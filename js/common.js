import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, loginEmail } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cc-auth' },
});

/* ------------------------------------------------------------------ */
/* Language                                                            */
/* ------------------------------------------------------------------ */
const DICT = {
  uz: {
    appName: 'Calisthenics Coach',
    login: 'Kirish', signup: "Ro'yxatdan o'tish", logout: 'Chiqish',
    phone: 'Telefon raqam', password: 'Parol', password2: 'Parolni takrorlang',
    fullName: "To'liq ism (F.I.Sh.)", birthYear: "Tug'ilgan yil", height: "Bo'y (sm)", weight: 'Vazn (kg)',
    sendRequest: "So'rov yuborish", haveAccount: 'Akkauntingiz bormi? Kirish', noAccount: "Akkaunt yo'qmi? Ro'yxatdan o'ting",
    pwMismatch: 'Parollar mos emas', pwShort: "Parol kamida 6 belgi bo'lsin", badPhone: "Telefon raqam noto'g'ri",
    fillAll: "Barcha maydonlarni to'ldiring", wrongLogin: "Telefon yoki parol noto'g'ri", phoneUsed: "Bu raqam allaqachon ro'yxatdan o'tgan",
    pendingTitle: 'So‘rovingiz yuborildi', pendingText: "Murabbiy siz bilan telefon orqali bog'lanadi va so'rovingizni tasdiqlaydi. Tasdiqlangandan keyin ilova ochiladi.",
    rejectedTitle: 'So‘rov rad etildi', rejectedText: "Murabbiy so'rovingizni tasdiqlamadi. Savollar bo'lsa, murabbiyga qo'ng'iroq qiling.",
    expiredTitle: 'Obuna muddati tugadi', expiredText: "30 kunlik muddat tugadi. Davom ettirish uchun murabbiyga qayta tasdiqlash so'rovini yuboring.",
    cancelledTitle: "Kirish to'xtatildi", cancelledText: "Murabbiy kirishingizni to'xtatdi. Qayta ochish uchun so'rov yuboring.",
    requestRenewal: "Qayta tasdiqlash so'rovi", renewalSent: "So'rov yuborildi. Murabbiy tasdiqlashini kuting.", checkAgain: 'Tekshirish',
    daysLeft: '{n} kun qoldi', lastDay: 'Bugun oxirgi kun', expiresSoon: 'Obuna {n} kundan keyin tugaydi. Murabbiyga oldindan ayting.',
    hello: 'Salom, {name}', level: 'Daraja', noLevel: 'Daraja belgilanmagan',
    dailyTasks: 'Kunlik vazifalar', progress: 'Natijalar', trainerTasks: "Murabbiy vazifalari", settings: 'Sozlamalar',
    technique: 'Texnika', techniqueSub: 'Push-up va pull-up anatomiyasi',
    techniqueIntro: "Skelet modelida mashq texnikasini o'rganing: qaysi xato qaysi bo'g'imga yuk beradi va qaysi mushaklar ishlaydi.",
    pushupAtlas: 'Push-up anatomiyasi', pushupAtlasSub: "Qo'l holati, tirsak, tana chizig'i, kurak",
    pullupAtlas: 'Pull-up anatomiyasi', pullupAtlasSub: "Ushlash, kurak, tana chizig'i, variantlar",
    dailyTasksSub: 'Bugungi mashqlar', progressSub: 'Daraja, testlar, statistika', trainerTasksSub: "Qo'shimcha mashqlar", settingsSub: "Mavzu, parol, dam olish kuni",
    back: 'Orqaga', done: 'Bajarildi', save: 'Saqlash', cancel: 'Bekor qilish', delete: "O'chirish", edit: 'Tahrirlash', add: "Qo'shish", close: 'Yopish',
    sets: 'set', reps: 'takror', repsDone: 'Jami bajarilgan takrorlar', noteOpt: "Izoh (og'riq, qiyinchilik...)", markDone: 'Bajarildi deb belgilash', update: 'Yangilash',
    doneToday: 'Bugun bajarildi: {n} takror', tasksDone: '{a}/{b} bajarildi',
    noTasksToday: "Bugun uchun vazifa yo'q. Dam oling yoki murabbiy vazifalarini ko'ring.",
    noTrainerTasks: "Murabbiy hozircha qo'shimcha vazifa yuklamagan.",
    periodDay: 'Bugun', periodWeek: 'Shu hafta', periodMonth: 'Shu oy', until: '{d} gacha',
    totalReps: 'Jami takrorlar', week: 'Oxirgi 7 kun', trainDays: "Mashg'ulot kunlari (30 kun)", last14: 'Oxirgi 14 kun (takrorlar)',
    latestTests: "So'nggi test natijalari", upcomingTests: 'Yaqinlashayotgan testlar', noTests: "Hozircha test yo'q", target: 'Maqsad', result: 'Natija',
    passed: "O'tdi", notPassed: "O'tmadi", promoted: "Keyingi darajaga o'tdi",
    theme: 'Mavzu', light: 'Kunduzgi', dark: 'Tungi', auto: 'Avto', language: 'Til',
    changePassword: "Parolni o'zgartirish", newPassword: 'Yangi parol', changePhone: "Telefon raqamni o'zgartirish", newPhone: 'Yangi raqam',
    myData: "Mening ma'lumotlarim", skipDay: "Mashg'ulotni o'tkazib yuborish", skipDate: 'Sana', skipReason: 'Sabab', send: 'Yuborish',
    skipSent: 'Murabbiyga yuborildi', mySkips: "Yuborilgan sabablar", seenByCoach: "Murabbiy ko'rdi", notSeen: "Hali ko'rilmagan",
    saved: 'Saqlandi', error: 'Xatolik', loading: 'Yuklanmoqda...', coachPanel: 'Murabbiy paneli', notCoach: 'Bu akkaunt murabbiy emas',
    // coach
    newStudents: "Yangi o'quvchilar", levelsExercises: 'Daraja va mashqlar', extraExercises: "Qo'shimcha mashqlar", skipMessages: 'Dam olish xabarlari',
    allStudents: "Barcha o'quvchilar", tests: 'Testlar', notifications: 'Bildirishnomalar',
    pendingRequests: "Qo'shilish so'rovlari", renewalRequests: "Qayta tasdiqlash so'rovlari", noPending: "Yangi so'rov yo'q",
    age: 'Yosh', call: "Qo'ng'iroq", approve: 'Tasdiqlash', reject: 'Rad etish', startLevel: 'Boshlang‘ich daraja', approve30: '30 kunga tasdiqlash',
    createLevelFirst: "Avval 'Daraja va mashqlar' bo'limida daraja yarating",
    levels: 'Darajalar', levelName: 'Daraja nomi', description: 'Tavsif', order: 'Tartib', newLevel: 'Yangi daraja',
    exercises: 'Mashqlar', exerciseName: 'Mashq nomi', media: 'GIF / video', days: 'Kunlar', everyDay: 'Har kuni', note: 'Izoh',
    noExercises: "Bu darajada mashq yo'q", selectLevel: 'Darajani tanlang', confirmDelete: "Rostdan o'chirilsinmi?",
    uploading: 'Yuklanmoqda...', compressing: 'Siqilmoqda...', fileTooBig: 'Fayl juda katta (maks. 8 MB)',
    forWhom: 'Kim uchun', everyone: "Barcha o'quvchilar", oneLevel: 'Bitta daraja', oneStudent: "Bitta o'quvchi", period: 'Muddat',
    startDate: 'Boshlanish sanasi', day: 'Kun', weekP: 'Hafta', monthP: 'Oy', activeTasks: 'Faol vazifalar', pastTasks: 'Tugagan vazifalar',
    noSkips: "Xabar yo'q", markSeen: "Ko'rildi", for: 'uchun',
    search: 'Qidirish...', status: 'Holat', active: 'Faol', pending: 'Kutmoqda', expired: 'Muddati tugagan', cancelled: "To'xtatilgan", rejected: 'Rad etilgan',
    lastActive: 'Oxirgi faollik', reps7: '7 kun takror', never: 'hech qachon', today: 'bugun', daysAgo: '{n} kun oldin',
    studentInfo: "O'quvchi ma'lumoti", changeLevel: "Darajani o'zgartirish", resetPassword: 'Parolni tiklash', resetPwPrompt: 'Yangi parol (kamida 6 belgi)',
    recentLogs: "So'nggi mashqlar", notes: 'Izohlar', testResults: 'Test natijalari', accessUntil: 'Kirish muddati',
    newTest: 'Yangi test', testTitle: 'Test nomi', testDate: 'Test sanasi', testLevel: 'Qaysi daraja (bo‘sh = hammasi)', allLevels: 'Barcha darajalar',
    testExercises: 'Test mashqlari', addExercise: "Mashq qo'shish", enterResults: 'Natijalarni kiritish', promoteSelected: "Belgilanganlarni keyingi darajaga o'tkazish",
    markTestDone: 'Test tugadi', upcoming: 'Kutilmoqda', finished: 'Tugagan', saveResults: 'Natijalarni saqlash', movedN: "{n} o'quvchi keyingi darajaga o'tkazildi",
    noStudentsForTest: "Bu daraja uchun faol o'quvchi yo'q",
    subscriptions: 'Obunalar', cancelAccess: 'Joriy oylikni bekor qilish', resetAccess: 'Obunani yangilash (30 kun)', selected: '{n} ta tanlandi',
    selectAll: 'Hammasini tanlash', confirmCancel: "Tanlangan o'quvchilarning kirishi hozir to'xtatilsinmi?", confirmReset: "Tanlangan o'quvchilarga bugundan 30 kun berilsinmi?",
    overviewActive: 'Faol', overviewExpiring: '3 kun ichida tugaydi', overviewExpired: 'Tugagan', overviewPending: 'Kutmoqda',
    noStudents: "Hali o'quvchi yo'q",
    coachLoggedIn: 'Siz murabbiy sifatida kirgansiz', coachLoggedInText: "Bu o'quvchilar sahifasi. O'quvchi sifatida sinab ko'rish uchun chiqing yoki boshqa telefon/inkognito oynadan oching.",
    daysLeftCol: 'Qolgan kun', orderHint: "Tartib raqami: testdan o'tgan o'quvchi keyingi raqamdagi darajaga o'tadi (1 → 2 → 3).",
    setupError: "Ro'yxatdan o'tish saqlandi, lekin kirish bloklangan: murabbiy Supabase'da 'Confirm email'ni o'chirishi kerak.",
  },
  ru: {
    appName: 'Calisthenics Coach',
    login: 'Войти', signup: 'Регистрация', logout: 'Выйти',
    phone: 'Номер телефона', password: 'Пароль', password2: 'Повторите пароль',
    fullName: 'Полное имя (Ф.И.О.)', birthYear: 'Год рождения', height: 'Рост (см)', weight: 'Вес (кг)',
    sendRequest: 'Отправить заявку', haveAccount: 'Есть аккаунт? Войти', noAccount: 'Нет аккаунта? Регистрация',
    pwMismatch: 'Пароли не совпадают', pwShort: 'Пароль минимум 6 символов', badPhone: 'Неверный номер телефона',
    fillAll: 'Заполните все поля', wrongLogin: 'Неверный телефон или пароль', phoneUsed: 'Этот номер уже зарегистрирован',
    pendingTitle: 'Заявка отправлена', pendingText: 'Тренер свяжется с вами по телефону и подтвердит заявку. После подтверждения приложение откроется.',
    rejectedTitle: 'Заявка отклонена', rejectedText: 'Тренер не подтвердил заявку. Если есть вопросы, позвоните тренеру.',
    expiredTitle: 'Срок подписки истёк', expiredText: '30 дней закончились. Отправьте тренеру запрос на продление.',
    cancelledTitle: 'Доступ остановлен', cancelledText: 'Тренер остановил ваш доступ. Отправьте запрос, чтобы открыть его снова.',
    requestRenewal: 'Запросить продление', renewalSent: 'Запрос отправлен. Ждите подтверждения тренера.', checkAgain: 'Проверить',
    daysLeft: 'Осталось {n} дн.', lastDay: 'Сегодня последний день', expiresSoon: 'Подписка закончится через {n} дн. Предупредите тренера заранее.',
    hello: 'Привет, {name}', level: 'Уровень', noLevel: 'Уровень не назначен',
    dailyTasks: 'Задания на день', progress: 'Прогресс', trainerTasks: 'Задания тренера', settings: 'Настройки',
    technique: 'Техника', techniqueSub: 'Анатомия отжиманий и подтягиваний',
    techniqueIntro: 'Изучите технику на модели скелета: какая ошибка нагружает какой сустав и какие мышцы работают. Страницы на узбекском языке.',
    pushupAtlas: 'Анатомия отжиманий', pushupAtlasSub: 'Руки, локти, линия тела, лопатки',
    pullupAtlas: 'Анатомия подтягиваний', pullupAtlasSub: 'Хват, лопатки, линия тела, варианты',
    dailyTasksSub: 'Упражнения на сегодня', progressSub: 'Уровень, тесты, статистика', trainerTasksSub: 'Дополнительные упражнения', settingsSub: 'Тема, пароль, пропуск',
    back: 'Назад', done: 'Готово', save: 'Сохранить', cancel: 'Отмена', delete: 'Удалить', edit: 'Изменить', add: 'Добавить', close: 'Закрыть',
    sets: 'подх.', reps: 'повт.', repsDone: 'Всего выполнено повторений', noteOpt: 'Заметка (боль, трудности...)', markDone: 'Отметить выполненным', update: 'Обновить',
    doneToday: 'Сегодня выполнено: {n} повт.', tasksDone: 'Выполнено {a}/{b}',
    noTasksToday: 'На сегодня заданий нет. Отдохните или посмотрите задания тренера.',
    noTrainerTasks: 'Тренер пока не добавил дополнительных заданий.',
    periodDay: 'Сегодня', periodWeek: 'Эта неделя', periodMonth: 'Этот месяц', until: 'до {d}',
    totalReps: 'Всего повторений', week: 'Последние 7 дней', trainDays: 'Дней тренировок (30 дн.)', last14: 'Последние 14 дней (повторения)',
    latestTests: 'Последние результаты тестов', upcomingTests: 'Ближайшие тесты', noTests: 'Тестов пока нет', target: 'Цель', result: 'Результат',
    passed: 'Сдал', notPassed: 'Не сдал', promoted: 'Переведён на следующий уровень',
    theme: 'Тема', light: 'Светлая', dark: 'Тёмная', auto: 'Авто', language: 'Язык',
    changePassword: 'Сменить пароль', newPassword: 'Новый пароль', changePhone: 'Сменить номер телефона', newPhone: 'Новый номер',
    myData: 'Мои данные', skipDay: 'Пропустить тренировку', skipDate: 'Дата', skipReason: 'Причина', send: 'Отправить',
    skipSent: 'Отправлено тренеру', mySkips: 'Отправленные причины', seenByCoach: 'Тренер видел', notSeen: 'Ещё не просмотрено',
    saved: 'Сохранено', error: 'Ошибка', loading: 'Загрузка...', coachPanel: 'Панель тренера', notCoach: 'Этот аккаунт не тренер',
    newStudents: 'Новые ученики', levelsExercises: 'Уровни и упражнения', extraExercises: 'Доп. упражнения', skipMessages: 'Сообщения о пропуске',
    allStudents: 'Все ученики', tests: 'Тесты', notifications: 'Уведомления',
    pendingRequests: 'Заявки на вступление', renewalRequests: 'Запросы на продление', noPending: 'Новых заявок нет',
    age: 'Возраст', call: 'Позвонить', approve: 'Подтвердить', reject: 'Отклонить', startLevel: 'Начальный уровень', approve30: 'Подтвердить на 30 дней',
    createLevelFirst: 'Сначала создайте уровень в разделе «Уровни и упражнения»',
    levels: 'Уровни', levelName: 'Название уровня', description: 'Описание', order: 'Порядок', newLevel: 'Новый уровень',
    exercises: 'Упражнения', exerciseName: 'Название упражнения', media: 'GIF / видео', days: 'Дни', everyDay: 'Каждый день', note: 'Заметка',
    noExercises: 'На этом уровне нет упражнений', selectLevel: 'Выберите уровень', confirmDelete: 'Точно удалить?',
    uploading: 'Загрузка...', compressing: 'Сжатие...', fileTooBig: 'Файл слишком большой (макс. 8 МБ)',
    forWhom: 'Для кого', everyone: 'Все ученики', oneLevel: 'Один уровень', oneStudent: 'Один ученик', period: 'Срок',
    startDate: 'Дата начала', day: 'День', weekP: 'Неделя', monthP: 'Месяц', activeTasks: 'Активные задания', pastTasks: 'Завершённые задания',
    noSkips: 'Сообщений нет', markSeen: 'Просмотрено', for: 'на',
    search: 'Поиск...', status: 'Статус', active: 'Активен', pending: 'Ожидает', expired: 'Истёк', cancelled: 'Остановлен', rejected: 'Отклонён',
    lastActive: 'Последняя активность', reps7: 'Повт. за 7 дн.', never: 'никогда', today: 'сегодня', daysAgo: '{n} дн. назад',
    studentInfo: 'Данные ученика', changeLevel: 'Сменить уровень', resetPassword: 'Сбросить пароль', resetPwPrompt: 'Новый пароль (минимум 6 символов)',
    recentLogs: 'Последние тренировки', notes: 'Заметки', testResults: 'Результаты тестов', accessUntil: 'Доступ до',
    newTest: 'Новый тест', testTitle: 'Название теста', testDate: 'Дата теста', testLevel: 'Для какого уровня (пусто = все)', allLevels: 'Все уровни',
    testExercises: 'Упражнения теста', addExercise: 'Добавить упражнение', enterResults: 'Ввести результаты', promoteSelected: 'Перевести отмеченных на следующий уровень',
    markTestDone: 'Тест завершён', upcoming: 'Предстоит', finished: 'Завершён', saveResults: 'Сохранить результаты', movedN: 'Переведено на следующий уровень: {n}',
    noStudentsForTest: 'Для этого уровня нет активных учеников',
    subscriptions: 'Подписки', cancelAccess: 'Отменить текущий месяц', resetAccess: 'Обновить подписку (30 дней)', selected: 'Выбрано: {n}',
    selectAll: 'Выбрать всех', confirmCancel: 'Остановить доступ выбранным ученикам сейчас?', confirmReset: 'Дать выбранным ученикам 30 дней с сегодняшнего дня?',
    overviewActive: 'Активны', overviewExpiring: 'Истекают за 3 дня', overviewExpired: 'Истекли', overviewPending: 'Ожидают',
    noStudents: 'Учеников пока нет',
    coachLoggedIn: 'Вы вошли как тренер', coachLoggedInText: 'Это страница учеников. Чтобы проверить как ученик, выйдите или откройте с другого телефона / в режиме инкогнито.',
    daysLeftCol: 'Осталось дней', orderHint: 'Порядковый номер: сдавший тест ученик переходит на уровень со следующим номером (1 → 2 → 3).',
    setupError: 'Регистрация сохранена, но вход заблокирован: тренер должен отключить «Confirm email» в Supabase.',
  },
};

let LANG = localStorage.getItem('cc-lang') || 'uz';
export const getLang = () => LANG;
export function setLang(l) { LANG = DICT[l] ? l : 'uz'; localStorage.setItem('cc-lang', LANG); document.documentElement.lang = LANG; }
export function t(key, vars = {}) {
  let s = (DICT[LANG] && DICT[LANG][key]) ?? DICT.uz[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
document.documentElement.lang = LANG;

/* ------------------------------------------------------------------ */
/* Theme                                                               */
/* ------------------------------------------------------------------ */
export const getTheme = () => localStorage.getItem('cc-theme') || 'auto';
export function setTheme(v) {
  localStorage.setItem('cc-theme', v);
  if (v === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', v);
}
setTheme(getTheme());

/* ------------------------------------------------------------------ */
/* DOM helpers                                                         */
/* ------------------------------------------------------------------ */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function toast(msg, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) { box = h('div', { id: 'toasts' }); document.body.append(box); }
  const el = h('div', { class: `toast ${kind}` }, msg);
  box.append(el);
  setTimeout(() => el.classList.add('out'), 2800);
  setTimeout(() => el.remove(), 3300);
}

export function modal(title, body, actions = []) {
  return new Promise((resolve) => {
    const close = (val) => { overlay.remove(); resolve(val); };
    const overlay = h('div', { class: 'modal-overlay', onclick: (e) => { if (e.target === overlay) close(null); } },
      h('div', { class: 'modal' },
        h('div', { class: 'modal-head' }, h('h3', {}, title), h('button', { class: 'icon-btn', 'aria-label': t('close'), onclick: () => close(null) }, '✕')),
        h('div', { class: 'modal-body' }, body),
        actions.length ? h('div', { class: 'modal-actions' },
          actions.map((a) => h('button', { class: `btn ${a.kind || ''}`, onclick: async () => {
            if (a.onClick) { const r = await a.onClick(); if (r === false) return; close(r ?? a.value ?? true); } else close(a.value ?? null);
          } }, a.label))) : null));
    document.body.append(overlay);
    const first = overlay.querySelector('input,select,textarea');
    if (first) first.focus();
  });
}

export async function confirmBox(text) {
  return !!(await modal('⚠', h('p', {}, text),
    [{ label: t('cancel'), value: false }, { label: 'OK', kind: 'primary', value: true }]));
}

export function field(label, input) { return h('label', { class: 'field' }, h('span', {}, label), input); }

export function busy(btn, on) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = '…'; }
  else { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
}

/* ------------------------------------------------------------------ */
/* Phone, dates                                                        */
/* ------------------------------------------------------------------ */
export function normalizePhone(s) {
  let d = String(s || '').replace(/\D/g, '');
  if (d.length === 9) d = '998' + d;
  return /^[0-9]{9,15}$/.test(d) ? d : null;
}
export function fmtPhone(d) {
  if (!d) return '';
  const m = /^998(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(d);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : '+' + d;
}
export { loginEmail };

export function todayStr(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(str, n) { const d = new Date(str + 'T12:00:00'); d.setDate(d.getDate() + n); return todayStr(d); }
export function isoWeekday(str = todayStr()) { const g = new Date(str + 'T12:00:00').getDay(); return g === 0 ? 7 : g; }
export function daysLeft(until) { if (!until) return 0; return Math.ceil((new Date(until) - Date.now()) / 86400000); }
// Browsers format Uzbek dates poorly ("M11 19"), so Uzbek names are spelled out here.
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str.length === 10 ? str + 'T12:00:00' : str);
  if (LANG === 'ru') return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
export function fmtLongToday() {
  const d = new Date();
  if (LANG === 'ru') return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  return `${UZ_DAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
}
export function ago(dateStr) {
  if (!dateStr) return t('never');
  const n = Math.round((new Date(todayStr() + 'T12:00:00') - new Date(String(dateStr).slice(0, 10) + 'T12:00:00')) / 86400000);
  return n <= 0 ? t('today') : t('daysAgo', { n });
}
export const ageOf = (y) => (y ? new Date().getFullYear() - y : '—');
export const WEEKDAYS = { uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'], ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] };

/* Access state of a student profile */
export function accessState(p) {
  if (!p) return 'none';
  if (p.role === 'coach') return 'coach';
  if (p.status === 'active') return daysLeft(p.access_until) > 0 ? 'active' : 'expired';
  return p.status; // pending | rejected | cancelled
}

export function errText(e) {
  const m = String(e?.message || e || '');
  if (/invalid login credentials/i.test(m)) return t('wrongLogin');
  if (/already registered|already been registered|phone already used|duplicate key/i.test(m)) return t('phoneUsed');
  if (/password/i.test(m) && /short|6/i.test(m)) return t('pwShort');
  return `${t('error')}: ${m}`;
}

/* ------------------------------------------------------------------ */
/* Media (GIF / video / image)                                         */
/* ------------------------------------------------------------------ */
export function mediaEl(url, type, cls = 'media') {
  if (!url) return null;
  if ((type || '').startsWith('video')) {
    return h('video', { class: cls, src: url, autoplay: true, loop: true, muted: true, playsInline: true, preload: 'metadata', 'aria-hidden': 'true' });
  }
  return h('img', { class: cls, src: url, loading: 'lazy', alt: '' });
}

const MAX_BYTES = 8 * 1024 * 1024;

// GIFs are 5–10x larger than the same clip as a video. Where the browser can, convert to video.
async function gifToVideo(file) {
  if (!('ImageDecoder' in window) || !('MediaRecorder' in window)) return file;
  const mime = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) return file;
  try {
    const dec = new ImageDecoder({ data: await file.arrayBuffer(), type: 'image/gif' });
    await dec.tracks.ready;
    const count = dec.tracks.selectedTrack.frameCount;
    const first = await dec.decode({ frameIndex: 0 });
    const scale = Math.min(1, 480 / first.image.displayWidth);
    const w = Math.round(first.image.displayWidth * scale / 2) * 2, hgt = Math.round(first.image.displayHeight * scale / 2) * 2;
    first.image.close();
    const canvas = Object.assign(document.createElement('canvas'), { width: w, height: hgt });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt);
    const rec = new MediaRecorder(canvas.captureStream(30), { mimeType: mime, videoBitsPerSecond: 700_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (rec.onstop = r));
    rec.start();
    for (let i = 0; i < count; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hgt);
      ctx.drawImage(image, 0, 0, w, hgt);
      const ms = Math.max(20, (image.duration || 100000) / 1000);
      image.close();
      await new Promise((r) => setTimeout(r, ms));
    }
    rec.stop(); await stopped;
    const type = mime.split(';')[0];
    const blob = new Blob(chunks, { type });
    if (!blob.size || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.gif$/i, '') + (type === 'video/mp4' ? '.mp4' : '.webm'), { type });
  } catch (e) {
    console.warn('GIF conversion skipped', e);
    return file;
  }
}

async function shrinkImage(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size < 400_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 900 / bmp.width);
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.82));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }) : file;
  } catch { return file; }
}

export async function uploadMedia(file, statusEl) {
  if (!file) return null;
  if (statusEl) statusEl.textContent = t('compressing');
  let f = file.type === 'image/gif' ? await gifToVideo(file) : await shrinkImage(file);
  if (f.size > MAX_BYTES) throw new Error(t('fileTooBig'));
  if (statusEl) statusEl.textContent = t('uploading');
  const ext = (f.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, f, { contentType: f.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  if (statusEl) statusEl.textContent = '';
  return { url: sb.storage.from('media').getPublicUrl(path).data.publicUrl, type: f.type };
}

/* ------------------------------------------------------------------ */
/* Small bar chart (last N days of reps)                               */
/* ------------------------------------------------------------------ */
export function barChart(series) {
  const W = 320, H = 120, pad = 18, n = series.length;
  const max = Math.max(1, ...series.map((s) => s.value));
  const bw = (W - pad) / n;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'bars');
  svg.setAttribute('role', 'img');
  series.forEach((s, i) => {
    const bh = Math.round((s.value / max) * (H - pad - 14));
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', (i * bw + 3).toFixed(1)); r.setAttribute('y', H - pad - bh);
    r.setAttribute('width', Math.max(2, bw - 6).toFixed(1)); r.setAttribute('height', Math.max(bh, s.value ? 2 : 1));
    r.setAttribute('rx', 3); r.setAttribute('class', s.value ? 'bar' : 'bar zero');
    const title = document.createElementNS(ns, 'title'); title.textContent = `${s.date}: ${s.value}`; r.append(title);
    svg.append(r);
    if (i % 2 === n % 2 || n <= 7) {
      const tx = document.createElementNS(ns, 'text');
      tx.setAttribute('x', (i * bw + bw / 2).toFixed(1)); tx.setAttribute('y', H - 4); tx.setAttribute('text-anchor', 'middle');
      tx.textContent = s.date.slice(8); svg.append(tx);
    }
  });
  return svg;
}

export function lastNDays(logs, n = 14) {
  const map = {};
  for (const l of logs) map[l.log_date] = (map[l.log_date] || 0) + (l.reps_done || 0);
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = addDays(todayStr(), -i); out.push({ date: d, value: map[d] || 0 }); }
  return out;
}

export function langThemeControls(onChange) {
  const langSel = h('div', { class: 'seg' }, ['uz', 'ru'].map((l) =>
    h('button', { class: getLang() === l ? 'on' : '', onclick: () => { setLang(l); onChange && onChange(); } }, l.toUpperCase())));
  const themeSel = h('div', { class: 'seg' }, [['light', '☀'], ['dark', '☾'], ['auto', 'A']].map(([v, ic]) =>
    h('button', { class: getTheme() === v ? 'on' : '', title: t(v), onclick: () => { setTheme(v); onChange && onChange(); } }, ic)));
  return { langSel, themeSel };
}
