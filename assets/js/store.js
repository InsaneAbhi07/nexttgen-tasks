/* NexttGen Tasks — data layer (no database, no server).
 *
 * Local mode : everything lives in this browser's localStorage (demo / single person).
 * Team mode  : one JSON file in a GitHub repo (e.g. data/db.json) is the shared store.
 *              Every browser reads/writes it through the GitHub REST API.
 *
 * Conflict handling: every record has an id + updatedAt. Before writing we fetch the
 * latest file, merge record-by-record (newest updatedAt wins), then write with the
 * file's sha. If someone else wrote in between, GitHub rejects it (409) and we retry.
 * Deletes are soft (deleted: true) so a merge can never bring a task back to life.
 */
(function () {
  const K = { db: 'ng.db.v1', cfg: 'ng.sync.v1', session: 'ng.session.v1' };
  const POLL_MS = 30000;

  const ls = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full / blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  const empty = () => ({ version: 1, users: [], tasks: [], activity: [] });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const now = () => new Date().toISOString();
  const wait = ms => new Promise(r => setTimeout(r, ms));

  let db = Object.assign(empty(), ls.get(K.db, {}));
  let cfg = ls.get(K.cfg, null);
  const subs = new Set();
  const status = { mode: 'local', state: 'idle', lastSync: null, error: null };

  const isRemote = () => !!(cfg && cfg.owner && cfg.repo && cfg.token);
  status.mode = isRemote() ? 'github' : 'local';

  function emit() { subs.forEach(fn => { try { fn(db, status); } catch (e) { console.error(e); } }); }
  function persist() { ls.set(K.db, db); }
  function setStatus(patch) { Object.assign(status, patch); emit(); }

  /* ---------- merge ---------- */
  const stamp = r => r.updatedAt || r.at || '';
  function mergeList(a = [], b = []) {
    const map = new Map();
    for (const r of a) map.set(r.id, r);
    for (const r of b) { const cur = map.get(r.id); if (!cur || stamp(r) > stamp(cur)) map.set(r.id, r); }
    return [...map.values()];
  }
  function merge(a, b) {
    return {
      version: 1,
      users: mergeList(a.users, b.users),
      tasks: mergeList(a.tasks, b.tasks),
      activity: mergeList(a.activity, b.activity).sort((x, y) => y.at.localeCompare(x.at)).slice(0, 2000),
    };
  }
  const canon = d => JSON.stringify(['users', 'tasks', 'activity']
    .map(k => [...(d[k] || [])].sort((x, y) => (x.id < y.id ? -1 : 1))));

  /* ---------- GitHub contents API ---------- */
  function ghUrl() {
    const path = cfg.path.split('/').map(encodeURIComponent).join('/');
    return `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${path}`;
  }
  const ghHeaders = () => ({
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  });
  function b64enc(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

  async function ghError(res) {
    const j = await res.json().catch(() => ({}));
    const hint = res.status === 401 ? ' (token invalid or expired)'
      : res.status === 403 ? ' (token lacks Contents: read & write on this repo)'
      : res.status === 404 ? ' (repo or branch not found / no access)' : '';
    return new Error(`GitHub ${res.status}: ${j.message || res.statusText}${hint}`);
  }

  async function ghGet() {
    const res = await fetch(`${ghUrl()}?ref=${encodeURIComponent(cfg.branch)}`, { headers: ghHeaders(), cache: 'no-store' });
    if (res.status === 404) {
      // File missing is fine (first run) — but make sure the repo itself is reachable.
      const repo = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`, { headers: ghHeaders(), cache: 'no-store' });
      if (!repo.ok) throw await ghError(repo);
      return { data: empty(), sha: null };
    }
    if (!res.ok) throw await ghError(res);
    const j = await res.json();
    if (!j.content && j.size > 0) throw new Error('Data file is over 1 MB — export & archive old activity.');
    return { data: Object.assign(empty(), j.content ? JSON.parse(b64dec(j.content)) : {}), sha: j.sha };
  }

  async function ghPut(data, sha) {
    const body = { message: `tasks: sync ${now()}`, content: b64enc(JSON.stringify(data, null, 1)), branch: cfg.branch };
    if (sha) body.sha = sha;
    const res = await fetch(ghUrl(), {
      method: 'PUT',
      headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 409 || res.status === 422) return null; // someone wrote first → retry
    if (!res.ok) throw await ghError(res);
    return (await res.json()).content.sha;
  }

  /* ---------- sync loop ---------- */
  let inflight = null;
  let again = false;

  function sync() {
    if (!isRemote()) return Promise.resolve();
    if (inflight) { again = true; return inflight; }
    inflight = (async () => {
      setStatus({ state: 'syncing', error: null });
      try {
        let ok = false;
        for (let attempt = 0; attempt < 5 && !ok; attempt++) {
          const { data, sha } = await ghGet();
          const merged = merge(data, db);
          db = merged;
          persist();
          emit();
          if (canon(merged) === canon(data)) { ok = true; break; } // nothing new to push
          ok = !!(await ghPut(merged, sha));
          if (!ok) await wait(300 + Math.random() * 900);
        }
        if (!ok) throw new Error('Could not save after several retries — will try again shortly.');
        setStatus({ state: 'ok', lastSync: now() });
      } catch (e) {
        console.warn('[sync]', e);
        setStatus({ state: 'error', error: e.message });
      } finally {
        inflight = null;
        if (again) { again = false; sync(); }
      }
    })();
    return inflight;
  }

  let timer = null;
  function startAutoSync() {
    clearInterval(timer);
    if (!isRemote()) return;
    timer = setInterval(() => { if (document.visibilityState === 'visible') sync(); }, POLL_MS);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  // Another tab of the same browser changed data
  window.addEventListener('storage', e => {
    if (e.key === K.db && e.newValue) { try { db = Object.assign(empty(), JSON.parse(e.newValue)); emit(); } catch { /* ignore */ } }
  });

  /* ---------- mutations ---------- */
  function commit(mutate, act) {
    mutate(db);
    if (act) db.activity.unshift({ id: uid(), at: now(), ...act });
    persist();
    emit();
    sync();
  }

  const Store = {
    uid, now,
    get db() { return db; },
    get status() { return status; },
    get config() { return cfg; },
    isRemote,
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    users: () => db.users.filter(u => !u.deleted),
    tasks: () => db.tasks.filter(t => !t.deleted),
    activity: () => db.activity,
    user: id => db.users.find(u => u.id === id && !u.deleted),
    task: id => db.tasks.find(t => t.id === id && !t.deleted),
    userByUsername: name => {
      const q = String(name).trim().toLowerCase();
      return db.users.find(u => !u.deleted && String(u.username || u.email || '').toLowerCase() === q);
    },

    addUser(u) {
      const rec = { id: uid(), createdAt: now(), updatedAt: now(), ...u };
      commit(d => d.users.push(rec), { by: rec.id, type: 'joined' });
      return rec;
    },
    updateUser(id, patch) {
      const u = db.users.find(x => x.id === id);
      if (!u) return;
      commit(() => Object.assign(u, patch, { updatedAt: now() }));
    },

    addTask(data, by) {
      const t = {
        id: uid(), title: '', notes: '', assignee: by, due: '', time: '', priority: 'medium',
        status: 'todo', tags: [], remind: '30', repeat: '', createdBy: by,
        createdAt: now(), updatedAt: now(), completedAt: null, ...data,
      };
      commit(d => d.tasks.push(t), { by, type: 'created', taskId: t.id, title: t.title, to: t.assignee !== by ? t.assignee : undefined });
      return t;
    },
    updateTask(id, patch, by, type = 'updated', extra = {}) {
      const t = db.tasks.find(x => x.id === id);
      if (!t) return;
      commit(() => Object.assign(t, patch, { updatedAt: now() }),
        type ? { by, type, taskId: id, title: patch.title ?? t.title, ...extra } : null);
      return t;
    },
    removeTask(id, by) {
      const t = db.tasks.find(x => x.id === id);
      if (!t) return;
      commit(() => Object.assign(t, { deleted: true, updatedAt: now() }), { by, type: 'deleted', taskId: id, title: t.title });
    },
    /** Merge a whole db-shaped object in (import / demo seed). */
    importData(obj) {
      const incoming = Object.assign(empty(), obj);
      commit(() => { db = merge(db, incoming); });
    },
    exportData: () => JSON.parse(JSON.stringify(db)),
    resetLocal() { db = empty(); persist(); emit(); },

    session: {
      get: () => ls.get(K.session, null),
      set: id => ls.set(K.session, id),
      clear: () => ls.del(K.session),
    },

    setConfig(c) {
      cfg = { branch: 'main', path: 'data/db.json', ...c };
      ls.set(K.cfg, cfg);
      status.mode = isRemote() ? 'github' : 'local';
      startAutoSync();
      return sync();
    },
    clearConfig() {
      cfg = null;
      ls.del(K.cfg);
      clearInterval(timer);
      setStatus({ mode: 'local', state: 'idle', error: null });
    },
    sync,
    startAutoSync,
  };

  window.Store = Store;
})();
