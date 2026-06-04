// screens-home.jsx — Home (Main) + Diary. Exports: HomeScreen, DiaryScreen, TopBar, MacroChips

function TopBar({ left, title, go, showProfile = true, extra }) {
  const t = useTheme();
  const [profile] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('tf-design-profile') || 'null') || {}; }
    catch { return {}; }
  });
  const initial = (profile.name || 'A').trim().charAt(0).toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, background: 'transparent', border: 'none' }}>
      <button onClick={() => go && go('home')} style={{ border: 'none', background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', gap: 10, color: t.text, fontFamily: 'inherit' }}>
        {left || <LogoBadge size={34} radius={11} />}
        <span style={{ color: t.text, fontWeight: 800, fontSize: title ? 18 : 14 }}>{title || 'FoodTrack AI'}</span>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {extra}
        {showProfile && (
          <button onClick={() => go && go('profile')} aria-label="Open profile" style={{ border: 'none', background: 'transparent', padding: 0, color: t.text, display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}>
            <span style={{ width: 34, height: 34, borderRadius: 99, background: 'linear-gradient(135deg,#dfeee3,#a9cdb9)', color: '#0A0E16', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{initial}</span>
          </button>
        )}
      </div>
    </div>
  );
}
function iconBtn(t) {
  return { width: 38, height: 38, borderRadius: 12, background: t.panel, border: `1px solid ${t.line}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function MacroChips({ totals }) {
  const t = useTheme();
  const items = [
    { k: 'protein', v: totals.protein, g: GOALS.protein },
    { k: 'carbs', v: totals.carbs, g: GOALS.carbs },
    { k: 'fat', v: totals.fat, g: GOALS.fat },
    { k: 'fiber', v: totals.fiber, g: GOALS.fiber },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
      {items.map(({ k, v, g }) => {
        const m = MACROS[k]; const pct = Math.min(100, (v / g) * 100);
        return (
          <div key={k} style={{ background: t.panel, border: `1px solid ${t.line}`, borderRadius: 16, padding: '12px 10px' }}>
            <div style={{ color: t.muted, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{m.label}</div>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 17, fontFamily: 'var(--display)' }}>
              <CountUp value={v} />g
            </div>
            <div style={{ height: 5, borderRadius: 99, background: t.track, overflow: 'hidden', marginTop: 7 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: 99,
                transition: 'width .9s cubic-bezier(.16,1,.3,1)', boxShadow: `0 0 8px ${m.color}66` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HomeScreen({ go, data, openAdd }) {
  const t = useTheme();
  const { totals } = data;
  const pct = Math.min(100, Math.round((totals.kcal / GOALS.kcal) * 100));
  const left = Math.max(0, GOALS.kcal - totals.kcal);
  const meals = MEALS.map(m => ({ ...m, items: data.log.filter(i => i.mealId === m.id) }));

  const quick = [
    { eyebrow: 'Diary', title: 'Log meals', sub: `${totals.count} meals today`, icon: 'diary', go: () => go('diary') },
    { eyebrow: 'Food DB', title: 'Add product', sub: '24K products indexed', icon: 'search', go: () => openAdd('breakfast') },
    { eyebrow: 'Calendar', title: 'Plan day', sub: `${data.plans.length} plans`, icon: 'calendar', go: () => go('plan') },
    { eyebrow: 'Scan', title: 'Barcode / photo', sub: 'Camera scan', icon: 'camera', go: () => openAdd('lunch', 'scan') },
  ];

  return (
    <div>
      <TopBar go={go} title="Today" />
      <div className="motion-soft-rise">
        <Eyebrow>Today · {todayLabel()}</Eyebrow>
      </div>
      <div className="motion-soft-rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 16, animationDelay: '.03s' }}>
        <h1 style={{ margin: 0, color: t.text, fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>Control room</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.panel, border: `1px solid ${t.line}`,
          borderRadius: 999, padding: '6px 11px' }}>
          <span style={{ color: '#FF8A4C', display: 'flex' }}><Icon name="flame" size={15} fill="solid" /></span>
          <span style={{ color: t.text, fontWeight: 800, fontSize: 13 }}>12</span>
          <span style={{ color: t.muted, fontSize: 12 }}>day streak</span>
        </div>
      </div>

      {/* Hero ring — Sauge forest feature card */}
      <div className="motion-soft-rise" style={{ background: t.feature, borderRadius: 28, padding: 22, marginBottom: 14, position: 'relative', overflow: 'hidden',
        boxShadow: t.glowShadow }}>
        <div style={{ position: 'absolute', right: -34, top: -34, width: 140, height: 140, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          <Ring pct={pct} size={150} stroke={13} color={t.featureRing} track={t.featureTrack}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 34, color: t.featureOn, lineHeight: 1 }}>
              <CountUp value={totals.kcal} />
            </div>
            <div style={{ color: t.featureMuted, fontSize: 12, fontWeight: 600, marginTop: 2 }}>kcal</div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.featureRing, fontWeight: 800, fontSize: 15, fontFamily: 'var(--display)' }}>{pct}% of goal</div>
            <div style={{ color: t.featureOn, fontWeight: 800, fontSize: 26, fontFamily: 'var(--display)', marginTop: 4, lineHeight: 1 }}>
              <CountUp value={left} />
            </div>
            <div style={{ color: t.featureMuted, fontSize: 13, marginTop: 2 }}>kcal left · goal {fmt(GOALS.kcal)}</div>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Eyebrow>Macro dashboard</Eyebrow>
          <button onClick={() => go('insights')} style={{ background: 'none', border: 'none', color: t.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
            Insights <Icon name="arrow" size={13} stroke={2.5} />
          </button>
        </div>
        <div className="motion-soft-rise" style={{ animationDelay: '.10s' }}><MacroChips totals={totals} /></div>
      </div>

      {/* Quick access */}
      <Eyebrow>Quick access</Eyebrow>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '10px 0 18px' }}>
        {quick.map((q, i) => (
          <Card key={i} className="motion-soft-rise" pad={15} onClick={q.go} style={{ minHeight: 104, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', animationDelay: `${0.13 + i * 0.035}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ color: t.muted, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>{q.eyebrow}</span>
              <span style={{ color: t.accent, display: 'flex' }}><Icon name={q.icon} size={18} stroke={2.2} /></span>
            </div>
            <div>
              <div style={{ color: t.text, fontWeight: 800, fontSize: 16 }}>{q.title}</div>
              <div style={{ color: t.faint, fontSize: 12, marginTop: 2 }}>{q.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Today's meals preview */}
      <Eyebrow>Logged today</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {meals.filter(m => m.items.length).map(m => (
          <Card key={m.id} className="motion-soft-rise" pad={14} onClick={() => go('diary')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: t.text, fontWeight: 700, fontSize: 14 }}>{m.label}</div>
                <div style={{ color: t.faint, fontSize: 12 }}>{m.items.map(i => i.food.name).join(' · ')}</div>
              </div>
              <div style={{ color: t.text, fontWeight: 800, fontSize: 15, fontFamily: 'var(--display)' }}>
                {fmt(totalsFromLog(m.items).kcal)}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function DiaryScreen({ go, data, openAdd, removeFood, updateFoodAmount }) {
  const t = useTheme();
  const { totals } = data;
  const pct = Math.min(100, Math.round((totals.kcal / GOALS.kcal) * 100));
  const left = Math.max(0, GOALS.kcal - totals.kcal);
  const [editing, setEditing] = React.useState(null);
  const saveEditedAmount = (grams) => {
    if (!editing) return;
    updateFoodAmount(editing.uid, grams);
    setEditing(null);
  };

  return (
    <div>
      <TopBar go={go} title="Diary" />

      <Card pad={20} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Ring pct={pct} size={118} stroke={11} glow={t.accentGlow}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 22, color: t.text }}>{pct}%</div>
          </Ring>
          <div style={{ flex: 1 }}>
            <Eyebrow>Today</Eyebrow>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 40, fontFamily: 'var(--display)', lineHeight: 1, marginTop: 2 }}>
              <CountUp value={totals.kcal} />
            </div>
            <div style={{ color: t.muted, fontSize: 13, marginTop: 4 }}>{fmt(left)} kcal left of {fmt(GOALS.kcal)}</div>
          </div>
        </div>
      </Card>

      {/* Macro bars */}
      <Card pad={18} style={{ marginBottom: 16 }}>
        <Eyebrow>Macro dashboard</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginTop: 14 }}>
          <MacroBar label="Protein" value={totals.protein} goal={GOALS.protein} color={MACROS.protein.color} />
          <MacroBar label="Carbs" value={totals.carbs} goal={GOALS.carbs} color={MACROS.carbs.color} delay={80} />
          <MacroBar label="Fat" value={totals.fat} goal={GOALS.fat} color={MACROS.fat.color} delay={160} />
          <MacroBar label="Fiber" value={totals.fiber} goal={GOALS.fiber} color={MACROS.fiber.color} delay={240} />
        </div>
      </Card>

      {/* Log by meal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Eyebrow>Food diary · log by meal</Eyebrow>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {MEALS.map(m => {
          const items = data.log.filter(i => i.mealId === m.id);
          const mt = totalsFromLog(items);
          return (
            <Card key={m.id} pad={0} style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{ width: 4, height: 34, borderRadius: 99, background: m.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: t.text, fontWeight: 800, fontSize: 16 }}>{m.label}</div>
                  <div style={{ color: t.faint, fontSize: 12 }}>{items.length ? `${fmt(mt.kcal)} kcal · ${items.length} item${items.length>1?'s':''}` : m.sub}</div>
                </div>
                <button onClick={() => openAdd(m.id)} style={{ width: 34, height: 34, borderRadius: 12, background: `${m.color}1f`,
                  border: `1px solid ${m.color}55`, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Icon name="plus" size={18} stroke={2.6} />
                </button>
              </div>
              {items.length > 0 && (
                <div style={{ borderTop: `1px solid ${t.line}` }}>
                  {items.map(it => (
                    <div key={it.uid} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px', borderBottom: `1px solid ${t.line}` }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: t.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>{it.food.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: t.text, fontWeight: 600, fontSize: 14 }}>{it.food.name}</div>
                        <div style={{ color: t.faint, fontSize: 12 }}>
                          {it.food.brand} · {it.food.quantityG ? `${it.food.quantityG}g · ` : ''}{it.food.priceTotal != null ? `${eur(it.food.priceTotal)} · ` : ''}{it.time}
                        </div>
                      </div>
                      <button onClick={() => setEditing(it)} aria-label={`Edit grams for ${it.food.name}`} style={{
                        border: `1px solid ${t.line2}`, background: t.elev, color: t.accent, borderRadius: 999,
                        padding: '7px 9px', minWidth: 56, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {it.food.quantityG || it.food.servingG || 100}g
                      </button>
                      <div style={{ color: t.text, fontWeight: 700, fontSize: 14, fontFamily: 'var(--display)' }}>{it.food.kcal}</div>
                      <button onClick={() => removeFood(it.uid)} style={{ background: 'none', border: 'none', color: t.faint, cursor: 'pointer', display: 'flex', padding: 4 }}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <PortionSheet
        open={!!editing}
        food={editing?.food}
        initialGrams={editing?.food?.quantityG || editing?.food?.servingG || 100}
        title="Edit grams"
        confirmLabel="Save amount"
        onConfirm={saveEditedAmount}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

Object.assign(window, { HomeScreen, DiaryScreen, TopBar, MacroChips });
