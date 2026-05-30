// screens-add.jsx — Add food: Search / Barcode / Photo. Exports: AddScreen

function AddScreen({ go, data, addFood, notify, initial }) {
  const t = useTheme();
  const [mode, setMode] = React.useState(initial?.mode || 'search');
  const [meal, setMeal] = React.useState(initial?.mealId || 'breakfast');
  const [q, setQ] = React.useState('');
  const [brand, setBrand] = React.useState('All');
  const [added, setAdded] = React.useState({});

  const modes = [
    { id: 'search', label: 'Search', sub: 'Products & brands', icon: 'search' },
    { id: 'barcode', label: 'Barcode', sub: 'Camera or code', icon: 'barcode' },
    { id: 'photo', label: 'Photo', sub: 'Upload or camera', icon: 'camera' },
  ];
  const brands = ['All', 'Masymas', 'Carrefour', 'Eroski', 'Homemade'];
  const results = FOOD_DB.filter(f =>
    (brand === 'All' || f.brand === brand) &&
    (!q || f.name.toLowerCase().includes(q.toLowerCase()) || f.brand.toLowerCase().includes(q.toLowerCase()))
  );

  const doAdd = (food) => {
    addFood(food, meal);
    setAdded(a => ({ ...a, [food.id]: true }));
    notify(`Added to ${meal}`);
    setTimeout(() => setAdded(a => ({ ...a, [food.id]: false })), 1400);
  };

  return (
    <div>
      <TopBar go={go} title="Add food" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ color: t.faint, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>Add to</span>
        {MEALS.map(m => (
          <Chip key={m.id} active={meal === m.id} color={m.color} onClick={() => setMeal(m.id)}>{m.label}</Chip>
        ))}
      </div>

      {/* mode selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9, marginBottom: 16 }}>
        {modes.map(md => {
          const on = mode === md.id;
          return (
            <button key={md.id} onClick={() => setMode(md.id)} style={{
              background: on ? `${t.accent}14` : t.panel, border: `1px solid ${on ? t.accent : t.line}`,
              borderRadius: 16, padding: '13px 10px', cursor: 'pointer', textAlign: 'left',
              transition: 'all .2s', boxShadow: on ? `0 0 0 1px ${t.accent}33` : 'none',
            }}>
              <span style={{ color: on ? t.accent : t.muted, display: 'flex', marginBottom: 8 }}><Icon name={md.icon} size={20} stroke={2.2} /></span>
              <div style={{ color: t.text, fontWeight: 700, fontSize: 14 }}>{md.label}</div>
              <div style={{ color: t.faint, fontSize: 11, marginTop: 1 }}>{md.sub}</div>
            </button>
          );
        })}
      </div>

      {mode === 'search' && (
        <div>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: t.faint, display: 'flex' }}><Icon name="search" size={18} /></span>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search product database…"
              style={inputStyle(t, { paddingLeft: 42 })} />
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
            {brands.map(b => <Chip key={b} active={brand === b} onClick={() => setBrand(b)}>{b}</Chip>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {results.map(f => (
              <Card key={f.id} pad={13}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: t.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>{f.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: t.text, fontWeight: 700, fontSize: 15 }}>{f.name}</div>
                    <div style={{ color: t.faint, fontSize: 12 }}>{f.brand} · {f.kcal} kcal · P{f.protein} C{f.carbs} F{f.fat}</div>
                  </div>
                  <button onClick={() => doAdd(f)} style={{
                    width: 36, height: 36, borderRadius: 11, cursor: 'pointer', flexShrink: 0,
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: added[f.id] ? t.accent : t.elev, color: added[f.id] ? t.accentOn : t.text,
                    transition: 'all .25s', transform: added[f.id] ? 'scale(1.05)' : 'scale(1)',
                  }}>
                    <Icon name={added[f.id] ? 'check' : 'plus'} size={18} stroke={2.8} />
                  </button>
                </div>
              </Card>
            ))}
            {results.length === 0 && <div style={{ color: t.faint, textAlign: 'center', padding: 30, fontSize: 14 }}>No products found</div>}
          </div>
        </div>
      )}

      {mode === 'barcode' && <BarcodeMode meal={meal} doAdd={doAdd} added={added} />}
      {mode === 'photo' && <PhotoMode meal={meal} doAdd={doAdd} added={added} />}
    </div>
  );
}

function BarcodeMode({ doAdd, added }) {
  const t = useTheme();
  const [code, setCode] = React.useState('843700');
  const [scanning, setScanning] = React.useState(false);
  const [found, setFound] = React.useState(null);
  const scan = () => {
    setScanning(true); setFound(null);
    setTimeout(() => { setScanning(false); setFound(FOOD_DB[5]); }, 2100);
  };
  return (
    <div>
      <div style={{ color: t.muted, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Barcode</div>
      <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="843700…" style={inputStyle(t, { flex: 1, fontFamily: 'var(--display)' })} />
        <Btn variant="light" onClick={scan}>Find</Btn>
      </div>

      {/* scan viewport */}
      <div style={{ position: 'relative', height: 200, borderRadius: 20, overflow: 'hidden',
        background: 'radial-gradient(120% 120% at 50% 0%, #0c1a14 0%, #060a08 70%)',
        border: `1px solid ${scanning ? t.accent : t.line2}`, transition: 'border-color .3s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        {/* corner brackets */}
        {[[12,12,1,1],[null,12,-1,1],[12,null,1,-1],[null,null,-1,-1]].map((c,i)=>(
          <div key={i} style={{ position:'absolute', width:26, height:26,
            top: c[0]!=null?c[0]:'auto', left: c[1]!=null?c[1]:'auto',
            bottom: c[0]==null?12:'auto', right: c[1]==null?12:'auto',
            borderTop: c[2]>0?`2.5px solid ${t.accent}`:'none', borderBottom: c[2]<0?`2.5px solid ${t.accent}`:'none',
            borderLeft: c[3]>0?`2.5px solid ${t.accent}`:'none', borderRight: c[3]<0?`2.5px solid ${t.accent}`:'none',
            borderTopLeftRadius: c[2]>0&&c[3]>0?8:0, borderTopRightRadius: c[2]>0&&c[3]<0?8:0,
            borderBottomLeftRadius: c[2]<0&&c[3]>0?8:0, borderBottomRightRadius: c[2]<0&&c[3]<0?8:0 }} />
        ))}
        {/* fake barcode */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center', opacity: 0.5 }}>
          {[3,1,2,1,4,1,2,3,1,2,1,4,2,1,3,1,2].map((w,i)=>(
            <div key={i} style={{ width: w, height: 70, background: t.text }} />
          ))}
        </div>
        {scanning && <div style={{ position: 'absolute', left: 24, right: 24, height: 2.5, borderRadius: 99,
          background: t.accent, boxShadow: `0 0 14px 3px ${t.accent}`, animation: 'scanline 1.1s ease-in-out infinite' }} />}
        {scanning && <div style={{ position: 'absolute', bottom: 12, color: t.accent, fontSize: 12, fontWeight: 700 }}>Scanning…</div>}
      </div>

      {found ? (
        <Card glow pad={15}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: t.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{found.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: t.accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.6 }}>MATCH FOUND</div>
              <div style={{ color: t.text, fontWeight: 700, fontSize: 16 }}>{found.name}</div>
              <div style={{ color: t.faint, fontSize: 12 }}>{found.brand} · {found.kcal} kcal</div>
            </div>
            <Btn size="sm" onClick={() => doAdd(found)} icon={added[found.id] ? 'check' : 'plus'}>{added[found.id] ? 'Added' : 'Add'}</Btn>
          </div>
        </Card>
      ) : (
        <Btn full variant="ghost" icon="camera" onClick={scan}>Scan with camera</Btn>
      )}
    </div>
  );
}

function PhotoMode({ doAdd, added }) {
  const t = useTheme();
  const [state, setState] = React.useState('empty'); // empty | analyzing | done
  const recog = FOOD_DB[2]; // chicken rice bowl
  const start = () => { setState('analyzing'); setTimeout(() => setState('done'), 2400); };
  return (
    <div>
      <div style={{ color: t.muted, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Snap a meal — AI estimates the macros</div>
      <div onClick={state === 'empty' ? start : undefined} style={{
        position: 'relative', height: 230, borderRadius: 20, overflow: 'hidden', cursor: state === 'empty' ? 'pointer' : 'default',
        border: state === 'empty' ? `1.5px dashed ${t.line2}` : `1px solid ${state === 'done' ? t.accent : t.line2}`,
        background: state === 'empty' ? t.panel : '#0a0d12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        transition: 'border-color .3s',
      }}>
        {state === 'empty' && (
          <div style={{ textAlign: 'center', color: t.muted }}>
            <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: t.faint }}><Icon name="camera" size={34} stroke={1.8} /></span>
            <div style={{ fontWeight: 700, color: t.text, fontSize: 15 }}>Tap to add food photo</div>
            <div style={{ fontSize: 12, marginTop: 3 }}>Camera or upload</div>
          </div>
        )}
        {state !== 'empty' && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#3a2418,#1a1410 60%,#241a12)',
              backgroundSize: 'cover' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, opacity: 0.85 }}>🍛</div>
            </div>
            {state === 'analyzing' && (
              <>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${t.accent}22, transparent 40%, transparent 60%, ${t.accent}22)` }} />
                <div style={{ position: 'absolute', left: 16, right: 16, height: 2.5, background: t.accent, boxShadow: `0 0 16px 3px ${t.accent}`, animation: 'scanline 1.3s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  <span style={{ color: t.accent }}>◍</span> Recognizing meal…
                </div>
              </>
            )}
            {state === 'done' && (
              <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(8,10,14,0.8)', backdropFilter: 'blur(6px)',
                borderRadius: 999, padding: '7px 13px', fontSize: 12, fontWeight: 700, color: '#fff', border: `1px solid ${t.accent}66` }}>
                recognized meal
              </div>
            )}
          </>
        )}
      </div>

      {state === 'done' && (
        <Card glow pad={16}>
          <div style={{ color: t.accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, marginBottom: 4 }}>NUTRITION MATCH · 94% confidence</div>
          <div style={{ color: t.text, fontWeight: 800, fontSize: 18 }}>{recog.name}</div>
          <div style={{ color: t.faint, fontSize: 13, marginBottom: 12 }}>grilled chicken · jasmine rice · avocado · salsa</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
            {[['kcal', recog.kcal, t.accent], ['Protein', recog.protein + 'g', MACROS.protein.color], ['Carbs', recog.carbs + 'g', MACROS.carbs.color], ['Fat', recog.fat + 'g', MACROS.fat.color]].map(([l, v, c]) => (
              <div key={l} style={{ background: t.elev, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ color: c, fontWeight: 800, fontSize: 16, fontFamily: 'var(--display)' }}>{v}</div>
                <div style={{ color: t.faint, fontSize: 10, fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
          <Btn full icon={added[recog.id] ? 'check' : 'plus'} onClick={() => doAdd(recog)}>{added[recog.id] ? 'Added to log' : 'Add to log'}</Btn>
        </Card>
      )}
      {state === 'empty' && <Btn full variant="ghost" icon="camera" onClick={start}>Open camera</Btn>}
    </div>
  );
}

function inputStyle(t, extra = {}) {
  return {
    width: '100%', boxSizing: 'border-box', background: t.panel, border: `1px solid ${t.line2}`,
    borderRadius: 14, padding: '13px 15px', color: t.text, fontSize: 15, fontFamily: 'inherit', outline: 'none',
    ...extra,
  };
}

Object.assign(window, { AddScreen, inputStyle });
