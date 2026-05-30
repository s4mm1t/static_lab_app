// directions.jsx — four elegant Home-screen aesthetic directions
// Exports to window: DirA, DirB, DirC, DirD  (each renders a styled phone Home)

const DD = {
  kcal: 1232, goal: 2400, pct: 51,
  macros: [
    { l: 'Protein', v: 94, g: 150 },
    { l: 'Carbs', v: 132, g: 250 },
    { l: 'Fat', v: 37, g: 72 },
  ],
  meals: [
    { l: 'Breakfast', d: 'Greek yogurt bowl · Cold brew', k: 410 },
    { l: 'Lunch', d: 'Chicken rice bowl', k: 612 },
    { l: 'Snack', d: 'Protein bar', k: 210 },
  ],
};

// generic ring
function R({ pct, size = 132, stroke = 10, color, track, cap = 'round', children }) {
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

function Status({ color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0', fontSize: 13, fontWeight: 700, color }}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 5, opacity: 0.8, fontSize: 11 }}>● ◗ ▮</span>
    </div>
  );
}
function Frame({ bg, children, label }) {
  return (
    <div style={{ width: 360, height: 760, borderRadius: 44, overflow: 'hidden', position: 'relative',
      background: bg, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', border: '1px solid rgba(0,0,0,0.2)' }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// A — LUMIÈRE  ·  editorial light, serif, sage
// ─────────────────────────────────────────────────────────────────────
function DirA() {
  const ink = '#23201A', bg = '#F2EDE3', sage = '#5E6B4F', line = 'rgba(35,32,26,0.12)';
  const serif = "'Newsreader', Georgia, serif";
  return (
    <Frame bg={bg}>
      <Status color={ink} />
      <div style={{ padding: '8px 26px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: sage, fontWeight: 700 }}>THURSDAY · MAY 29</div>
            <div style={{ fontFamily: serif, fontSize: 30, color: ink, fontWeight: 500, marginTop: 3, fontStyle: 'italic' }}>Today's table</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontStyle: 'italic', color: ink }}>p</div>
        </div>

        <div style={{ borderTop: `1px solid ${line}`, marginTop: 18, paddingTop: 22, display: 'flex', alignItems: 'center', gap: 20 }}>
          <R pct={DD.pct} size={128} stroke={6} color={sage} track={line} cap="butt">
            <div style={{ fontFamily: serif, fontSize: 38, color: ink, lineHeight: 1 }}>{DD.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: sage, marginTop: 4 }}>KCAL</div>
          </R>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, color: ink }}>1,168 left</div>
            <div style={{ fontSize: 12, color: '#8A8270', marginTop: 4, lineHeight: 1.5 }}>of a {DD.goal.toLocaleString()} kcal day. A calm, balanced start.</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 26, marginTop: 24, borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}`, padding: '16px 0' }}>
          {DD.macros.map(m => (
            <div key={m.l} style={{ flex: 1 }}>
              <div style={{ fontFamily: serif, fontSize: 22, color: ink }}>{m.v}<span style={{ fontSize: 12, color: sage }}>g</span></div>
              <div style={{ fontSize: 10, letterSpacing: 1.5, color: '#8A8270', marginTop: 3 }}>{m.l.toUpperCase()}</div>
              <div style={{ height: 2, background: line, marginTop: 8 }}><div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: sage }} /></div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, letterSpacing: 3, color: sage, fontWeight: 700, marginTop: 22 }}>LOGGED</div>
        {DD.meals.map((m, i) => (
          <div key={m.l} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '13px 0', borderBottom: i < 2 ? `1px solid ${line}` : 'none' }}>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 16, color: ink, width: 86 }}>{m.l}</div>
            <div style={{ flex: 1, fontSize: 12, color: '#8A8270' }}>{m.d}</div>
            <div style={{ fontFamily: serif, fontSize: 16, color: ink }}>{m.k}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 26, right: 26, bottom: 30 }}>
        <div style={{ background: ink, color: bg, fontFamily: serif, fontStyle: 'italic', fontSize: 17, textAlign: 'center', padding: '15px', borderRadius: 99 }}>Add to today  +</div>
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────
// B — OBSIDIAN  ·  refined dark glass, single emerald jewel
// ─────────────────────────────────────────────────────────────────────
function DirB() {
  const bg = 'radial-gradient(130% 100% at 50% -10%, #141A22 0%, #090B0F 60%)';
  const text = '#E8ECF1', muted = '#7C8794', jewel = '#48E0A0', glass = 'rgba(255,255,255,0.045)', border = 'rgba(255,255,255,0.09)';
  const card = { background: glass, border: `1px solid ${border}`, borderRadius: 24, backdropFilter: 'blur(20px)' };
  return (
    <Frame bg={bg}>
      <Status color={text} />
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Good evening</div>
            <div style={{ fontSize: 24, color: text, fontWeight: 600, letterSpacing: -0.4 }}>Your day, balanced</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 99, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: jewel, fontWeight: 700 }}>P</div>
        </div>

        <div style={{ ...card, marginTop: 20, padding: 24, display: 'flex', alignItems: 'center', gap: 20,
          boxShadow: `0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)` }}>
          <R pct={DD.pct} size={120} stroke={8} color={jewel} track="rgba(255,255,255,0.07)">
            <div style={{ fontSize: 30, color: text, fontWeight: 600, letterSpacing: -0.5 }}>{DD.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: muted, letterSpacing: 1 }}>kcal</div>
          </R>
          <div style={{ flex: 1 }}>
            <div style={{ color: jewel, fontSize: 13, fontWeight: 600 }}>{DD.pct}% of goal</div>
            <div style={{ fontSize: 26, color: text, fontWeight: 600, marginTop: 4, letterSpacing: -0.5 }}>1,168</div>
            <div style={{ fontSize: 12, color: muted }}>kcal remaining</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {DD.macros.map(m => {
            const col = m.l === 'Protein' ? jewel : m.l === 'Carbs' ? '#6FA0FF' : '#FFB36B';
            return (
              <div key={m.l} style={{ ...card, flex: 1, padding: '14px 12px' }}>
                <div style={{ fontSize: 11, color: muted }}>{m.l}</div>
                <div style={{ fontSize: 19, color: text, fontWeight: 600, marginTop: 3 }}>{m.v}<span style={{ fontSize: 11, color: muted }}>g</span></div>
                <div style={{ height: 4, borderRadius: 9, background: 'rgba(255,255,255,0.08)', marginTop: 9, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: col, borderRadius: 9 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: muted, fontWeight: 600, marginTop: 22, marginBottom: 10, letterSpacing: 0.3 }}>Today's meals</div>
        <div style={{ ...card, padding: 6 }}>
          {DD.meals.map((m, i) => (
            <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: i < 2 ? `1px solid ${border}` : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: 99, background: jewel, boxShadow: `0 0 8px ${jewel}` }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: text, fontWeight: 500 }}>{m.l}</div>
                <div style={{ fontSize: 11, color: muted }}>{m.d}</div>
              </div>
              <div style={{ fontSize: 14, color: text, fontWeight: 600 }}>{m.k}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28 }}>
        <div style={{ background: jewel, color: '#06160F', fontWeight: 700, fontSize: 15, textAlign: 'center', padding: '15px', borderRadius: 99, boxShadow: `0 10px 30px ${jewel}44` }}>+  Add food</div>
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────
// C — TERRA  ·  warm espresso, honey accent, cozy
// ─────────────────────────────────────────────────────────────────────
function DirC() {
  const bg = '#17120D', text = '#F0E7DA', muted = '#A9988380', honey = '#E2A24A', card = '#211913', border = 'rgba(226,162,74,0.14)';
  return (
    <Frame bg={bg}>
      <Status color={text} />
      <div style={{ padding: '14px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: honey, fontWeight: 700, letterSpacing: 1 }}>THU · MAY 29</div>
            <div style={{ fontSize: 27, color: text, fontWeight: 700, marginTop: 2 }}>Nourish</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 14, background: card, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: honey, fontWeight: 800 }}>p</div>
        </div>

        <div style={{ background: card, borderRadius: 28, padding: 24, marginTop: 20, border: `1px solid ${border}`, textAlign: 'center' }}>
          <R pct={DD.pct} size={150} stroke={12} color={honey} track="rgba(240,231,218,0.08)">
            <div style={{ fontSize: 40, color: text, fontWeight: 800, lineHeight: 1 }}>{DD.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#A99883', letterSpacing: 1, marginTop: 3 }}>OF {DD.goal.toLocaleString()} KCAL</div>
          </R>
          <div style={{ display: 'flex', justifycontent: 'center', gap: 8, marginTop: 18 }}>
            <div style={{ flex: 1, background: honey, color: '#1B1206', fontWeight: 700, fontSize: 14, padding: '13px', borderRadius: 99 }}>+ Add food</div>
            <div style={{ width: 48, borderRadius: 99, border: `1px solid ${border}`, color: honey, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>◎</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {DD.macros.map(m => (
            <div key={m.l} style={{ flex: 1, background: card, borderRadius: 18, padding: '15px 13px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: 22, color: text, fontWeight: 800 }}>{m.v}<span style={{ fontSize: 12, color: '#A99883' }}>g</span></div>
              <div style={{ fontSize: 11, color: '#A99883', marginTop: 2 }}>{m.l}</div>
              <div style={{ height: 5, borderRadius: 9, background: 'rgba(240,231,218,0.08)', marginTop: 9, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: honey, borderRadius: 9 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: honey, fontWeight: 700, letterSpacing: 1, marginTop: 22, marginBottom: 4 }}>TODAY</div>
        {DD.meals.map((m, i) => (
          <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: i < 2 ? `1px solid ${border}` : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: card, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{['🥣','🍗','🍫'][i]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: text, fontWeight: 600 }}>{m.l}</div>
              <div style={{ fontSize: 11, color: '#A99883' }}>{m.d}</div>
            </div>
            <div style={{ fontSize: 15, color: text, fontWeight: 700 }}>{m.k}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ─────────────────────────────────────────────────────────────────────
// D — GRAPHITE  ·  mono precision, cobalt accent, Swiss grid
// ─────────────────────────────────────────────────────────────────────
function DirD() {
  const bg = '#0C0D0F', text = '#F4F5F7', muted = '#6B7079', cobalt = '#5B7CFA', line = 'rgba(255,255,255,0.08)', card = '#131519';
  const mono = "'Space Grotesk', sans-serif";
  return (
    <Frame bg={bg}>
      <Status color={text} />
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: muted, fontWeight: 700, letterSpacing: 2 }}>29.05.2026 / THU</div>
            <div style={{ fontFamily: mono, fontSize: 23, color: text, fontWeight: 600, marginTop: 4, letterSpacing: -0.3 }}>OVERVIEW</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: text, fontFamily: mono }}>P</div>
        </div>

        <div style={{ border: `1px solid ${line}`, borderRadius: 18, marginTop: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, padding: 20, borderRight: `1px solid ${line}` }}>
              <div style={{ fontSize: 10, color: muted, letterSpacing: 1.5, fontWeight: 700 }}>CONSUMED</div>
              <div style={{ fontFamily: mono, fontSize: 38, color: text, fontWeight: 600, marginTop: 6, letterSpacing: -1 }}>{DD.kcal.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>of {DD.goal.toLocaleString()} kcal</div>
            </div>
            <div style={{ width: 132, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <R pct={DD.pct} size={104} stroke={5} color={cobalt} track={line} cap="butt">
                <div style={{ fontFamily: mono, fontSize: 22, color: text, fontWeight: 600 }}>{DD.pct}<span style={{ fontSize: 12, color: muted }}>%</span></div>
              </R>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: `1px solid ${line}` }}>
            {DD.macros.map((m, i) => (
              <div key={m.l} style={{ padding: '14px 16px', borderRight: i < 2 ? `1px solid ${line}` : 'none' }}>
                <div style={{ fontSize: 9, color: muted, letterSpacing: 1.5, fontWeight: 700 }}>{m.l.toUpperCase()}</div>
                <div style={{ fontFamily: mono, fontSize: 18, color: text, fontWeight: 600, marginTop: 4 }}>{m.v}<span style={{ fontSize: 10, color: muted }}>/{m.g}g</span></div>
                <div style={{ height: 3, background: line, marginTop: 8 }}><div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: cobalt }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: muted, letterSpacing: 2, fontWeight: 700 }}>LOG / 3 ENTRIES</div>
          <div style={{ fontSize: 10, color: cobalt, letterSpacing: 1, fontWeight: 700 }}>VIEW ALL →</div>
        </div>
        {DD.meals.map((m, i) => (
          <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: `1px solid ${line}` }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: muted, width: 22 }}>{String(i+1).padStart(2,'0')}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: text, fontWeight: 600 }}>{m.l}</div>
              <div style={{ fontSize: 11, color: muted }}>{m.d}</div>
            </div>
            <div style={{ fontFamily: mono, fontSize: 14, color: text, fontWeight: 600 }}>{m.k}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28, display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: cobalt, color: '#fff', fontFamily: mono, fontWeight: 600, fontSize: 14, textAlign: 'center', padding: '15px', borderRadius: 12, letterSpacing: 0.3 }}>+ ADD FOOD</div>
        <div style={{ width: 52, border: `1px solid ${line}`, borderRadius: 12, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⌗</div>
      </div>
    </Frame>
  );
}

Object.assign(window, { DirA, DirB, DirC, DirD });
