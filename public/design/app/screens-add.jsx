// screens-add.jsx — Add food: Search / Barcode / Photo. Exports: AddScreen

function AddScreen({ go, data, addFood, notify, initial }) {
  const t = useTheme();
  const [mode, setMode] = React.useState(initial?.mode || 'search');
  const [meal, setMeal] = React.useState(initial?.mealId || 'breakfast');
  const [q, setQ] = React.useState('');
  const [brand, setBrand] = React.useState('All');
  const [added, setAdded] = React.useState({});
  const [portionFood, setPortionFood] = React.useState(null);
  const [backendFoods, setBackendFoods] = React.useState([]);
  const [searchState, setSearchState] = React.useState({ loading: false, error: '', source: 'local' });

  const modes = [
    { id: 'search', label: 'Search', sub: 'Products & brands', icon: 'search' },
    { id: 'barcode', label: 'Barcode', sub: 'Camera or code', icon: 'barcode' },
    { id: 'photo', label: 'Photo', sub: 'Upload or camera', icon: 'camera' },
  ];
  const localResults = FOOD_DB.filter(f =>
    (brand === 'All' || f.brand === brand) &&
    foodMatchesQuery(f, q)
  );
  const backendFiltered = backendFoods.filter(f => brand === 'All' || f.brand === brand || f.store === brand);
  const results = backendFoods.length ? backendFiltered : localResults;
  const brands = ['All', ...Array.from(new Set([...FOOD_DB.map(f => f.brand), ...backendFoods.map(f => f.store || f.brand)].filter(Boolean))).slice(0, 8)];

  React.useEffect(() => {
    let cancelled = false;
    const term = q.trim();
    const id = setTimeout(() => {
      setSearchState({ loading: true, error: '', source: 'backend' });
      const params = new URLSearchParams({ limit: '40' });
      if (term) params.set('q', term);
      if (brand !== 'All') params.set('store', brand);
      fetch(`${trackfoodApiBase()}/api/v1/foods?${params.toString()}`, {
        headers: { 'X-Client-Timezone': clientTimezoneHeader() },
      })
        .then(async response => {
          const payload = await response.json().catch(() => []);
          if (!response.ok) throw new Error(apiDetailText(payload?.detail, `Food search failed (${response.status})`));
          return payload;
        })
        .then(rows => {
          if (cancelled) return;
          setBackendFoods((rows || []).map(foodFromApi).filter(Boolean));
          setSearchState({ loading: false, error: '', source: 'backend' });
        })
        .catch(error => {
          if (cancelled) return;
          setBackendFoods([]);
          setSearchState({ loading: false, error: safeErrorText(error, 'Food search failed'), source: 'local' });
        });
    }, 240);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, brand]);

  const previewFood = (food) => scaleFoodPortion(food, food.servingG || 100);
  const requestAdd = (food) => setPortionFood(food);
  const confirmAdd = (grams) => {
    const food = portionFood;
    if (!food) return;
    addFood(food, meal, grams);
    setAdded(a => ({ ...a, [food.id]: true }));
    notify(`Added ${grams}g to ${meal}`);
    setPortionFood(null);
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
          <div style={{ color: searchState.error ? t.danger : t.faint, fontSize: 11, fontWeight: 700, margin: '-3px 2px 10px' }}>
            {searchState.loading ? 'Searching backend…' : searchState.error ? `${searchState.error} · local fallback` : searchState.source === 'backend' ? 'Backend product database' : 'Local fallback database'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {results.map(f => (
              <Card key={f.id} pad={13}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: t.elev, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>{f.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: t.text, fontWeight: 700, fontSize: 15 }}>{f.name}</div>
                    <div style={{ color: t.faint, fontSize: 12 }}>
                      {f.brand} · {previewFood(f).kcal} kcal · {f.servingG || 100}g serving · {previewFood(f).priceTotal != null ? eur(previewFood(f).priceTotal) : 'price n/a'}
                    </div>
                    <div style={{ color: t.faint, fontSize: 11, marginTop: 2 }}>P{previewFood(f).protein} C{previewFood(f).carbs} F{previewFood(f).fat}</div>
                  </div>
                  <button onClick={() => requestAdd(f)} aria-label={`Choose grams for ${f.name}`} style={{
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

      {mode === 'barcode' && <BarcodeMode requestAdd={requestAdd} added={added} />}
      {mode === 'photo' && <PhotoMode requestAdd={requestAdd} added={added} />}
      <PortionSheet
        open={!!portionFood}
        food={portionFood}
        title="Choose grams"
        confirmLabel="Add to diary"
        onConfirm={confirmAdd}
        onClose={() => setPortionFood(null)}
      />
    </div>
  );
}

function BarcodeMode({ requestAdd, added }) {
  const t = useTheme();
  const inputRef = React.useRef(null);
  const [code, setCode] = React.useState('');
  const [scanning, setScanning] = React.useState(false);
  const [found, setFound] = React.useState(null);
  const [preview, setPreview] = React.useState('');
  const [error, setError] = React.useState('');
  const lookupCode = (rawCode) => {
    const clean = String(rawCode || '').trim();
    if (!clean) {
      setError('Enter barcode digits first');
      return;
    }
    setScanning(true); setFound(null); setError('');
    fetch(`${trackfoodApiBase()}/api/v1/foods/barcode/${encodeURIComponent(clean)}`, {
      headers: { 'X-Client-Timezone': clientTimezoneHeader() },
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(apiDetailText(payload?.detail, `Barcode lookup failed (${response.status})`));
        return payload;
      })
      .then(food => {
        if (food) setFound(foodFromApi(food));
        else setError('Barcode not found. Try product search.');
      })
      .catch(err => setError(safeErrorText(err, 'Barcode lookup failed')))
      .finally(() => setScanning(false));
  };
  const scan = (file) => {
    if (file) setPreview(URL.createObjectURL(file));
    setScanning(true); setFound(null);
    setTimeout(() => { setScanning(false); setFound(FOOD_DB[5]); }, 2100);
  };
  const foundPreview = found ? scaleFoodPortion(found, found.servingG || 100) : null;
  return (
    <div>
      <div style={{ color: t.muted, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Barcode</div>
      <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="843700…" style={inputStyle(t, { flex: 1, fontFamily: 'var(--display)' })} />
        <Btn variant="light" onClick={() => lookupCode(code)}>Find</Btn>
      </div>
      {error && <div style={{ color: t.danger, fontSize: 12, fontWeight: 700, margin: '-7px 2px 12px' }}>{error}</div>}

      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => scan(e.target.files && e.target.files[0])} />
      <div style={{ position: 'relative', height: 200, borderRadius: 20, overflow: 'hidden',
        background: preview ? '#0a0d12' : t.panel,
        border: `1px solid ${scanning ? t.accent : t.line2}`, transition: 'border-color .3s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        {preview && <img src={preview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        {[[12,12,1,1],[null,12,-1,1],[12,null,1,-1],[null,null,-1,-1]].map((c,i)=>(
          <div key={i} style={{ position:'absolute', width:26, height:26,
            top: c[0]!=null?c[0]:'auto', left: c[1]!=null?c[1]:'auto',
            bottom: c[0]==null?12:'auto', right: c[1]==null?12:'auto',
            borderTop: c[2]>0?`2.5px solid ${t.accent}`:'none', borderBottom: c[2]<0?`2.5px solid ${t.accent}`:'none',
            borderLeft: c[3]>0?`2.5px solid ${t.accent}`:'none', borderRight: c[3]<0?`2.5px solid ${t.accent}`:'none',
            borderTopLeftRadius: c[2]>0&&c[3]>0?8:0, borderTopRightRadius: c[2]>0&&c[3]<0?8:0,
            borderBottomLeftRadius: c[2]<0&&c[3]>0?8:0, borderBottomRightRadius: c[2]<0&&c[3]<0?8:0 }} />
        ))}
        {!preview && <div style={{ textAlign: 'center', color: t.muted, padding: 20 }}>
          <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Icon name="camera" size={34} stroke={1.8} /></span>
          <div style={{ color: t.text, fontWeight: 800 }}>Use phone camera</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Point at the product barcode</div>
        </div>}
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
              <div style={{ color: t.faint, fontSize: 12 }}>{found.brand} · {found.servingG || 100}g serving · {foundPreview.kcal} kcal · {foundPreview.priceTotal != null ? eur(foundPreview.priceTotal) : 'price n/a'}</div>
            </div>
            <Btn size="sm" onClick={() => requestAdd(found)} icon={added[found.id] ? 'check' : 'plus'}>{added[found.id] ? 'Added' : 'Add'}</Btn>
          </div>
        </Card>
      ) : (
        <Btn full variant="ghost" icon="camera" onClick={() => inputRef.current && inputRef.current.click()}>Open phone camera</Btn>
      )}
    </div>
  );
}

function PhotoMode({ requestAdd, added }) {
  const t = useTheme();
  const inputRef = React.useRef(null);
  const [state, setState] = React.useState('empty'); // empty | analyzing | done | error
  const [preview, setPreview] = React.useState('');
  const [analysis, setAnalysis] = React.useState(null);
  const [error, setError] = React.useState('');
  const readRawDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Image read failed'));
    reader.readAsDataURL(file);
  });
  const toDataUrl = async (file) => {
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
    const raw = await readRawDataUrl(file);
    if (file.type === 'image/gif' || file.type === 'image/heic' || file.type === 'image/heif') return raw;
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1280;
        const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.onerror = () => resolve(raw);
      image.src = raw;
    });
  };
  const itemToFood = (item) => ({
    id: item.food_id || `ai-${normalizeLookupText(item.name).slice(0, 32) || Date.now()}`,
    backendId: item.food_id || null,
    name: item.name,
    brand: analysis?.provider === 'gemini' ? 'AI vision estimate' : 'Product DB estimate',
    kcal: item.calories,
    protein: item.protein_g,
    carbs: item.carbs_g,
    fat: item.fat_g,
    fiber: item.fiber_g || 0,
    emoji: '🍽️',
    tags: ['photo', analysis?.provider].filter(Boolean),
    servingG: item.grams || 100,
    source: analysis?.provider || 'vision',
  });
  const start = (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setAnalysis(null);
    setError('');
    setState('analyzing');
    toDataUrl(file)
      .then(dataUrl => {
        const token = authToken();
        if (!token) throw new Error('Log in before analyzing a meal photo');
        return fetch(`${trackfoodApiBase()}/api/v1/nutrition/analyze-image`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            image_data_url: dataUrl,
            meal_slot: 'snack',
            locale: navigator.language || 'en',
            notes: '',
            client_context: `Current local time: ${deviceDateTimeLabel()}. Timezone: ${clientTimezoneHeader()}`,
          }),
        });
      })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(apiDetailText(payload?.detail, `Photo analysis failed (${response.status})`));
        return payload;
      })
      .then(payload => {
        setAnalysis(payload);
        setState('done');
      })
      .catch(err => {
        setError(safeErrorText(err, 'Photo analysis failed'));
        setState('error');
      });
  };
  const primaryItem = analysis?.items?.[0] || null;
  const recog = primaryItem ? itemToFood(primaryItem) : null;
  const recogPreview = recog ? scaleFoodPortion(recog, recog.servingG || 100) : null;
  return (
    <div>
      <div style={{ color: t.muted, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Snap a meal — AI estimates the macros</div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => start(e.target.files && e.target.files[0])} />
      <div onClick={state === 'empty' ? () => inputRef.current && inputRef.current.click() : undefined} style={{
        position: 'relative', height: 230, borderRadius: 20, overflow: 'hidden', cursor: state === 'empty' ? 'pointer' : 'default',
        border: state === 'empty' ? `1.5px dashed ${t.line2}` : `1px solid ${state === 'done' ? t.accent : t.line2}`,
        background: state === 'empty' ? t.panel : '#0a0d12', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        transition: 'border-color .3s',
      }}>
        {(state === 'empty' || state === 'error') && (
          <div style={{ textAlign: 'center', color: t.muted }}>
            <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: t.faint }}><Icon name="camera" size={34} stroke={1.8} /></span>
            <div style={{ fontWeight: 700, color: t.text, fontSize: 15 }}>{state === 'error' ? 'Try another photo' : 'Tap to add food photo'}</div>
            <div style={{ fontSize: 12, marginTop: 3 }}>{state === 'error' ? error : 'Opens phone camera or upload'}</div>
          </div>
        )}
        {state !== 'empty' && state !== 'error' && (
          <>
            {preview
              ? <img src={preview} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#3a2418,#1a1410 60%,#241a12)' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, opacity: 0.85 }}>🍛</div>
                </div>}
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
                {analysis?.provider === 'gemini' ? 'vision estimate' : 'database fallback'}
              </div>
            )}
          </>
        )}
      </div>

      {state === 'error' && <Btn full variant="ghost" icon="camera" onClick={() => inputRef.current && inputRef.current.click()}>Open phone camera</Btn>}

      {state === 'done' && recog && (
        <Card glow pad={16}>
          <div style={{ color: t.accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, marginBottom: 4 }}>
            NUTRITION MATCH · {Math.round((primaryItem.confidence || 0) * 100)}% confidence
          </div>
          <div style={{ color: t.text, fontWeight: 800, fontSize: 18 }}>{recog.name}</div>
          <div style={{ color: t.faint, fontSize: 13, marginBottom: 12 }}>
            {recog.servingG || 100}g estimate · {analysis.message || 'Confirm before saving'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
            {[['kcal', recogPreview.kcal, t.accent], ['Protein', recogPreview.protein + 'g', MACROS.protein.color], ['Carbs', recogPreview.carbs + 'g', MACROS.carbs.color], ['Fat', recogPreview.fat + 'g', MACROS.fat.color]].map(([l, v, c]) => (
              <div key={l} style={{ background: t.elev, borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ color: c, fontWeight: 800, fontSize: 16, fontFamily: 'var(--display)' }}>{v}</div>
                <div style={{ color: t.faint, fontSize: 10, fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
          <Btn full icon={added[recog.id] ? 'check' : 'plus'} onClick={() => requestAdd(recog)}>{added[recog.id] ? 'Added to log' : 'Add to log'}</Btn>
        </Card>
      )}
      {state === 'empty' && <Btn full variant="ghost" icon="camera" onClick={() => inputRef.current && inputRef.current.click()}>Open phone camera</Btn>}
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
