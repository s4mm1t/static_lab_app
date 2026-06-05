// ui.jsx — shared UI kit. Exports: Icon, Ring, CountUp, MacroBar, Card, Btn, Chip, Sheet, Toast
// requires theme.jsx (useTheme)

// ── Icons (stroke-based line set) ─────────────────────────────────────
function Icon({ name, size = 22, color = 'currentColor', stroke = 2, fill = 'none', style }) {
  const p = { fill: fill === 'none' ? 'none' : color, stroke: fill === 'solid' ? 'none' : color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path d="M3 11.5 12 4l9 7.5" {...p}/><path d="M5.5 10v9.5h13V10" {...p}/></>,
    diary: <><rect x="5" y="3.5" width="14" height="17" rx="2.5" {...p}/><path d="M9 8h6M9 12h6M9 16h3" {...p}/></>,
    plus: <><path d="M12 5v14M5 12h14" {...p}/></>,
    coach: <><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3z" {...p}/><circle cx="18.5" cy="17.5" r="1.6" {...p}/><circle cx="6" cy="16" r="1.2" {...p}/></>,
    chart: <><path d="M4 20V4M4 20h16" {...p}/><rect x="7.5" y="11" width="3" height="6" rx="1" {...p}/><rect x="13" y="7" width="3" height="10" rx="1" {...p}/></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2.5" {...p}/><path d="M4 9.5h16M8 3.5v4M16 3.5v4" {...p}/></>,
    user: <><circle cx="12" cy="8.5" r="3.8" {...p}/><path d="M5 19.5c1.2-3.4 4-5 7-5s5.8 1.6 7 5" {...p}/></>,
    search: <><circle cx="11" cy="11" r="6.5" {...p}/><path d="M16 16l4 4" {...p}/></>,
    barcode: <><path d="M4 6v12M7 6v12M10 6v8M13 6v12M16 6v8M20 6v12" {...p}/></>,
    camera: <><path d="M4.5 8.5h3l1.5-2.5h6L16.5 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V10a1.5 1.5 0 0 1 1.5-1.5z" {...p}/><circle cx="12" cy="13.5" r="3.3" {...p}/></>,
    sun: <><circle cx="12" cy="12" r="4" {...p}/><path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" {...p}/></>,
    moon: <><path d="M20 13.5A8 8 0 1 1 10.5 4a6.5 6.5 0 0 0 9.5 9.5z" {...p}/></>,
    bowl: <><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" {...p}/><path d="M8 7.5c0-1.5 1-2.5 1-2.5M12 7c0-2 1.2-3 1.2-3M16 7.5c0-1.5 1-2.5 1-2.5" {...p}/></>,
    spark: <><path d="M12 3v5M12 16v5M3 12h5M16 12h5" {...p}/><path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4z" {...p}/></>,
    flame: <><path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 1.5 2.5C10 12 9 9 12 3z" {...p}/></>,
    chevron: <><path d="M9 5l7 7-7 7" {...p}/></>,
    chevDown: <><path d="M5 9l7 7 7-7" {...p}/></>,
    x: <><path d="M6 6l12 12M18 6L6 18" {...p}/></>,
    check: <><path d="M5 12.5l4.5 4.5L19 7" {...p}/></>,
    send: <><path d="M5 12l15-7-6.5 15-2.5-6L5 12z" {...p}/></>,
    trash: <><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" {...p}/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3" {...p}/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" {...p}/></>,
    scale: <><path d="M5 7h14l-2 13H7L5 7z" {...p}/><path d="M9 7V5h6v2" {...p}/><circle cx="12" cy="13" r="2.2" {...p}/></>,
    bolt: <><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" {...p}/></>,
    target: <><circle cx="12" cy="12" r="8" {...p}/><circle cx="12" cy="12" r="3.5" {...p}/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" {...p}/></>,
    sync: <><path d="M20 9a8 8 0 0 0-14-3L4 8M4 4v4h4M4 15a8 8 0 0 0 14 3l2-2M20 20v-4h-4" {...p}/></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" {...p}/><circle cx="16" cy="7" r="2.2" {...p}/><circle cx="8" cy="17" r="2.2" {...p}/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={style}>{paths[name] || null}</svg>;
}

// ── CountUp ───────────────────────────────────────────────────────────
function CountUp({ value, dur = 800, fmt: f = (n) => Math.round(n).toLocaleString('en-US') }) {
  const [disp, setDisp] = React.useState(value);
  const prev = React.useRef(value);
  React.useEffect(() => {
    const from = prev.current, to = value, start = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setDisp(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return <>{f(disp)}</>;
}

// ── Ring (animated progress) ──────────────────────────────────────────
function Ring({ pct = 0, size = 168, stroke = 14, color, track, glow, children, dur = 1100 }) {
  const t = useTheme();
  color = color || t.accent;
  track = track || t.track;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [anim, setAnim] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (ts) => {
      const k = Math.min(1, (ts - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setAnim(e * pct);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pct, dur]);
  const off = circ * (1 - Math.min(1, anim / 100));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', filter: glow ? `drop-shadow(0 0 10px ${glow})` : 'none' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ── MacroBar (animated fill) ──────────────────────────────────────────
function MacroBar({ label, value, goal, color, unit = 'g', delay = 0 }) {
  const t = useTheme();
  const pct = Math.min(100, goal ? (value / goal) * 100 : 0);
  const [w, setW] = React.useState(0);
  React.useEffect(() => { const id = setTimeout(() => setW(pct), 60 + delay); return () => clearTimeout(id); }, [pct, delay]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: t.text, fontSize: 14, fontWeight: 600 }}>{label}</span>
        <span style={{ color: t.muted, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: t.text, fontWeight: 700 }}><CountUp value={value} />{unit}</span> / {goal}{unit}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: t.track, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${w}%`, borderRadius: 99, background: color,
          transition: 'width 0.9s cubic-bezier(.16,1,.3,1)', boxShadow: `0 0 10px ${color}66` }} />
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────
function Card({ children, style, pad = 18, onClick, glow, className }) {
  const t = useTheme();
  return (
    <div className={className} onClick={onClick} style={{
      background: t.panel, border: `1px solid ${t.line}`, borderRadius: 22, padding: pad,
      transition: 'transform .22s cubic-bezier(.22,1,.3,1), box-shadow .22s cubic-bezier(.22,1,.3,1)',
      boxShadow: glow ? `0 0 0 1px ${t.accent}33, 0 10px 30px ${t.accentGlow}` : t.cardShadow,
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

// ── Button ────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant = 'primary', size = 'md', style, icon, full, type = 'button', disabled = false }) {
  const t = useTheme();
  const [press, setPress] = React.useState(false);
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700,
    borderRadius: 999, width: full ? '100%' : undefined, whiteSpace: 'nowrap',
    transition: 'transform .12s ease, filter .12s ease, background .2s',
    transform: press && !disabled ? 'scale(0.96)' : 'scale(1)',
    opacity: disabled ? 0.62 : 1,
    fontSize: size === 'sm' ? 13 : 15, padding: size === 'sm' ? '9px 14px' : '13px 22px',
    letterSpacing: 0.2,
  };
  const variants = {
    primary: { background: t.accent, color: t.accentOn, boxShadow: `0 6px 20px ${t.accentGlow}` },
    light:   { background: t.text, color: t.bg },
    ghost:   { background: t.elev, color: t.text, border: `1px solid ${t.line2}` },
    outline: { background: 'transparent', color: t.text, border: `1px solid ${t.line2}` },
    danger:  { background: 'rgba(255,96,96,0.12)', color: t.danger, border: '1px solid rgba(255,96,96,0.3)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onPointerDown={() => !disabled && setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
      style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} stroke={2.4} />}
      {children}
    </button>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────
function Chip({ children, active, onClick, color }) {
  const t = useTheme();
  return (
    <button onClick={onClick} style={{
      border: `1px solid ${active ? (color || t.accent) : t.line2}`,
      background: active ? `${color || t.accent}1f` : 'transparent',
      color: active ? (color || t.accent) : t.muted,
      borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s', whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

// ── Bottom sheet ──────────────────────────────────────────────────────
function Sheet({ open, onClose, children, title }) {
  const t = useTheme();
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 80, pointerEvents: open ? 'auto' : 'none',
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
        opacity: open ? 1 : 0, transition: 'opacity .3s', backdropFilter: open ? 'blur(2px)' : 'none',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: t.panel2, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: `1px solid ${t.line}`, borderBottom: 'none',
        transform: open ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform .42s cubic-bezier(.22,1,.3,1)',
        padding: '14px 18px 30px', maxHeight: '82%', overflowY: 'auto',
        boxShadow: '0 -16px 50px rgba(80,70,40,0.18)',
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 99, background: t.line2, margin: '0 auto 14px' }} />
        {title && <div style={{ color: t.text, fontWeight: 700, fontSize: 18, marginBottom: 12 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

function PortionSheet({ open, food, initialGrams, title = 'Choose amount', confirmLabel = 'Add to diary', onConfirm, onClose }) {
  const t = useTheme();
  const fallback = food?.quantityG || food?.servingG || initialGrams || 100;
  const [grams, setGrams] = React.useState(fallback);
  React.useEffect(() => {
    if (open) setGrams(food?.quantityG || food?.servingG || initialGrams || 100);
  }, [open, food, initialGrams]);
  if (!food) return null;
  const amount = Math.max(5, Math.min(5000, Number(grams) || 0));
  const source = FOOD_DB.find(item => item.id === (food.baseId || food.id)) || food;
  const preview = scaleFoodPortion(source, amount);
  const quick = [50, 100, 150, 200, 250, 300];
  const input = {
    width: '100%', boxSizing: 'border-box', background: t.panel, border: `1px solid ${t.line2}`,
    borderRadius: 16, padding: '13px 15px', color: t.text, fontSize: 22, fontWeight: 800,
    fontFamily: 'var(--display)', outline: 'none',
  };
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: t.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25 }}>{food.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: t.text, fontWeight: 800, fontSize: 17 }}>{source.name}</div>
          <div style={{ color: t.faint, fontSize: 12, marginTop: 2 }}>{source.brand} · base {source.servingG || 100}g</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
        {quick.map(g => (
          <button key={g} type="button" onClick={() => setGrams(g)} style={{
            border: `1px solid ${amount === g ? t.accent : t.line2}`,
            background: amount === g ? `${t.accent}18` : t.panel,
            color: amount === g ? t.accent : t.muted,
            borderRadius: 999, padding: '10px 8px', fontSize: 13, fontWeight: 800,
          }}>
            {g}g
          </button>
        ))}
      </div>

      <label style={{ display: 'block', color: t.muted, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 7 }}>Grams</label>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input value={grams} onChange={e => setGrams(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" style={{ ...input, paddingRight: 48 }} />
        <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: t.faint, fontWeight: 800 }}>g</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
        {[['kcal', preview.kcal, t.accent], ['Protein', preview.protein + 'g', MACROS.protein.color], ['Carbs', preview.carbs + 'g', MACROS.carbs.color], ['Fat', preview.fat + 'g', MACROS.fat.color]].map(([label, value, color]) => (
          <div key={label} style={{ background: t.elev, borderRadius: 14, padding: '11px 8px', textAlign: 'center' }}>
            <div style={{ color, fontWeight: 900, fontSize: 16, fontFamily: 'var(--display)' }}>{value}</div>
            <div style={{ color: t.faint, fontSize: 10, fontWeight: 700 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: t.muted, fontSize: 13, marginBottom: 14 }}>
        <span>Estimated price</span>
        <span style={{ color: t.text, fontWeight: 800 }}>{preview.priceTotal != null ? eur(preview.priceTotal) : 'price n/a'}</span>
      </div>
      <Btn full icon="check" onClick={() => onConfirm(amount)}>{confirmLabel}</Btn>
    </Sheet>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────
function Toast({ toast }) {
  const t = useTheme();
  return (
    <div style={{
      position: 'absolute', left: 16, right: 16, bottom: 96, zIndex: 90,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
    }}>
      <div style={{
        background: t.elev, border: `1px solid ${t.accent}55`, color: t.text,
        borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 9, boxShadow: `0 10px 30px rgba(80,70,40,0.18), 0 0 0 1px ${t.accentGlow}`,
        transform: toast ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
        opacity: toast ? 1 : 0, transition: 'all .35s cubic-bezier(.22,1,.3,1)',
      }}>
        <span style={{ color: t.accent, display: 'flex' }}><Icon name="check" size={17} stroke={3} /></span>
        {toast || ''}
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────
function Eyebrow({ children, color }) {
  const t = useTheme();
  return <div style={{ color: color || t.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase' }}>{children}</div>;
}

// ── Logo mark — sage sprout (Sauge = sage). Botanical two-leaf sprout. ──
function LogoMark({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
      {/* stem */}
      <path d="M12 21 C 12 17 11.6 14 11.6 12" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      {/* left leaf */}
      <path d="M11.6 14.2 C 8.7 14.4 6 12.6 5.2 9.2 C 8.7 8.6 11.2 10.5 11.6 14.2 Z" fill={color} />
      {/* right leaf (higher) */}
      <path d="M11.7 11.6 C 11.9 7.9 14.6 5.4 18.4 5.2 C 18.6 8.9 16 11.4 11.7 11.6 Z" fill={color} />
    </svg>
  );
}

// ── Logo badge — rounded square w/ sprout, used in headers & welcome ────
function LogoBadge({ size = 34, radius = 11 }) {
  const t = useTheme();
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: t.accent, color: t.accentOn,
      display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${t.accentGlow}` }}>
      <LogoMark size={size * 0.62} color={t.accentOn} />
    </div>
  );
}

Object.assign(window, { Icon, CountUp, Ring, MacroBar, Card, Btn, Chip, Sheet, PortionSheet, Toast, Eyebrow, LogoMark, LogoBadge });
