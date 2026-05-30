// directions2.jsx — second set of elegant Home directions. Exports: DirE, DirF, DirG, DirH

const D2 = {
  kcal: 1232, goal: 2400, pct: 51,
  macros: [{ l: 'Protein', v: 94, g: 150 }, { l: 'Carbs', v: 132, g: 250 }, { l: 'Fat', v: 37, g: 72 }],
  meals: [
    { l: 'Breakfast', d: 'Greek yogurt bowl · Cold brew', k: 410, e: '🥣' },
    { l: 'Lunch', d: 'Chicken rice bowl', k: 612, e: '🍗' },
    { l: 'Snack', d: 'Protein bar', k: 210, e: '🍫' },
  ],
};

function Rg({ pct, size = 132, stroke = 10, color, track, cap = 'round', glow, children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: glow ? `drop-shadow(0 0 8px ${glow})` : 'none' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={off} strokeLinecap={cap} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  );
}
function Sb({ color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px 0', fontSize: 13, fontWeight: 700, color }}>
      <span>9:41</span><span style={{ fontSize: 11, opacity: 0.75 }}>● ◗ ▮</span>
    </div>
  );
}
function Fr({ bg, children }) {
  return (
    <div style={{ width: 360, height: 760, borderRadius: 44, overflow: 'hidden', position: 'relative', background: bg, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', border: '1px solid rgba(0,0,0,0.2)' }}>{children}</div>
  );
}

// ── E — MIST · airy light, frosted, periwinkle ────────────────────────
function DirE() {
  const bg = 'linear-gradient(170deg, #EEF1F7 0%, #E4E8F1 100%)';
  const ink = '#2A2F3A', muted = '#8B93A2', peri = '#6675EE', glass = 'rgba(255,255,255,0.72)', border = 'rgba(40,47,58,0.07)';
  const card = { background: glass, border: `1px solid ${border}`, borderRadius: 26, backdropFilter: 'blur(14px)', boxShadow: '0 10px 30px rgba(60,70,100,0.08)' };
  return (
    <Fr bg={bg}>
      <Sb color={ink} />
      <div style={{ padding: '12px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>Thursday, May 29</div>
            <div style={{ fontSize: 25, color: ink, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>Hello, pi</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 99, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: peri, fontWeight: 700 }}>P</div>
        </div>

        <div style={{ ...card, marginTop: 18, padding: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Rg pct={D2.pct} size={120} stroke={11} color={peri} track="rgba(40,47,58,0.07)">
            <div style={{ fontSize: 29, color: ink, fontWeight: 700, letterSpacing: -0.5 }}>{D2.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: muted, letterSpacing: 1 }}>kcal</div>
          </Rg>
          <div style={{ flex: 1 }}>
            <div style={{ color: peri, fontSize: 13, fontWeight: 700 }}>{D2.pct}% of goal</div>
            <div style={{ fontSize: 27, color: ink, fontWeight: 700, marginTop: 4, letterSpacing: -0.5 }}>1,168</div>
            <div style={{ fontSize: 12, color: muted }}>kcal remaining today</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {D2.macros.map(m => {
            const col = m.l === 'Protein' ? peri : m.l === 'Carbs' ? '#43B7A6' : '#F0935B';
            return (
              <div key={m.l} style={{ ...card, flex: 1, padding: '14px 13px' }}>
                <div style={{ fontSize: 11, color: muted }}>{m.l}</div>
                <div style={{ fontSize: 19, color: ink, fontWeight: 700, marginTop: 3 }}>{m.v}<span style={{ fontSize: 11, color: muted }}>g</span></div>
                <div style={{ height: 5, borderRadius: 9, background: 'rgba(40,47,58,0.08)', marginTop: 9, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: col, borderRadius: 9 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: muted, fontWeight: 600, marginTop: 20, marginBottom: 9 }}>Today's meals</div>
        <div style={{ ...card, padding: 6 }}>
          {D2.meals.map((m, i) => (
            <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderBottom: i < 2 ? `1px solid ${border}` : 'none' }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(102,117,238,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.e}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: ink, fontWeight: 600 }}>{m.l}</div>
                <div style={{ fontSize: 11, color: muted }}>{m.d}</div>
              </div>
              <div style={{ fontSize: 14, color: ink, fontWeight: 700 }}>{m.k}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28 }}>
        <div style={{ background: peri, color: '#fff', fontWeight: 700, fontSize: 15, textAlign: 'center', padding: '15px', borderRadius: 99, boxShadow: '0 10px 26px rgba(102,117,238,0.4)' }}>+  Add food</div>
      </div>
    </Fr>
  );
}

// ── F — NOIR OR · black + champagne gold, serif numerals, luxe ────────
function DirF() {
  const bg = '#0A0A0B', text = '#EDE9E1', muted = '#7E776B', gold = '#C7A867', line = 'rgba(199,168,103,0.2)', card = '#121211';
  const serif = "'Cormorant Garamond', Georgia, serif";
  return (
    <Fr bg={bg}>
      <Sb color={text} />
      <div style={{ padding: '16px 26px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: gold, fontWeight: 600 }}>MAY 29 · THURSDAY</div>
            <div style={{ fontFamily: serif, fontSize: 32, color: text, fontWeight: 500, marginTop: 2, letterSpacing: 0.3 }}>Daily Balance</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold, fontFamily: serif, fontSize: 18 }}>P</div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <Rg pct={D2.pct} size={172} stroke={3} color={gold} track="rgba(237,233,225,0.08)" cap="butt">
            <div style={{ fontFamily: serif, fontSize: 56, color: text, fontWeight: 500, lineHeight: 1 }}>{D2.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: gold, marginTop: 6 }}>KCAL TODAY</div>
            <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>1,168 remaining</div>
          </Rg>
        </div>

        <div style={{ display: 'flex', marginTop: 26, borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` }}>
          {D2.macros.map((m, i) => (
            <div key={m.l} style={{ flex: 1, padding: '16px 0', textAlign: 'center', borderRight: i < 2 ? `1px solid ${line}` : 'none' }}>
              <div style={{ fontFamily: serif, fontSize: 28, color: text, fontWeight: 500 }}>{m.v}</div>
              <div style={{ fontSize: 9, letterSpacing: 2, color: gold, marginTop: 2 }}>{m.l.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: muted, marginTop: 2 }}>of {m.g}g</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, letterSpacing: 3, color: gold, marginTop: 24, marginBottom: 4 }}>TODAY'S MENU</div>
        {D2.meals.map((m, i) => (
          <div key={m.l} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '14px 0', borderBottom: i < 2 ? `1px solid ${line}` : 'none' }}>
            <div style={{ fontFamily: serif, fontSize: 18, color: text, width: 96, fontWeight: 500 }}>{m.l}</div>
            <div style={{ flex: 1, fontSize: 11, color: muted }}>{m.d}</div>
            <div style={{ fontFamily: serif, fontSize: 18, color: gold }}>{m.k}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 26, right: 26, bottom: 30 }}>
        <div style={{ border: `1px solid ${gold}`, color: gold, fontFamily: serif, fontSize: 19, textAlign: 'center', padding: '13px', borderRadius: 6, letterSpacing: 1 }}>Add to Today</div>
      </div>
    </Fr>
  );
}

// ── G — SAUGE · botanical warm light, forest green ────────────────────
function DirG() {
  const bg = '#ECE6D9', ink = '#2B2A23', muted = '#7C7766', forest = '#3C5A3E', clay = '#B5704A', line = 'rgba(43,42,35,0.1)', card = '#F5F1E7';
  return (
    <Fr bg={bg}>
      <Sb color={ink} />
      <div style={{ padding: '12px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: forest, fontWeight: 700, letterSpacing: 0.5 }}>THU · MAY 29</div>
            <div style={{ fontSize: 26, color: ink, fontWeight: 700, marginTop: 2, letterSpacing: -0.3 }}>Good day, pi</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 99, background: forest, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ECE6D9', fontWeight: 700 }}>P</div>
        </div>

        <div style={{ background: forest, borderRadius: 30, padding: 24, marginTop: 18, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
            <Rg pct={D2.pct} size={116} stroke={10} color="#D9E4C9" track="rgba(255,255,255,0.16)">
              <div style={{ fontSize: 28, color: '#F4F0E7', fontWeight: 700, letterSpacing: -0.5 }}>{D2.kcal.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#B9C6AC', letterSpacing: 1 }}>kcal</div>
            </Rg>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#CFE0BE', fontSize: 13, fontWeight: 700 }}>{D2.pct}% of goal</div>
              <div style={{ fontSize: 28, color: '#F4F0E7', fontWeight: 700, marginTop: 3, letterSpacing: -0.5 }}>1,168</div>
              <div style={{ fontSize: 12, color: '#A8B89A' }}>kcal left of {D2.goal.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          {D2.macros.map(m => {
            const col = m.l === 'Protein' ? forest : m.l === 'Carbs' ? '#6E8B5A' : clay;
            return (
              <div key={m.l} style={{ flex: 1, background: card, borderRadius: 20, padding: '15px 13px', border: `1px solid ${line}` }}>
                <div style={{ fontSize: 21, color: ink, fontWeight: 700 }}>{m.v}<span style={{ fontSize: 11, color: muted }}>g</span></div>
                <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{m.l}</div>
                <div style={{ height: 5, borderRadius: 9, background: 'rgba(43,42,35,0.08)', marginTop: 9, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: col, borderRadius: 9 }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: forest, fontWeight: 700, letterSpacing: 0.5, marginTop: 20, marginBottom: 4 }}>LOGGED TODAY</div>
        {D2.meals.map((m, i) => (
          <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 0', borderBottom: i < 2 ? `1px solid ${line}` : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: card, border: `1px solid ${line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.e}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: ink, fontWeight: 600 }}>{m.l}</div>
              <div style={{ fontSize: 11, color: muted }}>{m.d}</div>
            </div>
            <div style={{ fontSize: 15, color: ink, fontWeight: 700 }}>{m.k}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 22, right: 22, bottom: 28 }}>
        <div style={{ background: ink, color: bg, fontWeight: 700, fontSize: 15, textAlign: 'center', padding: '15px', borderRadius: 99 }}>+  Add food</div>
      </div>
    </Fr>
  );
}

// ── H — INDIGO DUSK · dreamy plum/indigo gradient, lilac ──────────────
function DirH() {
  const bg = 'radial-gradient(120% 90% at 50% -5%, #2E2150 0%, #1A1330 45%, #0C0918 100%)';
  const text = '#EDE9F7', muted = '#9189B0', lilac = '#B79CFF', glass = 'rgba(255,255,255,0.055)', border = 'rgba(255,255,255,0.1)';
  const card = { background: glass, border: `1px solid ${border}`, borderRadius: 24, backdropFilter: 'blur(18px)' };
  return (
    <Fr bg={bg}>
      <Sb color={text} />
      <div style={{ padding: '14px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: lilac, fontWeight: 600 }}>Thursday evening</div>
            <div style={{ fontSize: 24, color: text, fontWeight: 600, letterSpacing: -0.4, marginTop: 2 }}>Wind down well</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 99, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: lilac, fontWeight: 700 }}>P</div>
        </div>

        <div style={{ ...card, marginTop: 20, padding: '26px 24px 22px', textAlign: 'center', boxShadow: '0 20px 50px rgba(70,40,140,0.3)' }}>
          <Rg pct={D2.pct} size={150} stroke={10} color={lilac} track="rgba(255,255,255,0.08)" glow="rgba(183,156,255,0.5)">
            <div style={{ fontSize: 42, color: text, fontWeight: 600, lineHeight: 1, letterSpacing: -1 }}>{D2.kcal.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: muted, letterSpacing: 1.5, marginTop: 5 }}>KCAL</div>
          </Rg>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
            <span style={{ fontSize: 13, color: lilac, fontWeight: 700 }}>{D2.pct}% of goal</span>
            <span style={{ width: 4, height: 4, borderRadius: 99, background: muted }} />
            <span style={{ fontSize: 13, color: muted }}>1,168 kcal left</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {D2.macros.map(m => {
            const col = m.l === 'Protein' ? lilac : m.l === 'Carbs' ? '#7FA8FF' : '#FF9FC4';
            return (
              <div key={m.l} style={{ ...card, flex: 1, padding: '14px 12px' }}>
                <div style={{ fontSize: 11, color: muted }}>{m.l}</div>
                <div style={{ fontSize: 19, color: text, fontWeight: 600, marginTop: 3 }}>{m.v}<span style={{ fontSize: 11, color: muted }}>g</span></div>
                <div style={{ height: 4, borderRadius: 9, background: 'rgba(255,255,255,0.09)', marginTop: 9, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${m.v/m.g*100}%`, background: col, borderRadius: 9, boxShadow: `0 0 6px ${col}` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 11, color: muted, fontWeight: 600, marginTop: 20, marginBottom: 9 }}>Today's meals</div>
        <div style={{ ...card, padding: 6 }}>
          {D2.meals.map((m, i) => (
            <div key={m.l} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderBottom: i < 2 ? `1px solid ${border}` : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: 99, background: lilac, boxShadow: `0 0 8px ${lilac}` }} />
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
        <div style={{ background: lilac, color: '#1A0F33', fontWeight: 700, fontSize: 15, textAlign: 'center', padding: '15px', borderRadius: 99, boxShadow: '0 10px 30px rgba(183,156,255,0.4)' }}>+  Add food</div>
      </div>
    </Fr>
  );
}

Object.assign(window, { DirE, DirF, DirG, DirH });
