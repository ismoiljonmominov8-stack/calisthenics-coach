import {
  sb, t, h, toast, modal, confirmBox, field, busy, normalizePhone, fmtPhone, loginEmail, todayStr, addDays,
  daysLeft, fmtDate, ago, ageOf, accessState, errText, mediaEl, uploadMedia, barChart, lastNDays,
  langThemeControls, getLang, WEEKDAYS,
} from './common.js';
import { WARN_DAYS } from './config.js';

const root = document.getElementById('root');
let me = null;
let coach = null;
let levels = [];
let students = [];
let stats = {};
let unseenSkips = 0;
let section = localStorage.getItem('cc-section') || 'students';
let mainEl = null;
let navEl = null;

const spinner = () => h('div', { class: 'spinner', 'aria-label': t('loading') });
const levelName = (id) => levels.find((l) => l.id === id)?.name || '—';
const studentName = (id) => students.find((s) => s.id === id)?.full_name || '—';
const pendingList = () => students.filter((s) => s.status === 'pending');
const renewalList = () => students.filter((s) => s.renewal_requested_at && (s.status === 'active' || s.status === 'cancelled'));
const fail = (e) => { toast(errText(e), 'err'); return false; };

const STATUS_BADGE = {
  active: 'badge ok', expired: 'badge danger', pending: 'badge warn', cancelled: 'badge', rejected: 'badge',
};
const statusBadge = (s) => {
  const st = accessState(s);
  const soon = st === 'active' && daysLeft(s.access_until) <= WARN_DAYS;
  return h('span', { class: soon ? 'badge warn' : STATUS_BADGE[st] || 'badge' }, t(st));
};

/* ------------------------------------------------------------------ */
/* Boot + login                                                         */
/* ------------------------------------------------------------------ */
async function boot() {
  root.replaceChildren(spinner());
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return renderLogin();
  me = session.user;
  const { data: p } = await sb.from('profiles').select('*').eq('id', me.id).maybeSingle();
  if (!p || p.role !== 'coach') return renderLogin(t('notCoach'));
  coach = p;
  await loadBase();
  renderShell();
  setInterval(async () => { await loadBase(); updateBadges(); }, 60000);
}

function renderLogin(msg = '') {
  const { langSel } = langThemeControls(() => renderLogin(msg));
  const phone = h('input', { type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '+998 90 123 45 67' });
  const pw = h('input', { type: 'password', autocomplete: 'current-password' });
  const err = h('p', { class: 'small', style: 'color:var(--danger);min-height:1.2em;margin:0' }, msg);
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, t('login'));
  root.replaceChildren(h('main', { class: 'app' },
    h('div', { class: 'topbar' }, h('div', { class: 'brand' }, h('div', { class: 'logo' }, 'C'), t('coachPanel')), langSel),
    h('div', { class: 'auth' }, h('h1', {}, t('coachPanel')),
      h('form', { class: 'card stack', onsubmit: async (e) => {
        e.preventDefault(); err.textContent = '';
        const ph = normalizePhone(phone.value);
        if (!ph) { err.textContent = t('badPhone'); return; }
        busy(btn, true);
        if (msg) await sb.auth.signOut();
        const { error } = await sb.auth.signInWithPassword({ email: loginEmail(ph), password: pw.value });
        busy(btn, false);
        if (error) { err.textContent = errText(error); return; }
        boot();
      } }, field(t('phone'), phone), field(t('password'), pw), err, btn),
      h('p', { class: 'small', style: 'text-align:center;margin-top:16px' }, h('a', { href: 'index.html' }, '← ' + t('appName'))))));
}

async function loadBase() {
  const [lv, st, ss, sk] = await Promise.all([
    sb.from('levels').select('*').order('sort_order').order('created_at'),
    sb.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
    sb.rpc('coach_student_stats'),
    sb.from('skip_requests').select('id', { count: 'exact', head: true }).eq('seen', false),
  ]);
  if (st.error) toast(errText(st.error), 'err');
  levels = lv.data || [];
  students = st.data || [];
  stats = Object.fromEntries((ss.data || []).map((r) => [r.student_id, r]));
  unseenSkips = sk.count || 0;
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
const SECTIONS = [
  ['new', 'newStudents', '👋'], ['levels', 'levelsExercises', '🧱'], ['extra', 'extraExercises', '🎯'],
  ['skips', 'skipMessages', '✉️'], ['students', 'allStudents', '👥'], ['tests', 'tests', '🏁'], ['settings', 'settings', '⚙️'],
];
const countFor = (key) => key === 'new' ? pendingList().length + renewalList().length : key === 'skips' ? unseenSkips : 0;

function renderShell() {
  navEl = h('aside', { class: 'side' });
  mainEl = h('main', { class: 'main' });
  root.replaceChildren(h('div', { class: 'coach' }, navEl, mainEl));
  renderNav();
  go(section);
}

function renderNav() {
  navEl.replaceChildren(
    h('div', { class: 'brand' }, h('div', { class: 'logo' }, 'C'), h('div', {}, t('coachPanel'), h('div', { class: 'small muted' }, coach.full_name))),
    ...SECTIONS.map(([key, label, icon]) => {
      const n = countFor(key);
      return h('button', { class: `navbtn ${section === key ? 'on' : ''}`, onclick: () => { navEl.classList.remove('open'); go(key); } },
        h('span', {}, `${icon}  ${t(label)}`), n ? h('span', { class: 'count' }, n) : null);
    }),
    h('div', { style: 'flex:1' }),
    h('button', { class: 'navbtn', onclick: () => sb.auth.signOut().then(() => location.reload()) }, `↩  ${t('logout')}`));
}

function updateBadges() {
  renderNav();
  const dot = document.getElementById('bell-dot');
  const total = pendingList().length + renewalList().length + unseenSkips;
  if (dot) { dot.textContent = total; dot.classList.toggle('hidden', !total); }
}

function header(title, ...right) {
  const total = pendingList().length + renewalList().length + unseenSkips;
  let menu = null;
  const bell = h('div', { style: 'position:relative' },
    h('button', { class: 'icon-btn', 'aria-label': t('notifications'), onclick: () => {
      if (menu) { menu.remove(); menu = null; return; }
      const row = (label, n, key) => h('button', { class: 'navbtn', onclick: () => { menu.remove(); menu = null; go(key); } },
        h('span', {}, label), h('span', { class: n ? 'count' : 'badge' }, n));
      menu = h('div', { class: 'bell-menu' },
        row(t('pendingRequests'), pendingList().length, 'new'),
        row(t('renewalRequests'), renewalList().length, 'new'),
        row(t('skipMessages'), unseenSkips, 'skips'));
      bell.append(menu);
    } }, '🔔', h('span', { id: 'bell-dot', class: `dot ${total ? '' : 'hidden'}` }, total)));
  const { langSel, themeSel } = langThemeControls(() => { renderNav(); go(section); });
  return h('div', { class: 'main-top' },
    h('div', { class: 'row' },
      h('button', { class: 'icon-btn menu-btn', 'aria-label': 'Menu', onclick: () => navEl.classList.toggle('open') }, '☰'),
      h('h1', { style: 'margin:0' }, title)),
    h('div', { class: 'row' }, ...right, langSel, themeSel, bell));
}

function go(key) {
  section = key; localStorage.setItem('cc-section', key);
  renderNav();
  const fn = { new: secNew, levels: secLevels, extra: secExtra, skips: secSkips, students: secStudents, tests: secTests, settings: secSettings }[key] || secStudents;
  mainEl.replaceChildren(spinner());
  fn();
}
const setMain = (...nodes) => mainEl.replaceChildren(...nodes.filter(Boolean));

function levelSelect(value, { allowEmpty = false, emptyLabel = '—' } = {}) {
  return h('select', {},
    allowEmpty ? h('option', { value: '' }, emptyLabel) : null,
    levels.map((l) => h('option', { value: l.id, selected: l.id === value }, l.name)));
}

/* ------------------------------------------------------------------ */
/* New students + renewals                                              */
/* ------------------------------------------------------------------ */
function secNew() {
  const pend = pendingList();
  const ren = renewalList();
  const noLevels = !levels.length;

  const pendCard = (s) => {
    const sel = levelSelect(levels[0]?.id);
    return h('article', { class: 'card stack' },
      h('div', { class: 'row between' }, h('h3', { style: 'margin:0' }, s.full_name), h('span', { class: 'small muted' }, fmtDate(s.created_at))),
      h('div', { class: 'row' },
        h('a', { class: 'btn small', href: `tel:+${s.phone}` }, `📞 ${fmtPhone(s.phone)}`),
        h('span', { class: 'badge' }, `${t('age')}: ${ageOf(s.birth_year)}`),
        h('span', { class: 'badge' }, `${s.height_cm ?? '—'} sm`),
        h('span', { class: 'badge' }, `${s.weight_kg ?? '—'} kg`)),
      noLevels ? h('div', { class: 'banner warn' }, t('createLevelFirst')) : field(t('startLevel'), sel),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary', disabled: noLevels, onclick: async (e) => {
          busy(e.target, true);
          const { error } = await sb.rpc('coach_approve', { p_student: s.id, p_level: sel.value || null });
          if (error) { busy(e.target, false); return fail(error); }
          toast(`${s.full_name} ✓`); await loadBase(); updateBadges(); secNew();
        } }, t('approve30')),
        h('button', { class: 'btn danger', onclick: async () => {
          if (!(await confirmBox(`${t('reject')}: ${s.full_name}?`))) return;
          const { error } = await sb.rpc('coach_set_access', { p_students: [s.id], p_action: 'reject' });
          if (error) return fail(error);
          await loadBase(); updateBadges(); secNew();
        } }, t('reject'))));
  };

  const renCard = (s) => h('article', { class: 'card row between' },
    h('div', {}, h('b', {}, s.full_name), h('div', { class: 'small muted' },
      `${fmtPhone(s.phone)} · ${levelName(s.level_id)} · ${t('accessUntil')}: ${fmtDate(s.access_until)}`)),
    h('div', { class: 'row' }, statusBadge(s),
      h('a', { class: 'btn small', href: `tel:+${s.phone}` }, '📞'),
      h('button', { class: 'btn primary small', onclick: async (e) => {
        busy(e.target, true);
        const { error } = await sb.rpc('coach_set_access', { p_students: [s.id], p_action: 'reset' });
        if (error) { busy(e.target, false); return fail(error); }
        toast(`${s.full_name} ✓`); await loadBase(); updateBadges(); secNew();
      } }, t('approve30'))));

  setMain(header(t('newStudents')),
    h('div', { class: 'stack' },
      h('h2', {}, t('pendingRequests'), ' ', h('span', { class: 'badge' }, pend.length)),
      pend.length ? h('div', { class: 'stack' }, pend.map(pendCard)) : h('div', { class: 'card empty' }, t('noPending')),
      h('h2', { style: 'margin-top:14px' }, t('renewalRequests'), ' ', h('span', { class: 'badge' }, ren.length)),
      ren.length ? h('div', { class: 'stack' }, ren.map(renCard)) : h('div', { class: 'card empty' }, t('noPending'))));
}

/* ------------------------------------------------------------------ */
/* Media input used by exercise / task / test forms                     */
/* ------------------------------------------------------------------ */
function mediaInput(existingUrl, existingType) {
  const file = h('input', { type: 'file', accept: 'image/gif,image/png,image/jpeg,image/webp,video/mp4,video/webm' });
  const preview = h('div', {}, mediaEl(existingUrl, existingType, 'thumb'));
  const status = h('div', { class: 'small muted' });
  file.addEventListener('change', () => {
    const f = file.files[0];
    if (!f) return;
    preview.replaceChildren(mediaEl(URL.createObjectURL(f), f.type, 'thumb'));
  });
  return {
    el: field(t('media'), h('div', { class: 'stack', style: 'gap:6px' }, preview, file, status)),
    async value() {
      const f = file.files[0];
      if (!f) return { url: existingUrl || null, type: existingType || null };
      const r = await uploadMedia(f, status);
      return { url: r.url, type: r.type };
    },
  };
}

function removeMedia(url) {
  const m = /\/object\/public\/media\/(.+)$/.exec(url || '');
  if (m) sb.storage.from('media').remove([decodeURIComponent(m[1])]);
}

/* ------------------------------------------------------------------ */
/* Levels & exercises                                                   */
/* ------------------------------------------------------------------ */
let selectedLevel = null;

async function levelForm(lv) {
  const name = h('input', { value: lv?.name || '' });
  const desc = h('textarea', {}, lv?.description || '');
  const order = h('input', { type: 'number', value: lv?.sort_order ?? (levels.length ? Math.max(...levels.map((l) => l.sort_order)) + 1 : 1) });
  return modal(lv ? t('edit') : t('newLevel'),
    h('div', { class: 'stack' }, field(t('levelName'), name), field(t('description'), desc), field(t('order'), order),
      h('p', { class: 'small muted', style: 'margin:0' }, t('orderHint'))),
    [{ label: t('cancel') }, { label: t('save'), kind: 'primary', onClick: async () => {
      if (!name.value.trim()) { toast(t('fillAll'), 'err'); return false; }
      const row = { name: name.value.trim(), description: desc.value.trim(), sort_order: parseInt(order.value, 10) || 0 };
      const { data, error } = lv ? await sb.from('levels').update(row).eq('id', lv.id).select().single()
        : await sb.from('levels').insert(row).select().single();
      if (error) return fail(error);
      return data;
    } }]);
}

async function exerciseForm(lv, ex) {
  const name = h('input', { value: ex?.name || '' });
  const sets = h('input', { type: 'number', min: 1, value: ex?.sets ?? 3 });
  const reps = h('input', { value: ex?.reps ?? '10', placeholder: '10 / 30s / max' });
  const note = h('textarea', {}, ex?.note || '');
  const days = new Set(ex?.days || []);
  const dayChips = h('div', { class: 'chips' }, WEEKDAYS[getLang()].map((d, i) => {
    const b = h('button', { type: 'button', class: `chip ${days.has(i + 1) ? 'on' : ''}`, onclick: () => {
      days.has(i + 1) ? days.delete(i + 1) : days.add(i + 1); b.classList.toggle('on');
    } }, d);
    return b;
  }));
  const media = mediaInput(ex?.media_url, ex?.media_type);
  return modal(`${lv.name}: ${ex ? t('edit') : t('addExercise')}`,
    h('div', { class: 'stack' }, field(t('exerciseName'), name),
      h('div', { class: 'grid2' }, field(t('sets'), sets), field(t('reps'), reps)),
      field(`${t('days')} (${t('everyDay')} = —)`, dayChips), field(t('note'), note), media.el),
    [{ label: t('cancel') }, { label: t('save'), kind: 'primary', onClick: async () => {
      if (!name.value.trim()) { toast(t('fillAll'), 'err'); return false; }
      try {
        const m = await media.value();
        if (ex && ex.media_url && m.url !== ex.media_url) removeMedia(ex.media_url);
        const row = { level_id: lv.id, name: name.value.trim(), sets: parseInt(sets.value, 10) || 1, reps: reps.value.trim() || '1',
          days: days.size ? [...days].sort() : null, note: note.value.trim(), media_url: m.url, media_type: m.type };
        const { error } = ex ? await sb.from('exercises').update(row).eq('id', ex.id) : await sb.from('exercises').insert(row);
        if (error) return fail(error);
        return true;
      } catch (e) { return fail(e); }
    } }]);
}

async function secLevels() {
  const { data: exs, error } = await sb.from('exercises').select('*').order('sort_order').order('created_at');
  if (error) return fail(error);
  if (!selectedLevel || !levels.find((l) => l.id === selectedLevel)) selectedLevel = levels[0]?.id || null;
  const lv = levels.find((l) => l.id === selectedLevel);
  const mine = (exs || []).filter((x) => x.level_id === selectedLevel);
  const dayLabel = (d) => (!d || !d.length) ? t('everyDay') : d.map((n) => WEEKDAYS[getLang()][n - 1]).join(' ');

  const left = h('div', { class: 'stack' },
    h('button', { class: 'btn primary', onclick: async () => {
      const r = await levelForm(null);
      if (r) { await loadBase(); selectedLevel = r.id; secLevels(); }
    } }, '+ ' + t('newLevel')),
    h('div', { class: 'list' }, levels.map((l) => h('button', { class: `listitem ${l.id === selectedLevel ? 'on' : ''}`, onclick: () => { selectedLevel = l.id; secLevels(); } },
      h('span', {}, h('b', {}, l.name), h('div', { class: 'small muted' }, `#${l.sort_order}`)),
      h('span', { class: 'badge' }, (exs || []).filter((x) => x.level_id === l.id).length)))));

  const right = !lv ? h('div', { class: 'card empty' }, t('createLevelFirst')) : h('div', { class: 'stack' },
    h('div', { class: 'card stack' },
      h('div', { class: 'row between' }, h('h2', { style: 'margin:0' }, lv.name),
        h('div', { class: 'row' },
          h('button', { class: 'btn small', onclick: async () => { if (await levelForm(lv)) { await loadBase(); secLevels(); } } }, t('edit')),
          h('button', { class: 'btn small danger', onclick: async () => {
            if (!(await confirmBox(`${t('confirmDelete')} (${lv.name})`))) return;
            const { error: e } = await sb.from('levels').delete().eq('id', lv.id);
            if (e) return fail(e);
            selectedLevel = null; await loadBase(); secLevels();
          } }, t('delete')))),
      lv.description ? h('p', { class: 'muted', style: 'margin:0' }, lv.description) : null),
    h('div', { class: 'row between' }, h('h3', { style: 'margin:0' }, t('exercises')),
      h('button', { class: 'btn primary small', onclick: async () => { if (await exerciseForm(lv, null)) secLevels(); } }, '+ ' + t('addExercise'))),
    mine.length ? mine.map((x) => h('div', { class: 'card exrow' },
      mediaEl(x.media_url, x.media_type, 'thumb') || h('div', { class: 'thumb' }),
      h('div', {}, h('b', {}, x.name), h('div', { class: 'small muted' }, `${x.sets} ${t('sets')} × ${x.reps} · ${dayLabel(x.days)}`),
        x.note ? h('div', { class: 'small' }, x.note) : null),
      h('div', { class: 'row', style: 'flex-direction:column;align-items:stretch;gap:6px' },
        h('button', { class: 'btn small', onclick: async () => { if (await exerciseForm(lv, x)) secLevels(); } }, t('edit')),
        h('button', { class: 'btn small danger', onclick: async () => {
          if (!(await confirmBox(`${t('confirmDelete')} (${x.name})`))) return;
          const { error: e } = await sb.from('exercises').delete().eq('id', x.id);
          if (e) return fail(e);
          removeMedia(x.media_url); secLevels();
        } }, t('delete')))))
      : h('div', { class: 'card empty' }, t('noExercises')));

  setMain(header(t('levelsExercises')), h('div', { class: 'split' }, left, right));
}

/* ------------------------------------------------------------------ */
/* Additional exercises                                                 */
/* ------------------------------------------------------------------ */
async function secExtra() {
  const today = todayStr();
  const { data: tasks, error } = await sb.from('extra_tasks').select('*').order('start_date', { ascending: false }).limit(200);
  if (error) return fail(error);

  let who = 'all';
  const whoSeg = h('div', { class: 'seg' });
  const levelSel = levelSelect(levels[0]?.id);
  const studentSel = h('select', {}, students.filter((s) => s.status === 'active').map((s) => h('option', { value: s.id }, s.full_name)));
  const levelWrap = field(t('level'), levelSel);
  const studentWrap = field(t('oneStudent'), studentSel);
  const renderWho = () => {
    whoSeg.replaceChildren(...[['all', t('everyone')], ['level', t('oneLevel')], ['student', t('oneStudent')]].map(([v, l]) =>
      h('button', { type: 'button', class: who === v ? 'on' : '', onclick: () => { who = v; renderWho(); } }, l)));
    levelWrap.classList.toggle('hidden', who !== 'level');
    studentWrap.classList.toggle('hidden', who !== 'student');
  };
  renderWho();
  const period = h('select', {}, [['day', t('day')], ['week', t('weekP')], ['month', t('monthP')]].map(([v, l]) => h('option', { value: v }, l)));
  const start = h('input', { type: 'date', value: today });
  const name = h('input', {});
  const sets = h('input', { type: 'number', min: 1, value: 3 });
  const reps = h('input', { value: '10' });
  const note = h('textarea', {});
  const media = mediaInput(null, null);
  const addBtn = h('button', { class: 'btn primary', onclick: async () => {
    if (!name.value.trim()) return toast(t('fillAll'), 'err');
    busy(addBtn, true);
    try {
      const m = await media.value();
      const span = { day: 0, week: 6, month: 29 }[period.value];
      const row = {
        level_id: who === 'level' ? levelSel.value : null, student_id: who === 'student' ? studentSel.value : null,
        period: period.value, start_date: start.value, end_date: addDays(start.value, span),
        name: name.value.trim(), sets: parseInt(sets.value, 10) || 1, reps: reps.value.trim() || '1', note: note.value.trim(),
        media_url: m.url, media_type: m.type,
      };
      if (who === 'student' && !row.student_id) throw new Error(t('fillAll'));
      const { error: e } = await sb.from('extra_tasks').insert(row);
      if (e) throw e;
      toast(t('saved')); secExtra();
    } catch (e) { fail(e); busy(addBtn, false); }
  } }, '+ ' + t('add'));

  const targetLabel = (x) => x.student_id ? `👤 ${studentName(x.student_id)}` : x.level_id ? `🧱 ${levelName(x.level_id)}` : `👥 ${t('everyone')}`;
  const periodLabel = { day: t('day'), week: t('weekP'), month: t('monthP') };
  const row = (x) => h('div', { class: 'card exrow' },
    mediaEl(x.media_url, x.media_type, 'thumb') || h('div', { class: 'thumb' }),
    h('div', {}, h('b', {}, x.name), h('div', { class: 'small muted' }, `${x.sets} ${t('sets')} × ${x.reps}`),
      h('div', { class: 'row small', style: 'gap:6px;margin-top:4px' }, h('span', { class: 'badge' }, targetLabel(x)),
        h('span', { class: 'badge' }, `${periodLabel[x.period]}: ${fmtDate(x.start_date)} – ${fmtDate(x.end_date)}`))),
    h('button', { class: 'btn small danger', onclick: async () => {
      if (!(await confirmBox(`${t('confirmDelete')} (${x.name})`))) return;
      const { error: e } = await sb.from('extra_tasks').delete().eq('id', x.id);
      if (e) return fail(e);
      removeMedia(x.media_url); secExtra();
    } }, t('delete')));
  const active = (tasks || []).filter((x) => x.end_date >= today);
  const past = (tasks || []).filter((x) => x.end_date < today).slice(0, 20);

  setMain(header(t('extraExercises')),
    h('div', { class: 'split' },
      h('div', { class: 'card stack' },
        h('h3', { style: 'margin:0' }, t('add')),
        field(t('forWhom'), whoSeg), levelWrap, studentWrap,
        h('div', { class: 'grid2' }, field(t('period'), period), field(t('startDate'), start)),
        field(t('exerciseName'), name), h('div', { class: 'grid2' }, field(t('sets'), sets), field(t('reps'), reps)),
        field(t('note'), note), media.el, addBtn),
      h('div', { class: 'stack' },
        h('h2', { style: 'margin:0' }, t('activeTasks')),
        active.length ? active.map(row) : h('div', { class: 'card empty' }, t('noTrainerTasks')),
        past.length ? h('h2', { style: 'margin:10px 0 0' }, t('pastTasks')) : null,
        past.map(row))));
}

/* ------------------------------------------------------------------ */
/* Skip messages                                                        */
/* ------------------------------------------------------------------ */
async function secSkips() {
  const { data, error } = await sb.from('skip_requests').select('*').order('created_at', { ascending: false }).limit(150);
  if (error) return fail(error);
  const markSeen = async (ids) => {
    const { error: e } = await sb.from('skip_requests').update({ seen: true }).in('id', ids);
    if (e) return fail(e);
    await loadBase(); updateBadges(); secSkips();
  };
  const unseen = (data || []).filter((s) => !s.seen);
  setMain(header(t('skipMessages'), unseen.length ? h('button', { class: 'btn small', onclick: () => markSeen(unseen.map((s) => s.id)) }, `✓ ${t('markSeen')} (${unseen.length})`) : null),
    (data || []).length ? h('div', { class: 'stack' }, data.map((s) => {
      const st = students.find((x) => x.id === s.student_id);
      return h('article', { class: 'card', style: s.seen ? '' : 'border-color:var(--warn)' },
        h('div', { class: 'row between' },
          h('div', {}, h('b', {}, st?.full_name || '—'), ' ',
            h('span', { class: 'badge warn' }, `${fmtDate(s.skip_date)} ${t('for')}`),
            h('div', { class: 'small muted' }, `${st ? fmtPhone(st.phone) : ''} · ${fmtDate(s.created_at)}`)),
          s.seen ? h('span', { class: 'badge ok' }, t('seenByCoach')) : h('button', { class: 'btn small primary', onclick: () => markSeen([s.id]) }, t('markSeen'))),
        h('p', { style: 'margin:8px 0 0' }, s.reason));
    })) : h('div', { class: 'card empty' }, t('noSkips')));
}

/* ------------------------------------------------------------------ */
/* All students + detail drawer                                         */
/* ------------------------------------------------------------------ */
let studentFilter = 'all';
let studentSearch = '';

function secStudents() {
  const real = students.filter((s) => s.status !== 'rejected');
  const counts = { active: 0, soon: 0, expired: 0, pending: 0 };
  for (const s of real) {
    const st = accessState(s);
    if (st === 'active') { counts.active++; if (daysLeft(s.access_until) <= WARN_DAYS) counts.soon++; }
    if (st === 'expired') counts.expired++;
    if (st === 'pending') counts.pending++;
  }
  const tableBody = h('tbody');
  const fill = () => {
    const q = studentSearch.trim().toLowerCase();
    const rows = real.filter((s) => {
      const st = accessState(s);
      if (studentFilter !== 'all' && st !== studentFilter) return false;
      return !q || s.full_name.toLowerCase().includes(q) || s.phone.includes(q.replace(/\D/g, '') || '@@');
    });
    tableBody.replaceChildren(...(rows.length ? rows.map((s) => {
      const stt = stats[s.id] || {};
      const st = accessState(s);
      return h('tr', { class: 'click', onclick: () => openStudent(s.id) },
        h('td', {}, h('b', {}, s.full_name), h('div', { class: 'small muted' }, fmtPhone(s.phone))),
        h('td', {}, levelName(s.level_id)),
        h('td', {}, statusBadge(s)),
        h('td', { class: 'num' }, st === 'active' ? daysLeft(s.access_until) : '—'),
        h('td', {}, ago(stt.last_log || s.last_active_at)),
        h('td', { class: 'num' }, stt.reps_7d ?? 0),
        h('td', { class: 'num' }, stt.total_reps ?? 0));
    }) : [h('tr', {}, h('td', { colspan: 7, class: 'empty' }, t('noStudents')))]));
  };
  const search = h('input', { type: 'search', placeholder: t('search'), value: studentSearch, style: 'max-width:260px', oninput: (e) => { studentSearch = e.target.value; fill(); } });
  const chips = h('div', { class: 'chips' }, [['all', '∗'], ['active', t('active')], ['expired', t('expired')], ['pending', t('pending')], ['cancelled', t('cancelled')]].map(([v, l]) =>
    h('button', { class: `chip ${studentFilter === v ? 'on' : ''}`, onclick: () => { studentFilter = v; secStudents(); } }, l)));
  const stat = (n, l) => h('div', { class: 'stat' }, h('b', {}, n), h('span', {}, l));
  setMain(header(t('allStudents')),
    h('div', { class: 'overview' }, stat(counts.active, t('overviewActive')), stat(counts.soon, t('overviewExpiring')),
      stat(counts.expired, t('overviewExpired')), stat(counts.pending, t('overviewPending'))),
    h('div', { class: 'row between', style: 'margin-bottom:10px' }, chips, search),
    h('div', { class: 'tablewrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, t('fullName')), h('th', {}, t('level')), h('th', {}, t('status')),
        h('th', { class: 'num' }, t('daysLeftCol')), h('th', {}, t('lastActive')),
        h('th', { class: 'num' }, t('reps7')), h('th', { class: 'num' }, t('totalReps')))),
      tableBody)));
  fill();
}

async function openStudent(id) {
  const s = students.find((x) => x.id === id);
  if (!s) return;
  document.querySelector('.drawer')?.remove();
  const body = h('div', { class: 'stack' }, spinner());
  const drawer = h('aside', { class: 'drawer', role: 'dialog', 'aria-label': s.full_name },
    h('div', { class: 'row between', style: 'margin-bottom:12px' }, h('h2', { style: 'margin:0' }, s.full_name),
      h('button', { class: 'icon-btn', 'aria-label': t('close'), onclick: () => drawer.remove() }, '✕')),
    body);
  document.body.append(drawer);

  const since = addDays(todayStr(), -29);
  const [logs, skips, results] = await Promise.all([
    sb.from('workout_logs').select('*').eq('student_id', id).gte('log_date', since).order('log_date', { ascending: false }).order('updated_at', { ascending: false }),
    sb.from('skip_requests').select('*').eq('student_id', id).order('created_at', { ascending: false }).limit(10),
    sb.from('test_results').select('value,test_id,test_exercises(name,target),tests(title,test_date)').eq('student_id', id),
  ]);
  const st = stats[id] || {};
  const lvSel = levelSelect(s.level_id, { allowEmpty: true });
  const notes = (logs.data || []).filter((l) => l.note);
  const byTest = {};
  for (const r of results.data || []) {
    byTest[r.test_id] = byTest[r.test_id] || { title: r.tests?.title, date: r.tests?.test_date, rows: [] };
    byTest[r.test_id].rows.push(r);
  }
  const refresh = async () => { await loadBase(); updateBadges(); if (section === 'students') secStudents(); openStudent(id); };

  body.replaceChildren(
    h('section', { class: 'card stack' },
      h('div', { class: 'row' }, statusBadge(s), h('a', { class: 'btn small', href: `tel:+${s.phone}` }, `📞 ${fmtPhone(s.phone)}`)),
      h('div', { class: 'grid2 small' },
        h('div', {}, `${t('age')}: `, h('b', {}, ageOf(s.birth_year))),
        h('div', {}, `${t('height')}: `, h('b', {}, s.height_cm ?? '—')),
        h('div', {}, `${t('weight')}: `, h('b', {}, s.weight_kg ?? '—')),
        h('div', {}, `${t('accessUntil')}: `, h('b', {}, s.access_until ? fmtDate(s.access_until) : '—')))),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('b', {}, st.total_reps ?? 0), h('span', {}, t('totalReps'))),
      h('div', { class: 'stat' }, h('b', {}, st.reps_7d ?? 0), h('span', {}, t('week'))),
      h('div', { class: 'stat' }, h('b', {}, st.days_30d ?? 0), h('span', {}, t('trainDays')))),
    h('section', { class: 'card' }, h('h3', {}, t('last14')), barChart(lastNDays(logs.data || [], 14))),
    h('section', { class: 'card stack' },
      field(t('changeLevel'), h('div', { class: 'logrow' }, lvSel, h('button', { class: 'btn', onclick: async () => {
        const { error } = await sb.from('profiles').update({ level_id: lvSel.value || null }).eq('id', id);
        if (error) return fail(error);
        toast(t('saved')); refresh();
      } }, t('save')))),
      h('div', { class: 'row' },
        h('button', { class: 'btn primary small', onclick: async () => {
          if (!(await confirmBox(t('confirmReset')))) return;
          const { error } = await sb.rpc('coach_set_access', { p_students: [id], p_action: 'reset' });
          if (error) return fail(error);
          toast(t('saved')); refresh();
        } }, t('resetAccess')),
        h('button', { class: 'btn danger small', onclick: async () => {
          if (!(await confirmBox(t('confirmCancel')))) return;
          const { error } = await sb.rpc('coach_set_access', { p_students: [id], p_action: 'cancel' });
          if (error) return fail(error);
          toast(t('saved')); refresh();
        } }, t('cancelAccess')),
        h('button', { class: 'btn small', onclick: async () => {
          const inp = h('input', { type: 'text', minlength: 6, autocomplete: 'off' });
          await modal(t('resetPassword'), field(t('resetPwPrompt'), inp), [{ label: t('cancel') }, { label: t('save'), kind: 'primary', onClick: async () => {
            if (inp.value.length < 6) { toast(t('pwShort'), 'err'); return false; }
            const { error } = await sb.rpc('coach_reset_password', { p_student: id, p_password: inp.value });
            if (error) return fail(error);
            toast(`${t('saved')}: ${inp.value}`); return true;
          } }]);
        } }, t('resetPassword')))),
    notes.length ? h('section', { class: 'card stack' }, h('h3', { style: 'margin:0' }, '⚠ ' + t('notes')),
      notes.slice(0, 15).map((l) => h('div', { class: 'small' }, h('b', {}, `${fmtDate(l.log_date)} · ${l.exercise_name}: `), l.note))) : null,
    h('section', { class: 'card stack' }, h('h3', { style: 'margin:0' }, t('recentLogs')),
      (logs.data || []).length ? h('table', {}, h('tbody', {}, logs.data.slice(0, 40).map((l) => h('tr', {},
        h('td', { class: 'small' }, fmtDate(l.log_date)), h('td', {}, l.exercise_name, l.task_kind === 'extra' ? ' 🎯' : ''),
        h('td', { class: 'num' }, h('b', {}, l.reps_done)))))) : h('p', { class: 'muted', style: 'margin:0' }, '—')),
    (skips.data || []).length ? h('section', { class: 'card stack' }, h('h3', { style: 'margin:0' }, t('skipMessages')),
      skips.data.map((k) => h('div', { class: 'small' }, h('b', {}, fmtDate(k.skip_date) + ': '), k.reason))) : null,
    Object.keys(byTest).length ? h('section', { class: 'card stack' }, h('h3', { style: 'margin:0' }, t('testResults')),
      Object.values(byTest).sort((a, b) => (b.date > a.date ? 1 : -1)).map((g) => h('div', { class: 'small' },
        h('b', {}, `${g.title} · ${fmtDate(g.date)}: `), g.rows.map((r) => `${r.test_exercises?.name} ${r.value ?? '—'}/${r.test_exercises?.target ?? ''}`).join(', ')))) : null);
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */
let selectedTest = null;

async function testForm(ts) {
  const title = h('input', { value: ts?.title || '' });
  const date = h('input', { type: 'date', value: ts?.test_date || addDays(todayStr(), 7) });
  const lv = levelSelect(ts?.level_id, { allowEmpty: true, emptyLabel: t('allLevels') });
  const note = h('textarea', {}, ts?.note || '');
  return modal(ts ? t('edit') : t('newTest'),
    h('div', { class: 'stack' }, field(t('testTitle'), title), field(t('testDate'), date), field(t('testLevel'), lv), field(t('note'), note)),
    [{ label: t('cancel') }, { label: t('save'), kind: 'primary', onClick: async () => {
      if (!title.value.trim() || !date.value) { toast(t('fillAll'), 'err'); return false; }
      const row = { title: title.value.trim(), test_date: date.value, level_id: lv.value || null, note: note.value.trim() };
      const { data, error } = ts ? await sb.from('tests').update(row).eq('id', ts.id).select().single() : await sb.from('tests').insert(row).select().single();
      if (error) return fail(error);
      return data;
    } }]);
}

async function testExForm(ts, ex, count) {
  const name = h('input', { value: ex?.name || '' });
  const target = h('input', { value: ex?.target || '', placeholder: '10 / 30s' });
  const media = mediaInput(ex?.media_url, ex?.media_type);
  return modal(ex ? t('edit') : t('addExercise'),
    h('div', { class: 'stack' }, field(t('exerciseName'), name), field(t('target'), target), media.el),
    [{ label: t('cancel') }, { label: t('save'), kind: 'primary', onClick: async () => {
      if (!name.value.trim()) { toast(t('fillAll'), 'err'); return false; }
      try {
        const m = await media.value();
        const row = { test_id: ts.id, name: name.value.trim(), target: target.value.trim(), media_url: m.url, media_type: m.type, sort_order: ex?.sort_order ?? count };
        const { error } = ex ? await sb.from('test_exercises').update(row).eq('id', ex.id) : await sb.from('test_exercises').insert(row);
        if (error) return fail(error);
        return true;
      } catch (e) { return fail(e); }
    } }]);
}

async function secTests() {
  const { data: tests, error } = await sb.from('tests').select('*,test_exercises(*)').order('test_date', { ascending: false });
  if (error) return fail(error);
  const list = tests || [];
  if (!selectedTest || !list.find((x) => x.id === selectedTest)) selectedTest = list.find((x) => x.status === 'upcoming')?.id || list[0]?.id || null;
  const ts = list.find((x) => x.id === selectedTest);

  const left = h('div', { class: 'stack' },
    h('button', { class: 'btn primary', onclick: async () => { const r = await testForm(null); if (r) { selectedTest = r.id; secTests(); } } }, '+ ' + t('newTest')),
    h('div', { class: 'list' }, list.map((x) => h('button', { class: `listitem ${x.id === selectedTest ? 'on' : ''}`, onclick: () => { selectedTest = x.id; secTests(); } },
      h('span', {}, h('b', {}, x.title), h('div', { class: 'small muted' }, `${fmtDate(x.test_date)} · ${x.level_id ? levelName(x.level_id) : t('allLevels')}`)),
      h('span', { class: x.status === 'done' ? 'badge' : 'badge warn' }, x.status === 'done' ? t('finished') : t('upcoming'))))));

  if (!ts) { setMain(header(t('tests')), h('div', { class: 'split' }, left, h('div', { class: 'card empty' }, t('noTests')))); return; }

  const exs = (ts.test_exercises || []).sort((a, b) => a.sort_order - b.sort_order);
  const [{ data: res }, { data: outs }] = await Promise.all([
    sb.from('test_results').select('*').eq('test_id', ts.id),
    sb.from('test_outcomes').select('*').eq('test_id', ts.id),
  ]);
  const withResults = new Set((res || []).map((r) => r.student_id));
  const eligible = students.filter((s) => withResults.has(s.id) ||
    ((accessState(s) === 'active') && (!ts.level_id || s.level_id === ts.level_id)));

  // results grid
  const inputs = {};
  const passBoxes = {};
  const grid = eligible.length && exs.length ? h('div', { class: 'tablewrap resgrid' }, h('table', {},
    h('thead', {}, h('tr', {}, h('th', {}, t('fullName')), exs.map((x) => h('th', { class: 'num' }, x.name, h('div', { class: 'small' }, `${t('target')}: ${x.target}`))),
      h('th', { class: 'num' }, t('passed')))),
    h('tbody', {}, eligible.map((s) => h('tr', {},
      h('td', {}, h('b', {}, s.full_name), h('div', { class: 'small muted' }, levelName(s.level_id))),
      exs.map((x) => {
        const v = (res || []).find((r) => r.student_id === s.id && r.test_exercise_id === x.id)?.value;
        const inp = h('input', { type: 'number', inputmode: 'decimal', step: 'any', value: v ?? '' });
        inputs[`${s.id}|${x.id}`] = inp;
        return h('td', { class: 'num' }, inp);
      }),
      h('td', { class: 'num' }, (() => {
        const o = (outs || []).find((r) => r.student_id === s.id);
        const cb = h('input', { type: 'checkbox', checked: !!o?.passed, style: 'width:22px;height:22px;min-height:0' });
        passBoxes[s.id] = cb;
        return h('span', {}, cb, o?.promoted ? h('div', { class: 'small', style: 'color:var(--ok)' }, '↑') : null);
      })())))))) : h('div', { class: 'card empty' }, exs.length ? t('noStudentsForTest') : t('noExercises'));

  const saveResults = async (btn) => {
    busy(btn, true);
    const rows = [];
    for (const [k, inp] of Object.entries(inputs)) {
      if (inp.value === '') continue;
      const [student_id, test_exercise_id] = k.split('|');
      rows.push({ test_id: ts.id, student_id, test_exercise_id, value: Number(inp.value) });
    }
    const outRows = Object.entries(passBoxes).map(([student_id, cb]) => ({ test_id: ts.id, student_id, passed: cb.checked }));
    const r1 = rows.length ? await sb.from('test_results').upsert(rows, { onConflict: 'test_exercise_id,student_id' }) : { error: null };
    const r2 = outRows.length ? await sb.from('test_outcomes').upsert(outRows, { onConflict: 'test_id,student_id' }) : { error: null };
    busy(btn, false);
    if (r1.error || r2.error) return fail(r1.error || r2.error);
    toast(t('saved'));
    return true;
  };

  const right = h('div', { class: 'stack' },
    h('div', { class: 'card stack' },
      h('div', { class: 'row between' },
        h('div', {}, h('h2', { style: 'margin:0' }, ts.title),
          h('div', { class: 'muted small' }, `${fmtDate(ts.test_date)} · ${ts.level_id ? levelName(ts.level_id) : t('allLevels')}`)),
        h('div', { class: 'row' },
          h('button', { class: 'btn small', onclick: async () => { if (await testForm(ts)) secTests(); } }, t('edit')),
          h('button', { class: 'btn small', onclick: async () => {
            const { error: e } = await sb.from('tests').update({ status: ts.status === 'done' ? 'upcoming' : 'done' }).eq('id', ts.id);
            if (e) return fail(e); secTests();
          } }, ts.status === 'done' ? t('upcoming') : `✓ ${t('markTestDone')}`),
          h('button', { class: 'btn small danger', onclick: async () => {
            if (!(await confirmBox(`${t('confirmDelete')} (${ts.title})`))) return;
            const { error: e } = await sb.from('tests').delete().eq('id', ts.id);
            if (e) return fail(e);
            selectedTest = null; secTests();
          } }, t('delete')))),
      ts.note ? h('p', { class: 'muted', style: 'margin:0' }, ts.note) : null),
    h('div', { class: 'row between' }, h('h3', { style: 'margin:0' }, t('testExercises')),
      h('button', { class: 'btn small primary', onclick: async () => { if (await testExForm(ts, null, exs.length)) secTests(); } }, '+ ' + t('addExercise'))),
    exs.map((x) => h('div', { class: 'card exrow' },
      mediaEl(x.media_url, x.media_type, 'thumb') || h('div', { class: 'thumb' }),
      h('div', {}, h('b', {}, x.name), h('div', { class: 'small muted' }, `${t('target')}: ${x.target}`)),
      h('div', { class: 'row', style: 'flex-direction:column;align-items:stretch;gap:6px' },
        h('button', { class: 'btn small', onclick: async () => { if (await testExForm(ts, x, exs.length)) secTests(); } }, t('edit')),
        h('button', { class: 'btn small danger', onclick: async () => {
          if (!(await confirmBox(`${t('confirmDelete')} (${x.name})`))) return;
          const { error: e } = await sb.from('test_exercises').delete().eq('id', x.id);
          if (e) return fail(e);
          removeMedia(x.media_url); secTests();
        } }, t('delete'))))),
    h('h3', { style: 'margin:10px 0 0' }, t('enterResults')),
    grid,
    eligible.length && exs.length ? h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: (e) => saveResults(e.target) }, t('saveResults')),
      h('button', { class: 'btn primary', onclick: async (e) => {
        const ids = Object.entries(passBoxes).filter(([, cb]) => cb.checked).map(([id]) => id);
        if (!ids.length) return toast(`${t('selected', { n: 0 })}`, 'err');
        if (!(await saveResults(e.target))) return;
        if (!(await confirmBox(`${t('promoteSelected')}: ${ids.length}?`))) return;
        const { data, error: er } = await sb.rpc('coach_promote', { p_test: ts.id, p_students: ids });
        if (er) return fail(er);
        toast(t('movedN', { n: data ?? 0 }));
        await loadBase(); secTests();
      } }, t('promoteSelected'))) : null);

  setMain(header(t('tests')), h('div', { class: 'split' }, left, right));
}

/* ------------------------------------------------------------------ */
/* Settings: subscriptions                                              */
/* ------------------------------------------------------------------ */
function secSettings() {
  const list = students.filter((s) => ['active', 'cancelled'].includes(s.status));
  const picked = new Set();
  const count = h('span', { class: 'badge' }, t('selected', { n: 0 }));
  const boxes = [];
  const sync = () => { count.textContent = t('selected', { n: picked.size }); };
  const all = h('input', { type: 'checkbox', style: 'width:20px;height:20px;min-height:0', onchange: (e) => {
    boxes.forEach(([id, cb]) => { cb.checked = e.target.checked; e.target.checked ? picked.add(id) : picked.delete(id); }); sync();
  } });
  const act = async (action) => {
    if (!picked.size) return toast(t('selected', { n: 0 }), 'err');
    if (!(await confirmBox(action === 'cancel' ? t('confirmCancel') : t('confirmReset')))) return;
    const { error } = await sb.rpc('coach_set_access', { p_students: [...picked], p_action: action });
    if (error) return fail(error);
    toast(t('saved')); await loadBase(); updateBadges(); secSettings();
  };
  setMain(header(t('settings')),
    h('div', { class: 'stack' },
      h('section', { class: 'card stack' },
        h('div', { class: 'row between' }, h('h2', { style: 'margin:0' }, t('subscriptions')), count),
        h('div', { class: 'row' },
          h('button', { class: 'btn danger', onclick: () => act('cancel') }, t('cancelAccess')),
          h('button', { class: 'btn primary', onclick: () => act('reset') }, t('resetAccess'))),
        h('div', { class: 'tablewrap' }, h('table', {},
          h('thead', {}, h('tr', {}, h('th', {}, all), h('th', {}, t('fullName')), h('th', {}, t('level')), h('th', {}, t('status')), h('th', {}, t('accessUntil')))),
          h('tbody', {}, list.length ? list.map((s) => {
            const cb = h('input', { type: 'checkbox', style: 'width:20px;height:20px;min-height:0', onchange: (e) => { e.target.checked ? picked.add(s.id) : picked.delete(s.id); sync(); } });
            boxes.push([s.id, cb]);
            return h('tr', {}, h('td', {}, cb), h('td', {}, h('b', {}, s.full_name), h('div', { class: 'small muted' }, fmtPhone(s.phone))),
              h('td', {}, levelName(s.level_id)), h('td', {}, statusBadge(s)), h('td', {}, s.access_until ? fmtDate(s.access_until) : '—'));
          }) : h('tr', {}, h('td', { colspan: 5, class: 'empty' }, t('noStudents'))))))),
      h('button', { class: 'btn danger', style: 'justify-self:start', onclick: () => sb.auth.signOut().then(() => location.reload()) }, t('logout'))));
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelector('.drawer')?.remove(); });
boot();
