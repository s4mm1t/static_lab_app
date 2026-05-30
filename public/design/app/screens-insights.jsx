// screens-insights.jsx — Insights + Profile. Exports: InsightsScreen, ProfileScreen

function InsightsScreen({ go, data }) {
  const t = useTheme();
  const { totals } = data;
  const pct = Math.min(100, Math.round((totals.kcal / GOALS.kcal) * 100));
  const left = Math.max(0, GOALS.kcal - totals.kcal);
  const week = [
    { d: 'Sa', v: 2180 }, { d: 'Su', v: 1740 }, { d: 'Mo', v: 2390 }, { d: 'Tu', v: 2050 },
    { d: 'We', v: 2260 }, { d: 'Th', v: totals.kcal }, { d: 'Fr', v: 0 },
  ];
  const maxV = Math.max(GOALS.kcal, ...week.map(w => w.v));
  const avg = Math.round(week.slice(0, 6).reduce((a, b) => a + b.v, 0) / 6);

  const [meal, setMeal] = React.useState('Yogur Danone con avena, banana y miel');
  const [match, setMatch] = React.useState(null);
  const [matching, setMatching] = React.useState(false);
  const runMatch = () => {
    setMatching(true); setMatch(null);
    setTimeout(() => { setMatching(false); setMatch({ kcal: 412, protein: 22, carbs: 58, fat: 11, fiber: 6 }); }, 1600);
  };

  return (
    <div>
      <TopBar go={go} title="Insights" />

      {/* Today's signal */}
      <Card glow pad={20} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <Eyebrow>Stats</Eyebrow>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 22 }}>Today's signal</div>
          </div>
          <div style={{ color: t.accent, fontWeight: 800, fontSize: 38, fontFamily: 'var(--display)', lineHeight: 1 }}>{pct}%</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Ring pct={pct} size={104} stroke={10} glow={t.accentGlow}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: t.text }}>{fmt(totals.kcal)}</div>
            <div style={{ color: t.faint, fontSize: 10 }}>kcal</div>
          </Ring>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
            <MacroBar label="Protein" value={totals.protein} goal={GOALS.protein} color={MACROS.protein.color} />
            <MacroBar label="Carbs" value={totals.carbs} goal={GOALS.carbs} color={MACROS.carbs.color} delay={80} />
            <MacroBar label="Fat" value={totals.fat} goal={GOALS.fat} color={MACROS.fat.color} delay={160} />
          </div>
        </div>
      </Card>

      {/* stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginBottom: 14 }}>
        {[['7-day avg', fmt(avg), 'kcal'], ['Consistency', '6/7', 'days'], ['Balance', fmt(left), 'left']].map(([l, v, s]) => (
          <Card key={l} pad={13}>
            <div style={{ color: t.muted, fontSize: 11, fontWeight: 700 }}>{l}</div>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 19, fontFamily: 'var(--display)', marginTop: 5 }}>{v}</div>
            <div style={{ color: t.faint, fontSize: 11 }}>{s}</div>
          </Card>
        ))}
      </div>

      {/* weekly chart */}
      <Card pad={18} style={{ marginBottom: 14 }}>
        <Eyebrow>This week · kcal</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 16 }}>
          {week.map((w, i) => {
            const h = Math.max(4, (w.v / maxV) * 100);
            const isToday = w.d === 'Th';
            return (
              <div key={w.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ width: '100%', height: `${h}%`, borderRadius: 7, transformOrigin: 'bottom',
                    background: isToday ? t.accent : w.v ? 'rgba(43,42,35,0.2)' : t.track,
                    boxShadow: isToday ? `0 0 12px ${t.accentGlow}` : 'none', alignSelf: 'flex-end',
                    animation: `growBar .8s cubic-bezier(.16,1,.3,1) ${i*0.06}s both` }} />
                </div>
                <span style={{ color: isToday ? t.accent : t.faint, fontSize: 11, fontWeight: 700 }}>{w.d}</span>
              </div>
            );
          })}
        </div>
        {/* goal line label */}
        <div style={{ color: t.faint, fontSize: 11, marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 2, background: t.accent, borderRadius: 2 }} /> Goal {fmt(GOALS.kcal)} kcal
        </div>
      </Card>

      {/* Nutrition match */}
      <Card pad={18} style={{ marginBottom: 14 }}>
        <Eyebrow>Nutrition match</Eyebrow>
        <div style={{ color: t.text, fontWeight: 800, fontSize: 18, margin: '4px 0 12px' }}>Describe a meal</div>
        <textarea value={meal} onChange={e => setMeal(e.target.value)} rows={2}
          style={{ ...inputStyle(t), resize: 'none', lineHeight: 1.4 }} />
        <Btn full variant="light" onClick={runMatch} style={{ marginTop: 12 }}>{matching ? 'Estimating…' : 'Match nutrition'}</Btn>
        {matching && (
          <div style={{ marginTop: 12, height: 4, borderRadius: 99, background: t.elev, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '40%', background: t.accent, borderRadius: 99, animation: 'indet 1.2s ease-in-out infinite' }} />
          </div>
        )}
        {match && (
          <div style={{ marginTop: 14, animation: 'dropIn .4s cubic-bezier(.22,1,.3,1)' }}>
            <div style={{ color: t.accent, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>AI ESTIMATE · per serving</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7 }}>
              {[['kcal', match.kcal, t.accent], ['P', match.protein, MACROS.protein.color], ['C', match.carbs, MACROS.carbs.color], ['F', match.fat, MACROS.fat.color], ['Fb', match.fiber, MACROS.fiber.color]].map(([l, v, c]) => (
                <div key={l} style={{ background: t.elev, borderRadius: 11, padding: '10px 4px', textAlign: 'center' }}>
                  <div style={{ color: c, fontWeight: 800, fontSize: 15, fontFamily: 'var(--display)' }}>{v}</div>
                  <div style={{ color: t.faint, fontSize: 10 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Scanner status */}
      <Card pad={18}>
        <Eyebrow>Scanner status</Eyebrow>
        <div style={{ color: t.text, fontWeight: 800, fontSize: 18, margin: '4px 0 4px' }}>Ready to scan</div>
        <div style={{ color: t.faint, fontSize: 13, marginBottom: 14 }}>Barcode search for exact products, or photo for AI estimate.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
          {[['Products', '24K', 'indexed'], ['Estimate', 'Live', 'AI v2'], ['Source', 'DB', 'local + cloud']].map(([l, v, s]) => (
            <div key={l} style={{ background: t.elev, borderRadius: 13, padding: '12px 10px' }}>
              <div style={{ color: t.muted, fontSize: 11, fontWeight: 700 }}>{l}</div>
              <div style={{ color: t.text, fontWeight: 800, fontSize: 17, fontFamily: 'var(--display)', marginTop: 4 }}>{v}</div>
              <div style={{ color: t.faint, fontSize: 11 }}>{s}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ProfileScreen({ go, data, openTweaks }) {
  const t = useTheme();
  const { totals } = data;
  const left = Math.max(0, GOALS.kcal - totals.kcal);
  const stats = [
    ['Today', fmt(totals.kcal), `${fmt(left)} kcal left`],
    ['Meals', String(totals.count), 'logged today'],
    ['Plans', String(data.plans.length), dateKey(0)],
    ['Routine', 'Balanced', 'activity'],
  ];
  return (
    <div>
      <TopBar go={go} title="Profile" showProfile={false} />

      <Card pad={20} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#dfeee3,#a9cdb9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 26, color: '#0A0E16' }}>P</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow>Member profile</Eyebrow>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 20, overflow: 'hidden', textOverflow: 'ellipsis' }}>pidor</div>
            <div style={{ color: t.faint, fontSize: 13 }}>pi***@gmail.com</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
          <Btn variant="ghost" size="sm" style={{ flex: 1 }}>Change avatar</Btn>
          <Btn variant="danger" size="sm" style={{ flex: 1 }}>Log out</Btn>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 14 }}>
        {stats.map(([l, v, s]) => (
          <Card key={l} pad={14}>
            <div style={{ color: t.muted, fontSize: 11, fontWeight: 700 }}>{l}</div>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 20, fontFamily: 'var(--display)', marginTop: 4 }}>{v}</div>
            <div style={{ color: t.faint, fontSize: 11 }}>{s}</div>
          </Card>
        ))}
      </div>

      {/* theme shortcut → tweaks */}
      <Card pad={16} onClick={openTweaks} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${t.accent}1c`, border: `1px solid ${t.accent}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accent }}><Icon name="sliders" size={20} stroke={2.2} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ color: t.text, fontWeight: 700, fontSize: 15 }}>Appearance</div>
            <div style={{ color: t.faint, fontSize: 12 }}>Accent: {t.accentName} · open Tweaks</div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            {Object.values(PALETTES).slice(0, 4).map(p => <span key={p.name} style={{ width: 14, height: 14, borderRadius: 99, background: p.hex, border: p.hex === t.accent ? `2px solid ${t.text}` : 'none' }} />)}
          </div>
        </div>
      </Card>

      <Card pad={16} style={{ marginBottom: 14 }}>
        <Eyebrow>Account</Eyebrow>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[['Phone linked', '+34 676 76 76 67'], ['Email', 'pi***@gmail.com'], ['Units', 'Metric · grams / kg'], ['Display name', 'pidor']].map(([l, v], i, arr) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: i < arr.length - 1 ? `1px solid ${t.line}` : 'none' }}>
              <span style={{ color: t.muted, fontSize: 14 }}>{l}</span>
              <span style={{ color: t.text, fontWeight: 600, fontSize: 14 }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card pad={16}>
        <Eyebrow>Privacy</Eyebrow>
        <div style={{ color: t.text, fontWeight: 700, fontSize: 15, margin: '6px 0 3px' }}>Account data</div>
        <div style={{ color: t.faint, fontSize: 12, marginBottom: 13 }}>Export your profile, diary, plans, and coach contexts.</div>
        <div style={{ display: 'flex', gap: 9 }}>
          <Btn variant="ghost" size="sm" style={{ flex: 1 }}>Export JSON</Btn>
          <Btn variant="danger" size="sm" style={{ flex: 1 }}>Sign out device</Btn>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { InsightsScreen, ProfileScreen });
