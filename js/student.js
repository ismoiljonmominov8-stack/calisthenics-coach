import {
  sb, t, h, toast, field, busy, normalizePhone, fmtPhone, loginEmail, todayStr, addDays, isoWeekday,
  daysLeft, fmtDate, fmtLongToday, accessState, errText, mediaEl, barChart, lastNDays, langThemeControls, setLang, getLang,
} from './common.js';
import { WARN_DAYS } from './config.js';

const app = document.getElementById('app');
let me = null;       // auth user
let profile = null;  // profiles row
let levels = [];
let touched = false;

const userErr = (m) => Object.assign(new Error(m), { user: true });
const spinner = () => h('div', { class: 'spinner', 'aria-label': t('loading') });
const setView = (...nodes) => { app.replaceChildren(...nodes.filter(Boolean)); window.scrollTo(0, 0); };

/* ------------------------------------------------------------------ */
async function boot() {
  setView(spinner());
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return renderAuth('login');
  me = session.user;
  await loadProfile();
  route();
}

async function loadProfile() {
  const [{ data: p, error }, { data: lv }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', me.id).maybeSingle(),
    sb.from('levels').select('*').order('sort_order').order('created_at'),
  ]);
  if (error) toast(errText(error), 'err');
  profile = p; levels = lv || [];
  if (profile && !localStorage.getItem('cc-lang')) setLang(profile.lang || 'uz');
}

const levelName = (id) => levels.find((l) => l.id === id)?.name || t('noLevel');

function route() {
  if (!profile) return renderAuth('login');
  const st = accessState(profile);
  if (st === 'coach') return renderCoachNotice();
  if (st !== 'active') return renderStatus(st);
  if (!touched) { touched = true; sb.rpc('touch_activity'); }
  const v = location.hash.slice(1);
  if (v === 'daily') return renderTasks('daily');
  if (v === 'progress') return renderProgress();
  if (v === 'trainer') return renderTasks('extra');
  if (v === 'settings') return renderSettings();
  if (v === 'technique') return renderTechnique();
  renderHome();
}
window.addEventListener('hashchange', () => profile && route());
sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') { profile = null; me = null; renderAuth('login'); } });

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */
function topbar(extra) {
  return h('div', { class: 'topbar' },
    h('div', { class: 'brand' }, h('div', { class: 'logo' }, 'C'), t('appName')),
    extra || null);
}

function renderAuth(mode) {
  const { langSel } = langThemeControls(() => renderAuth(mode));
  const phone = h('input', { type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '+998 90 123 45 67', required: true });
  const pw = h('input', { type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password', required: true, minlength: 6 });
  const err = h('p', { class: 'small', style: 'color:var(--danger);min-height:1.2em;margin:0' });
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, mode === 'login' ? t('login') : t('sendRequest'));

  let extra = [];
  const f = {};
  if (mode === 'signup') {
    f.name = h('input', { autocomplete: 'name', required: true });
    f.year = h('input', { type: 'number', inputmode: 'numeric', min: 1940, max: new Date().getFullYear() - 4, placeholder: '2005', required: true });
    f.height = h('input', { type: 'number', inputmode: 'decimal', min: 80, max: 230, placeholder: '175', required: true });
    f.weight = h('input', { type: 'number', inputmode: 'decimal', min: 20, max: 250, step: '0.1', placeholder: '70', required: true });
    f.pw2 = h('input', { type: 'password', autocomplete: 'new-password', required: true });
    extra = [field(t('fullName'), f.name), field(t('phone'), phone),
      h('div', { class: 'grid2' }, field(t('birthYear'), f.year), field(t('height'), f.height)),
      field(t('weight'), f.weight), field(t('password'), pw), field(t('password2'), f.pw2)];
  } else {
    extra = [field(t('phone'), phone), field(t('password'), pw)];
  }

  const form = h('form', { class: 'stack', onsubmit: async (e) => {
    e.preventDefault(); err.textContent = '';
    const ph = normalizePhone(phone.value);
    if (!ph) { err.textContent = t('badPhone'); return; }
    if (pw.value.length < 6) { err.textContent = t('pwShort'); return; }
    busy(btn, true);
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: loginEmail(ph), password: pw.value });
        if (error) throw error;
      } else {
        if (pw.value !== f.pw2.value) throw userErr(t('pwMismatch'));
        if (!f.name.value.trim() || !f.year.value || !f.height.value || !f.weight.value) throw userErr(t('fillAll'));
        const { data, error } = await sb.auth.signUp({
          email: loginEmail(ph), password: pw.value,
          options: { data: { full_name: f.name.value.trim(), phone: ph, birth_year: f.year.value, height_cm: f.height.value, weight_kg: f.weight.value, lang: getLang() } },
        });
        if (error) throw error;
        if (!data.session) throw userErr(t('setupError'));
      }
      boot();
    } catch (e2) {
      err.textContent = e2.user ? e2.message : errText(e2);
    } finally { busy(btn, false); }
  } }, ...extra, err, btn);

  setView(
    topbar(langSel),
    h('div', { class: 'auth' },
      h('h1', {}, mode === 'login' ? t('login') : t('signup')),
      h('div', { class: 'card stack' }, form),
      h('p', { class: 'small', style: 'text-align:center;margin-top:16px' },
        h('a', { href: '#', onclick: (e) => { e.preventDefault(); renderAuth(mode === 'login' ? 'signup' : 'login'); } },
          mode === 'login' ? t('noAccount') : t('haveAccount')))));
}

/* The coach opened the student link: explain instead of redirecting silently */
function renderCoachNotice() {
  setView(
    topbar(),
    h('div', { class: 'auth' },
      h('div', { class: 'card stack', style: 'text-align:center' },
        h('div', { style: 'font-size:2.6rem' }, '🧑‍🏫'),
        h('h2', {}, t('coachLoggedIn')),
        h('p', { class: 'muted' }, t('coachLoggedInText')),
        h('a', { class: 'btn primary block', href: 'coach.html' }, t('coachPanel')),
        h('button', { class: 'btn block', onclick: () => sb.auth.signOut() }, t('logout')))));
}

/* ------------------------------------------------------------------ */
/* Pending / expired / cancelled / rejected                             */
/* ------------------------------------------------------------------ */
function renderStatus(st) {
  const map = { pending: ['pendingTitle', 'pendingText', '⏳'], rejected: ['rejectedTitle', 'rejectedText', '✋'],
    expired: ['expiredTitle', 'expiredText', '⌛'], cancelled: ['cancelledTitle', 'cancelledText', '⏸'] };
  const [title, text, icon] = map[st] || map.pending;
  const canRenew = st === 'expired' || st === 'cancelled';
  const sent = !!profile.renewal_requested_at;
  const renewBtn = canRenew ? h('button', { class: 'btn primary block', disabled: sent, onclick: async (e) => {
    busy(e.target, true);
    const { error } = await sb.rpc('request_renewal');
    if (error) { toast(errText(error), 'err'); busy(e.target, false); return; }
    await loadProfile(); renderStatus(st); toast(t('renewalSent'));
  } }, sent ? t('renewalSent') : t('requestRenewal')) : null;

  setView(
    topbar(h('button', { class: 'btn small ghost', onclick: () => sb.auth.signOut() }, t('logout'))),
    h('div', { class: 'auth' },
      h('div', { class: 'card stack', style: 'text-align:center' },
        h('div', { style: 'font-size:2.6rem' }, icon),
        h('h2', {}, t(title)),
        h('p', { class: 'muted' }, t(text)),
        h('p', { class: 'small' }, profile.full_name, ' · ', fmtPhone(profile.phone)),
        renewBtn,
        h('button', { class: 'btn block', onclick: async (e) => { busy(e.target, true); await loadProfile(); route(); } }, t('checkAgain')))));
}

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */
function daysBadge() {
  const n = daysLeft(profile.access_until);
  const cls = n <= WARN_DAYS ? 'badge warn' : 'badge ok';
  return h('span', { class: cls }, n <= 1 ? t('lastDay') : t('daysLeft', { n }));
}

function renderHome() {
  const n = daysLeft(profile.access_until);
  const tile = (hash, icon, title, sub) => h('button', { class: 'tile', onclick: () => { location.hash = hash; } },
    h('div', { class: 'ic', 'aria-hidden': 'true' }, icon), h('div', {}, h('b', {}, title), h('span', {}, sub)));
  setView(
    topbar(daysBadge()),
    h('section', { class: 'hero' },
      h('div', { class: 'muted small' }, fmtLongToday()),
      h('h1', { style: 'margin:4px 0 0' }, t('hello', { name: profile.full_name.split(' ')[0] })),
      h('span', { class: 'lvl' }, `${t('level')}: ${levelName(profile.level_id)}`)),
    n <= WARN_DAYS ? h('div', { class: 'banner warn', style: 'margin-bottom:14px' }, t('expiresSoon', { n: Math.max(n, 0) })) : null,
    h('nav', { class: 'tiles' },
      tile('daily', '🔥', t('dailyTasks'), t('dailyTasksSub')),
      tile('progress', '📈', t('progress'), t('progressSub')),
      tile('trainer', '🎯', t('trainerTasks'), t('trainerTasksSub')),
      tile('technique', '🦴', t('technique'), t('techniqueSub')),
      tile('settings', '⚙️', t('settings'), t('settingsSub'))));
}

function renderTechnique() {
  const item = (href, title, sub) => h('a', { class: 'card tile', href, style: 'text-decoration:none;color:inherit' },
    h('div', { class: 'ic', 'aria-hidden': 'true' }, '🦴'), h('div', {}, h('b', {}, title), h('span', {}, sub)));
  setView(
    viewHead(t('technique')),
    h('p', { class: 'muted small', style: 'margin:0 0 12px' }, t('techniqueIntro')),
    h('nav', { class: 'tiles' },
      item('technique/push-up.html', t('pushupAtlas'), t('pushupAtlasSub')),
      item('technique/pull-up.html', t('pullupAtlas'), t('pullupAtlasSub')),
      item('technique/planche.html', t('plancheAtlas'), t('plancheAtlasSub')),
      item('technique/front-lever.html', t('fleverAtlas'), t('fleverAtlasSub')),
      item('technique/muscle-up.html', t('muAtlas'), t('muAtlasSub'))));
}

function viewHead(title) {
  return h('div', { class: 'viewhead' },
    h('button', { class: 'icon-btn', 'aria-label': t('back'), onclick: () => { location.hash = ''; } }, '←'),
    h('h2', {}, title));
}

/* ------------------------------------------------------------------ */
/* Daily tasks + Trainer tasks                                          */
/* ------------------------------------------------------------------ */
function suggestReps(task) {
  const r = parseInt(task.reps, 10);
  return Number.isFinite(r) && /^\d+$/.test(String(task.reps).trim()) ? r * (task.sets || 1) : '';
}

function taskCard(task, kind, log, onSaved) {
  const reps = h('input', { type: 'number', inputmode: 'numeric', min: 0, value: log ? log.reps_done : suggestReps(task), 'aria-label': t('repsDone') });
  const note = h('input', { type: 'text', placeholder: t('noteOpt'), value: log?.note || '' });
  const status = h('div', { class: 'small', style: 'color:var(--ok);font-weight:700' }, log ? `✓ ${t('doneToday', { n: log.reps_done })}` : '');
  const btn = h('button', { class: `btn ${log ? '' : 'primary'}` }, log ? t('update') : t('done'));
  const card = h('article', { class: `card task ${log ? 'done' : ''}` },
    mediaEl(task.media_url, task.media_type),
    h('div', { class: 'row between' },
      h('h3', { style: 'margin:0' }, task.name),
      h('span', { class: 'badge accent' }, `${task.sets} ${t('sets')} × ${task.reps}`)),
    task.note ? h('p', { class: 'muted small', style: 'margin:0' }, task.note) : null,
    field(t('repsDone'), h('div', { class: 'logrow' }, reps, btn)),
    note, status);

  btn.addEventListener('click', async () => {
    const value = Math.max(0, parseInt(reps.value, 10) || 0);
    busy(btn, true);
    const { error } = await sb.from('workout_logs').upsert({
      student_id: me.id, task_kind: kind, task_id: task.id, exercise_name: task.name,
      log_date: todayStr(), reps_done: value, note: note.value.trim(), updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,task_kind,task_id,log_date' });
    busy(btn, false);
    if (error) return toast(errText(error), 'err');
    card.classList.add('done'); btn.classList.remove('primary'); btn.textContent = t('update');
    status.textContent = `✓ ${t('doneToday', { n: value })}`;
    toast(t('saved'));
    onSaved && onSaved();
  });
  return card;
}

async function renderTasks(kind) {
  const title = kind === 'daily' ? t('dailyTasks') : t('trainerTasks');
  setView(viewHead(title), spinner());
  const today = todayStr();
  const tasksQ = kind === 'daily'
    ? sb.from('exercises').select('*').order('sort_order').order('created_at')
    : sb.from('extra_tasks').select('*').lte('start_date', today).gte('end_date', today).order('created_at');
  const [{ data: tasks, error }, { data: logs }] = await Promise.all([
    tasksQ, sb.from('workout_logs').select('*').eq('task_kind', kind).eq('log_date', today),
  ]);
  if (error) { toast(errText(error), 'err'); return; }
  const wd = isoWeekday(today);
  const list = kind === 'daily' ? (tasks || []).filter((x) => !x.days || !x.days.length || x.days.includes(wd)) : (tasks || []);
  const logOf = (id) => (logs || []).find((l) => l.task_id === id);

  if (!list.length) {
    setView(viewHead(title), h('div', { class: 'card empty' }, kind === 'daily' ? t('noTasksToday') : t('noTrainerTasks')));
    return;
  }
  const bar = h('i', { style: 'width:0%' });
  const label = h('span', { class: 'small muted' });
  const refresh = () => {
    const doneN = app.querySelectorAll('.task.done').length;
    bar.style.width = `${Math.round((doneN / list.length) * 100)}%`;
    label.textContent = t('tasksDone', { a: doneN, b: list.length });
  };
  let body;
  if (kind === 'daily') {
    body = list.map((x) => taskCard(x, kind, logOf(x.id), refresh));
  } else {
    const groups = [['day', t('periodDay')], ['week', t('periodWeek')], ['month', t('periodMonth')]];
    body = groups.map(([p, name]) => {
      const items = list.filter((x) => x.period === p);
      if (!items.length) return null;
      return h('section', { class: 'stack' },
        h('h3', { style: 'margin:8px 0 0' }, name),
        items.map((x) => {
          const c = taskCard(x, kind, logOf(x.id), refresh);
          if (p !== 'day') c.insertBefore(h('span', { class: 'badge' }, t('until', { d: fmtDate(x.end_date) })), c.children[1]);
          return c;
        }));
    });
  }
  setView(viewHead(title),
    h('div', { class: 'stack', style: 'margin-bottom:14px' }, label, h('div', { class: 'progressbar' }, bar)),
    h('div', { class: 'stack' }, body));
  refresh();
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */
async function renderProgress() {
  setView(viewHead(t('progress')), spinner());
  const today = todayStr();
  const [stats, logs, results, outcomes, upcoming] = await Promise.all([
    sb.rpc('my_stats'),
    sb.from('workout_logs').select('log_date,reps_done').gte('log_date', addDays(today, -13)),
    sb.from('test_results').select('value,test_id,test_exercise_id,test_exercises(name,target),tests(title,test_date)'),
    sb.from('test_outcomes').select('*'),
    sb.from('tests').select('*,test_exercises(*)').gte('test_date', today).eq('status', 'upcoming').order('test_date'),
  ]);
  const s = (stats.data && stats.data[0]) || { total_reps: 0, reps_7d: 0, days_30d: 0 };
  const lvl = levels.find((l) => l.id === profile.level_id);

  // latest tests: group results by test
  const byTest = {};
  for (const r of results.data || []) {
    const k = r.test_id;
    byTest[k] = byTest[k] || { title: r.tests?.title || '—', date: r.tests?.test_date || '', rows: [] };
    byTest[k].rows.push(r);
  }
  const latest = Object.entries(byTest).sort((a, b) => (b[1].date > a[1].date ? 1 : -1)).slice(0, 3);
  const outcomeOf = (id) => (outcomes.data || []).find((o) => o.test_id === id);

  setView(
    viewHead(t('progress')),
    h('div', { class: 'stack' },
      h('section', { class: 'hero', style: 'margin:0' },
        h('div', { class: 'muted small' }, t('level')),
        h('h2', { style: 'margin:2px 0 4px' }, lvl ? lvl.name : t('noLevel')),
        lvl && lvl.description ? h('p', { class: 'muted small', style: 'margin:0' }, lvl.description) : null),
      h('div', { class: 'stats' },
        h('div', { class: 'stat' }, h('b', {}, s.total_reps), h('span', {}, t('totalReps'))),
        h('div', { class: 'stat' }, h('b', {}, s.reps_7d), h('span', {}, t('week'))),
        h('div', { class: 'stat' }, h('b', {}, s.days_30d), h('span', {}, t('trainDays')))),
      h('section', { class: 'card' }, h('h3', {}, t('last14')), barChart(lastNDays(logs.data || [], 14))),
      h('section', { class: 'card stack' },
        h('h3', { style: 'margin:0' }, t('upcomingTests')),
        (upcoming.data || []).length ? upcoming.data.map((ts) => h('div', { class: 'stack', style: 'border-top:1px solid var(--line);padding-top:10px' },
          h('div', { class: 'row between' }, h('b', {}, ts.title), h('span', { class: 'badge warn' }, fmtDate(ts.test_date))),
          ts.note ? h('p', { class: 'small muted', style: 'margin:0' }, ts.note) : null,
          (ts.test_exercises || []).sort((a, b) => a.sort_order - b.sort_order).map((x) => h('div', { class: 'exrow' },
            mediaEl(x.media_url, x.media_type, 'thumb') || h('div', { class: 'thumb' }),
            h('div', {}, h('b', {}, x.name), h('div', { class: 'small muted' }, `${t('target')}: ${x.target}`)), h('span'))))) :
          h('p', { class: 'muted', style: 'margin:0' }, t('noTests'))),
      h('section', { class: 'card stack' },
        h('h3', { style: 'margin:0' }, t('latestTests')),
        latest.length ? latest.map(([id, g]) => {
          const o = outcomeOf(id);
          return h('div', { class: 'stack', style: 'border-top:1px solid var(--line);padding-top:10px;gap:6px' },
            h('div', { class: 'row between' }, h('b', {}, `${g.title} · ${fmtDate(g.date)}`),
              o ? h('span', { class: o.passed ? 'badge ok' : 'badge danger' }, o.promoted ? t('promoted') : (o.passed ? t('passed') : t('notPassed'))) : null),
            h('table', {}, h('tbody', {}, g.rows.map((r) => h('tr', {},
              h('td', {}, r.test_exercises?.name || '—'),
              h('td', { class: 'num muted' }, `${t('target')}: ${r.test_exercises?.target ?? ''}`),
              h('td', { class: 'num' }, h('b', {}, r.value ?? '—')))))));
        }) : h('p', { class: 'muted', style: 'margin:0' }, t('noTests')))));
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
async function renderSettings() {
  const { langSel, themeSel } = langThemeControls(async () => {
    await sb.rpc('update_my_profile', { p_height: profile.height_cm, p_weight: profile.weight_kg, p_lang: getLang() });
    renderSettings();
  });

  // my data
  const hIn = h('input', { type: 'number', inputmode: 'decimal', value: profile.height_cm ?? '' });
  const wIn = h('input', { type: 'number', inputmode: 'decimal', step: '0.1', value: profile.weight_kg ?? '' });
  const saveData = h('button', { class: 'btn', onclick: async () => {
    busy(saveData, true);
    const { error } = await sb.rpc('update_my_profile', { p_height: hIn.value || null, p_weight: wIn.value || null, p_lang: getLang() });
    busy(saveData, false);
    if (error) return toast(errText(error), 'err');
    profile.height_cm = hIn.value; profile.weight_kg = wIn.value; toast(t('saved'));
  } }, t('save'));

  // password
  const p1 = h('input', { type: 'password', autocomplete: 'new-password' });
  const p2 = h('input', { type: 'password', autocomplete: 'new-password' });
  const savePw = h('button', { class: 'btn', onclick: async () => {
    if (p1.value.length < 6) return toast(t('pwShort'), 'err');
    if (p1.value !== p2.value) return toast(t('pwMismatch'), 'err');
    busy(savePw, true);
    const { error } = await sb.auth.updateUser({ password: p1.value });
    busy(savePw, false);
    if (error) return toast(errText(error), 'err');
    p1.value = p2.value = ''; toast(t('saved'));
  } }, t('save'));

  // phone
  const ph = h('input', { type: 'tel', inputmode: 'tel', placeholder: fmtPhone(profile.phone) });
  const savePh = h('button', { class: 'btn', onclick: async () => {
    const n = normalizePhone(ph.value);
    if (!n) return toast(t('badPhone'), 'err');
    busy(savePh, true);
    const { error } = await sb.rpc('change_my_phone', { p_phone: n, p_email: loginEmail(n) });
    busy(savePh, false);
    if (error) return toast(errText(error), 'err');
    profile.phone = n; ph.value = ''; ph.placeholder = fmtPhone(n); toast(t('saved'));
  } }, t('save'));

  // skip a day
  const sd = h('input', { type: 'date', value: todayStr(), min: todayStr() });
  const sr = h('textarea', { placeholder: t('skipReason'), maxlength: 500 });
  const skipList = h('div', { class: 'stack', style: 'gap:6px' });
  const loadSkips = async () => {
    const { data } = await sb.from('skip_requests').select('*').order('created_at', { ascending: false }).limit(10);
    skipList.replaceChildren(...(data || []).map((s) => h('div', { class: 'row between small', style: 'border-top:1px solid var(--line);padding-top:6px' },
      h('span', {}, h('b', {}, fmtDate(s.skip_date)), ' — ', s.reason),
      h('span', { class: s.seen ? 'badge ok' : 'badge' }, s.seen ? t('seenByCoach') : t('notSeen')))));
  };
  const sendSkip = h('button', { class: 'btn primary', onclick: async () => {
    if (!sr.value.trim()) return toast(t('fillAll'), 'err');
    busy(sendSkip, true);
    const { error } = await sb.from('skip_requests').insert({ student_id: me.id, skip_date: sd.value, reason: sr.value.trim() });
    busy(sendSkip, false);
    if (error) return toast(errText(error), 'err');
    sr.value = ''; toast(t('skipSent')); loadSkips();
  } }, t('send'));

  setView(
    viewHead(t('settings')),
    h('div', { class: 'stack' },
      h('section', { class: 'card stack' },
        h('div', { class: 'row between' }, h('b', {}, t('theme')), themeSel),
        h('div', { class: 'row between' }, h('b', {}, t('language')), langSel)),
      h('section', { class: 'card stack' },
        h('h3', { style: 'margin:0' }, t('skipDay')),
        field(t('skipDate'), sd), field(t('skipReason'), sr), sendSkip,
        h('div', { class: 'small muted' }, t('mySkips')), skipList),
      h('section', { class: 'card stack' },
        h('h3', { style: 'margin:0' }, t('myData')),
        h('p', { class: 'small muted', style: 'margin:0' }, profile.full_name, ' · ', fmtPhone(profile.phone)),
        h('div', { class: 'grid2' }, field(t('height'), hIn), field(t('weight'), wIn)), saveData),
      h('section', { class: 'card stack' },
        h('h3', { style: 'margin:0' }, t('changePassword')),
        field(t('newPassword'), p1), field(t('password2'), p2), savePw),
      h('section', { class: 'card stack' },
        h('h3', { style: 'margin:0' }, t('changePhone')),
        field(t('newPhone'), ph), savePh),
      h('button', { class: 'btn danger block', onclick: () => sb.auth.signOut() }, t('logout'))));
  loadSkips();
}

boot();
