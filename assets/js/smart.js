/* NexttGen Tasks — "smart" helpers. Pure functions, no data access, no API calls.
 * - parseQuick: natural-language quick add  ("Fix OTP bug tomorrow 5pm @priya #high")
 * - suggestPriority: keyword-based priority guess
 * - groupByDate: Overdue / Today / Tomorrow / next days / Later buckets
 * - focus / insights / standup: daily intelligence for the dashboard
 */
(function () {
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => ymd(new Date());
  const diffDays = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / DAY); // a − b in days
  const fmtDay = s => parseYmd(s).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtWeekday = s => parseYmd(s).toLocaleDateString('en-IN', { weekday: 'long' });
  const fmtTime = hm => { if (!hm) return ''; const [h, m] = hm.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`; };
  const first = u => (u ? u.name.split(' ')[0] : 'Someone');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const PRI_RANK = { high: 3, medium: 2, low: 1 };

  /* ---------- priority guess ---------- */
  const HIGH = /\b(urgent|asap|critical|prod(uction)?|hotfix|bug|fix|outage|down|client|deadline|release|deploy|payment|security|blocker|escalat\w*)\b/i;
  const LOW = /\b(read|research|explore|idea|someday|cleanup|clean up|refactor|docs?|learn|later|nice to have)\b/i;
  function suggestPriority(title) {
    if (HIGH.test(title)) return 'high';
    if (LOW.test(title)) return 'low';
    return 'medium';
  }

  /* ---------- natural-language quick add ---------- */
  const WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const WD_RE = /\s(?:on\s+|by\s+)?(?:next\s+)?(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)(?=\s)/i;

  function parseQuick(input, users = []) {
    let s = ` ${input.trim()} `;
    const out = { title: '', due: '', time: '', priority: '', assignee: '', tags: [], autoPriority: false, defaultedDue: false, hints: [] };
    const base = new Date();
    const take = (re, fn) => { s = s.replace(re, (...m) => { fn(m); return ' '; }); };

    take(/\s(!!!?|#urgent|#high|#p1)(?=\s)/i, () => { out.priority = 'high'; });
    take(/\s(#medium|#med|#p2)(?=\s)/i, () => { out.priority = 'medium'; });
    take(/\s(#low|#p3)(?=\s)/i, () => { out.priority = 'low'; });

    take(/\s@([\w.-]+)(?=\s)/, m => {
      const q = m[1].toLowerCase();
      const u = users.find(x => x.name.toLowerCase().split(' ')[0] === q) || users.find(x => x.name.toLowerCase().startsWith(q));
      if (u) out.assignee = u.id; else out.hints.push(`No member named “@${m[1]}”`);
    });
    take(/\s#([\w-]+)(?=\s)/g, m => { out.tags.push(m[1].toLowerCase()); });

    // time: 5pm, 5:30 pm, at 10am, 17:30
    take(/\s(?:at\s+)?(\d{1,2})(?::([0-5]\d))?\s*(am|pm)(?=\s)/i, m => {
      let h = Number(m[1]) % 12; if (m[3].toLowerCase() === 'pm') h += 12;
      out.time = `${pad(h)}:${m[2] || '00'}`;
    });
    if (!out.time) take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?=\s)/, m => { out.time = `${pad(Number(m[1]))}:${m[2]}`; });

    // dates (Hindi-friendly too: "parso" = day after tomorrow, "kal" = tomorrow)
    take(/\s(?:on\s+|by\s+)?(day after tomorrow|parso)(?=\s)/i, () => { out.due = ymd(addDays(base, 2)); });
    take(/\s(?:on\s+|by\s+)?(today|tonight|eod|aaj)(?=\s)/i, () => { out.due = ymd(base); });
    take(/\s(?:on\s+|by\s+)?(tomorrow|tmrw|tmr|kal)(?=\s)/i, () => { out.due = ymd(addDays(base, 1)); });
    take(/\sin\s+(\d{1,2})\s+days?(?=\s)/i, m => { out.due = ymd(addDays(base, Number(m[1]))); });
    take(/\s(?:by\s+)?next\s+week(?=\s)/i, () => { out.due = ymd(addDays(base, ((8 - base.getDay()) % 7) || 7)); });
    take(/\s(?:by\s+)?(?:end of week|eow)(?=\s)/i, () => { out.due = ymd(addDays(base, (5 - base.getDay() + 7) % 7)); });
    take(WD_RE, m => {
      const idx = WD.indexOf(m[1].slice(0, 3).toLowerCase());
      out.due = ymd(addDays(base, ((idx - base.getDay() + 7) % 7) || 7));
    });
    // dd/mm or dd-mm(-yyyy) — Indian date order
    take(/\s(?:on\s+|by\s+)?(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?(?=\s)/, m => {
      const d = Number(m[1]), mo = Number(m[2]) - 1;
      let y = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : base.getFullYear();
      let dt = new Date(y, mo, d);
      if (!m[3] && ymd(dt) < ymd(base)) dt = new Date(y + 1, mo, d);
      if (dt.getMonth() === mo) out.due = ymd(dt);
    });

    if (out.time && !out.due) {
      const nowHm = `${pad(base.getHours())}:${pad(base.getMinutes())}`;
      out.due = ymd(out.time > nowHm ? base : addDays(base, 1));
    }
    if (!out.due) { out.due = ymd(base); out.defaultedDue = true; }

    out.title = s.replace(/\s+(on|by|at|due)\s*$/i, ' ').replace(/\s+/g, ' ').trim();
    out.title = out.title.charAt(0).toUpperCase() + out.title.slice(1);
    if (!out.priority) { out.priority = suggestPriority(out.title); out.autoPriority = true; }
    return out;
  }

  /* ---------- date buckets ---------- */
  function sortTasks(a, b) {
    return (a.status === 'done') - (b.status === 'done')
      || (a.due || '9999').localeCompare(b.due || '9999')
      || (a.time || '99').localeCompare(b.time || '99')
      || PRI_RANK[b.priority] - PRI_RANK[a.priority];
  }
  function groupByDate(tasks, t = today()) {
    const g = {};
    const add = (key, label, sub, tone, rank) => (g[key] ||= { key, label, sub, tone, rank, items: [] }).items;
    for (const task of tasks) {
      if (!task.due) { add('nodate', 'No date', 'Unscheduled', 'muted', 9000).push(task); continue; }
      const d = diffDays(task.due, t);
      if (d < 0 && task.status !== 'done') add('overdue', 'Overdue', 'Needs attention', 'danger', -1000).push(task);
      else if (d < 0) add('past', 'Earlier', 'Completed before today', 'muted', 9500).push(task);
      else if (d === 0) add('today', 'Today', fmtDay(task.due), 'brand', 0).push(task);
      else if (d === 1) add('tomorrow', 'Tomorrow', fmtDay(task.due), 'info', 1).push(task);
      else if (d <= 6) add(task.due, fmtWeekday(task.due), fmtDay(task.due), '', d).push(task);
      else add('later', 'Later', 'Beyond this week', 'muted', 100).push(task);
    }
    const groups = Object.values(g).sort((a, b) => a.rank - b.rank);
    groups.forEach(x => x.items.sort(sortTasks));
    return groups;
  }

  /* ---------- focus: top tasks to do right now ---------- */
  function score(task, t) {
    if (task.status === 'done') return -1;
    let s = { high: 30, medium: 15, low: 5 }[task.priority] || 10;
    if (task.due) {
      const d = diffDays(task.due, t);
      if (d < 0) s += 40 + Math.min(-d, 10) * 2;
      else if (d === 0) s += 30;
      else if (d === 1) s += 15;
      else if (d <= 3) s += 8;
    }
    if (task.status === 'progress') s += 10;
    return s;
  }
  function focus(tasks, me, n = 3) {
    const t = today();
    return tasks.filter(x => x.assignee === me && x.status !== 'done')
      .map(x => {
        const d = x.due ? diffDays(x.due, t) : null;
        const why = d !== null && d < 0 ? `${plural(-d, 'day')} overdue`
          : d === 0 ? (x.time ? `Due today ${fmtTime(x.time)}` : 'Due today')
          : x.status === 'progress' ? 'Already in progress'
          : x.priority === 'high' ? 'High priority'
          : d === 1 ? 'Due tomorrow' : d !== null ? `Due ${fmtDay(x.due)}` : 'No date set';
        return { task: x, score: score(x, t), why };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
  }

  /* ---------- insights ---------- */
  function streak(tasks, me) {
    const days = new Set(tasks.filter(x => x.assignee === me && x.completedAt).map(x => ymd(new Date(x.completedAt))));
    let d = new Date();
    if (!days.has(ymd(d))) d = addDays(d, -1);
    let n = 0;
    while (days.has(ymd(d))) { n++; d = addDays(d, -1); }
    return n;
  }

  function insights(users, tasks, me) {
    const out = [];
    const t = today();
    const open = tasks.filter(x => x.status !== 'done');
    const mine = open.filter(x => x.assignee === me);
    const myOver = mine.filter(x => x.due && x.due < t);
    const myToday = mine.filter(x => x.due === t);

    if (myOver.length) {
      const oldest = Math.max(...myOver.map(x => -diffDays(x.due, t)));
      out.push({ icon: 'alert', tone: 'danger', text: `You have ${plural(myOver.length, 'overdue task')}. The oldest is ${plural(oldest, 'day')} late.`, action: { id: 'rollover-mine', label: 'Move all to today' } });
    }
    if (myToday.length >= 6) {
      out.push({ icon: 'alert', tone: 'warn', text: `Heavy day: ${myToday.length} tasks due today. Push the low-priority ones to tomorrow?`, action: { id: 'push-low', label: 'Push low → tomorrow' } });
    } else if (!myToday.length && !myOver.length) {
      out.push({ icon: 'target', tone: 'ok', text: 'Nothing due today for you. Good moment to pull something forward from later this week.' });
    }

    let busiest = null;
    for (let i = 1; i <= 4; i++) {
      const d = ymd(addDays(new Date(), i));
      const n = open.filter(x => x.due === d).length;
      if (!busiest || n > busiest.n) busiest = { d, n };
    }
    if (busiest && busiest.n >= 5) out.push({ icon: 'calendar', tone: 'warn', text: `${fmtWeekday(busiest.d)} looks busy: ${busiest.n} team tasks due. Spread some out early.` });

    const load = users.map(u => ({ u, n: open.filter(x => x.assignee === u.id).length })).sort((a, b) => b.n - a.n);
    if (load.length >= 2) {
      const hi = load[0], lo = load[load.length - 1];
      if (hi.n - lo.n >= 4) out.push({ icon: 'users', tone: 'info', text: `${first(hi.u)} has ${hi.n} open tasks while ${first(lo.u)} has ${lo.n}. Consider rebalancing.` });
    }

    const stale = open.filter(x => x.status === 'progress' && Date.now() - Date.parse(x.updatedAt) > 3 * DAY);
    if (stale.length) out.push({ icon: 'clock', tone: 'warn', text: `${plural(stale.length, 'task')} stuck “In progress” for 3+ days without an update.` });

    const ts = Date.now();
    const w0 = tasks.filter(x => x.completedAt && ts - Date.parse(x.completedAt) < 7 * DAY).length;
    const w1 = tasks.filter(x => x.completedAt && ts - Date.parse(x.completedAt) >= 7 * DAY && ts - Date.parse(x.completedAt) < 14 * DAY).length;
    if (w0 || w1) {
      const pct = w1 ? Math.round(((w0 - w1) / w1) * 100) : null;
      out.push({ icon: 'trend', tone: w0 >= w1 ? 'ok' : 'info', text: pct === null || pct === 0
        ? `Team closed ${plural(w0, 'task')} in the last 7 days.`
        : `Team closed ${plural(w0, 'task')} in the last 7 days, ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% on the week before.` });
    }

    const st = streak(tasks, me);
    if (st >= 2) out.push({ icon: 'fire', tone: 'ok', text: `${st}-day streak: you've closed at least one task every day.` });

    return out.slice(0, 5);
  }

  /* ---------- standup ---------- */
  function standup(tasks, user) {
    const t = today();
    const mine = tasks.filter(x => x.assignee === user.id);
    let prevDone = [];
    let label = 'Yesterday';
    for (let i = 1; i <= 4 && !prevDone.length; i++) {
      const d = ymd(addDays(new Date(), -i));
      prevDone = mine.filter(x => x.completedAt && ymd(new Date(x.completedAt)) === d);
      if (prevDone.length && i > 1) label = `Last working day (${fmtDay(d)})`;
    }
    const doneToday = mine.filter(x => x.completedAt && ymd(new Date(x.completedAt)) === t);
    const plan = mine.filter(x => x.status !== 'done' && ((x.due && x.due <= t) || x.status === 'progress')).sort(sortTasks);
    const blockers = plan.filter(x => x.due && x.due < t);
    const line = x => `• ${x.title}${x.time && x.due === t ? ` (${fmtTime(x.time)})` : ''}`;

    return [
      `*Standup — ${user.name} — ${fmtDay(t)}*`,
      '',
      `*${label}:*`,
      ...(prevDone.length ? prevDone.map(line) : ['• —']),
      ...(doneToday.length ? ['', '*Already done today:*', ...doneToday.map(line)] : []),
      '',
      '*Today:*',
      ...(plan.length ? plan.map(x => `${line(x)}${x.status === 'progress' ? ' [in progress]' : ''}`) : ['• Planning / picking up new work']),
      '',
      '*Blockers / overdue:*',
      ...(blockers.length ? blockers.map(x => `• ${x.title} — ${plural(-diffDays(x.due, t), 'day')} late`) : ['• None']),
    ].join('\n');
  }

  /* ---------- repeating tasks ---------- */
  function nextOccurrence(task) {
    const base = parseYmd(task.due || today());
    let d;
    if (task.repeat === 'daily') d = addDays(base, 1);
    else if (task.repeat === 'weekdays') { d = addDays(base, 1); while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1); }
    else if (task.repeat === 'weekly') d = addDays(base, 7);
    else if (task.repeat === 'monthly') { d = new Date(base); d.setMonth(d.getMonth() + 1); }
    else return null;
    // never schedule the next copy in the past
    while (ymd(d) < today()) d = task.repeat === 'monthly' ? new Date(d.setMonth(d.getMonth() + 1)) : addDays(d, task.repeat === 'weekly' ? 7 : 1);
    return ymd(d);
  }

  window.Smart = {
    DAY, pad, ymd, parseYmd, addDays, today, diffDays, fmtDay, fmtWeekday, fmtTime, plural, first,
    PRI_RANK, suggestPriority, parseQuick, groupByDate, sortTasks, focus, insights, streak, standup, nextOccurrence,
  };
})();
