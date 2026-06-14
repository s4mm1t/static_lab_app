// screens-plan.jsx — Plan (Calendar) + Coach (Assistant). Exports: PlanScreen, CoachScreen

const PLAN_TYPES = [
  { id: 'Meal', color: '#34E0A1' },
  { id: 'Training', color: '#5B8CFF' },
  { id: 'Task', color: '#FFC93C' },
  { id: 'Note', color: '#B98CFF' },
];

function PlanScreen({ go, data }) {
  const t = useTheme();
  const [now, setNow] = React.useState(() => deviceNow());
  React.useEffect(() => {
    const id = setInterval(() => setNow(deviceNow()), 30000);
    return () => clearInterval(id);
  }, []);
  const [cursor, setCursor] = React.useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [sel, setSel] = React.useState(now.getDate());
  const [type, setType] = React.useState('Training');
  const [title, setTitle] = React.useState('');
  const [time, setTime] = React.useState('18:30');
  const month = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDow = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2, '0')}`;
  const selectedDate = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(sel, days));
  const selKey = dateKeyFromDate(selectedDate);
  const todayKey = dateKeyFromDate(now);
  const selectedLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dayPlans = data.plans.filter(p => p.date === selKey);
  const moveMonth = (delta) => {
    setCursor(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));
    setSel(1);
  };

  const save = () => {
    if (!title.trim()) return;
    data.addPlan({ date: selKey, type, title: title.trim(), time });
    setTitle('');
  };

  return (
    <div>
      <TopBar go={go} title="Plan" />
      <Card pad={16} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <Eyebrow>Calendar</Eyebrow>
            <div style={{ color: t.text, fontWeight: 800, fontSize: 22, fontFamily: 'var(--display)' }}>{month}</div>
            <div style={{ color: t.faint, fontSize: 11, marginTop: 3 }}>{deviceTimezone()} · {nowTime(now)}</div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => moveMonth(-1)} style={navBtn(t)}><Icon name="chevron" size={16} style={{ transform: 'rotate(180deg)' }} color={t.muted} /></button>
            <button onClick={() => moveMonth(1)} style={navBtn(t)}><Icon name="chevron" size={16} color={t.muted} /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 6 }}>
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
            <div key={d} style={{ textAlign: 'center', color: t.faint, fontSize: 10, fontWeight: 700 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = dateKeyFromDate(new Date(cursor.getFullYear(), cursor.getMonth(), d));
            const on = key === selKey;
            const isToday = key === todayKey;
            const has = data.plans.some(p => p.date === key);
            return (
              <button key={i} onClick={() => setSel(d)} style={{
                aspectRatio: '1', borderRadius: 11, cursor: 'pointer',
                border: `1px solid ${on ? t.accent : isToday ? `${t.accent}66` : 'transparent'}`,
                background: on ? `${t.accent}1c` : isToday ? t.panel : t.elev, color: on || isToday ? t.accent : t.text,
                fontWeight: on ? 800 : 600, fontSize: 13, position: 'relative',
                fontFamily: 'var(--display)', transition: 'all .15s',
                boxShadow: isToday && !on ? `inset 0 0 0 1px ${t.accent}44` : 'none',
              }}>
                {d}
                {isToday && <span style={{ position: 'absolute', top: 5, right: 5, width: 4, height: 4, borderRadius: 99, background: t.accent }} />}
                {has && <span style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: on ? t.accent : t.muted }} />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Add plan */}
      <Card pad={16} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <Eyebrow>Plan day</Eyebrow>
          <span style={{ color: t.muted, fontSize: 13, fontFamily: 'var(--display)' }}>
            {selKey === todayKey ? `Today · ${nowTime(now)}` : selectedLabel}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {PLAN_TYPES.map(pt => (
            <button key={pt.id} onClick={() => setType(pt.id)} style={{
              padding: '11px', borderRadius: 13, cursor: 'pointer', fontWeight: 700, fontSize: 14,
              border: `1px solid ${type === pt.id ? pt.color : t.line2}`,
              background: type === pt.id ? `${pt.color}1c` : t.elev,
              color: type === pt.id ? pt.color : t.muted, transition: 'all .18s',
            }}>{pt.id}</button>
          ))}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Leg day, dinner, buy groceries…" style={{ ...inputStyle(t), marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 9 }}>
          <input value={time} onChange={e => setTime(e.target.value)} style={{ ...inputStyle(t), flex: 1, fontFamily: 'var(--display)', color: t.accent }} />
          <Btn variant="light" onClick={save}>Save plan</Btn>
        </div>
      </Card>

      {/* plans list */}
      <Eyebrow>{selKey}</Eyebrow>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {dayPlans.length === 0 ? (
          <Card pad={26}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: t.text, fontWeight: 700, fontSize: 15 }}>No plans yet</div>
              <div style={{ color: t.faint, fontSize: 13, marginTop: 4 }}>Add a task, workout, note, or meal marker.</div>
            </div>
          </Card>
        ) : dayPlans.map(p => {
          const c = PLAN_TYPES.find(x => x.id === p.type)?.color || t.accent;
          return (
            <Card key={p.id} pad={14} style={{ animation: 'dropIn .4s cubic-bezier(.22,1,.3,1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 4, height: 36, borderRadius: 99, background: c }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: c, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{p.type.toUpperCase()}</div>
                  <div style={{ color: t.text, fontWeight: 700, fontSize: 15 }}>{p.title}</div>
                </div>
                <div style={{ color: t.muted, fontWeight: 700, fontSize: 14, fontFamily: 'var(--display)' }}>{p.time}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
function navBtn(t) { return { width: 34, height: 34, borderRadius: 10, background: t.elev, border: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }; }

function isCannedCoachReplyText(reply) {
  const low = String(reply || '').toLowerCase();
  return /выберите один из вариантов|добавьте в дневник питания|please choose one of the options|i can help you with|elige una de las opciones/i.test(low);
}

// ── Coach (Assistant) ─────────────────────────────────────────────────
function CoachScreen({ go, data, profile, addFood, addPlan, notify }) {
  const t = useTheme();
  const account = profile?.email || 'guest';
  const coachKey = accountStorageKey(account, 'coach-v2');
  const intro = { from: 'ai', text: "Готов. Пиши обычным языком: я буду отвечать через основной агент и учитывать профиль, дневник, планы и текущий экран." };
  const loadCoachMessages = () => {
    const stored = storedJSON(coachKey, [intro]);
    const cleaned = stored.filter(m => !(m.from === 'ai' && isCannedCoachReplyText(m.text)));
    return cleaned.length ? cleaned : [intro];
  };
  const [msgs, setMsgs] = React.useState(loadCoachMessages);
  const [input, setInput] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    localStorage.removeItem(accountStorageKey(account, 'coach'));
    setMsgs(loadCoachMessages());
  }, [account, coachKey]);

  React.useEffect(() => {
    localStorage.setItem(coachKey, JSON.stringify(msgs.slice(-40)));
  }, [coachKey, msgs]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing]);

  const lang = (text) => /[а-яё]/i.test(text) ? 'ru' : /[áéíóúñ¿¡]|\b(hola|comi|comí|calorias|gramos)\b/i.test(text) ? 'es' : 'en';
  const clientContext = () => {
    const meals = data.log.slice(-12).map(item => {
      const food = item.food;
      return `${item.mealId}: ${food.name}, ${food.quantityG || food.servingG || 100}g, ${food.kcal} kcal, P${food.protein} C${food.carbs} F${food.fat}`;
    });
    const plans = data.plans.slice(-12).map(plan => `${plan.date} ${plan.time || ''}: ${plan.title} (${plan.type})`);
    return [
      `Profile: ${profile?.name || 'user'}, ${profile?.weightKg || 'not set'}kg, ${profile?.heightCm || 'not set'}cm, diet ${profile?.diet || 'balanced'}, goal ${fmt(GOALS.kcal)} kcal`,
      `Today totals in mobile UI: ${fmt(data.totals.kcal)} kcal, protein ${Math.round(data.totals.protein)}g, carbs ${Math.round(data.totals.carbs)}g, fat ${Math.round(data.totals.fat)}g, fiber ${Math.round(data.totals.fiber)}g`,
      `Today remaining in mobile UI: ${fmt(Math.max(0, GOALS.kcal - data.totals.kcal))} kcal`,
      `Mobile UI diary: ${meals.length ? meals.join('; ') : 'empty'}`,
      `Mobile UI plans: ${plans.length ? plans.join('; ') : 'empty'}`,
      `Important: avoid canned fallback text. React to the latest user message specifically and answer in the same language.`,
    ].join('\n');
  };
  const askBackend = async (text) => {
    const token = localStorage.getItem('tf-auth-token') || localStorage.getItem('trackfoodai-token');
    if (!token) return { content: null, error: 'no-token' };
    try {
      const res = await fetch(`${trackfoodApiBase()}/api/v1/assistant/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Client-Timezone': clientTimezoneHeader() },
        body: JSON.stringify({ message: text, client_context: clientContext() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) return { content: null, error: payload.detail || `backend-${res.status}` };
      return { content: payload.content || null, error: null };
    } catch {
      return { content: null, error: 'backend-offline' };
    }
  };
  const runLocalAction = (text) => {
    const low = text.toLowerCase();
    const language = lang(text);
    const grams = Number((low.match(/(\d{1,4})\s*(?:г|гр|g|gram|grams|gramos)/i) || [])[1]) || undefined;
    const food = findFoodInText(text);
    if (low.match(/log|add|ate|had|добав|залог|съел|ел|comí|agrega|añade/) && food) {
      addFood(food, 'snack', grams);
      notify(`Logged ${food.name}`);
      return language === 'ru'
        ? `Локально добавил ${food.name}${grams ? `, ${grams}g` : ''} в Diary.`
        : language === 'es'
          ? `Añadí localmente ${food.name}${grams ? `, ${grams}g` : ''} al diario.`
          : `Added ${food.name}${grams ? `, ${grams}g` : ''} locally to Diary.`;
    }
    if (low.match(/plan|remind|tomorrow|train|workout|leg|run|running|план|напом|завтра|трен|зал|пробеж|бег|entreno|mañana|correr/)) {
      const isRun = low.match(/run|running|пробеж|бег|correr/);
      const title = isRun ? (language === 'ru' ? 'Пробежка' : language === 'es' ? 'Correr' : 'Run') : (language === 'ru' ? 'Тренировка' : language === 'es' ? 'Entreno' : 'Training');
      addPlan({ date: dateKey(1), type: 'Training', title, time: '18:30' });
      notify('Plan added to calendar');
      return language === 'ru'
        ? `Локально добавил в календарь: ${title}, завтра в 18:30.`
        : language === 'es'
          ? `Añadí localmente al calendario: ${title}, mañana a las 18:30.`
          : `Added locally to calendar: ${title}, tomorrow at 18:30.`;
    }
    return null;
  };
  const localBalanceReply = (text) => {
    const low = text.toLowerCase();
    if (!low.match(/left|balance|calorie|how many|remaining|остал|калор|баланс|сколько|calorías|quedan/)) return null;
    const language = lang(text);
    const left = Math.max(0, GOALS.kcal - data.totals.kcal);
    if (language === 'ru') {
      return `Осталось ${fmt(left)} kcal из цели ${fmt(GOALS.kcal)} kcal. Уже записано ${fmt(data.totals.kcal)} kcal.\n\nМакросы сейчас: белок ${Math.round(data.totals.protein)}g, углеводы ${Math.round(data.totals.carbs)}g, жиры ${Math.round(data.totals.fat)}g. Это данные текущего Diary, не заготовка.`;
    }
    if (language === 'es') {
      return `Quedan ${fmt(left)} kcal de una meta de ${fmt(GOALS.kcal)} kcal. Ya hay ${fmt(data.totals.kcal)} kcal registradas.\n\nMacros ahora: proteína ${Math.round(data.totals.protein)}g, carbs ${Math.round(data.totals.carbs)}g, grasa ${Math.round(data.totals.fat)}g. Esto sale del Diary actual, no de una plantilla.`;
    }
    return `You have ${fmt(left)} kcal left from a ${fmt(GOALS.kcal)} kcal goal. Logged so far: ${fmt(data.totals.kcal)} kcal.\n\nCurrent macros: protein ${Math.round(data.totals.protein)}g, carbs ${Math.round(data.totals.carbs)}g, fat ${Math.round(data.totals.fat)}g. This comes from the current Diary, not a canned template.`;
  };
  const isCannedReply = (reply) => {
    return isCannedCoachReplyText(reply);
  };
  const offlineReply = (text, reason, actionReply) => {
    const language = lang(text);
    const left = Math.max(0, GOALS.kcal - data.totals.kcal);
    if (language === 'ru') {
      return `${actionReply ? `${actionReply}\n\n` : ''}Отвечаю по текущему контексту приложения. В дневнике сейчас ${fmt(data.totals.kcal)} kcal из ${fmt(GOALS.kcal)}, осталось ${fmt(left)} kcal. Планы и сообщения сохраняю локально для этого аккаунта.`;
    }
    if (language === 'es') {
      return `${actionReply ? `${actionReply}\n\n` : ''}Respondo con el contexto actual de la app. En el diario hay ${fmt(data.totals.kcal)} kcal de ${fmt(GOALS.kcal)}, quedan ${fmt(left)} kcal. Los planes y mensajes se guardan localmente para esta cuenta.`;
    }
    return `${actionReply ? `${actionReply}\n\n` : ''}Answering from the current app context. Local diary: ${fmt(data.totals.kcal)} of ${fmt(GOALS.kcal)} kcal, ${fmt(left)} kcal left. Plans and messages stay saved for this account.`;
  };

  const send = async (preset) => {
    const text = (preset || input).trim();
    if (!text) return;
    setMsgs(m => [...m, { from: 'me', text }]);
    setInput(''); setTyping(true);
    const actionReply = runLocalAction(text);
    if (actionReply) {
      setTimeout(() => {
        setTyping(false);
        setMsgs(m => [...m, { from: 'ai', text: actionReply }]);
      }, 320);
      return;
    }
    const backend = await askBackend(text);
    setTimeout(() => {
      setTyping(false);
      const backendContent = backend.content && !isCannedReply(backend.content) ? backend.content : null;
      const textReply = backendContent || localBalanceReply(text) || (backend.content && actionReply) || offlineReply(text, backend.content ? 'canned-backend-reply' : (backend.error || 'empty-backend-reply'), actionReply);
      setMsgs(m => [...m, { from: 'ai', text: textReply }]);
    }, backend.content ? 180 : 500);
  };

  const chips = ['Пробежка завтра', 'Сколько калорий осталось?', 'Добавь банан 120г', 'Белковый перекус'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar go={go} title="Coach" extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${t.accent}14`, border: `1px solid ${t.accent}44`,
          borderRadius: 999, padding: '6px 11px' }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: t.accent, boxShadow: `0 0 8px ${t.accent}` }} />
          <span style={{ color: t.accent, fontWeight: 700, fontSize: 12 }}>Main context</span>
        </div>
      } showProfile={false} />

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8, marginBottom: 10 }}>
        {msgs.map((m, i) => <Bubble key={i} m={m} t={t} />)}
        {typing && (
          <div style={{ alignSelf: 'flex-start', background: t.panel, border: `1px solid ${t.line}`, borderRadius: 18, borderTopLeftRadius: 6, padding: '13px 16px', display: 'flex', gap: 5 }}>
            {[0,1,2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: 99, background: t.muted, animation: `blink 1.2s ${i*0.18}s infinite` }} />)}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 9 }}>
          {chips.map(c => <Chip key={c} onClick={() => send(c)}>{c}</Chip>)}
        </div>
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Спроси про еду, граммы, план или дневной баланс…" style={{ ...inputStyle(t), borderRadius: 999 }} />
          <button onClick={() => send()} style={{ width: 48, height: 48, borderRadius: 999, flexShrink: 0, border: 'none', cursor: 'pointer',
            background: t.accent, color: t.accentOn, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${t.accentGlow}` }}>
            <Icon name="send" size={20} stroke={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m, t }) {
  const me = m.from === 'me';
  return (
    <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '82%',
      background: me ? t.accent : t.panel, color: me ? t.accentOn : t.text,
      border: me ? 'none' : `1px solid ${t.line}`, borderRadius: 18,
      borderTopRightRadius: me ? 6 : 18, borderTopLeftRadius: me ? 18 : 6,
      padding: '12px 15px', fontSize: 14.5, lineHeight: 1.5, fontWeight: me ? 600 : 500,
      animation: 'dropIn .35s cubic-bezier(.22,1,.3,1)' }}>
      {m.text}
    </div>
  );
}

Object.assign(window, { PlanScreen, CoachScreen });
