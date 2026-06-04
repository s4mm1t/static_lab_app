// main.jsx — App shell: theme provider, router, bottom nav, FAB, tweaks, welcome
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

function App() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const data = useAppData();
  const [route, setRoute] = React.useState({ screen: 'home', params: {} });
  const [entered, setEntered] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  const theme = React.useMemo(() => makeTheme(tw.accent), [tw.accent]);
  GOALS.kcal = tw.kcalGoal; // live goal

  const go = (screen, params = {}) => setRoute({ screen, params });
  const openAdd = (mealId, mode = 'search') => go('add', { mealId, mode });
  const notify = (msg) => { setToast(msg); clearTimeout(notify._t); notify._t = setTimeout(() => setToast(null), 2200); };
  const openTweaks = () => window.postMessage({ type: '__activate_edit_mode' }, '*');

  const dispFont = FONTS[tw.displayFont] || FONTS.Grotesk;
  const rootStyle = { '--display': dispFont, fontFamily: "'Manrope', sans-serif" };

  const screens = {
    home:     <HomeScreen go={go} data={data} openAdd={openAdd} />,
    diary:    <DiaryScreen go={go} data={data} openAdd={openAdd} removeFood={data.removeFood} />,
    add:      <AddScreen go={go} data={data} addFood={data.addFood} notify={notify} initial={route.params} />,
    plan:     <PlanScreen go={go} data={data} />,
    coach:    <CoachScreen go={go} data={data} addFood={data.addFood} addPlan={data.addPlan} notify={notify} />,
    insights: <InsightsScreen go={go} data={data} />,
    profile:  <ProfileScreen go={go} data={data} openTweaks={openTweaks} onLogout={() => setEntered(false)} notify={notify} />,
  };

  const nav = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'diary', icon: 'diary', label: 'Diary' },
    { id: 'add', fab: true, icon: 'plus' },
    { id: 'insights', icon: 'chart', label: 'Insights' },
    { id: 'coach', icon: 'coach', label: 'Coach' },
  ];

  return (
    <ThemeCtx.Provider value={theme}>
      <div style={{ ...rootStyle, position: 'fixed', inset: 0, width: '100%', height: '100%', background: theme.bg, color: theme.text, overflow: 'hidden' }}>
        {!entered ? (
          <Welcome onStart={() => setEntered(true)} theme={theme} />
        ) : (
          <>
            <Screen routeKey={route.screen} motion={tw.motion} isCoach={route.screen === 'coach'}>
              {route.screen === 'coach'
                ? <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: 'calc(100% )' }}>{screens.coach}</div>
                : screens[route.screen]}
            </Screen>

            {/* bottom nav */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40, paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
              background: `linear-gradient(to top, ${theme.bg} 58%, transparent)`, pointerEvents: 'none' }}>
              <div style={{ margin: '0 16px', height: 62, borderRadius: 22, background: theme.panel2, border: `1px solid ${theme.line}`,
                boxShadow: '0 10px 30px rgba(80,70,40,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                position: 'relative', pointerEvents: 'auto' }}>
                {nav.map(n => {
                  if (n.fab) {
                    const on = route.screen === 'add';
                    return (
                      <button key={n.id} onClick={() => openAdd(route.params.mealId || 'breakfast')} style={{
                        width: 54, height: 54, borderRadius: 18, border: 'none', cursor: 'pointer', marginTop: -22,
                        background: theme.accent, color: theme.accentOn, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 8px 24px ${theme.accentGlow}, 0 0 0 5px ${theme.bg}`,
                        transform: on ? 'scale(1.06) rotate(45deg)' : 'scale(1)', transition: 'transform .35s cubic-bezier(.22,1,.3,1)' }}>
                        <Icon name="plus" size={26} stroke={2.6} />
                      </button>
                    );
                  }
                  const on = route.screen === n.id;
                  return (
                    <button key={n.id} onClick={() => go(n.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 3, padding: '6px 8px', flex: 1, color: on ? theme.accent : theme.faint, transition: 'color .2s' }}>
                      <Icon name={n.icon} size={22} stroke={on ? 2.5 : 2} />
                      <span style={{ fontSize: 10, fontWeight: 700 }}>{n.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Toast toast={toast} />
          </>
        )}
        {entered && <AppTweaks tw={tw} setTweak={setTweak} />}
      </div>
    </ThemeCtx.Provider>
  );
}

// Capture-safe screen wrapper: rests at opacity 1, animates IN via transition on mount
function Screen({ children, routeKey, motion, isCoach }) {
  const [shown, setShown] = React.useState(!motion);
  React.useEffect(() => {
    if (!motion) { setShown(true); return; }
    setShown(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, [routeKey, motion]);
  return (
    <div key={routeKey} style={{
      position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
      padding: 'calc(14px + env(safe-area-inset-top, 0px)) calc(18px + env(safe-area-inset-right, 0px)) calc(110px + env(safe-area-inset-bottom, 0px)) calc(18px + env(safe-area-inset-left, 0px))',
      display: isCoach ? 'flex' : 'block', flexDirection: 'column',
      opacity: 1,
      transform: shown ? 'none' : 'translateX(16px)',
      transition: motion ? 'transform .42s cubic-bezier(.22,1,.3,1)' : 'none',
    }}>
      {children}
    </div>
  );
}

function Welcome({ onStart, theme }) {
  const pct = 51;
  const macros = [{ k: 'protein', v: 94, g: 150 }, { k: 'carbs', v: 132, g: 250 }, { k: 'fat', v: 37, g: 72 }];
  const features = [
    { icon: 'camera', label: 'Snap a meal', sub: 'Photo or barcode' },
    { icon: 'chart', label: 'See macros', sub: 'Live breakdown' },
    { icon: 'coach', label: 'Get coached', sub: 'AI for real days' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
      padding: 'calc(56px + env(safe-area-inset-top, 0px)) calc(24px + env(safe-area-inset-right, 0px)) calc(30px + env(safe-area-inset-bottom, 0px)) calc(24px + env(safe-area-inset-left, 0px))',
      overflowY: 'auto',
      background: `radial-gradient(130% 65% at 100% 0%, ${theme.accentGlow} 0%, transparent 52%), ${theme.bg}` }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoBadge size={36} radius={12} />
          <span style={{ color: theme.text, fontWeight: 800, fontSize: 15 }}>FoodTrack AI</span>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: theme.muted, border: `1px solid ${theme.line}`, borderRadius: 999, padding: '5px 11px' }}>DEMO</div>
      </div>

      {/* product hero preview — fills the upper space */}
      <div style={{ background: theme.feature, borderRadius: 26, padding: 20, marginTop: 20, position: 'relative', overflow: 'hidden', boxShadow: theme.glowShadow, flexShrink: 0 }}>
        <div style={{ position: 'absolute', right: -28, top: -28, width: 120, height: 120, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          <Ring pct={pct} size={102} stroke={10} color={theme.featureRing} track={theme.featureTrack}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 21, color: theme.featureOn, lineHeight: 1 }}>{pct}%</div>
            <div style={{ color: theme.featureMuted, fontSize: 9.5, fontWeight: 600, letterSpacing: 1.2, marginTop: 3 }}>OF GOAL</div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ color: theme.featureOn, fontWeight: 800, fontSize: 27, fontFamily: 'var(--display)', lineHeight: 1 }}>1,232 <span style={{ fontSize: 13, color: theme.featureMuted, fontWeight: 600 }}>kcal</span></div>
            <div style={{ color: theme.featureMuted, fontSize: 12, marginTop: 4 }}>1,168 left of 2,400</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 13 }}>
              {macros.map(m => (
                <div key={m.k} style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, m.v / m.g * 100)}%`, background: MACROS[m.k].color, borderRadius: 99 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* copy */}
      <div style={{ color: theme.accent, fontSize: 12, fontWeight: 700, letterSpacing: 1.4, marginTop: 24, flexShrink: 0 }}>CAMERA-FIRST NUTRITION</div>
      <h1 style={{ margin: '9px 0 0', color: theme.text, fontFamily: 'var(--display)', fontSize: 31, fontWeight: 700, lineHeight: 1.06, letterSpacing: -0.7, flexShrink: 0 }}>
        Log what you ate.<br /><span style={{ color: theme.accent }}>See what changed.</span>
      </h1>
      <p style={{ color: theme.muted, fontSize: 14, lineHeight: 1.5, margin: '12px 0 0', flexShrink: 0 }}>
        Turn a meal into a calm daily picture — calories, macros, and a coach built for real mornings.
      </p>

      {/* feature row */}
      <div style={{ display: 'flex', gap: 8, marginTop: 18, flexShrink: 0 }}>
        {features.map(f => (
          <div key={f.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 16, padding: '13px 12px' }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: `${theme.accent}18`, color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={f.icon} size={17} stroke={2.2} /></span>
            <div>
              <div style={{ color: theme.text, fontSize: 12.5, fontWeight: 800, lineHeight: 1.1 }}>{f.label}</div>
              <div style={{ color: theme.faint, fontSize: 10.5, marginTop: 3 }}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* recently logged preview — fills the lower space */}
      <div style={{ marginTop: 18, flexShrink: 0 }}>
        <div style={{ color: theme.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.4, marginBottom: 9 }}>RECENTLY LOGGED</div>
        <div style={{ background: theme.panel, border: `1px solid ${theme.line}`, borderRadius: 18, overflow: 'hidden' }}>
          {[{ e: '🥣', n: 'Greek yogurt bowl', t: 'Breakfast · 08:12', k: 320 },
            { e: '🍗', n: 'Chicken rice bowl', t: 'Lunch · 13:40', k: 612 }].map((m, i) => (
            <div key={m.n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: i ? `1px solid ${theme.line}` : 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: theme.elev, border: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.e}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: theme.text, fontWeight: 700, fontSize: 14 }}>{m.n}</div>
                <div style={{ color: theme.faint, fontSize: 12, marginTop: 1 }}>{m.t}</div>
              </div>
              <div style={{ color: theme.text, fontWeight: 800, fontSize: 15, fontFamily: 'var(--display)' }}>{m.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs pinned to bottom */}
      <div style={{ marginTop: 'auto', paddingTop: 18, flexShrink: 0 }}>
        <Btn full onClick={onStart} icon="arrow" style={{ marginBottom: 10 }}>Get started</Btn>
        <button onClick={onStart} style={{ width: '100%', background: 'none', border: 'none', color: theme.muted, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Explore the demo →</button>
      </div>
    </div>
  );
}

function AppTweaks({ tw, setTweak }) {
  const t = useTheme();
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
      <TweakRadio label="Numbers & titles" value={tw.displayFont}
        options={['Grotesk', 'Bricolage', 'Archivo']}
        onChange={(v) => setTweak('displayFont', v)} />
      <TweakSection label="Daily goal" />
      <TweakSlider label="Calorie goal" value={tw.kcalGoal} min={1500} max={4000} step={50} unit=" kcal"
        onChange={(v) => setTweak('kcalGoal', v)} />
      <TweakSection label="Motion" />
      <TweakToggle label="Screen animations" value={tw.motion} onChange={(v) => setTweak('motion', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
