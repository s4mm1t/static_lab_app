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
  { id: 'f1',  name: 'Greek yogurt bowl', brand: 'Homemade',  kcal: 320, protein: 24, carbs: 38, fat: 8,  fiber: 5,  emoji: '🥣', tags: ['breakfast'] },
  { id: 'f2',  name: 'Cold brew + oat',   brand: 'Café',      kcal: 90,  protein: 2,  carbs: 14, fat: 3,  fiber: 0,  emoji: '☕', tags: ['drink'] },
  { id: 'f3',  name: 'Chicken rice bowl', brand: 'Meal prep', kcal: 612, protein: 48, carbs: 62, fat: 19, fiber: 8,  emoji: '🍗', tags: ['lunch'] },
  { id: 'f4',  name: 'Protein bar',       brand: 'Barebells',  kcal: 210, protein: 20, carbs: 18, fat: 7,  fiber: 4,  emoji: '🍫', tags: ['snack'] },
  { id: 'f5',  name: 'Banana',            brand: 'Fresh',     kcal: 105, protein: 1,  carbs: 27, fat: 0,  fiber: 3,  emoji: '🍌', tags: ['fruit'] },
  { id: 'f6',  name: 'Atún claro',        brand: 'Masymas',   kcal: 116, protein: 26, carbs: 0,  fat: 1,  fiber: 0,  emoji: '🐟', tags: ['protein'] },
  { id: 'f7',  name: 'Avocado toast',     brand: 'Homemade',  kcal: 290, protein: 9,  carbs: 30, fat: 16, fiber: 9,  emoji: '🥑', tags: ['breakfast'] },
  { id: 'f8',  name: 'Salmon fillet',     brand: 'Carrefour', kcal: 367, protein: 40, carbs: 0,  fat: 23, fiber: 0,  emoji: '🍣', tags: ['dinner'] },
  { id: 'f9',  name: 'Mixed salad',       brand: 'Fresh',     kcal: 140, protein: 4,  carbs: 12, fat: 9,  fiber: 6,  emoji: '🥗', tags: ['side'] },
  { id: 'f10', name: 'Espresso',          brand: 'Café',      kcal: 5,   protein: 0,  carbs: 1,  fat: 0,  fiber: 0,  emoji: '☕', tags: ['drink'] },
  { id: 'f11', name: 'Almonds 30g',       brand: 'Eroski',    kcal: 174, protein: 6,  carbs: 6,  fat: 15, fiber: 4,  emoji: '🌰', tags: ['snack'] },
  { id: 'f12', name: 'Whey shake',        brand: 'MyProtein', kcal: 130, protein: 27, carbs: 4,  fat: 2,  fiber: 1,  emoji: '🥤', tags: ['protein'] },
  { id: 'f13', name: 'Oatmeal + berries', brand: 'Homemade',  kcal: 280, protein: 10, carbs: 48, fat: 6,  fiber: 8,  emoji: '🫐', tags: ['breakfast'] },
  { id: 'f14', name: 'Pasta bolognese',   brand: 'Homemade',  kcal: 540, protein: 28, carbs: 68, fat: 16, fiber: 6,  emoji: '🍝', tags: ['dinner'] },
];

// seeded "today" so the app looks lived-in
const SEED_LOG = [
  { uid: 's1', ref: 'f1',  mealId: 'breakfast', time: '08:12' },
  { uid: 's2', ref: 'f2',  mealId: 'breakfast', time: '08:15' },
  { uid: 's3', ref: 'f3',  mealId: 'lunch',     time: '13:40' },
  { uid: 's4', ref: 'f4',  mealId: 'snack',     time: '17:05' },
];

const byId = (ref) => FOOD_DB.find(f => f.id === ref);

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

// ── App data store (lifted state) ─────────────────────────────────────
function useAppData() {
  const [log, setLog] = React.useState(() =>
    SEED_LOG.map(s => ({ ...s, food: { ...byId(s.ref) } }))
  );
  const [plans, setPlans] = React.useState([
    { id: 'p1', date: dateKey(0), type: 'Training', title: 'Leg day · 18:30', time: '18:30' },
    { id: 'p2', date: dateKey(0), type: 'Meal', title: 'Meal prep — salmon + rice', time: '20:00' },
  ]);
  const addFood = (food, mealId) => {
    setLog(l => [...l, { uid: 'u' + Date.now() + Math.random().toString(36).slice(2,6), food: { ...food }, mealId, time: nowTime() }]);
  };
  const removeFood = (uid) => setLog(l => l.filter(i => i.uid !== uid));
  const addPlan = (p) => setPlans(ps => [...ps, { ...p, id: 'p' + Date.now() }]);
  const totals = totalsFromLog(log);
  return { log, totals, addFood, removeFood, plans, addPlan };
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function dateKey(offset = 0) {
  const d = new Date(2026, 4, 29 + offset);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
  ThemeCtx, useTheme, makeTheme, fmt, totalsFromLog, useAppData, dateKey,
});
