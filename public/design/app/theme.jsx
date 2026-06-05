// theme.jsx — design tokens, accent palettes, mock data, app state helpers
// Exports to window: PALETTES, MACROS, MEALS, FOOD_DB, SEED_LOG, GOALS,
//   ThemeCtx, useTheme, makeTheme, fmt, totalsFromLog, useAppData

// ── Accent palettes (Sauge light theme — drive hero card / ring / CTAs) ─
// Each accent doubles as the forest-style "feature" card color.
const PALETTES = {
  Forest:    { name: 'Forest',    hex: '#3C5A3E', on: '#F2EEE4', glow: 'rgba(60,90,62,0.18)',  ring: '#CFE0BE' },
  Pine:      { name: 'Pine',      hex: '#2F5547', on: '#EEF3EE', glow: 'rgba(47,85,71,0.18)',  ring: '#BFE0CE' },
  Clay:      { name: 'Clay',      hex: '#A85738', on: '#FBF1EA', glow: 'rgba(168,87,56,0.18)', ring: '#F2CDB8' },
  Sky:       { name: 'Sky',       hex: '#2E6F9E', on: '#EEF6FB', glow: 'rgba(46,111,158,0.18)',ring: '#BFDDF0' },
  Plum:      { name: 'Plum',      hex: '#6E4A78', on: '#F6EEF7', glow: 'rgba(110,74,120,0.18)',ring: '#E0C9E6' },
  Slate:     { name: 'Slate',     hex: '#4A5C76', on: '#EEF2F7', glow: 'rgba(74,92,118,0.18)', ring: '#CAD6E6' },
};

// ── Macro semantic colors (tuned for light/cream backgrounds) ─────────
const MACROS = {
  protein: { label: 'Protein', color: '#4F8A52', short: 'P' },
  carbs:   { label: 'Carbs',   color: '#3E72B0', short: 'C' },
  fat:     { label: 'Fat',     color: '#C2643F', short: 'F' },
  fiber:   { label: 'Fiber',   color: '#8A6FB0', short: 'Fb' },
};

const MEALS = [
  { id: 'breakfast', label: 'Breakfast', sub: 'Start clean',  color: '#5B8CFF', icon: 'sun' },
  { id: 'lunch',     label: 'Lunch',     sub: 'Main fuel',    color: '#34E0A1', icon: 'bowl' },
  { id: 'dinner',    label: 'Dinner',    sub: 'Close the day',color: '#FF7A45', icon: 'moon' },
  { id: 'snack',     label: 'Snack',     sub: 'Small bites',  color: '#FFC93C', icon: 'spark' },
];

const GOALS = { kcal: 2400, protein: 150, carbs: 250, fat: 72, fiber: 30 };

// ── Food database (per serving) ───────────────────────────────────────
const FOOD_DB = [
  { id: 'f1',  name: 'Greek yogurt bowl', brand: 'Homemade',  kcal: 320, protein: 24, carbs: 38, fat: 8,  fiber: 5,  emoji: '🥣', tags: ['breakfast'], servingG: 260, price: 1.85 },
  { id: 'f2',  name: 'Cold brew + oat',   brand: 'Café',      kcal: 90,  protein: 2,  carbs: 14, fat: 3,  fiber: 0,  emoji: '☕', tags: ['drink'], servingG: 250, price: 1.60 },
  { id: 'f3',  name: 'Chicken rice bowl', brand: 'Meal prep', kcal: 612, protein: 48, carbs: 62, fat: 19, fiber: 8,  emoji: '🍗', tags: ['lunch'], servingG: 420, price: 4.90 },
  { id: 'f4',  name: 'Protein bar',       brand: 'Barebells',  kcal: 210, protein: 20, carbs: 18, fat: 7,  fiber: 4,  emoji: '🍫', tags: ['snack'], servingG: 55, price: 2.35 },
  { id: 'f5',  name: 'Banana',            brand: 'Fresh',     kcal: 105, protein: 1,  carbs: 27, fat: 0,  fiber: 3,  emoji: '🍌', tags: ['fruit'], servingG: 118, price: 0.32 },
  { id: 'f6',  name: 'Atún claro',        brand: 'Masymas',   kcal: 116, protein: 26, carbs: 0,  fat: 1,  fiber: 0,  emoji: '🐟', tags: ['protein'], servingG: 80, price: 1.29 },
  { id: 'f7',  name: 'Avocado toast',     brand: 'Homemade',  kcal: 290, protein: 9,  carbs: 30, fat: 16, fiber: 9,  emoji: '🥑', tags: ['breakfast'], servingG: 180, price: 2.10 },
  { id: 'f8',  name: 'Salmon fillet',     brand: 'Carrefour', kcal: 367, protein: 40, carbs: 0,  fat: 23, fiber: 0,  emoji: '🍣', tags: ['dinner'], servingG: 170, price: 5.75 },
  { id: 'f9',  name: 'Mixed salad',       brand: 'Fresh',     kcal: 140, protein: 4,  carbs: 12, fat: 9,  fiber: 6,  emoji: '🥗', tags: ['side'], servingG: 240, price: 2.45 },
  { id: 'f10', name: 'Espresso',          brand: 'Café',      kcal: 5,   protein: 0,  carbs: 1,  fat: 0,  fiber: 0,  emoji: '☕', tags: ['drink'], servingG: 40, price: 1.10 },
  { id: 'f11', name: 'Almonds 30g',       brand: 'Eroski',    kcal: 174, protein: 6,  carbs: 6,  fat: 15, fiber: 4,  emoji: '🌰', tags: ['snack'], servingG: 30, price: 0.78 },
  { id: 'f12', name: 'Whey shake',        brand: 'MyProtein', kcal: 130, protein: 27, carbs: 4,  fat: 2,  fiber: 1,  emoji: '🥤', tags: ['protein'], servingG: 35, price: 0.95 },
  { id: 'f13', name: 'Oatmeal + berries', brand: 'Homemade',  kcal: 280, protein: 10, carbs: 48, fat: 6,  fiber: 8,  emoji: '🫐', tags: ['breakfast'], servingG: 300, price: 1.65 },
  { id: 'f14', name: 'Pasta bolognese',   brand: 'Homemade',  kcal: 540, protein: 28, carbs: 68, fat: 16, fiber: 6,  emoji: '🍝', tags: ['dinner'], servingG: 380, price: 3.80 },
];

const FOOD_ALIASES = {
  f1: ['greek yogurt', 'yogurt', 'йогурт', 'греческий йогурт', 'bol de yogur'],
  f2: ['cold brew', 'coffee', 'кофе', 'колд брю', 'cafe', 'café'],
  f3: ['chicken rice', 'chicken', 'курица', 'рис с курицей', 'pollo arroz'],
  f4: ['protein bar', 'bar', 'протеиновый батончик', 'батончик', 'barrita'],
  f5: ['banana', 'банан', 'plátano', 'platano'],
  f6: ['atun', 'atún', 'tuna', 'тунец', 'atun claro'],
  f7: ['avocado', 'toast', 'авокадо', 'тост', 'aguacate'],
  f8: ['salmon', 'лосось', 'семга', 'salmón', 'salmon'],
  f9: ['salad', 'салат', 'ensalada'],
  f10: ['espresso', 'эспрессо', 'кофе', 'cafe', 'café'],
  f11: ['almonds', 'миндаль', 'almendras'],
  f12: ['whey', 'shake', 'протеин', 'шейк', 'batido'],
  f13: ['oatmeal', 'oats', 'овсянка', 'каша', 'avena'],
  f14: ['pasta', 'bolognese', 'паста', 'болоньезе'],
};

// seeded "today" so the app looks lived-in
const SEED_LOG = [
  { uid: 's1', ref: 'f1',  mealId: 'breakfast', time: '08:12' },
  { uid: 's2', ref: 'f2',  mealId: 'breakfast', time: '08:15' },
  { uid: 's3', ref: 'f3',  mealId: 'lunch',     time: '13:40' },
  { uid: 's4', ref: 'f4',  mealId: 'snack',     time: '17:05' },
];

const byId = (ref) => FOOD_DB.find(f => f.id === ref);

function normalizeLookupText(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function foodLookupText(food) {
  return normalizeLookupText([food.name, food.brand, ...(food.tags || []), ...(FOOD_ALIASES[food.id] || [])].join(' '));
}
function foodMatchesQuery(food, query) {
  const q = normalizeLookupText(query).trim();
  if (!q) return true;
  const haystack = foodLookupText(food);
  return q.split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}
function findFoodInText(text) {
  const haystack = normalizeLookupText(text);
  const matches = FOOD_DB.map(food => {
    const terms = [food.name, ...(FOOD_ALIASES[food.id] || []), ...(food.tags || [])]
      .map(normalizeLookupText)
      .filter(term => term.length > 2);
    const hit = terms.find(term => haystack.includes(term));
    return hit ? { food, score: hit.length } : null;
  }).filter(Boolean);
  matches.sort((a, b) => b.score - a.score);
  return matches[0]?.food || null;
}

function totalsFromLog(log) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, count: log.length };
  log.forEach(item => {
    const f = item.food || byId(item.ref);
    if (!f) return;
    t.kcal += f.kcal; t.protein += f.protein; t.carbs += f.carbs; t.fat += f.fat; t.fiber += f.fiber;
  });
  return t;
}

function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
function eur(n) { return `${Number(n || 0).toFixed(2)} EUR`; }
function scaleFoodPortion(food, grams) {
  const servingG = food.servingG || 100;
  const quantityG = Math.max(5, Number(grams) || servingG);
  const ratio = quantityG / servingG;
  const round = (value) => Math.max(0, Math.round(value * ratio));
  return {
    ...food,
    baseId: food.baseId || food.id,
    quantityG,
    servingG,
    priceTotal: food.price != null ? Number((food.price * ratio).toFixed(2)) : null,
    kcal: round(food.kcal),
    protein: round(food.protein),
    carbs: round(food.carbs),
    fat: round(food.fat),
    fiber: round(food.fiber),
  };
}

function accountStorageId(accountId) {
  return String(accountId || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}
function accountStorageKey(accountId, area) {
  return `tf-design-${area}:${accountStorageId(accountId)}`;
}
function storedJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function isLocalApiHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local') ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}
function trackfoodApiBase() {
  const explicit = String(window.TRACKFOOD_API_BASE || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  const { protocol, hostname, origin } = window.location;
  return isLocalApiHost(hostname || '127.0.0.1')
    ? `${protocol}//${hostname || '127.0.0.1'}:8000`
    : origin;
}
function hydrateLog(rows) {
  return (rows || []).map(item => {
    const food = item.food || byId(item.ref);
    return food ? { ...item, food: { ...food } } : null;
  }).filter(Boolean);
}

// ── App data store (lifted state, isolated per account) ───────────────
function useAppData(accountId = 'guest') {
  const dataKey = accountStorageId(accountId);
  const loadLog = React.useCallback(() => hydrateLog(storedJSON(accountStorageKey(dataKey, 'log'), [])), [dataKey]);
  const loadPlans = React.useCallback(() => storedJSON(accountStorageKey(dataKey, 'plans'), []), [dataKey]);
  const [log, setLog] = React.useState(loadLog);
  const [plans, setPlans] = React.useState(loadPlans);

  React.useEffect(() => {
    setLog(loadLog());
    setPlans(loadPlans());
  }, [loadLog, loadPlans]);

  React.useEffect(() => {
    localStorage.setItem(accountStorageKey(dataKey, 'log'), JSON.stringify(log));
  }, [dataKey, log]);

  React.useEffect(() => {
    localStorage.setItem(accountStorageKey(dataKey, 'plans'), JSON.stringify(plans));
  }, [dataKey, plans]);

  const addFood = (food, mealId, amountG) => {
    const prepared = amountG ? scaleFoodPortion(food, amountG) : { ...food };
    setLog(l => [...l, { uid: 'u' + Date.now() + Math.random().toString(36).slice(2,6), food: prepared, mealId, time: nowTime() }]);
  };
  const updateFoodAmount = (uid, amountG) => {
    setLog(l => l.map(item => {
      if (item.uid !== uid) return item;
      const source = byId(item.food?.baseId || item.food?.id || item.ref) || item.food;
      return { ...item, food: scaleFoodPortion(source, amountG) };
    }));
  };
  const removeFood = (uid) => setLog(l => l.filter(i => i.uid !== uid));
  const addPlan = (p) => setPlans(ps => {
    const normalizedTitle = normalizeLookupText(p.title);
    const exists = ps.some(item =>
      item.date === p.date &&
      item.type === p.type &&
      item.time === p.time &&
      normalizeLookupText(item.title) === normalizedTitle
    );
    return exists ? ps : [...ps, { ...p, id: 'p' + Date.now() }];
  });
  const totals = totalsFromLog(log);
  return { accountId: dataKey, log, totals, addFood, updateFoodAmount, removeFood, plans, addPlan };
}

function deviceNow() {
  return new Date();
}
function deviceTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'; }
  catch { return 'Local time'; }
}
function nowTime(date = deviceNow()) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function dateKeyFromDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function dateKey(offset = 0, anchor = deviceNow()) {
  const d = new Date(anchor);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return dateKeyFromDate(d);
}
function deviceDateTimeLabel(date = deviceNow()) {
  const d = new Date(date);
  const dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dateLabel} · ${nowTime(d)}`;
}
function weekDaysMondayFirst(anchor = deviceNow()) {
  const start = new Date(anchor);
  start.setHours(12, 0, 0, 0);
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  const todayKey = dateKeyFromDate(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    const key = dateKeyFromDate(d);
    return {
      key,
      date: d,
      day: d.getDate(),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      longLabel: d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      isToday: key === todayKey,
    };
  });
}

// ── Theme tokens (Sauge — botanical light) ────────────────────────────
function makeTheme(accentKey) {
  const a = PALETTES[accentKey] || PALETTES.Forest;
  return {
    accent: a.hex, accentOn: a.on, accentGlow: a.glow, accentName: a.name,
    // feature = the forest-style hero card (uses the accent color)
    feature: a.hex, featureOn: a.on, featureRing: a.ring,
    featureTrack: 'rgba(255,255,255,0.18)',
    featureMuted: 'rgba(242,238,228,0.62)',
    bg: '#ECE6D9',
    panel: '#F5F1E7',
    panel2: '#F1ECE0',
    elev: '#E7E0D1',
    line: 'rgba(43,42,35,0.10)',
    line2: 'rgba(43,42,35,0.17)',
    track: 'rgba(43,42,35,0.08)',
    text: '#2B2A23',
    muted: '#7C7766',
    faint: '#A39A86',
    danger: '#B5443A',
    cardShadow: '0 8px 24px rgba(80,70,40,0.07)',
    glowShadow: '0 10px 30px rgba(80,70,40,0.10)',
  };
}

const ThemeCtx = React.createContext(makeTheme('Forest'));
const useTheme = () => React.useContext(ThemeCtx);

Object.assign(window, {
  PALETTES, MACROS, MEALS, FOOD_DB, SEED_LOG, GOALS,
  ThemeCtx, useTheme, makeTheme, fmt, eur, scaleFoodPortion, totalsFromLog, useAppData, dateKey, dateKeyFromDate,
  deviceNow, deviceTimezone, deviceDateTimeLabel, weekDaysMondayFirst, nowTime,
  storedJSON, accountStorageKey, accountStorageId,
  normalizeLookupText, foodMatchesQuery, findFoodInText, trackfoodApiBase,
});
