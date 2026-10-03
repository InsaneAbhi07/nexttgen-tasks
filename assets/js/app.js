/* NexttGen Tasks — UI. Plain JS, no build step, runs on GitHub Pages as-is. */
(function () {
  const { ymd, today, parseYmd, addDays, diffDays, fmtDay, fmtTime, plural, first } = Smart;

  /* ---------- helpers ---------- */
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch { return fb; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

  const COLORS = ['#0B5CFF', '#0EA5E9', '#7C3AED', '#DB2777', '#EA580C', '#16A34A', '#0891B2', '#CA8A04'];
  const ROLES = ['Developer', 'Designer', 'QA', 'Sales', 'Manager', 'DevOps', 'Business', 'Member', 'Other'];
  const PRI = { high: 'High', medium: 'Medium', low: 'Low' };
  const STATUS = { todo: 'To do', progress: 'In progress', done: 'Done' };
  const REMIND = { '': 'No reminder', 0: 'At due time', 10: '10 min before', 30: '30 min before', 60: '1 hour before', 1440: '1 day before' };
  const REPEAT = { '': 'Does not repeat', daily: 'Daily', weekdays: 'Weekdays (Mon–Fri)', weekly: 'Weekly', monthly: 'Monthly' };
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'mine', label: 'My Tasks', icon: 'list' },
    { id: 'week', label: 'Week', icon: 'calendar' },
    { id: 'team', label: 'Team', icon: 'users' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'sliders' },
  ];

  const P = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    list: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    cloud: '<path d="M17.5 19H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    trend: '<path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/>',
    fire: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-4 3 0-2 0-4-2-6-1 4-4 7-4 12 0 4 3 7 7 7z"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  };
  const ic = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const avatar = (u, size = '') => u
    ? `<span class="av ${size}" style="--c:${u.color}" title="${esc(u.name)}">${esc(initials(u.name))}</span>`
    : `<span class="av ${size} empty" title="Unassigned">?</span>`;

  function relTime(iso) {
    const s = (Date.now() - Date.parse(iso)) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  const clockTime = iso => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  async function hashPw(pw, salt) {
    const data = `nexttgen::${salt}::${pw}`;
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (let i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) | 0;
    return `w${(h >>> 0).toString(16)}`;
  }

  /* ---------- state ---------- */
  const S = {
    me: null,
    view: lsGet('ng.view', 'dashboard'),
    authMode: 'login',
    who: 'all', show: 'open', day: null, q: '',
    weekOffset: 0, histRange: 7, histWho: 'all',
    pendingRender: false,
  };

  /* ---------- toasts ---------- */
  function toast(msg, tone = '') {
    const el = document.createElement('div');
    el.className = `toast ${tone}`;
    el.innerHTML = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 4700);
  }

  /* ---------- theme ---------- */
  function currentTheme() {
    const t = document.documentElement.dataset.theme;
    if (t) return t;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  }

  /* ---------- modal ---------- */
  function openModal(html, cls = '') {
    $('#modal-root').innerHTML = `<div class="overlay" data-overlay><div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
    const f = $('#modal-root [autofocus]') || $('#modal-root input, #modal-root textarea, #modal-root button');
    if (f) setTimeout(() => f.focus(), 30);
  }
  function closeModal() {
    $('#modal-root').innerHTML = '';
    if (S.pendingRender) { S.pendingRender = false; refresh(); }
  }

  /* =====================================================================
     AUTH
     ===================================================================== */
  function syncLabel() {
    const c = Store.config;
    return Store.isRemote() ? `Team workspace · ${esc(c.owner)}/${esc(c.repo)}` : 'Local mode · data stays in this browser';
  }

  function renderAuth() {
    S.me = null;
    $('#app').hidden = true;
    const el = $('#auth');
    el.hidden = false;
    const login = S.authMode === 'login';
    const noUsers = Store.users().length === 0;
    $('#authTitle').textContent = login ? 'Welcome back' : 'Create your account';
    $('#authSub').textContent = login ? 'Login to see what the team is working on.' : 'Sign up once, then everyone sees your tasks on the team board.';
    document.title = `${login ? 'Login' : 'Sign up'} · NexttGen Team Tasks`;
    $('#loginForm').hidden = !login;
    $('#registerForm').hidden = login;
    $$('#auth .tabs button').forEach(b => b.classList.toggle('on', b.dataset.auth === S.authMode));
    $('#authFoot').innerHTML = noUsers && !Store.isRemote()
      ? `<p>First time? <button type="button" class="link" data-action="seed">Load a demo team</button> and login as <b>rohit</b> / <b>nexttgen</b>.</p>`
      : `<p class="muted">${syncLabel()} · <button type="button" class="link" data-action="open-sync">${Store.isRemote() ? 'Change' : 'Team sync'}</button></p>`;
  }

  async function handleAuth(form) {
    const register = form.id === 'registerForm';
    const f = Object.fromEntries(new FormData(form));
    const err = $('.form-err', form);
    const username = (f.username || '').trim().toLowerCase();
    const password = f.password || '';
    const name = (f.name || '').trim();
    err.textContent = '';

    if (register && !name) { err.textContent = 'Please enter your name.'; return; }
    if (!username) { err.textContent = 'Please enter a username.'; return; }
    if (!password) { err.textContent = 'Please enter a password.'; return; }

    if (Store.isRemote()) await Store.sync(); // pick up colleagues who registered elsewhere
    if (register) {
      if (Store.userByUsername(username)) { err.textContent = 'That username is taken. Try another, or login.'; return; }
      const salt = Store.uid();
      const used = new Set(Store.users().map(u => u.color));
      const u = Store.addUser({
        name, username, role: 'Member', salt,
        pass: await hashPw(password, salt),
        color: COLORS.find(c => !used.has(c)) || COLORS[Store.users().length % COLORS.length],
      });
      form.reset();
      enterApp(u);
      toast(`Welcome, <b>${esc(first(u))}</b>!`, 'ok');
    } else {
      const u = Store.userByUsername(username);
      if (!u || u.pass !== await hashPw(password, u.salt)) { err.textContent = 'Wrong username or password.'; return; }
      form.reset();
      enterApp(u);
    }
  }

  /* =====================================================================
     SHELL
     ===================================================================== */
  function enterApp(u) {
    S.me = u;
    Store.session.set(u.id);
    $('#auth').hidden = true;
    $('#app').hidden = false;
    document.title = 'NexttGen Team Tasks';
    renderShell();
    refresh();
    dailyDigest();
    checkReminders();
  }

  function renderShell() {
    const dark = currentTheme() === 'dark';
    $('#app').innerHTML = `
      <aside class="side">
        <div class="brand">
          <img src="assets/img/ng-icon.jpg" alt="">
          <div><b>Nextt<span>Gen</span></b><small>Team Tasks</small></div>
        </div>
        <nav>${NAV.map(n => `<button class="nav-item" data-nav="${n.id}">${ic(n.icon)}<span>${n.label}</span><em data-count="${n.id}"></em></button>`).join('')}</nav>
        <div class="side-foot">
          <button class="sync-chip" id="syncChip" data-nav="settings"></button>
          <div class="me">
            ${avatar(S.me)}
            <div class="me-txt"><b>${esc(S.me.name)}</b><small>${esc(S.me.role || '')}</small></div>
            <button class="icon-btn sm" data-action="logout" title="Sign out" aria-label="Sign out">${ic('logout')}</button>
          </div>
        </div>
      </aside>
      <div class="main">
        <header class="top">
          <form class="quick" id="quickForm" autocomplete="off">
            ${ic('spark')}
            <input id="quickInput" aria-label="Smart add task" placeholder="Smart add: “Client demo tomorrow 4pm @priya #high”">
            <kbd>Enter</kbd>
            <div class="quick-preview" id="quickPreview"></div>
          </form>
          <button class="btn primary" data-action="new-task">${ic('plus')}<span>New task</span></button>
          <button class="icon-btn" data-action="bell" aria-label="Reminders">${ic('bell')}<i id="bellBadge"></i></button>
          <button class="icon-btn" data-action="theme" aria-label="Toggle theme" id="themeBtn">${ic(dark ? 'sun' : 'moon')}</button>
        </header>
        <section id="view" class="view"></section>
      </div>`;
  }

  function updateChrome() {
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.nav === S.view));
    const t = today();
    const mine = Store.tasks().filter(x => x.assignee === S.me.id && x.status !== 'done');
    const urgent = mine.filter(x => x.due && x.due <= t).length;
    const mc = $('[data-count="mine"]'); if (mc) mc.textContent = urgent || '';
    const bb = $('#bellBadge'); if (bb) bb.textContent = urgent || '';

    const st = Store.status;
    const chip = $('#syncChip');
    if (chip) {
      const remote = Store.isRemote();
      chip.className = `sync-chip ${remote ? st.state : 'local'}`;
      chip.innerHTML = `${ic('cloud')}<span>${!remote ? 'Local mode' : st.state === 'syncing' ? 'Syncing…' : st.state === 'error' ? 'Sync error' : `Synced ${st.lastSync ? relTime(st.lastSync) : ''}`}</span>`;
      chip.title = st.error || syncLabel();
    }
  }

  const VIEWS = { dashboard: viewDashboard, mine: viewMine, week: viewWeek, team: viewTeam, history: viewHistory, settings: viewSettings };

  function refresh() {
    if (!S.me) return;
    const v = $('#view');
    if (!v) return;
    const fresh = Store.user(S.me.id);
    if (!fresh) { logout(); return; }
    S.me = fresh;
    v.innerHTML = (VIEWS[S.view] || viewDashboard)();
    updateChrome();
  }

  function go(view) {
    S.view = view;
    S.day = null;
    lsSet('ng.view', view);
    refresh();
    $('#view').scrollTop = 0;
    window.scrollTo({ top: 0 });
  }

  function logout() {
    Store.session.clear();
    S.me = null;
    S.authMode = 'login';
    $('#app').innerHTML = '';
    renderAuth();
  }

  /* =====================================================================
     TASK PIECES
     ===================================================================== */
  function applyFilters(list, opts = {}) {
    const who = opts.who ?? S.who;
    const q = S.q.trim().toLowerCase();
    return list.filter(t => {
      if (who === 'me' && t.assignee !== S.me.id) return false;
      if (who !== 'all' && who !== 'me' && t.assignee !== who) return false;
      if (S.show === 'open' && t.status === 'done') return false;
      if (S.show === 'done' && t.status !== 'done') return false;
      if (S.day && t.due !== S.day) return false;
      if (q) {
        const u = Store.user(t.assignee);
        const hay = `${t.title} ${t.notes} ${(t.tags || []).join(' ')} ${u ? u.name : ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function taskHtml(t, opts = {}) {
    const u = Store.user(t.assignee);
    const d = t.due ? diffDays(t.due, today()) : null;
    const late = t.status !== 'done' && d !== null && d < 0;
    return `
      <article class="task pri-${t.priority} st-${t.status}" data-id="${t.id}">
        <button class="check" data-action="toggle" aria-label="${t.status === 'done' ? 'Mark as not done' : 'Mark as done'}">${ic('check')}</button>
        <div class="t-body" data-action="edit" tabindex="0">
          <div class="t-title">${esc(t.title)}</div>
          <div class="t-meta">
            <span class="pri-tag">${PRI[t.priority]}</span>
            ${opts.showDate && t.due ? `<span>${ic('calendar')}${fmtDay(t.due)}</span>` : ''}
            ${t.time ? `<span>${ic('clock')}${fmtTime(t.time)}</span>` : ''}
            ${late ? `<span class="late">${plural(-d, 'day')} late</span>` : ''}
            ${t.status === 'progress' ? '<span class="prog">In progress</span>' : ''}
            ${t.repeat ? `<span title="${REPEAT[t.repeat]}">${ic('repeat')}${t.repeat}</span>` : ''}
            ${(t.tags || []).map(x => `<span class="tag">#${esc(x)}</span>`).join('')}
            ${t.status === 'done' && t.completedAt ? `<span>Done ${relTime(t.completedAt)}</span>` : ''}
          </div>
        </div>
        <div class="t-side">
          ${t.status === 'todo' ? `<button class="mini" data-action="start" title="Start working on this" aria-label="Start">${ic('play')}</button>` : ''}
          ${avatar(u, 'sm')}
        </div>
      </article>`;
  }

  function groupsHtml(list, opts = {}) {
    const groups = Smart.groupByDate(list);
    if (!groups.length) return emptyState(opts.empty || 'Nothing here. Use Smart add above to create a task.');
    return groups.map(g => `
      <section class="group tone-${g.tone || 'plain'}">
        <header>
          <h3>${g.label}</h3><span class="sub">${g.sub}</span><span class="count">${g.items.length}</span>
          ${g.key === 'overdue' ? '<button class="btn sm ghost" data-action="rollover">Move to today</button>' : ''}
        </header>
        <div class="tasks">${g.items.map(t => taskHtml(t, { showDate: ['overdue', 'later', 'past'].includes(g.key) })).join('')}</div>
      </section>`).join('');
  }

  const emptyState = msg => `<div class="empty"><img src="assets/img/ng-icon.jpg" alt=""><p>${msg}</p></div>`;

  function filterBar(opts = {}) {
    const users = Store.users();
    return `
      <div class="filters">
        ${opts.noWho ? '' : `
        <div class="who" role="group" aria-label="Filter by member">
          <button class="pill ${S.who === 'all' ? 'on' : ''}" data-who="all">Everyone</button>
          <button class="pill ${S.who === 'me' ? 'on' : ''}" data-who="me">Me</button>
          ${users.filter(u => u.id !== S.me.id).map(u => `<button class="pill av-pill ${S.who === u.id ? 'on' : ''}" data-who="${u.id}">${avatar(u, 'xs')}${esc(first(u))}</button>`).join('')}
        </div>`}
        <div class="seg small" role="group" aria-label="Status">
          ${['open', 'all', 'done'].map(s => `<button class="${S.show === s ? 'on' : ''}" data-show="${s}">${{ open: 'Open', all: 'All', done: 'Done' }[s]}</button>`).join('')}
        </div>
        <label class="search">${ic('search')}<input id="searchInput" placeholder="Search tasks, tags, people" value="${esc(S.q)}"></label>
      </div>`;
  }

  /* =====================================================================
     VIEWS
     ===================================================================== */
  function viewDashboard() {
    const all = Store.tasks();
    const t = today();
    const open = all.filter(x => x.status !== 'done');
    const weekAgo = Date.now() - 7 * Smart.DAY;
    const kpis = [
      { label: 'Due today', n: open.filter(x => x.due === t).length, tone: 'brand', sub: 'across the team' },
      { label: 'Overdue', n: open.filter(x => x.due && x.due < t).length, tone: 'danger', sub: 'need attention' },
      { label: 'In progress', n: open.filter(x => x.status === 'progress').length, tone: 'info', sub: 'being worked on' },
      { label: 'Done · 7 days', n: all.filter(x => x.completedAt && Date.parse(x.completedAt) > weekAgo).length, tone: 'ok', sub: 'shipped' },
    ];

    // date strip: today + next 6 days
    const scoped = applyFilters(all);
    const stripBase = all.filter(x => (S.who === 'all' || (S.who === 'me' ? x.assignee === S.me.id : x.assignee === S.who)) && x.status !== 'done');
    const strip = Array.from({ length: 7 }, (_, i) => {
      const d = ymd(addDays(new Date(), i));
      return { d, n: stripBase.filter(x => x.due === d).length, i };
    });
    const max = Math.max(1, ...strip.map(s => s.n));

    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const focus = Smart.focus(all, S.me.id);
    const ins = Smart.insights(Store.users(), all, S.me.id);

    return `
      <div class="view-head">
        <div>
          <p class="eyebrow">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <h1>${greet}, ${esc(first(S.me))}</h1>
        </div>
        <button class="btn" data-action="standup">${ic('msg')} My standup</button>
      </div>

      <div class="kpis">${kpis.map(k => `
        <div class="kpi tone-${k.tone}"><span>${k.label}</span><b>${k.n}</b><small>${k.sub}</small></div>`).join('')}
      </div>

      <div class="dash">
        <div class="dash-main">
          <div class="strip" role="group" aria-label="Pick a day">
            <button class="strip-day all ${S.day ? '' : 'on'}" data-day="">
              <small>All</small><b>${ic('grid')}</b><span class="bar"><i style="width:100%"></i></span><em>${stripBase.length} open</em>
            </button>
            ${strip.map(s => `
              <button class="strip-day ${S.day === s.d ? 'on' : ''} ${s.i === 0 ? 'is-today' : ''}" data-day="${s.d}">
                <small>${s.i === 0 ? 'Today' : s.i === 1 ? 'Tmrw' : parseYmd(s.d).toLocaleDateString('en-IN', { weekday: 'short' })}</small>
                <b>${parseYmd(s.d).getDate()}</b>
                <span class="bar"><i style="width:${(s.n / max) * 100}%"></i></span>
                <em>${s.n ? plural(s.n, 'task') : 'free'}</em>
              </button>`).join('')}
          </div>
          ${filterBar()}
          <div class="groups">${groupsHtml(scoped, { empty: S.day ? `Nothing scheduled for ${fmtDay(S.day)}.` : undefined })}</div>
        </div>

        <aside class="dash-side">
          <div class="card focus">
            <h4>${ic('target')} Your focus now</h4>
            ${focus.length ? `<ol>${focus.map(f => `
              <li data-id="${f.task.id}">
                <button class="check sm" data-action="toggle" aria-label="Mark as done">${ic('check')}</button>
                <div data-action="edit" tabindex="0"><b>${esc(f.task.title)}</b><small>${f.why}</small></div>
              </li>`).join('')}</ol>` : '<p class="muted">All clear. Nothing open is assigned to you.</p>'}
          </div>
          <div class="card insights">
            <h4>${ic('spark')} Smart insights</h4>
            ${ins.length ? ins.map(i => `
              <div class="ins tone-${i.tone}">
                <span class="ins-ic">${ic(i.icon)}</span>
                <div><p>${esc(i.text)}</p>${i.action ? `<button class="link" data-action="${i.action.id}">${i.action.label} →</button>` : ''}</div>
              </div>`).join('') : '<p class="muted">Insights appear once the team has a few tasks.</p>'}
          </div>
          <div class="card pulse">
            <h4>${ic('users')} Team today</h4>
            ${Store.users().map(u => {
              const mine = open.filter(x => x.assignee === u.id);
              const td = mine.filter(x => x.due === t).length;
              const od = mine.filter(x => x.due && x.due < t).length;
              const doing = mine.find(x => x.status === 'progress');
              return `<button class="pulse-row" data-who-jump="${u.id}">
                ${avatar(u, 'sm')}
                <div><b>${esc(u.name)}</b><small>${doing ? `Working on: ${esc(doing.title)}` : esc(u.role || '')}</small></div>
                <span class="nums"><em title="Due today">${td}</em>${od ? `<em class="bad" title="Overdue">${od}</em>` : ''}</span>
              </button>`;
            }).join('')}
          </div>
        </aside>
      </div>`;
  }

  function viewMine() {
    const list = applyFilters(Store.tasks(), { who: 'me' });
    const all = Store.tasks().filter(x => x.assignee === S.me.id);
    const done7 = all.filter(x => x.completedAt && Date.now() - Date.parse(x.completedAt) < 7 * Smart.DAY).length;
    const st = Smart.streak(Store.tasks(), S.me.id);
    return `
      <div class="view-head">
        <div><p class="eyebrow">Assigned to you</p><h1>My Tasks</h1></div>
        <div class="head-stats">
          <span><b>${all.filter(x => x.status !== 'done').length}</b> open</span>
          <span><b>${done7}</b> done this week</span>
          ${st ? `<span class="fire">${ic('fire')}<b>${st}</b>-day streak</span>` : ''}
          <button class="btn" data-action="standup">${ic('msg')} Standup</button>
        </div>
      </div>
      ${filterBar({ noWho: true })}
      <div class="groups">${groupsHtml(list, { empty: 'You have no tasks matching this filter.' })}</div>`;
  }

  function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); return x; }

  function viewWeek() {
    const start = startOfWeek(addDays(new Date(), S.weekOffset * 7));
    const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(start, i)));
    const t = today();
    const tasks = Store.tasks().filter(x => S.who === 'all' || (S.who === 'me' ? x.assignee === S.me.id : x.assignee === S.who));
    const label = `${fmtDay(days[0])} – ${fmtDay(days[6])}`;
    return `
      <div class="view-head">
        <div><p class="eyebrow">${S.weekOffset === 0 ? 'This week' : S.weekOffset === 1 ? 'Next week' : S.weekOffset === -1 ? 'Last week' : 'Week view'}</p><h1>${label}</h1></div>
        <div class="week-nav">
          <button class="icon-btn" data-week="-1" aria-label="Previous week">${ic('chevL')}</button>
          <button class="btn" data-week="0">This week</button>
          <button class="icon-btn" data-week="1" aria-label="Next week">${ic('chevR')}</button>
        </div>
      </div>
      <div class="filters">
        <div class="who" role="group">
          <button class="pill ${S.who === 'all' ? 'on' : ''}" data-who="all">Everyone</button>
          <button class="pill ${S.who === 'me' ? 'on' : ''}" data-who="me">Me</button>
          ${Store.users().filter(u => u.id !== S.me.id).map(u => `<button class="pill av-pill ${S.who === u.id ? 'on' : ''}" data-who="${u.id}">${avatar(u, 'xs')}${esc(first(u))}</button>`).join('')}
        </div>
      </div>
      <div class="week">
        ${days.map(d => {
          const items = tasks.filter(x => x.due === d).sort(Smart.sortTasks);
          const openN = items.filter(x => x.status !== 'done').length;
          return `
          <div class="wday ${d === t ? 'today' : ''} ${d < t ? 'past' : ''}">
            <header><small>${parseYmd(d).toLocaleDateString('en-IN', { weekday: 'short' })}</small><b>${parseYmd(d).getDate()}</b><em>${openN || ''}</em></header>
            <div class="wlist">
              ${items.map(x => `
                <div class="wcard pri-${x.priority} st-${x.status}" data-id="${x.id}" data-action="edit" tabindex="0">
                  <span class="wt">${esc(x.title)}</span>
                  <span class="wm">${x.time ? fmtTime(x.time) : ''}${avatar(Store.user(x.assignee), 'xs')}</span>
                </div>`).join('')}
            </div>
            <button class="add-day" data-action="new-task" data-due="${d}">${ic('plus')} Add</button>
          </div>`;
        }).join('')}
      </div>`;
  }

  function viewTeam() {
    const users = Store.users();
    const tasks = Store.tasks();
    const t = today();
    const open = tasks.filter(x => x.status !== 'done');
    const maxOpen = Math.max(1, ...users.map(u => open.filter(x => x.assignee === u.id).length));
    const days = Array.from({ length: 5 }, (_, i) => ymd(addDays(new Date(), i)));
    const lastSeen = id => { const a = Store.activity().find(x => x.by === id); return a ? relTime(a.at) : '—'; };

    return `
      <div class="view-head"><div><p class="eyebrow">${plural(users.length, 'member')}</p><h1>Team</h1></div></div>
      <div class="team-grid">
        ${users.map(u => {
          const mine = tasks.filter(x => x.assignee === u.id);
          const o = mine.filter(x => x.status !== 'done');
          const done7 = mine.filter(x => x.completedAt && Date.now() - Date.parse(x.completedAt) < 7 * Smart.DAY).length;
          const od = o.filter(x => x.due && x.due < t).length;
          const doing = o.find(x => x.status === 'progress');
          return `
          <div class="card member">
            <div class="m-top">${avatar(u, 'lg')}<div><b>${esc(u.name)}</b><small>active ${lastSeen(u.id)}</small></div></div>
            <label class="role-pick"><span>Role</span><select data-role-for="${u.id}" aria-label="Role for ${esc(u.name)}">${[...new Set([...ROLES, u.role || 'Member'])].map(r => `<option ${r === (u.role || 'Member') ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
            <div class="m-stats">
              <div><b>${o.length}</b><small>Open</small></div>
              <div><b>${o.filter(x => x.due === t).length}</b><small>Today</small></div>
              <div class="${od ? 'bad' : ''}"><b>${od}</b><small>Overdue</small></div>
              <div><b>${done7}</b><small>Done 7d</small></div>
            </div>
            <div class="load"><span style="width:${(o.length / maxOpen) * 100}%"></span></div>
            <p class="doing">${doing ? `${ic('play')} ${esc(doing.title)}` : '<span class="muted">Nothing in progress</span>'}</p>
            <button class="btn sm block" data-who-jump="${u.id}">View tasks</button>
          </div>`;
        }).join('')}
      </div>

      <div class="card">
        <h4>${ic('calendar')} Workload, next 5 days <small class="muted">· open tasks per person per day</small></h4>
        <div class="table-wrap">
          <table class="load-table">
            <thead><tr><th>Member</th>${days.map((d, i) => `<th>${i === 0 ? 'Today' : parseYmd(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</th>`).join('')}</tr></thead>
            <tbody>
              ${users.map(u => `<tr><td>${avatar(u, 'xs')} ${esc(first(u))}</td>${days.map(d => {
                const n = open.filter(x => x.assignee === u.id && x.due === d).length;
                return `<td class="${n >= 4 ? 'hot' : n === 0 ? 'zero' : ''}">${n || '·'}</td>`;
              }).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </div>
        <p class="muted small">Cells with 4+ tasks are highlighted; use them to spot who needs help.</p>
      </div>`;
  }

  const ACT = {
    created: 'created', completed: 'completed', reopened: 'reopened', started: 'started',
    updated: 'updated', deleted: 'deleted', moved: 'rescheduled', assigned: 'reassigned', joined: 'joined the team',
  };

  function viewHistory() {
    const since = S.histRange === 1 ? parseYmd(today()).getTime() : Date.now() - S.histRange * Smart.DAY;
    const acts = Store.activity().filter(a => Date.parse(a.at) >= since && (S.histWho === 'all' || a.by === S.histWho));
    const byDay = new Map();
    for (const a of acts) { const k = ymd(new Date(a.at)); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(a); }
    const completed = acts.filter(a => a.type === 'completed').length;
    const created = acts.filter(a => a.type === 'created').length;
    const top = Store.users().map(u => ({ u, n: acts.filter(a => a.by === u.id && a.type === 'completed').length })).sort((a, b) => b.n - a.n)[0];

    return `
      <div class="view-head">
        <div><p class="eyebrow">Activity log</p><h1>History</h1></div>
        <div class="seg small">
          ${[[1, 'Today'], [3, '3 days'], [7, '7 days'], [30, '30 days']].map(([n, l]) => `<button class="${S.histRange === n ? 'on' : ''}" data-hist="${n}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="filters">
        <div class="who">
          <button class="pill ${S.histWho === 'all' ? 'on' : ''}" data-hwho="all">Everyone</button>
          ${Store.users().map(u => `<button class="pill av-pill ${S.histWho === u.id ? 'on' : ''}" data-hwho="${u.id}">${avatar(u, 'xs')}${esc(first(u))}</button>`).join('')}
        </div>
      </div>
      <div class="kpis three">
        <div class="kpi tone-ok"><span>Completed</span><b>${completed}</b><small>in this period</small></div>
        <div class="kpi tone-brand"><span>Created</span><b>${created}</b><small>new tasks</small></div>
        <div class="kpi tone-info"><span>Top finisher</span><b class="name">${top && top.n ? esc(first(top.u)) : '—'}</b><small>${top && top.n ? plural(top.n, 'task') + ' closed' : 'no completions yet'}</small></div>
      </div>
      ${byDay.size ? [...byDay.entries()].map(([d, list]) => `
        <section class="hday">
          <header><h3>${d === today() ? 'Today' : diffDays(today(), d) === 1 ? 'Yesterday' : fmtDay(d)}</h3>
            <span class="sub">${plural(list.filter(a => a.type === 'completed').length, 'completion')} · ${plural(list.length, 'event')}</span></header>
          <ul class="feed">
            ${list.map(a => {
              const u = Store.user(a.by);
              const to = a.to ? Store.user(a.to) : null;
              const task = a.taskId ? Store.task(a.taskId) : null;
              return `<li class="ev ev-${a.type}">
                <time>${clockTime(a.at)}</time>
                ${avatar(u, 'xs')}
                <p><b>${esc(u ? u.name : 'Someone')}</b> ${ACT[a.type] || a.type}
                  ${a.title ? (task ? `<a href="#" data-open-task="${task.id}">“${esc(a.title)}”</a>` : `“${esc(a.title)}”`) : ''}
                  ${to ? ` for <b>${esc(first(to))}</b>` : ''}${a.note ? ` <span class="muted">${esc(a.note)}</span>` : ''}</p>
              </li>`;
            }).join('')}
          </ul>
        </section>`).join('') : emptyState('No activity in this period.')}`;
  }

  function syncFormHtml() {
    const c = Store.config || {};
    return `
      <form id="syncForm" class="sync-form" autocomplete="off">
        <div class="row2">
          <label class="fld"><span>GitHub owner / org</span><input name="owner" required value="${esc(c.owner || 'InsaneAbhi07')}"></label>
          <label class="fld"><span>Data repo</span><input name="repo" required value="${esc(c.repo || 'nexttgen-tasks-data')}"></label>
        </div>
        <div class="row2">
          <label class="fld"><span>Branch</span><input name="branch" value="${esc(c.branch || 'main')}"></label>
          <label class="fld"><span>File path</span><input name="path" value="${esc(c.path || 'data/db.json')}"></label>
        </div>
        <label class="fld"><span>Fine-grained token <small>(Contents: Read & write, this repo only)</small></span>
          <input name="token" type="password" required value="${esc(c.token || '')}" placeholder="github_pat_…"></label>
        <p class="form-err" id="syncErr" role="alert"></p>
        <div class="btn-row">
          <button class="btn primary">${ic('cloud')} Save & connect</button>
          ${Store.isRemote() ? `<button type="button" class="btn ghost danger" data-action="disconnect">Disconnect</button>` : ''}
        </div>
      </form>`;
  }

  function viewSettings() {
    const st = Store.status;
    const notif = 'Notification' in window ? Notification.permission : 'unsupported';
    return `
      <div class="view-head"><div><p class="eyebrow">Workspace & profile</p><h1>Settings</h1></div></div>
      <div class="settings">
        <div class="card">
          <h4>Profile</h4>
          <form id="profileForm">
            <div class="row2">
              <label class="fld"><span>Name</span><input name="name" required value="${esc(S.me.name)}"></label>
              <label class="fld"><span>Role</span><select name="role">${ROLES.map(r => `<option ${r === S.me.role ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
            </div>
            <div class="fld"><span>Colour</span>
              <div class="swatches">${COLORS.map(c => `<label><input type="radio" name="color" value="${c}" ${c === S.me.color ? 'checked' : ''}><i style="--c:${c}"></i></label>`).join('')}</div>
            </div>
            <button class="btn primary">Save profile</button>
          </form>
        </div>

        <div class="card">
          <h4>${ic('cloud')} Team workspace (shared data)</h4>
          <p class="muted">${Store.isRemote()
            ? `Connected to <b>${esc(Store.config.owner)}/${esc(Store.config.repo)}</b> · ${st.state === 'error' ? `<span class="bad">${esc(st.error)}</span>` : st.lastSync ? `last synced ${relTime(st.lastSync)}` : 'syncing…'}`
            : 'Right now data lives only in <b>this browser</b>. Connect a GitHub repo so the whole team shares one task list.'}</p>
          ${syncFormHtml()}
          ${Store.isRemote() ? `
            <div class="invite">
              <div><b>Invite teammates</b><p class="muted small">Share this link privately (WhatsApp/Teams DM). It carries the token, so don't post it publicly.</p></div>
              <div class="btn-row"><button class="btn" data-action="copy-invite">${ic('link')} Copy invite link</button><button class="btn ghost" data-action="sync-now">Sync now</button></div>
            </div>` : ''}
        </div>

        <div class="card">
          <h4>${ic('bell')} Reminders</h4>
          <p class="muted">Browser notifications fire while the portal is open in any tab (pin the tab). Status: <b>${notif}</b>.</p>
          ${notif === 'default' ? `<button class="btn" data-action="enable-notif">${ic('bell')} Enable notifications</button>` : ''}
          ${notif === 'denied' ? '<p class="small bad">Blocked in this browser. Allow notifications for this site in the address-bar settings.</p>' : ''}
          ${notif === 'granted' ? `<button class="btn ghost" data-action="test-notif">Send a test reminder</button>` : ''}
        </div>

        <div class="card">
          <h4>Data</h4>
          <p class="muted">Back up everything to a JSON file, or restore/merge one.</p>
          <div class="btn-row">
            <button class="btn" data-action="export">${ic('download')} Export JSON</button>
            <label class="btn">${ic('upload')} Import JSON<input type="file" accept="application/json" id="importFile" hidden></label>
            ${!Store.isRemote() ? `<button class="btn ghost" data-action="seed">${ic('spark')} Load demo data</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  /* =====================================================================
     MODALS
     ===================================================================== */
  function taskForm(t = {}) {
    const isNew = !t.id;
    const users = Store.users();
    const opt = (map, val) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${String(val ?? '') === k ? 'selected' : ''}>${v}</option>`).join('');
    const hist = isNew ? [] : Store.activity().filter(a => a.taskId === t.id).slice(0, 8);
    const creator = !isNew && Store.user(t.createdBy);
    return `
      <form id="taskForm" data-id="${t.id || ''}">
        <header class="m-head"><h2>${isNew ? 'New task' : 'Edit task'}</h2><button type="button" class="icon-btn sm" data-action="close-modal" aria-label="Close">${ic('x')}</button></header>
        <label class="fld"><span>Title</span><input name="title" required value="${esc(t.title || '')}" placeholder="What needs doing?" autofocus></label>
        <p class="ai-hint" id="aiHint"></p>
        <label class="fld"><span>Notes</span><textarea name="notes" rows="3" placeholder="Links, context, acceptance criteria…">${esc(t.notes || '')}</textarea></label>
        <div class="row3">
          <label class="fld"><span>Assignee</span><select name="assignee">${users.map(u => `<option value="${u.id}" ${(t.assignee || S.me.id) === u.id ? 'selected' : ''}>${esc(u.name)}${u.id === S.me.id ? ' (me)' : ''}</option>`).join('')}</select></label>
          <label class="fld"><span>Due date</span><input type="date" name="due" value="${t.due ?? today()}"></label>
          <label class="fld"><span>Time</span><input type="time" name="time" value="${t.time || ''}"></label>
        </div>
        <div class="row3">
          <label class="fld"><span>Priority</span><select name="priority">${opt(PRI, t.priority || 'medium')}</select></label>
          <label class="fld"><span>Status</span><select name="status">${opt(STATUS, t.status || 'todo')}</select></label>
          <label class="fld"><span>Reminder</span><select name="remind">${opt(REMIND, t.remind ?? '30')}</select></label>
        </div>
        <div class="row2">
          <label class="fld"><span>Repeat</span><select name="repeat">${opt(REPEAT, t.repeat || '')}</select></label>
          <label class="fld"><span>Tags</span><input name="tags" value="${esc((t.tags || []).join(', '))}" placeholder="frontend, client"></label>
        </div>
        ${!isNew ? `
          <details class="t-hist"><summary>${ic('history')} History · created by ${esc(creator ? creator.name : 'someone')} ${relTime(t.createdAt)}</summary>
            <ul>${hist.map(a => { const u = Store.user(a.by); return `<li><time>${fmtDay(ymd(new Date(a.at)))} ${clockTime(a.at)}</time> ${esc(u ? first(u) : 'Someone')} ${ACT[a.type] || a.type}${a.note ? ` <span class="muted">${esc(a.note)}</span>` : ''}</li>`; }).join('')}</ul>
          </details>` : ''}
        <footer class="m-foot">
          ${!isNew ? `<button type="button" class="btn ghost danger" data-action="delete-task">${ic('trash')} Delete</button>` : ''}
          <span class="grow"></span>
          <button type="button" class="btn ghost" data-action="close-modal">Cancel</button>
          <button class="btn primary">${isNew ? 'Create task' : 'Save changes'}</button>
        </footer>
      </form>`;
  }

  function openTask(id, defaults = {}) {
    const t = id ? Store.task(id) : defaults;
    if (id && !t) return;
    openModal(taskForm(t));
    updateAiHint();
  }

  function updateAiHint() {
    const f = $('#taskForm');
    if (!f) return;
    const title = f.elements.title.value.trim();
    const hint = $('#aiHint');
    const sug = title.length > 3 ? Smart.suggestPriority(title) : null;
    if (sug && sug !== f.elements.priority.value) {
      hint.innerHTML = `${ic('spark')} Looks like <b>${PRI[sug]}</b> priority. <button type="button" class="link" data-action="apply-pri" data-pri="${sug}">Apply</button>`;
      hint.hidden = false;
    } else hint.hidden = true;
  }

  function saveTaskForm(form) {
    const f = Object.fromEntries(new FormData(form));
    const data = {
      title: f.title.trim(), notes: f.notes.trim(), assignee: f.assignee, due: f.due, time: f.time,
      priority: f.priority, status: f.status, remind: f.remind, repeat: f.repeat,
      tags: f.tags.split(',').map(s => s.trim().replace(/^#/, '').toLowerCase()).filter(Boolean),
    };
    const id = form.dataset.id;
    if (!id) {
      if (data.status === 'done') data.completedAt = Store.now();
      Store.addTask(data, S.me.id);
      toast(`Task created${data.assignee !== S.me.id ? ` for <b>${esc(first(Store.user(data.assignee)))}</b>` : ''}`, 'ok');
    } else {
      const old = Store.task(id);
      const wasDone = old.status === 'done';
      if (data.status === 'done' && !wasDone) data.completedAt = Store.now();
      if (data.status !== 'done') data.completedAt = null;
      let type = 'updated', extra = {};
      if (data.assignee !== old.assignee) { type = 'assigned'; extra.to = data.assignee; }
      else if (data.status === 'done' && !wasDone) type = 'completed';
      else if (data.due !== old.due) { type = 'moved'; extra.note = data.due ? `→ ${fmtDay(data.due)}` : '→ no date'; }
      Store.updateTask(id, data, S.me.id, type, extra);
      if (type === 'completed') spawnRepeat(Store.task(id));
      toast('Saved', 'ok');
    }
    closeModal();
  }

  function spawnRepeat(t) {
    if (!t || !t.repeat) return;
    const next = Smart.nextOccurrence(t);
    if (!next) return;
    const { id, createdAt, updatedAt, completedAt, status, ...rest } = t;
    Store.addTask({ ...rest, due: next, status: 'todo', completedAt: null, createdBy: S.me.id }, S.me.id);
    toast(`Repeats ${t.repeat}: next one on <b>${fmtDay(next)}</b>`);
  }

  function toggleDone(id) {
    const t = Store.task(id);
    if (!t) return;
    if (t.status === 'done') {
      Store.updateTask(id, { status: 'todo', completedAt: null }, S.me.id, 'reopened');
    } else {
      Store.updateTask(id, { status: 'done', completedAt: Store.now() }, S.me.id, 'completed');
      spawnRepeat(Store.task(id));
      const left = Store.tasks().filter(x => x.assignee === S.me.id && x.status !== 'done' && x.due && x.due <= today()).length;
      toast(left ? `Done! ${plural(left, 'task')} left for today.` : `Done! You're all clear for today.`, 'ok');
    }
  }

  function standupModal() {
    const text = Smart.standup(Store.tasks(), S.me);
    openModal(`
      <header class="m-head"><h2>${ic('msg')} Your standup</h2><button type="button" class="icon-btn sm" data-action="close-modal" aria-label="Close">${ic('x')}</button></header>
      <p class="muted">Auto-built from what you closed yesterday, what's due today and anything overdue. Edit before sharing.</p>
      <textarea id="standupText" rows="14" class="mono">${esc(text)}</textarea>
      <footer class="m-foot"><span class="grow"></span>
        <a class="btn ghost" id="waShare" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">Share on WhatsApp</a>
        <button class="btn primary" data-action="copy-standup">${ic('copy')} Copy</button>
      </footer>`, 'wide');
  }

  function bellModal() {
    const t = today();
    const mine = Store.tasks().filter(x => x.assignee === S.me.id && x.status !== 'done' && x.due);
    const over = mine.filter(x => x.due < t).sort(Smart.sortTasks);
    const tod = mine.filter(x => x.due === t).sort(Smart.sortTasks);
    const soon = mine.filter(x => x.due > t && diffDays(x.due, t) <= 3).sort(Smart.sortTasks);
    const sec = (title, list, cls) => list.length ? `<h5 class="${cls}">${title} · ${list.length}</h5><div class="tasks">${list.map(x => taskHtml(x, { showDate: true })).join('')}</div>` : '';
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    openModal(`
      <header class="m-head"><h2>${ic('bell')} Reminders</h2><button type="button" class="icon-btn sm" data-action="close-modal" aria-label="Close">${ic('x')}</button></header>
      ${perm === 'default' ? `<div class="banner">${ic('bell')}<span>Turn on browser notifications to get pinged before tasks are due.</span><button class="btn sm primary" data-action="enable-notif">Enable</button></div>` : ''}
      ${sec('Overdue', over, 'bad') + sec('Today', tod, '') + sec('Next 3 days', soon, '') || emptyState('No reminders. Nothing due in the next 3 days.')}
    `, 'wide');
  }

  /* =====================================================================
     REMINDERS + DIGEST
     ===================================================================== */
  function notify(title, body, tag) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body, tag, icon: 'assets/img/ng-icon.jpg' }); } catch { /* some mobile browsers need SW */ }
    }
  }

  function checkReminders() {
    if (!S.me) return;
    const fired = lsGet('ng.fired', {});
    const nowTs = Date.now();
    for (const t of Store.tasks()) {
      if (t.assignee !== S.me.id || t.status === 'done' || !t.due || t.remind === '' || t.remind == null) continue;
      const dueTs = new Date(`${t.due}T${t.time || '09:00'}`).getTime();
      const at = dueTs - Number(t.remind) * 60000;
      const key = `${t.id}@${at}`;
      if (nowTs >= at && nowTs - at < 6 * 3600000 && !fired[key]) {
        fired[key] = nowTs;
        const when = t.time ? `${fmtDay(t.due)} at ${fmtTime(t.time)}` : fmtDay(t.due);
        notify(`Reminder: ${t.title}`, `Due ${when}`, key);
        toast(`${ic('bell')} <b>${esc(t.title)}</b> is due ${t.time ? `at ${fmtTime(t.time)}` : 'today'}`, 'warn');
      }
    }
    // prune entries older than 3 days
    for (const k of Object.keys(fired)) if (nowTs - fired[k] > 3 * Smart.DAY) delete fired[k];
    lsSet('ng.fired', fired);
  }

  function dailyDigest() {
    const key = `ng.digest.${S.me.id}`;
    if (lsGet(key, '') === today()) return;
    lsSet(key, today());
    const t = today();
    const mine = Store.tasks().filter(x => x.assignee === S.me.id && x.status !== 'done');
    const td = mine.filter(x => x.due === t).length;
    const od = mine.filter(x => x.due && x.due < t).length;
    if (td || od) toast(`${ic('spark')} Today: <b>${plural(td, 'task')}</b>${od ? `, <b class="bad">${od} overdue</b>` : ''}. Check “Your focus now”.`);
  }

  /* =====================================================================
     DEMO DATA
     ===================================================================== */
  async function seedDemo() {
    const people = [
      ['Rohit Sharma', 'rohit', 'Manager'],
      ['Abhishek Singh', 'abhishek', 'Developer'],
      ['Priya Nair', 'priya', 'Designer'],
      ['Karan Mehta', 'karan', 'Developer'],
      ['Sneha Iyer', 'sneha', 'QA'],
      ['Tushar', 'tushar', 'Sales'],
    ];
    const users = [];
    for (let i = 0; i < people.length; i++) {
      const [name, username, role] = people[i];
      if (Store.userByUsername(username)) { users.push(Store.userByUsername(username)); continue; }
      const salt = Store.uid();
      const iso = new Date(Date.now() - 20 * Smart.DAY).toISOString();
      users.push({ id: Store.uid(), name, username, role, salt, pass: await hashPw('nexttgen', salt), color: COLORS[i], createdAt: iso, updatedAt: iso });
    }
    const [R, A, P, K, N, T] = users;
    // [title, who, dayOffset, time, priority, status, tags, repeat]
    const rows = [
      ['Client demo: Heureux analytics dashboard', R, 0, '16:00', 'high', 'todo', ['client']],
      ['Fix OTP login bug on Android', A, 0, '13:00', 'high', 'progress', ['bug', 'mobile']],
      ['Daily standup notes', R, 0, '10:00', 'medium', 'done', ['team'], 'weekdays'],
      ['Onboarding screens v2 (Figma)', P, 0, '', 'medium', 'progress', ['design']],
      ['Regression test release 2.4', N, 0, '18:00', 'high', 'todo', ['qa', 'release']],
      ['Code review: payments module PR #142', K, 0, '12:00', 'medium', 'todo', ['review']],
      ['Update invoice API docs', A, -2, '', 'low', 'todo', ['docs']],
      ['Renew SSL certificate for staging', K, -1, '', 'high', 'todo', ['devops']],
      ['Sprint planning: Sprint 19', R, 1, '11:00', 'medium', 'todo', ['team']],
      ['Deploy staging build 2.4-rc1', K, 1, '17:00', 'high', 'todo', ['deploy']],
      ['Landing page hero illustrations', P, 1, '', 'medium', 'todo', ['design', 'web']],
      ['Write test cases: reports export', N, 1, '', 'medium', 'todo', ['qa']],
      ['Push notification research', A, 2, '', 'low', 'todo', ['research']],
      ['Client feedback call: NexttGen CRM', R, 2, '15:30', 'high', 'todo', ['client']],
      ['Dark mode QA pass', N, 2, '', 'medium', 'todo', ['qa']],
      ['Refactor auth middleware', K, 3, '', 'low', 'todo', ['backend']],
      ['Design system: button & input tokens', P, 3, '', 'medium', 'todo', ['design']],
      ['Performance audit: dashboard load time', A, 3, '', 'medium', 'todo', ['perf']],
      ['Weekly report to management', R, 4, '17:00', 'medium', 'todo', ['report'], 'weekly'],
      ['App store screenshots', P, 5, '', 'low', 'todo', ['mobile']],
      ['Set up GitHub Actions CI', K, 8, '', 'medium', 'todo', ['devops']],
      ['Bug bash: release 2.3', N, -3, '', 'high', 'done', ['qa']],
      ['Integrate Razorpay webhooks', A, -3, '', 'high', 'done', ['payment']],
      ['Wireframes: admin panel', P, -2, '', 'medium', 'done', ['design']],
      ['Database backup script', K, -2, '', 'medium', 'done', ['devops']],
      ['Client onboarding checklist', R, -1, '', 'medium', 'done', ['client']],
      ['Fix date picker timezone bug', A, -1, '', 'high', 'done', ['bug']],
      ['Smoke test hotfix 2.3.1', N, -1, '', 'high', 'done', ['qa']],
      ['Follow up with Heureux on proposal', T, 0, '11:30', 'high', 'todo', ['sales', 'client']],
      ['Prepare quotation: CRM project', T, 1, '', 'high', 'todo', ['sales']],
      ['Demo call with new lead', T, 2, '14:00', 'medium', 'todo', ['sales']],
      ['Update sales pipeline sheet', T, 4, '', 'low', 'todo', ['sales'], 'weekly'],
      ['Send renewal reminder to clients', T, -1, '', 'medium', 'done', ['sales']],
    ];
    const tasks = [];
    const activity = [];
    const at = (offset, h, m = 0) => { const d = addDays(new Date(), offset); d.setHours(h, m, 0, 0); return d.toISOString(); };
    const have = new Set(Store.tasks().map(t => t.title));
    rows.forEach(([title, u, off, time, priority, status, tags, repeat = ''], i) => {
      if (have.has(title)) return; // already loaded earlier
      const id = Store.uid() + i;
      const createdAt = at(Math.min(off, 0) - 2, 10, i);
      const completedAt = status === 'done' ? at(Math.min(off, 0), off === 0 ? 9 : 17, 30) : null;
      const updatedAt = completedAt || (status === 'progress' ? at(0, 9, 15) : createdAt);
      const creator = i % 3 === 0 ? R : u;
      tasks.push({ id, title, notes: '', assignee: u.id, due: ymd(addDays(new Date(), off)), time, priority, status, tags, remind: time ? '30' : '', repeat, createdBy: creator.id, createdAt, updatedAt, completedAt });
      activity.push({ id: Store.uid() + 'c' + i, at: createdAt, by: creator.id, type: 'created', taskId: id, title, to: creator.id !== u.id ? u.id : undefined });
      if (status === 'progress') activity.push({ id: Store.uid() + 'p' + i, at: updatedAt, by: u.id, type: 'started', taskId: id, title });
      if (completedAt) activity.push({ id: Store.uid() + 'd' + i, at: completedAt, by: u.id, type: 'completed', taskId: id, title });
    });
    users.filter(u => !Store.user(u.id)).forEach(u => activity.push({ id: Store.uid() + 'j' + u.id, at: u.createdAt, by: u.id, type: 'joined' }));
    Store.importData({ users, tasks, activity });
    toast(tasks.length ? `Demo data added (${plural(tasks.length, 'task')}). Login as <b>rohit</b> / <b>nexttgen</b>` : 'Demo data is already loaded.', tasks.length ? 'ok' : '');
  }

  /* =====================================================================
     EVENTS
     ===================================================================== */
  function quickPreview() {
    const input = $('#quickInput');
    const box = $('#quickPreview');
    const v = input.value.trim();
    if (!v || document.activeElement !== input) { box.innerHTML = ''; return; }
    const p = Smart.parseQuick(v, Store.users());
    const u = Store.user(p.assignee || S.me.id);
    box.innerHTML = `
      <span class="qp-title">${esc(p.title || '…')}</span>
      <span class="chip">${ic('calendar')}${p.due === today() ? 'Today' : fmtDay(p.due)}${p.defaultedDue ? ' <i>(default)</i>' : ''}</span>
      ${p.time ? `<span class="chip">${ic('clock')}${fmtTime(p.time)}</span>` : ''}
      <span class="chip">${avatar(u, 'xs')}${esc(first(u))}</span>
      <span class="chip pri-${p.priority}">${PRI[p.priority]}${p.autoPriority ? ' <i>(auto)</i>' : ''}</span>
      ${p.tags.map(x => `<span class="chip">#${esc(x)}</span>`).join('')}
      ${p.hints.map(h => `<span class="chip warn">${esc(h)}</span>`).join('')}
      <span class="qp-help">Try: today · tomorrow · kal · parso · fri · in 3 days · 15/10 · 5pm · @name · #tag · #high</span>`;
  }

  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-action],[data-nav],[data-who],[data-show],[data-day],[data-week],[data-hist],[data-hwho],[data-auth],[data-who-jump],[data-open-task],[data-overlay]');
    if (!el) return;

    if (el.hasAttribute('data-overlay')) { if (e.target === el) closeModal(); return; }
    if (el.dataset.auth) { S.authMode = el.dataset.auth; $$('#auth .form-err').forEach(p => { p.textContent = ''; }); renderAuth(); const first = $(`#${S.authMode}Form input`); if (first) first.focus(); return; }
    if (el.dataset.nav) { go(el.dataset.nav); return; }
    if (el.dataset.who !== undefined) { S.who = el.dataset.who; refresh(); return; }
    if (el.dataset.whoJump) { S.who = el.dataset.whoJump === S.me.id ? 'me' : el.dataset.whoJump; S.view = 'dashboard'; S.day = null; closeModal(); refresh(); return; }
    if (el.dataset.show) { S.show = el.dataset.show; refresh(); return; }
    if (el.dataset.day !== undefined) { S.day = el.dataset.day || null; refresh(); return; }
    if (el.dataset.week) { const n = Number(el.dataset.week); S.weekOffset = n === 0 ? 0 : S.weekOffset + n; refresh(); return; }
    if (el.dataset.hist) { S.histRange = Number(el.dataset.hist); refresh(); return; }
    if (el.dataset.hwho) { S.histWho = el.dataset.hwho; refresh(); return; }
    if (el.dataset.openTask) { e.preventDefault(); openTask(el.dataset.openTask); return; }

    const action = el.dataset.action;
    const taskEl = el.closest('[data-id]');
    const id = taskEl && taskEl.dataset.id;

    switch (action) {
      case 'toggle': toggleDone(id); break;
      case 'start': Store.updateTask(id, { status: 'progress' }, S.me.id, 'started'); toast('Marked in progress'); break;
      case 'edit': if (id) { closeModal(); openTask(id); } break;
      case 'new-task': openTask(null, { due: el.dataset.due || today(), assignee: S.who !== 'all' && S.who !== 'me' ? S.who : S.me.id }); break;
      case 'close-modal': closeModal(); break;
      case 'delete-task': {
        if (!el.dataset.confirm) { el.dataset.confirm = '1'; el.innerHTML = `${ic('trash')} Click again to delete`; return; }
        Store.removeTask($('#taskForm').dataset.id, S.me.id); closeModal(); toast('Task deleted'); break;
      }
      case 'apply-pri': $('#taskForm').elements.priority.value = el.dataset.pri; updateAiHint(); break;
      case 'rollover':
      case 'rollover-mine': {
        const t = today();
        const list = action === 'rollover'
          ? applyFilters(Store.tasks(), S.view === 'mine' ? { who: 'me' } : {}).filter(x => x.status !== 'done' && x.due && x.due < t)
          : Store.tasks().filter(x => x.assignee === S.me.id && x.status !== 'done' && x.due && x.due < t);
        list.forEach(x => Store.updateTask(x.id, { due: t }, S.me.id, 'moved', { note: '→ today (rollover)' }));
        toast(`Moved ${plural(list.length, 'task')} to today`, 'ok'); break;
      }
      case 'push-low': {
        const t = today(); const tm = ymd(addDays(new Date(), 1));
        const list = Store.tasks().filter(x => x.assignee === S.me.id && x.status !== 'done' && x.due === t && x.priority === 'low');
        list.forEach(x => Store.updateTask(x.id, { due: tm }, S.me.id, 'moved', { note: '→ tomorrow' }));
        toast(`Pushed ${plural(list.length, 'low-priority task')} to tomorrow`); break;
      }
      case 'standup': standupModal(); break;
      case 'copy-standup': {
        await navigator.clipboard.writeText($('#standupText').value).catch(() => {});
        toast('Standup copied. Paste it in your team group.', 'ok'); break;
      }
      case 'bell': bellModal(); break;
      case 'theme': {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        applyTheme(next); lsSet('ng.theme', next);
        $('#themeBtn').innerHTML = ic(next === 'dark' ? 'sun' : 'moon'); break;
      }
      case 'logout': logout(); break;
      case 'seed': await seedDemo(); if (S.me) refresh(); else renderAuth(); break;
      case 'open-sync':
        openModal(`<header class="m-head"><h2>${ic('cloud')} Connect team workspace</h2><button type="button" class="icon-btn sm" data-action="close-modal" aria-label="Close">${ic('x')}</button></header>
          <p class="muted">Ask whoever set up the workspace for the invite link, or enter the details. See README for the 3-minute setup.</p>${syncFormHtml()}`, 'wide');
        break;
      case 'disconnect': Store.clearConfig(); toast('Disconnected. Back to local mode.'); closeModal(); S.me ? refresh() : renderAuth(); break;
      case 'sync-now': await Store.sync(); toast(Store.status.state === 'error' ? `Sync failed: ${esc(Store.status.error)}` : 'Synced', Store.status.state === 'error' ? 'bad' : 'ok'); break;
      case 'copy-invite': {
        const c = Store.config;
        const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ owner: c.owner, repo: c.repo, branch: c.branch, path: c.path, token: c.token }))));
        const url = `${location.origin}${location.pathname}#join=${payload}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        toast('Invite link copied. Send it privately to teammates.', 'ok'); break;
      }
      case 'enable-notif': {
        const p = await Notification.requestPermission();
        toast(p === 'granted' ? 'Notifications on' : 'Notifications not allowed', p === 'granted' ? 'ok' : 'warn');
        if ($('#modal-root').innerHTML) bellModal(); else refresh(); break;
      }
      case 'test-notif': notify('NexttGen reminder', 'This is how task reminders will look.', 'test'); break;
      case 'export': {
        const blob = new Blob([JSON.stringify(Store.exportData(), null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `nexttgen-tasks-${today()}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000); break;
      }
      default: break;
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#modal-root').innerHTML) closeModal();
    if (e.key === 'Enter' && e.target.matches('[data-action="edit"]')) e.target.click();
    if (e.key === '/' && S.me && !e.target.matches('input,textarea,select')) { e.preventDefault(); $('#quickInput').focus(); }
  });

  document.addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'loginForm' || f.id === 'registerForm') return handleAuth(f);
    if (f.id === 'taskForm') return saveTaskForm(f);
    if (f.id === 'quickForm') {
      const input = $('#quickInput');
      const v = input.value.trim();
      if (!v) return;
      const p = Smart.parseQuick(v, Store.users());
      if (!p.title) return;
      Store.addTask({ title: p.title, due: p.due, time: p.time, priority: p.priority, tags: p.tags, assignee: p.assignee || S.me.id }, S.me.id);
      input.value = '';
      quickPreview();
      toast(`Added “${esc(p.title)}” · ${p.due === today() ? 'today' : fmtDay(p.due)}`, 'ok');
      return;
    }
    if (f.id === 'profileForm') {
      const d = Object.fromEntries(new FormData(f));
      Store.updateUser(S.me.id, { name: d.name.trim(), role: d.role, color: d.color || S.me.color });
      renderShell(); refresh(); toast('Profile saved', 'ok');
      return;
    }
    if (f.id === 'syncForm') {
      const d = Object.fromEntries(new FormData(f));
      const btn = f.querySelector('.btn.primary');
      btn.disabled = true; btn.textContent = 'Connecting…';
      await Store.setConfig({ owner: d.owner.trim(), repo: d.repo.trim(), branch: d.branch.trim() || 'main', path: d.path.trim() || 'data/db.json', token: d.token.trim() });
      if (Store.status.state === 'error') {
        btn.disabled = false; btn.innerHTML = `${ic('cloud')} Save & connect`;
        $('#syncErr', f).textContent = Store.status.error;
        return;
      }
      toast('Connected to team workspace', 'ok');
      closeModal();
      S.me ? refresh() : renderAuth();
    }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'quickInput') quickPreview();
    if (e.target.id === 'searchInput') {
      S.q = e.target.value;
      const pos = e.target.selectionStart;
      refresh();
      const s = $('#searchInput'); if (s) { s.focus(); s.setSelectionRange(pos, pos); }
    }
    if (e.target.form && e.target.form.id === 'taskForm' && e.target.name === 'title') updateAiHint();
    if (e.target.id === 'standupText') { const a = $('#waShare'); if (a) a.href = `https://wa.me/?text=${encodeURIComponent(e.target.value)}`; }
  });
  document.addEventListener('change', async e => {
    if (e.target.form && e.target.form.id === 'taskForm' && e.target.name === 'priority') updateAiHint();
    if (e.target.dataset && e.target.dataset.roleFor) {
      const u = Store.user(e.target.dataset.roleFor);
      Store.updateUser(u.id, { role: e.target.value });
      if (u.id === S.me.id) { renderShell(); refresh(); }
      toast(`${esc(first(u))} is now <b>${esc(e.target.value)}</b>`, 'ok');
      return;
    }
    if (e.target.id === 'importFile' && e.target.files[0]) {
      try {
        const obj = JSON.parse(await e.target.files[0].text());
        if (!Array.isArray(obj.tasks) || !Array.isArray(obj.users)) throw new Error('Not a NexttGen export');
        Store.importData(obj);
        toast(`Imported ${plural(obj.tasks.length, 'task')}`, 'ok');
      } catch (err) { toast(`Import failed: ${esc(err.message)}`, 'bad'); }
    }
  });
  document.addEventListener('focusin', e => { if (e.target.id === 'quickInput') quickPreview(); });
  document.addEventListener('focusout', e => {
    if (e.target.id === 'quickInput') setTimeout(quickPreview, 120);
    // a background sync arrived while the user was typing in a view form → render now
    if (S.pendingRender && !$('#modal-root').innerHTML && e.target.closest && e.target.closest('#view')) {
      setTimeout(() => { if (!$('#view').contains(document.activeElement) || !document.activeElement.matches('input,textarea,select')) { S.pendingRender = false; refresh(); } }, 50);
    }
  });

  /* ---------- store → UI ---------- */
  Store.subscribe(() => {
    if (!S.me) {
      if (!$('#auth').hidden) renderAuth();
      return;
    }
    updateChrome();
    const a = document.activeElement;
    const typing = a && $('#view') && $('#view').contains(a) && a.matches('input,textarea,select') && a.id !== 'searchInput';
    if (typing || $('#modal-root').innerHTML) { S.pendingRender = true; return; }
    refresh();
  });

  /* ---------- boot ---------- */
  function handleJoinLink() {
    const m = location.hash.match(/#join=([^&]+)/);
    if (!m) return false;
    try {
      const c = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
      history.replaceState(null, '', location.pathname + location.search);
      Store.setConfig(c);
      toast(`Joined team workspace <b>${esc(c.owner)}/${esc(c.repo)}</b>. Register or sign in.`, 'ok');
      return true;
    } catch { toast('That invite link is invalid.', 'bad'); return false; }
  }

  async function boot() {
    applyTheme(lsGet('ng.theme', null));
    const joined = handleJoinLink();
    Store.startAutoSync();
    if (Store.isRemote() && !joined) await Store.sync();
    const sid = Store.session.get();
    const u = sid && Store.user(sid);
    if (u) enterApp(u); else renderAuth();
    setInterval(() => { checkReminders(); if (S.me) updateChrome(); }, 30000);
  }

  boot();
})();
