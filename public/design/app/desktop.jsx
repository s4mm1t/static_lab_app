// desktop.jsx — FoodTrack AI desktop dashboard (Sauge). Reuses theme.jsx + ui.jsx.
// Shell: scaled browser window → sidebar + topbar + routed content.

const FONTS = {
  Grotesk:   "'Space Grotesk', sans-serif",
  Bricolage: "'Bricolage Grotesque', sans-serif",
  Archivo:   "'Archivo', sans-serif",
};
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "Forest",
  "displayFont": "Grotesk",
  "kcalGoal": 2400,
  "motion": true
}/*EDITMODE-END*/;

const WIN_W = 1340, WIN_H = 836;

const WEEK = [
  { d: 'Sat', v: 2180 }, { d: 'Sun', v: 1740 }, { d: 'Mon', v: 2390 }, { d: 'Tue', v: 2050 },
  { d: 'Wed', v: 2260 }, { d: 'Thu', v: 1232 }, { d: 'Fri', v: 0 },
];

// ── Fit-to-viewport scaler ────────────────────────────────────────────
function useScale(w, h, pad = 48) {
  const [s, setS] = React.useState(1);
  React.useEffect(() => {
    const calc = () => setS(Math.min(1, Math.min((window.innerWidth - pad) / w, (window.innerHeight - pad) / h)));
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [w, h, pad]);
  return s;
}

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ route, go, openTweaks }) {
  const t = useTheme();
  const nav = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'diary', icon: 'diary', label: 'Diary' },
    { id: 'insights', icon: 'chart', label: 'Insights' },
    { id: 'plan', icon: 'calendar', label: 'Plan' },
    { id: 'coach', icon: 'coach', label: 'Coach' },
  ];
  return (
    <div style={{ width: 252, flexShrink: 0, height: '100%', background: t.panel, borderRight: `1px solid ${t.line}`,
      display: 'flex', flexDirection: 'column', padding: '22px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 8px 22px' }}>
        <LogoBadge size={38} radius={12} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: t.text, fontWeight: 800, fontSize: 15, lineHeight: 1, whiteSpace: 'nowrap' }}>FoodTrack AI</div>
          <div style={{ color: t.faint, fontSize: 11, marginTop: 4 }}>Nutrition OS</div>
        </div>
      </div>

      <div style={{ color: t.faint, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, padding: '0 8px 8px' }}>MENU</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {nav.map(n => {
          const on = route === n.id;
          return (
            <button key={n.id} onClick={() => go(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 13, cursor: 'pointer',
              border: 'none', fontFamily: 'inherit', textAlign: 'left', width: '100%',
              background: on ? t.feature : 'transparent', color: on ? t.featureOn : t.muted,
              fontWeight: on ? 700 : 600, fontSize: 14, transition: 'background .18s, color .18s' }}>
              <Icon name={n.icon} size={20} stroke={on ? 2.4 : 2} />
              {n.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={openTweaks} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
          border: `1px solid ${t.line}`, background: t.elev, color: t.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13 }}>
          <Icon name="sliders" size={18} stroke={2.2} /> Customize
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 6px', borderTop: `1px solid ${t.line}`, paddingTop: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#dfeee3,#a9cdb9)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#243A2B', flexShrink: 0 }}>P</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: t.text, fontWeight: 700, fontSize: 13.5 }}>Pi Rodríguez</div>
            <div style={{ color: t.faint, fontSize: 11.5 }}>Premium · 2,400 kcal</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────
const TITLES = {
  home: ['Good day, Pi', 'Thu · May 29 · here is your day at a glance'],
  diary: ['Food diary', 'Everything you logged today, by meal'],
  insights: ['Insights', 'Trends, balance and your weekly rhythm'],
  plan: ['Plan', 'Schedule meals and training ahead'],
  coach: ['Coach', 'Ask anything — log, plan, or check your day'],
};
function DeskTopBar({ route, onAdd }) {
  const t = useTheme();
  const [title, sub] = TITLES[route] || TITLES.home;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
      padding: '20px 32px', borderBottom: `1px solid ${t.line}`, flexShrink: 0 }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, color: t.text, fontFamily: 'var(--display)', fontSize: 25, fontWeight: 700, letterSpacing: -0.4 }}>{title}</h1>
        <div style={{ color: t.muted, fontSize: 13, marginTop: 3 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: t.panel, border: `1px solid ${t.line}`,
          borderRadius: 12, padding: '10px 14px', width: 230, color: t.faint }}>
          <Icon name="search" size={17} stroke={2.2} />
          <span style={{ fontSize: 13 }}>Search foods…</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: t.panel, border: `1px solid ${t.line}`, borderRadius: 12, padding: '9px 13px' }}>
          <span style={{ color: '#FF8A4C', display: 'flex' }}><Icon name="flame" size={16} fill="solid" /></span>
          <span style={{ color: t.text, fontWeight: 800, fontSize: 14 }}>12</span>
        </div>
        <Btn icon="plus" onClick={onAdd}>Add food</Btn>
      </div>
    </div>
  );
}

// ── Reusable panel ────────────────────────────────────────────────────
function Panel({ children, style, pad = 20, title, action }) {
  const t = useTheme();
  return (
    <Card pad={pad} style={style}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Eyebrow>{title}</Eyebrow>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

// ── Weekly kcal bar chart ─────────────────────────────────────────────
function WeekChart({ goal, height = 150 }) {
  const t = useTheme();
  const maxV = Math.max(goal, ...WEEK.map(w => w.v));
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height, marginTop: 4 }}>
        {WEEK.map((w, i) => {
          const h = Math.max(3, (w.v / maxV) * 100);
          const today = w.d === 'Thu';
          return (
            <div key={w.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, height: '100%' }}>
              <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${h}%`, borderRadius: 9, transformOrigin: 'bottom',
                  background: today ? t.accent : w.v ? 'rgba(43,42,35,0.18)' : t.track,
                  animation: `growBar .7s cubic-bezier(.16,1,.3,1) ${i * 0.05}s both` }} />
              </div>
              <span style={{ color: today ? t.accent : t.faint, fontSize: 12, fontWeight: 700 }}>{w.d}</span>
            </div>
          );
        })}
      </div>
      <div style={{ color: t.faint, fontSize: 12, marginTop: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 18, height: 3, background: t.accent, borderRadius: 2 }} /> Goal {fmt(goal)} kcal · 7-day avg 1,975
      </div>
    </div>
  );
}

// ── Hero (forest) ─────────────────────────────────────────────────────
function HeroCard({ totals, onAdd }) {
  const t = useTheme();
  const pct = Math.min(100, Math.round((totals.kcal / GOALS.kcal) * 100));
  const left = Math.max(0, GOALS.kcal - totals.kcal);
  const macros = [
    { k: 'protein', v: totals.protein, g: GOALS.protein },
    { k: 'carbs', v: totals.carbs, g: GOALS.carbs },
    { k: 'fat', v: totals.fat, g: GOALS.fat },
    { k: 'fiber', v: totals.fiber, g: GOALS.fiber },
  ];
  return (
    <div style={{ background: t.feature, borderRadius: 26, padding: 26, position: 'relative', overflow: 'hidden', boxShadow: t.glowShadow }}>
      <div style={{ position: 'absolute', right: -40, top: -50, width: 180, height: 180, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 28, position: 'relative' }}>
        <Ring pct={pct} size={150} stroke={13} color={t.featureRing} track={t.featureTrack}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 34, color: t.featureOn, lineHeight: 1 }}><CountUp value={totals.kcal} /></div>
          <div style={{ color: t.featureMuted, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginTop: 3 }}>KCAL</div>
        </Ring>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ color: t.featureRing, fontWeight: 800, fontSize: 16, fontFamily: 'var(--display)' }}>{pct}% of goal</div>
            <div style={{ color: t.featureMuted, fontSize: 13 }}>· {fmt(left)} kcal left of {fmt(GOALS.kcal)}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginTop: 16 }}>
            {macros.map(m => (
              <div key={m.k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ color: t.featureOn, fontSize: 12.5, fontWeight: 700 }}>{MACROS[m.k].label}</span>
                  <span style={{ color: t.featureMuted, fontSize: 11.5 }}>{m.v}/{m.g}g</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, m.v / m.g * 100)}%`, background: MACROS[m.k].color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onAdd} style={{ alignSelf: 'stretch', border: 'none', cursor: 'pointer', background: t.featureOn, color: t.feature,
          fontFamily: 'inherit', fontWeight: 800, fontSize: 14, borderRadius: 18, padding: '0 26px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 7, whiteSpace: 'nowrap' }}>
          <Icon name="plus" size={26} stroke={2.6} /> Add food
        </button>
      </div>
    </div>
  );
}

// ── Meal log list ─────────────────────────────────────────────────────
function MealLog({ data, compact }) {
  const t = useTheme();
  const meals = MEALS.map(m => ({ ...m, items: data.log.filter(i => i.mealId === m.id) }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 16 : 20 }}>
      {meals.map(m => {
        const kcal = m.items.reduce((a, i) => a + (i.food?.kcal || 0), 0);
        return (
          <div key={m.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: m.color }} />
              <span style={{ color: t.text, fontWeight: 800, fontSize: 14 }}>{m.label}</span>
              <span style={{ color: t.faint, fontSize: 12.5 }}>{m.items.length} items</span>
              <span style={{ marginLeft: 'auto', color: t.muted, fontWeight: 700, fontSize: 13, fontFamily: 'var(--display)' }}>{kcal} kcal</span>
            </div>
            {m.items.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.items.map(it => (
                  <div key={it.uid} style={{ display: 'flex', alignItems: 'center', gap: 13, background: t.panel2, border: `1px solid ${t.line}`, borderRadius: 14, padding: '11px 14px' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: t.elev, border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{it.food?.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: t.text, fontWeight: 700, fontSize: 14 }}>{it.food?.name}</div>
                      <div style={{ color: t.faint, fontSize: 12 }}>{it.food?.brand} · {it.time}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, color: t.muted, fontSize: 12 }}>
                      <span>P {it.food?.protein}</span><span>C {it.food?.carbs}</span><span>F {it.food?.fat}</span>
                    </div>
                    <div style={{ color: t.text, fontWeight: 800, fontSize: 14, fontFamily: 'var(--display)', width: 56, textAlign: 'right' }}>{it.food?.kcal}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: t.faint, fontSize: 13, border: `1px dashed ${t.line2}`, borderRadius: 14, padding: '14px', textAlign: 'center' }}>Nothing logged yet</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────
function Stat({ label, value, unit, sub }) {
  const t = useTheme();
  return (
    <div style={{ background: t.panel2, border: `1px solid ${t.line}`, borderRadius: 16, padding: '15px 16px' }}>
      <div style={{ color: t.muted, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ color: t.text, fontWeight: 800, fontSize: 24, fontFamily: 'var(--display)', marginTop: 5, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 13, color: t.faint, fontWeight: 600 }}>{unit}</span>
      </div>
      {sub && <div style={{ color: t.faint, fontSize: 11.5, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────
function HomeView({ data, onAdd, go }) {
  const t = useTheme();
  const quick = [
    { eyebrow: 'Diary', title: 'Log meals', icon: 'diary', go: () => go('diary') },
    { eyebrow: 'Scan', title: 'Barcode / photo', icon: 'camera', go: onAdd },
    { eyebrow: 'Plan', title: 'Schedule day', icon: 'calendar', go: () => go('plan') },
    { eyebrow: 'Coach', title: 'Ask anything', icon: 'coach', go: () => go('coach') },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <HeroCard totals={data.totals} onAdd={onAdd} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <Stat label="7-day average" value="1,975" unit=" kcal" sub="Below goal by 425" />
        <Stat label="Consistency" value="6/7" unit=" days" sub="Logged this week" />
        <Stat label="Current streak" value="12" unit=" days" sub="Personal best: 18" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 18, alignItems: 'start' }}>
        <Panel title="This week · kcal"><WeekChart goal={GOALS.kcal} /></Panel>
        <Panel title="Quick access">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quick.map((q, i) => (
              <button key={i} onClick={q.go} style={{ textAlign: 'left', cursor: 'pointer', background: t.panel2, border: `1px solid ${t.line}`,
                borderRadius: 14, padding: '13px 14px', fontFamily: 'inherit', minHeight: 92, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ color: t.muted, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>{q.eyebrow}</span>
                  <span style={{ color: t.accent }}><Icon name={q.icon} size={17} stroke={2.2} /></span>
                </div>
                <div style={{ color: t.text, fontWeight: 800, fontSize: 14 }}>{q.title}</div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Logged today" action={<button onClick={() => go('diary')} style={{ background: 'none', border: 'none', color: t.accent, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>Open diary <Icon name="arrow" size={13} stroke={2.5} /></button>}>
        <MealLog data={data} compact />
      </Panel>
    </div>
  );
}

// ── DIARY ─────────────────────────────────────────────────────────────
function DiaryView({ data, onAdd }) {
  const t = useTheme();
  const tot = data.totals;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }}>
      <Panel title="Today, by meal" action={<Btn size="sm" icon="plus" onClick={onAdd}>Add</Btn>}>
        <MealLog data={data} />
      </Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Panel title="Day total">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Ring pct={Math.min(100, Math.round(tot.kcal / GOALS.kcal * 100))} size={96} stroke={10}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: t.text }}>{Math.round(tot.kcal / GOALS.kcal * 100)}%</div>
            </Ring>
            <div>
              <div style={{ color: t.text, fontWeight: 800, fontSize: 26, fontFamily: 'var(--display)' }}>{fmt(tot.kcal)}</div>
              <div style={{ color: t.muted, fontSize: 13 }}>of {fmt(GOALS.kcal)} kcal</div>
            </div>
          </div>
        </Panel>
        <Panel title="Macros">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <MacroBar label="Protein" value={tot.protein} goal={GOALS.protein} color={MACROS.protein.color} />
            <MacroBar label="Carbs" value={tot.carbs} goal={GOALS.carbs} color={MACROS.carbs.color} delay={80} />
            <MacroBar label="Fat" value={tot.fat} goal={GOALS.fat} color={MACROS.fat.color} delay={160} />
            <MacroBar label="Fiber" value={tot.fiber} goal={GOALS.fiber} color={MACROS.fiber.color} delay={240} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ── INSIGHTS ──────────────────────────────────────────────────────────
function InsightsView({ data }) {
  const t = useTheme();
  const tot = data.totals;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <Stat label="Today" value={fmt(tot.kcal)} unit=" kcal" sub={`${Math.round(tot.kcal / GOALS.kcal * 100)}% of goal`} />
        <Stat label="7-day average" value="1,975" unit=" kcal" sub="Trending steady" />
        <Stat label="Protein avg" value="118" unit=" g" sub="Goal 150g" />
        <Stat label="Consistency" value="86" unit=" %" sub="6 of 7 days" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, alignItems: 'start' }}>
        <Panel title="This week · kcal"><WeekChart goal={GOALS.kcal} height={200} /></Panel>
        <Panel title="Macro balance · today">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <MacroBar label="Protein" value={tot.protein} goal={GOALS.protein} color={MACROS.protein.color} />
            <MacroBar label="Carbs" value={tot.carbs} goal={GOALS.carbs} color={MACROS.carbs.color} delay={80} />
            <MacroBar label="Fat" value={tot.fat} goal={GOALS.fat} color={MACROS.fat.color} delay={160} />
            <MacroBar label="Fiber" value={tot.fiber} goal={GOALS.fiber} color={MACROS.fiber.color} delay={240} />
          </div>
        </Panel>
      </div>
      <Panel title="Scanner status">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[['Products', '24K', 'indexed'], ['Estimate', 'Live', 'AI v2'], ['Source', 'DB', 'local + cloud']].map(([l, v, s]) => (
            <div key={l} style={{ background: t.panel2, border: `1px solid ${t.line}`, borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ color: t.muted, fontSize: 11.5, fontWeight: 700 }}>{l}</div>
              <div style={{ color: t.text, fontWeight: 800, fontSize: 20, fontFamily: 'var(--display)', marginTop: 4 }}>{v}</div>
              <div style={{ color: t.faint, fontSize: 11.5, marginTop: 2 }}>{s}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ── PLAN ──────────────────────────────────────────────────────────────
function PlanView({ data }) {
  const t = useTheme();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const plans = [
    { day: 'Thu', type: 'Training', title: 'Leg day', time: '18:30', color: MACROS.protein.color },
    { day: 'Thu', type: 'Meal', title: 'Meal prep — salmon + rice', time: '20:00', color: MEALS[2].color },
    { day: 'Fri', type: 'Meal', title: 'High-protein breakfast', time: '08:00', color: MEALS[0].color },
    { day: 'Sat', type: 'Training', title: 'Long run · 12km', time: '09:30', color: MACROS.carbs.color },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18, alignItems: 'start' }}>
      <Panel title="This week">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
          {days.map(d => {
            const today = d === 'Thu';
            const has = plans.filter(p => p.day === d);
            return (
              <div key={d} style={{ background: today ? t.feature : t.panel2, border: `1px solid ${today ? 'transparent' : t.line}`, borderRadius: 14, padding: '12px 10px', minHeight: 150 }}>
                <div style={{ color: today ? t.featureRing : t.muted, fontSize: 12, fontWeight: 800 }}>{d}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {has.map((p, i) => (
                    <div key={i} style={{ background: today ? 'rgba(255,255,255,0.12)' : t.elev, borderRadius: 9, padding: '7px 8px' }}>
                      <div style={{ width: 6, height: 6, borderRadius: 99, background: p.color, marginBottom: 5 }} />
                      <div style={{ color: today ? t.featureOn : t.text, fontSize: 11, fontWeight: 700, lineHeight: 1.2 }}>{p.title}</div>
                      <div style={{ color: today ? t.featureMuted : t.faint, fontSize: 10, marginTop: 2 }}>{p.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Upcoming">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plans.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: t.panel2, border: `1px solid ${t.line}`, borderRadius: 13, padding: '12px 14px' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: `${p.color}1f`, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={p.type === 'Training' ? 'bolt' : 'bowl'} size={18} stroke={2.2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: t.text, fontWeight: 700, fontSize: 13.5 }}>{p.title}</div>
                <div style={{ color: t.faint, fontSize: 12 }}>{p.day} · {p.time}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ── COACH ─────────────────────────────────────────────────────────────
function CoachView({ data, addFood, notify }) {
  const t = useTheme();
  const [msgs, setMsgs] = React.useState([
    { who: 'coach', text: "Morning, Pi. You're at 1,232 kcal — about 51% of today's goal. Protein is a touch behind. Want a high-protein snack idea?" },
  ]);
  const [val, setVal] = React.useState('');
  const chips = ['Calories left today?', 'Log a banana', 'Plan leg day', 'High-protein snack'];
  const send = (text) => {
    const m = text || val;
    if (!m.trim()) return;
    setMsgs(x => [...x, { who: 'me', text: m }]);
    setVal('');
    setTimeout(() => setMsgs(x => [...x, { who: 'coach', text: "On it — added to your day. You've got 1,168 kcal and 56g protein left. A whey shake (130 kcal · 27g) would close most of that gap." }]), 500);
  };
  return (
    <Panel pad={0} style={{ height: 560, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.who === 'me' ? 'flex-end' : 'flex-start', maxWidth: '72%',
            background: m.who === 'me' ? t.feature : t.panel2, color: m.who === 'me' ? t.featureOn : t.text,
            border: m.who === 'me' ? 'none' : `1px solid ${t.line}`, borderRadius: 18, padding: '13px 16px', fontSize: 14, lineHeight: 1.5 }}>
            {m.who === 'coach' && <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: t.accent, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, marginBottom: 6 }}><Icon name="coach" size={14} /> COACH</div>}
            {m.text}
          </div>
        ))}
      </div>
      <div style={{ padding: 18, borderTop: `1px solid ${t.line}` }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {chips.map(c => <Chip key={c} onClick={() => send(c)}>{c}</Chip>)}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask to log food, plan, or check your day…" style={{ flex: 1, background: t.panel2, border: `1px solid ${t.line2}`,
            borderRadius: 13, padding: '13px 16px', fontSize: 14, color: t.text, outline: 'none' }} />
          <button onClick={() => send()} style={{ width: 48, borderRadius: 13, border: 'none', background: t.accent, color: t.accentOn, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={20} fill="solid" />
          </button>
        </div>
      </div>
    </Panel>
  );
}

// ── Add-food modal ────────────────────────────────────────────────────
function AddModal({ open, onClose, addFood, notify }) {
  const t = useTheme();
  const [q, setQ] = React.useState('');
  const [meal, setMeal] = React.useState('breakfast');
  if (!open) return null;
  const list = FOOD_DB.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
  const add = (f) => { addFood(f, meal); notify(`Added ${f.name}`); };
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(43,42,35,0.4)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn .2s' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, maxHeight: '80%', background: t.panel, border: `1px solid ${t.line}`,
        borderRadius: 24, boxShadow: '0 30px 80px rgba(80,70,40,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px 14px', borderBottom: `1px solid ${t.line}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 18 }}>Add food</div>
            <button onClick={onClose} style={{ background: t.elev, border: `1px solid ${t.line}`, borderRadius: 9, width: 30, height: 30, cursor: 'pointer', color: t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={16} stroke={2.4} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: t.panel2, border: `1px solid ${t.line2}`, borderRadius: 12, padding: '11px 14px' }}>
            <Icon name="search" size={17} color={t.faint} stroke={2.2} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search 24K foods…" style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 14, color: t.text }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {MEALS.map(m => <Chip key={m.id} active={meal === m.id} onClick={() => setMeal(m.id)} color={m.color}>{m.label}</Chip>)}
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: 12 }}>
          {list.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 12, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = t.panel2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: t.elev, border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{f.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: t.text, fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                <div style={{ color: t.faint, fontSize: 12 }}>{f.brand} · {f.kcal} kcal · P{f.protein} C{f.carbs} F{f.fat}</div>
              </div>
              <button onClick={() => add(f)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: t.accent, color: t.accentOn, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={18} stroke={2.6} /></button>
            </div>
          ))}
          {!list.length && <div style={{ color: t.faint, textAlign: 'center', padding: 30, fontSize: 14 }}>No matches</div>}
        </div>
      </div>
    </div>
  );
}

// ── Tweaks ────────────────────────────────────────────────────────────
function AppTweaks({ tw, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Accent" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, padding: '4px 2px 10px' }}>
        {Object.entries(PALETTES).map(([key, p]) => {
          const on = tw.accent === key;
          return (
            <button key={key} onClick={() => setTweak('accent', key)} title={p.name} style={{
              width: 40, height: 40, borderRadius: 13, cursor: 'pointer', background: p.hex,
              border: on ? '2.5px solid #fff' : '2.5px solid transparent',
              boxShadow: on ? `0 0 0 2px ${p.hex}, 0 4px 12px ${p.glow}` : 'none', transition: 'all .15s' }} />
          );
        })}
      </div>
      <TweakSection label="Display font" />
      <TweakRadio label="Numbers & titles" value={tw.displayFont} options={['Grotesk', 'Bricolage', 'Archivo']} onChange={(v) => setTweak('displayFont', v)} />
      <TweakSection label="Daily goal" />
      <TweakSlider label="Calorie goal" value={tw.kcalGoal} min={1500} max={4000} step={50} unit=" kcal" onChange={(v) => setTweak('kcalGoal', v)} />
      <TweakSection label="Motion" />
      <TweakToggle label="Entrance animations" value={tw.motion} onChange={(v) => setTweak('motion', v)} />
    </TweaksPanel>
  );
}

// ── App shell ─────────────────────────────────────────────────────────
function DesktopApp() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const data = useAppData();
  const [route, setRoute] = React.useState('home');
  const [addOpen, setAddOpen] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const scale = useScale(WIN_W, WIN_H);

  const theme = React.useMemo(() => makeTheme(tw.accent), [tw.accent]);
  GOALS.kcal = tw.kcalGoal;
  const dispFont = FONTS[tw.displayFont] || FONTS.Grotesk;
  const notify = (msg) => { setToast(msg); clearTimeout(notify._t); notify._t = setTimeout(() => setToast(null), 2200); };
  const openTweaks = () => window.postMessage({ type: '__activate_edit_mode' }, '*');

  const views = {
    home: <HomeView data={data} onAdd={() => setAddOpen(true)} go={setRoute} />,
    diary: <DiaryView data={data} onAdd={() => setAddOpen(true)} />,
    insights: <InsightsView data={data} />,
    plan: <PlanView data={data} />,
    coach: <CoachView data={data} addFood={data.addFood} notify={notify} />,
  };

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={{ '--display': dispFont, fontFamily: "'Manrope', sans-serif", display: 'flex',
        width: '100vw', height: '100vh', background: theme.bg, color: theme.text, position: 'fixed', inset: 0, overflow: 'hidden' }}>
        <Sidebar route={route} go={setRoute} openTweaks={openTweaks} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <DeskTopBar route={route} onAdd={() => setAddOpen(true)} />
          <div key={route + (tw.motion ? '' : 'static')} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 36px',
            animation: tw.motion ? 'dropIn .42s cubic-bezier(.22,1,.3,1)' : 'none' }}>
            {views[route]}
          </div>
        </div>
        <AddModal open={addOpen} onClose={() => setAddOpen(false)} addFood={data.addFood} notify={notify} />
        <Toast toast={toast} />
        <AppTweaks tw={tw} setTweak={setTweak} />
      </div>
    </ThemeCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<DesktopApp />);

