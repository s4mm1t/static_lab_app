// directions3.jsx — third set, all light & elegant (per liked E·Mist + G·Sauge). Exports: DirI, DirJ, DirK, DirL

const D3 = {
  kcal: 1232, goal: 2400, pct: 51,
  macros: [{ l: 'Protein', v: 94, g: 150 }, { l: 'Carbs', v: 132, g: 250 }, { l: 'Fat', v: 37, g: 72 }],
  meals: [
    { l: 'Breakfast', d: 'Greek yogurt bowl · Cold brew', k: 410, e: '🥣' },
    { l: 'Lunch', d: 'Chicken rice bowl', k: 612, e: '🍗' },
    { l: 'Snack', d: 'Protein bar', k: 210, e: '🍫' },
  ],
};
function Ri({ pct, size = 132, stroke = 10, color, track, cap = 'round', children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap={cap} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}
function Sbi({ color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0', fontSize: 13, fontWeight: 700, color }}>
      <span>9:41</span><span style={{ fontSize: 11, opacity: 0.7 }}>● ◗ ▮</span>
    </div>
  );
}
function Fri({ bg, children }) {
  return (
    <div style={{ width: 360, height: 760, borderRadius: 44, overflow: 'hidden', position: 'relative', background: bg, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', border: '1px solid rgba(0,0,0,0.15)' }}>{children}</div>
  );
}
// shared light macro row
function MacroRow3({ cardStyle, ink, muted, cols }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {D3.macros.map((m, i) => (
        <div key={m.l} style={{ ...cardStyle, flex: 1, padding: '14px 13px' }}>
          <div style={{ fontSize: 19, color: ink, fontWeight: 700 }}>{m.v}<span style={{ fontSize: 11, color: muted }}>g</span></div>
          <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{m.l}</div>
          <div style={{ height: 5, borderRadius: 9, background: 'rgba(0,0,0,0.06)', marginTop: 9, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: cols[i], borderRadius: 9 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
function MealList3({ ink, muted, line, tint }) {
  return (
    <div>
      {D3.meals.map((m, i) => (
        <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: i < 2 ? `1px solid ${line}` : 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.e}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: ink, fontWeight: 600 }}>{m.l}</div>
            <div style={{ fontSize: 11, color: muted }}>{m.d}</div>
          </div>
          <div style={{ fontSize: 15, color: ink, fontWeight: 700 }}>{m.k}</div>
        </div>
      ))}
    </div>
  );
}

// ── I — SKY · fresh light, sky-blue + mint, frosted ───────────────────
function DirI() {
  const bg = 'linear-gradient(170deg, #ECF4FA 0%, #DCECF3 100%)';
  const ink = '#22323F', muted = '#7E909C', sky = '#2C8FD6', mint = '#37B596';
  const glass = 'rgba(255,255,255,0.78)', border = 'rgba(34,50,63,0.07)';
  const card = { background: glass, border: `1px solid ${border}`, borderRadius: 26, backdropFilter: 'blur(14px)', boxShadow: '0 10px 30px rgba(44,143,214,0.08)' };
  return (
    <Fri bg={bg}>
      <Sbi color={ink} />
      <div style={{ padding: '12px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Thursday, May 29</div>
            <div style={{ fontSize: 25, color: ink, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>Fresh start</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 99, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sky, fontWeight: 700 }}>P</div>
        </div>
        <div style={{ ...card, marginTop: 18, padding: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Ri pct={D3.pct} size={120} stroke={11} color={sky} track="rgba(34,50,63,0.07)">
            <div style={{ fontSize: 29, color: ink, fontWeight: 700, letterSpacing: -0.5 }}>{D3.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: muted, letterSpacing: 1 }}>kcal</div>
          </Ri>
          <div style={{ flex: 1 }}>
            <div style={{ color: mint, fontSize: 13, fontWeight: 700 }}>{D3.pct}% of goal</div>
            <div style={{ fontSize: 27, color: ink, fontWeight: 700, marginTop: 4, letterSpacing: -0.5 }}>1,168</div>
            <div style={{ fontSize: 12, color: muted }}>kcal remaining today</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}><MacroRow3 cardStyle={card} ink={ink} muted={muted} cols={[sky, mint, '#F0935B']} /></div>
        <div style={{ fontSize: 12, color: muted, fontWeight: 600, marginTop: 20, marginBottom: 9 }}>Today's meals</div>
        <div style={{ ...card, padding: '6px 14px' }}><MealList3 ink={ink} muted={muted} line={border} tint="rgba(44,143,214,0.1)" /></div>
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28 }}>
        <div style={{ background: sky, color: '#fff', fontWeight: 700, fontSize: 15, textAlign: 'center', padding: '15px', borderRadius: 99, boxShadow: '0 10px 26px rgba(44,143,214,0.4)' }}>+  Add food</div>
      </div>
    </Fri>
  );
}

// ── J — MATCHA · bright white + matcha green, clean wellness ───────────
function DirJ() {
  const bg = '#F4F2EA', ink = '#262A22', muted = '#82856E', matcha = '#6A9A2E', deep = '#4E7A22';
  const line = 'rgba(38,42,34,0.09)', card = { background: '#FBFAF4', border: `1px solid ${line}`, borderRadius: 24, boxShadow: '0 8px 24px rgba(80,90,40,0.06)' };
  return (
    <Fri bg={bg}>
      <Sbi color={ink} />
      <div style={{ padding: '12px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: matcha, fontWeight: 700, letterSpacing: 0.5 }}>THU · MAY 29</div>
            <div style={{ fontSize: 26, color: ink, fontWeight: 700, letterSpacing: -0.4, marginTop: 2 }}>Fuel up, pi</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: matcha, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F4F2EA', fontWeight: 800 }}>P</div>
        </div>
        <div style={{ background: 'linear-gradient(160deg, #6FA12E, #557F22)', borderRadius: 28, padding: 24, marginTop: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -24, bottom: -30, width: 120, height: 120, borderRadius: 99, background: 'rgba(255,255,255,0.07)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
            <Ri pct={D3.pct} size={118} stroke={11} color="#EAF3D6" track="rgba(255,255,255,0.18)">
              <div style={{ fontSize: 28, color: '#FBFAF4', fontWeight: 700, letterSpacing: -0.5 }}>{D3.kcal.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#D5E4B5', letterSpacing: 1 }}>kcal</div>
            </Ri>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#E7F2CE', fontSize: 13, fontWeight: 700 }}>{D3.pct}% of goal</div>
              <div style={{ fontSize: 28, color: '#FBFAF4', fontWeight: 700, marginTop: 3, letterSpacing: -0.5 }}>1,168</div>
              <div style={{ fontSize: 12, color: '#BFD49A' }}>kcal left of {D3.goal.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}><MacroRow3 cardStyle={card} ink={ink} muted={muted} cols={[matcha, '#88B04B', '#D08A3E']} /></div>
        <div style={{ fontSize: 11, color: deep, fontWeight: 700, letterSpacing: 0.5, marginTop: 20, marginBottom: 4 }}>LOGGED TODAY</div>
        <MealList3 ink={ink} muted={muted} line={line} tint="rgba(106,154,46,0.12)" />
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28 }}>
        <div style={{ background: ink, color: bg, fontWeight: 700, fontSize: 15, textAlign: 'center', padding: '15px', borderRadius: 99 }}>+  Add food</div>
      </div>
    </Fri>
  );
}

// ── K — LINEN · warm minimal, terracotta, serif numerals ──────────────
function DirK() {
  const bg = '#ECE7DD', ink = '#2E2A23', muted = '#8C8473', terra = '#BF6038', line = 'rgba(46,42,35,0.12)';
  const serif = "'Newsreader', Georgia, serif";
  return (
    <Fri bg={bg}>
      <Sbi color={ink} />
      <div style={{ padding: '10px 26px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: terra, fontWeight: 700 }}>THURSDAY · MAY 29</div>
            <div style={{ fontFamily: serif, fontSize: 30, color: ink, fontStyle: 'italic', fontWeight: 500, marginTop: 3 }}>A balanced day</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontStyle: 'italic', color: ink }}>p</div>
        </div>
        <div style={{ borderTop: `1px solid ${line}`, marginTop: 18, paddingTop: 22, display: 'flex', alignItems: 'center', gap: 20 }}>
          <Ri pct={D3.pct} size={128} stroke={6} color={terra} track={line} cap="butt">
            <div style={{ fontFamily: serif, fontSize: 38, color: ink, lineHeight: 1 }}>{D3.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: terra, marginTop: 4 }}>KCAL</div>
          </Ri>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, color: ink }}>1,168 left</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 4, lineHeight: 1.5 }}>of a {D3.goal.toLocaleString()} kcal day. Steady and unhurried.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 26, marginTop: 22, borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}`, padding: '16px 0' }}>
          {D3.macros.map(m => (
            <div key={m.l} style={{ flex: 1 }}>
              <div style={{ fontFamily: serif, fontSize: 22, color: ink }}>{m.v}<span style={{ fontSize: 12, color: terra }}>g</span></div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: muted, marginTop: 3 }}>{m.l.toUpperCase()}</div>
              <div style={{ height: 2, background: line, marginTop: 8 }}><div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: terra }} /></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, letterSpacing: 3, color: terra, fontWeight: 700, marginTop: 22 }}>LOGGED</div>
        {D3.meals.map((m, i) => (
          <div key={m.l} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '13px 0', borderBottom: i < 2 ? `1px solid ${line}` : 'none' }}>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, color: ink, width: 86 }}>{m.l}</div>
            <div style={{ flex: 1, fontSize: 12, color: muted }}>{m.d}</div>
            <div style={{ fontFamily: serif, fontSize: 16, color: ink }}>{m.k}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 26, right: 26, bottom: 30 }}>
        <div style={{ background: terra, color: '#FCF6EE', fontFamily: serif, fontStyle: 'italic', fontSize: 18, textAlign: 'center', padding: '14px', borderRadius: 99 }}>Add to today  +</div>
      </div>
    </Fri>
  );
}

// ── L — PEBBLE · cool neutral light, soft slate-blue, minimal ─────────
function DirL() {
  const bg = '#ECEEF1', ink = '#2A303A', muted = '#878F9C', slate = '#5B6E8C', line = 'rgba(42,48,58,0.08)';
  const card = { background: '#FFFFFF', border: `1px solid ${line}`, borderRadius: 26, boxShadow: '0 8px 26px rgba(50,60,80,0.05)' };
  return (
    <Fri bg={bg}>
      <Sbi color={ink} />
      <div style={{ padding: '12px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Thursday, May 29</div>
            <div style={{ fontSize: 25, color: ink, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>Overview</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 99, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: slate, fontWeight: 700 }}>P</div>
        </div>
        <div style={{ ...card, marginTop: 18, padding: 24, textAlign: 'center' }}>
          <Ri pct={D3.pct} size={140} stroke={9} color={slate} track="rgba(42,48,58,0.08)">
            <div style={{ fontSize: 36, color: ink, fontWeight: 700, letterSpacing: -1 }}>{D3.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: muted, letterSpacing: 1.5, marginTop: 2 }}>OF {D3.goal.toLocaleString()} KCAL</div>
          </Ri>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 }}>
            <span style={{ fontSize: 13, color: slate, fontWeight: 700 }}>{D3.pct}% of goal</span>
            <span style={{ width: 4, height: 4, borderRadius: 99, background: muted }} />
            <span style={{ fontSize: 13, color: muted }}>1,168 kcal left</span>
          </div>
        </div>
        <div style={{ marginTop: 12 }}><MacroRow3 cardStyle={card} ink={ink} muted={muted} cols={[slate, '#4E9C97', '#D6924E']} /></div>
        <div style={{ fontSize: 12, color: muted, fontWeight: 600, marginTop: 20, marginBottom: 9 }}>Today's meals</div>
        <div style={{ ...card, padding: '6px 14px' }}><MealList3 ink={ink} muted={muted} line={line} tint="rgba(91,110,140,0.1)" /></div>
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: ink, color: '#fff', fontWeight: 700, fontSize: 15, textAlign: 'center', padding: '15px', borderRadius: 99 }}>+  Add food</div>
        <div style={{ width: 52, ...card, borderRadius: 99, color: slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>◎</div>
      </div>
    </Fri>
  );
}

Object.assign(window, { DirI, DirJ, DirK, DirL });
