// screens-plan.jsx — Plan (Calendar) + Coach (Assistant). Exports: PlanScreen, CoachScreen

const PLAN_TYPES = [
  { id: 'Meal', color: '#34E0A1' },
  { id: 'Training', color: '#5B8CFF' },
  { id: 'Task', color: '#FFC93C' },
  { id: 'Note', color: '#B98CFF' },
];

function PlanScreen({ go, data }) {
  const t = useTheme();
  const [sel, setSel] = React.useState(29);
  const [type, setType] = React.useState('Training');
  const [title, setTitle] = React.useState('');
  const [time, setTime] = React.useState('18:30');
  const month = 'May 2026';
  // May 2026: starts Friday (1st = Fri). grid offset: Su=0 → 1st is Fri index 5
  const firstDow = 5; const days = 31;
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const selKey = `2026-05-${String(sel).padStart(2, '0')}`;
  const dayPlans = data.plans.filter(p => p.date === selKey);

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
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button style={navBtn(t)}><Icon name="chevron" size={16} style={{ transform: 'rotate(180deg)' }} color={t.muted} /></button>
            <button style={navBtn(t)}><Icon name="chevron" size={16} color={t.muted} /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5, marginBottom: 6 }}>
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} style={{ textAlign: 'center', color: t.faint, fontSize: 10, fontWeight: 700 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const on = d === sel;
            const has = data.plans.some(p => p.date === `2026-05-${String(d).padStart(2,'0')}`);
            return (
              <button key={i} onClick={() => setSel(d)} style={{
                aspectRatio: '1', borderRadius: 11, cursor: 'pointer',
                border: `1px solid ${on ? t.accent : 'transparent'}`,
                background: on ? `${t.accent}1c` : t.elev, color: on ? t.accent : t.text,
                fontWeight: on ? 800 : 600, fontSize: 13, position: 'relative',
                fontFamily: 'var(--display)', transition: 'all .15s',
              }}>
                {d}
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
          <span style={{ color: t.muted, fontSize: 13, fontFamily: 'var(--display)' }}>{selKey}</span>
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

// ── Coach (Assistant) ─────────────────────────────────────────────────
function CoachScreen({ go, data, addFood, addPlan, notify }) {
  const t = useTheme();
  const [msgs, setMsgs] = React.useState([
    { from: 'ai', text: "Hey — I'm your FoodTrack coach. I can log meals, plan reminders, or read today's balance. What's up?" },
  ]);
  const [input, setInput] = React.useState('');
  const [typing, setTyping] = React.useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing]);

  const respond = (text) => {
    const low = text.toLowerCase();
    const left = Math.max(0, GOALS.kcal - data.totals.kcal);
    // log food
    const food = FOOD_DB.find(f => low.includes(f.name.toLowerCase().split(' ')[0]));
    if (low.match(/log|add|ate|had/) && food) {
      addFood(food, 'snack'); notify(`Logged ${food.name}`);
      return `Done — logged **${food.name}** (${food.kcal} kcal) to your snacks. You've got **${fmt(left - food.kcal)} kcal** left today.`;
    }
    if (low.match(/left|balance|calorie|how many|remaining/)) {
      return `You're at **${fmt(data.totals.kcal)} / ${fmt(GOALS.kcal)} kcal** today (${Math.round(data.totals.kcal/GOALS.kcal*100)}%). That's **${fmt(left)} kcal** left. Protein's at ${Math.round(data.totals.protein)}g — push it toward ${GOALS.protein}g.`;
    }
    if (low.match(/plan|remind|tomorrow|train|workout|leg/)) {
      addPlan({ date: dateKey(1), type: 'Training', title: 'Leg day', time: '18:30' });
      notify('Plan added to calendar');
      return `Set — **Leg day** added to tomorrow at 18:30. Want me to pre-log a post-workout shake too?`;
    }
    if (low.match(/protein|snack|suggest|recommend/)) {
      return `For a high-protein snack: a **whey shake (27g protein, 130 kcal)** or **Greek yogurt bowl (24g)**. Want me to log one?`;
    }
    return `Got it. I can log meals, check your balance, or plan your week — try "log a banana" or "how many calories left?"`;
  };

  const send = (preset) => {
    const text = (preset || input).trim();
    if (!text) return;
    setMsgs(m => [...m, { from: 'me', text }]);
    setInput(''); setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs(m => [...m, { from: 'ai', text: respond(text) }]);
    }, 1100);
  };

  const chips = ['Calories left today?', 'Log a banana', 'Plan leg day tomorrow', 'High-protein snack'];

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
            placeholder="Ask to log food, plan, or check your day…" style={{ ...inputStyle(t), borderRadius: 999 }} />
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
  // simple **bold** rendering
  const parts = m.text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div style={{ alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '82%',
      background: me ? t.accent : t.panel, color: me ? t.accentOn : t.text,
      border: me ? 'none' : `1px solid ${t.line}`, borderRadius: 18,
      borderTopRightRadius: me ? 6 : 18, borderTopLeftRadius: me ? 18 : 6,
      padding: '12px 15px', fontSize: 14.5, lineHeight: 1.5, fontWeight: me ? 600 : 500,
      animation: 'dropIn .35s cubic-bezier(.22,1,.3,1)' }}>
      {parts.map((p, i) => p.startsWith('**')
        ? <strong key={i} style={{ fontWeight: 800, color: me ? t.accentOn : t.accent }}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>)}
    </div>
  );
}

Object.assign(window, { PlanScreen, CoachScreen });
