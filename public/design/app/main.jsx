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
  React.useEffect(() => {
    clearLegacyDesignCache();
  }, []);

  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState({ screen: 'home', params: {} });
  const [entered, setEntered] = React.useState(() => localStorage.getItem('tf-design-session') === 'active');
  const [authMode, setAuthMode] = React.useState('signup');
  const [authForm, setAuthForm] = React.useState({ name: '', email: '', password: '', weightKg: '', heightCm: '', diet: 'balanced' });
  const [authBusy, setAuthBusy] = React.useState(false);
  const [profile, setProfile] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('tf-design-profile') || 'null') || {}; }
    catch { return {}; }
  });
  const [toast, setToast] = React.useState(null);
  const [fabPulse, setFabPulse] = React.useState(false);
  const data = useAppData(entered ? profile.email : 'guest');

  const theme = React.useMemo(() => makeTheme(tw.accent), [tw.accent]);
  GOALS.kcal = profile.calorieGoal || tw.kcalGoal; // live goal

  const go = (screen, params = {}) => setRoute({ screen, params });
  const openAdd = (mealId, mode = 'search') => go('add', { mealId, mode });
  const triggerAdd = (mealId, mode = 'search') => {
    setFabPulse(true);
    clearTimeout(triggerAdd._t);
    triggerAdd._t = setTimeout(() => setFabPulse(false), 360);
    openAdd(mealId, mode);
  };
  const notify = (msg) => { setToast(safeText(msg)); clearTimeout(notify._t); notify._t = setTimeout(() => setToast(null), 2200); };
  const openTweaks = () => window.postMessage({ type: '__activate_edit_mode' }, '*');
  const clearDeviceSession = () => {
    localStorage.removeItem('tf-design-session');
    localStorage.removeItem('tf-design-profile');
    localStorage.removeItem('tf-auth-token');
    localStorage.removeItem('trackfoodai-token');
    sessionStorage.removeItem('tf-design-session');
    if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
    if ('caches' in window) caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
  };
  const submitAuth = async (event) => {
    event.preventDefault();
    if (authBusy) return;
    const formError = authFormError(authMode, authForm);
    if (formError) {
      notify(formError);
      return;
    }
    const email = authForm.email.trim().toLowerCase();
    const nextProfile = {
      name: authMode === 'signup' ? authForm.name.trim() : (profile.name || email.split('@')[0] || 'User'),
      email,
      weightKg: authMode === 'signup' ? Number(authForm.weightKg) : profile.weightKg,
      heightCm: authMode === 'signup' ? Number(authForm.heightCm) : profile.heightCm,
      diet: authMode === 'signup' ? authForm.diet : profile.diet,
    };
    if (authMode === 'signup') nextProfile.calorieGoal = estimateGoal(nextProfile);
    setAuthBusy(true);
    try {
      const finalProfile = await syncBackendAuth(authMode, authForm, nextProfile);
      const wasCreated = finalProfile._authCreated;
      if (authMode === 'signup' && wasCreated) clearAccountData(finalProfile.email);
      const cleanProfile = { ...finalProfile };
      delete cleanProfile._authCreated;
      setProfile(cleanProfile);
      localStorage.setItem('tf-design-session', 'active');
      localStorage.setItem('tf-design-profile', JSON.stringify(cleanProfile));
      setEntered(true);
      setRoute({ screen: 'home', params: {} });
      notify(wasCreated ? 'Account created' : 'Welcome back');
    } catch (error) {
      notify(safeText(error, 'Backend is not available'));
    } finally {
      setAuthBusy(false);
    }
  };
  const logout = () => {
    clearDeviceSession();
    setEntered(false);
    setAuthMode('login');
    setAuthForm(current => ({ ...current, password: '' }));
    setRoute({ screen: 'home', params: {} });
    notify('Signed out on this device');
  };

  const dispFont = FONTS[tw.displayFont] || FONTS.Grotesk;
  const rootStyle = { '--display': dispFont, fontFamily: "'Manrope', sans-serif" };

  const screens = {
    home:     <HomeScreen go={go} data={data} openAdd={openAdd} profile={profile} />,
    diary:    <DiaryScreen go={go} data={data} openAdd={openAdd} removeFood={data.removeFood} updateFoodAmount={data.updateFoodAmount} />,
    add:      <AddScreen go={go} data={data} addFood={data.addFood} notify={notify} initial={route.params} />,
    plan:     <PlanScreen go={go} data={data} />,
    coach:    <CoachScreen go={go} data={data} profile={profile} addFood={data.addFood} addPlan={data.addPlan} notify={notify} />,
    insights: <InsightsScreen go={go} data={data} />,
    profile:  <ProfileScreen go={go} data={data} profile={profile} openTweaks={openTweaks} onLogout={logout} notify={notify} />,
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
          <Welcome
            theme={theme}
            authMode={authMode}
            setAuthMode={setAuthMode}
            authForm={authForm}
            setAuthForm={setAuthForm}
            authBusy={authBusy}
            onSubmit={submitAuth}
          />
        ) : (
          <>
            <Screen routeKey={route.screen} motion={tw.motion} isCoach={route.screen === 'coach'}>
              {route.screen === 'coach'
                ? <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: 'calc(100% )' }}>{screens.coach}</div>
                : screens[route.screen]}
            </Screen>
            {/* bottom nav */}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40, paddingBottom: 'max(4px, env(safe-area-inset-bottom, 0px))',
              background: `linear-gradient(to top, ${theme.bg} 58%, transparent)`, pointerEvents: 'none' }}>
              <div style={{ margin: '0 16px', height: 58, borderRadius: 20, background: theme.panel2, border: `1px solid ${theme.line}`,
                boxShadow: '0 10px 30px rgba(80,70,40,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                position: 'relative', pointerEvents: 'auto' }}>
                {nav.map(n => {
                  if (n.fab) {
                    const on = route.screen === 'add';
                    return (
                      <button key={n.id} onClick={() => triggerAdd(route.params.mealId || 'breakfast')} style={{
                        width: 52, height: 52, borderRadius: 17, border: 'none', cursor: 'pointer', marginTop: -18,
                        background: theme.accent, color: theme.accentOn, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: `0 8px 24px ${theme.accentGlow}, 0 0 0 5px ${theme.bg}`,
                        transform: fabPulse ? 'translateY(-2px) scale(1.08)' : on ? 'scale(1.04)' : 'scale(1)',
                        transition: 'transform .32s cubic-bezier(.22,1,.3,1)' }}>
                        <span style={{
                          display: 'flex',
                          transform: fabPulse ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform .32s cubic-bezier(.22,1,.3,1)',
                        }}>
                          <Icon name="plus" size={26} stroke={2.6} />
                        </span>
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
        {!entered && <Toast toast={toast} />}
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
      padding: 'calc(8px + env(safe-area-inset-top, 0px)) calc(18px + env(safe-area-inset-right, 0px)) calc(88px + env(safe-area-inset-bottom, 0px)) calc(18px + env(safe-area-inset-left, 0px))',
      display: isCoach ? 'flex' : 'block', flexDirection: 'column',
      opacity: 1,
      transform: shown ? 'none' : 'translateY(14px) scale(.985)',
      transition: motion ? 'transform .48s cubic-bezier(.22,1,.3,1)' : 'none',
    }}>
      {children}
    </div>
  );
}

function Welcome({ theme, authMode, setAuthMode, authForm, setAuthForm, authBusy, onSubmit }) {
  const pct = 51;
  const macros = [{ k: 'protein', v: 94, g: 150 }, { k: 'carbs', v: 132, g: 250 }, { k: 'fat', v: 37, g: 72 }];
  const features = [
    { icon: 'camera', label: 'Snap a meal', sub: 'Photo or barcode' },
    { icon: 'chart', label: 'See macros', sub: 'Live breakdown' },
    { icon: 'coach', label: 'Get coached', sub: 'AI for real days' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
      padding: 'calc(14px + env(safe-area-inset-top, 0px)) calc(24px + env(safe-area-inset-right, 0px)) calc(18px + env(safe-area-inset-bottom, 0px)) calc(24px + env(safe-area-inset-left, 0px))',
      overflowY: 'auto',
      background: `radial-gradient(130% 65% at 100% 0%, ${theme.accentGlow} 0%, transparent 52%), ${theme.bg}` }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoBadge size={36} radius={12} />
          <span style={{ color: theme.text, fontWeight: 800, fontSize: 15 }}>static_lab</span>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: theme.muted, border: `1px solid ${theme.line}`, borderRadius: 999, padding: '5px 11px' }}>{nowTime()}</div>
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

      <form id="tf-auth-form" onSubmit={onSubmit} style={{ background: 'rgba(245,241,231,.72)', border: `1px solid ${theme.line}`, borderRadius: 22, padding: 14, marginTop: 18, boxShadow: theme.cardShadow, flexShrink: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: theme.elev, borderRadius: 999, padding: 4, marginBottom: 12 }}>
          {['signup','login'].map(mode => (
            <button key={mode} type="button" disabled={authBusy} onClick={() => setAuthMode(mode)} style={{ border: 'none', borderRadius: 999, padding: '10px 8px', background: authMode === mode ? theme.accent : 'transparent', color: authMode === mode ? theme.accentOn : theme.muted, fontWeight: 800, opacity: authBusy ? 0.65 : 1 }}>
              {mode === 'signup' ? 'Sign up' : 'Log in'}
            </button>
          ))}
        </div>
        {authMode === 'signup' && (
          <>
            <input value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" autoComplete="name" disabled={authBusy} style={authInput(theme)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={authForm.weightKg} onChange={e => setAuthForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="Weight kg" inputMode="decimal" autoComplete="off" disabled={authBusy} style={authInput(theme)} />
              <input value={authForm.heightCm} onChange={e => setAuthForm(f => ({ ...f, heightCm: e.target.value }))} placeholder="Height cm" inputMode="decimal" autoComplete="off" disabled={authBusy} style={authInput(theme)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 10 }}>
              {[
                ['balanced', 'Balance'],
                ['cut', 'Cut'],
                ['muscle', 'Muscle'],
              ].map(([id, label]) => (
                <button key={id} type="button" disabled={authBusy} onClick={() => setAuthForm(f => ({ ...f, diet: id }))} style={{ border: `1px solid ${authForm.diet === id ? theme.accent : theme.line2}`, borderRadius: 999, padding: '9px 6px', background: authForm.diet === id ? `${theme.accent}18` : theme.panel, color: authForm.diet === id ? theme.accent : theme.muted, fontWeight: 800, fontSize: 12, opacity: authBusy ? 0.65 : 1 }}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        <input value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false" disabled={authBusy} style={authInput(theme)} />
        <input value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" type="password" autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} minLength={8} maxLength={72} disabled={authBusy} style={authInput(theme)} />
        <Btn type="submit" full icon="arrow" disabled={authBusy} style={{ marginTop: 4 }}>{authBusy ? 'Working...' : (authMode === 'signup' ? 'Create account' : 'Log in')}</Btn>
      </form>

      <div style={{ marginTop: 'auto', minHeight: 14, flexShrink: 0 }} />
    </div>
  );
}

function estimateGoal(profile) {
  const weight = Number(profile.weightKg) || 72;
  const height = Number(profile.heightCm) || 178;
  const base = 10 * weight + 6.25 * height - 5 * 30 + 5;
  const balanced = Math.round(base * 1.45);
  if (profile.diet === 'cut') return Math.max(1200, Math.round(balanced - 350));
  if (profile.diet === 'muscle') return Math.round(balanced + 280);
  return balanced;
}

function safeText(value, fallback = 'Something went wrong') {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (value instanceof Error) return safeText(value.message, fallback);
  if (Array.isArray(value)) return value.map(item => safeText(item, '')).filter(Boolean).join(' ') || fallback;
  if (typeof value === 'object') {
    return safeText(value.detail || value.message || value.msg, fallback);
  }
  return String(value);
}

function detailText(detail, fallback) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map(item => {
      if (typeof item === 'string') return item;
      const loc = Array.isArray(item?.loc) ? item.loc.filter(part => part !== 'body').join(' ') : '';
      let msg = item?.msg || item?.message || item?.type || '';
      if (loc === 'password' && /at least 8/i.test(msg)) msg = 'Password must be at least 8 characters.';
      else if (loc === 'password' && /at most 72/i.test(msg)) msg = 'Password must be 72 characters or less.';
      else if (loc === 'email') msg = 'Enter a valid email address.';
      else if (loc === 'name' && /at least 2/i.test(msg)) msg = 'Name must be at least 2 characters.';
      else if (loc && msg) msg = `${loc}: ${msg}`;
      return safeText(msg, '');
    }).filter(Boolean);
    return parts.length ? parts.join(' ') : fallback;
  }
  return safeText(detail, fallback);
}

function authFormError(mode, form) {
  const email = form.email.trim().toLowerCase();
  const password = form.password || '';
  if (!email || !password.trim()) return mode === 'signup' ? 'Add email and password.' : 'Enter email and password.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password must be 72 characters or less.';
  if (mode === 'signup') {
    if (form.name.trim().length < 2) return 'Name must be at least 2 characters.';
    const weight = Number(form.weightKg);
    const height = Number(form.heightCm);
    if (!Number.isFinite(weight) || weight < 25 || weight > 350) return 'Check weight kg.';
    if (!Number.isFinite(height) || height < 90 || height > 260) return 'Check height cm.';
  }
  return '';
}

function clearAccountData(email) {
  const account = accountStorageId(email);
  ['log', 'plans', 'coach', 'coach-v2', 'week-stats'].forEach(area => localStorage.removeItem(accountStorageKey(account, area)));
}

function clearLegacyDesignCache() {
  ['tf-design-log', 'tf-design-plans', 'tf-design-coach', 'tf-design-coach-v2'].forEach(key => localStorage.removeItem(key));
}

async function syncBackendAuth(mode, form, profile) {
  const base = trackfoodApiBase();
  const path = mode === 'signup' ? '/api/v1/auth/register' : '/api/v1/auth/login';
  const payload = mode === 'signup'
    ? {
        name: profile.name,
        email: profile.email,
        password: form.password,
        calorie_goal: profile.calorieGoal,
        activity_level: 'balanced',
        weight_kg: profile.weightKg,
        height_cm: profile.heightCm,
        diet_type: profile.diet,
      }
    : { email: profile.email, password: form.password };
  const postAuth = async (targetPath, body) => {
    const response = await fetch(`${base}${targetPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(detailText(data.detail, `Backend auth failed (${response.status})`));
      error.status = response.status;
      error.detail = data.detail;
      throw error;
    }
    return data;
  };
  let data;
  let created = mode === 'signup';
  try {
    data = await postAuth(path, payload);
  } catch (error) {
    if (mode === 'signup' && error.status === 409) {
      data = await postAuth('/api/v1/auth/login', { email: profile.email, password: form.password });
      created = false;
    } else {
      throw error;
    }
  }
  localStorage.setItem('tf-auth-token', data.token);
  localStorage.setItem('trackfoodai-token', data.token);
  return {
    ...profile,
    name: data.profile.name,
    email: data.profile.email,
    weightKg: data.profile.weight_kg || profile.weightKg,
    heightCm: data.profile.height_cm || profile.heightCm,
    diet: data.profile.diet_type || profile.diet,
    calorieGoal: data.profile.calorie_goal || profile.calorieGoal,
    _authCreated: created,
  };
}

function authInput(theme) {
  return {
    width: '100%', border: `1px solid ${theme.line2}`, background: theme.panel, color: theme.text,
    borderRadius: 14, padding: '12px 13px', marginBottom: 8, outline: 'none', fontSize: 14, fontWeight: 650,
  };
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
