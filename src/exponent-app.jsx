import { useState, useEffect, useRef, useCallback } from "react";

// ── Palette & tokens ────────────────────────────────────────────────────────
const C = {
  bg: "#0D0D0F",
  surface: "#141416",
  surfaceHover: "#1A1A1D",
  border: "rgba(255,255,255,0.07)",
  borderMid: "rgba(255,255,255,0.13)",
  accent: "#7C6FFF",
  accentDim: "rgba(124,111,255,0.15)",
  accentGlow: "rgba(124,111,255,0.35)",
  green: "#3DDC84",
  greenDim: "rgba(61,220,132,0.12)",
  amber: "#F5A524",
  amberDim: "rgba(245,165,36,0.12)",
  red: "#FF4D4D",
  redDim: "rgba(255,77,77,0.12)",
  textPrimary: "#F0EEF8",
  textSecondary: "#8E8CA0",
  textTertiary: "#54525E",
  teal: "#00D4C8",
  tealDim: "rgba(0,212,200,0.12)",
};

const font = `'IBM Plex Mono', 'Courier New', monospace`;
const sans = `'DM Sans', system-ui, sans-serif`;

// ── Utility ─────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");
const fmtTime = (s) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);

// ── Storage helpers ──────────────────────────────────────────────────────────
const store = {
  get: (k, def) => { try { const v = localStorage.getItem("exp_" + k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem("exp_" + k, JSON.stringify(v)); } catch {} },
};

// ── Web Audio helpers ────────────────────────────────────────────────────────
let _audioCtx = null;
const getCtx = () => { if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return _audioCtx; };

function createBinauralNode(freq, beat) {
  const ctx = getCtx();
  const L = ctx.createOscillator();
  const R = ctx.createOscillator();
  const merger = ctx.createChannelMerger(2);
  const gainNode = ctx.createGain();
  L.frequency.value = freq;
  R.frequency.value = freq + beat;
  L.connect(merger, 0, 0);
  R.connect(merger, 0, 1);
  merger.connect(gainNode);
  gainNode.gain.value = 0.12;
  gainNode.connect(ctx.destination);
  L.start(); R.start();
  return { stop: () => { try { L.stop(); R.stop(); } catch {} }, gainNode };
}

function createNoiseNode(type) {
  const ctx = getCtx();
  const bufSize = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  if (type === "white") {
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  } else {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  const source = ctx.createBufferSource();
  source.buffer = buf; source.loop = true;
  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.4;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start();
  return { stop: () => { try { source.stop(); } catch {} }, gainNode };
}

// ── Global styles injection ──────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("exp-styles")) return;
  const s = document.createElement("style");
  s.id = "exp-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${C.bg}; color: ${C.textPrimary}; font-family: ${sans}; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
    .exp-btn { background: transparent; border: 1px solid ${C.border}; color: ${C.textPrimary};
      padding: 8px 16px; border-radius: 8px; cursor: pointer; font-family: ${sans};
      font-size: 13px; transition: all 0.15s; }
    .exp-btn:hover { border-color: ${C.borderMid}; background: ${C.surfaceHover}; }
    .exp-btn.primary { background: ${C.accent}; border-color: ${C.accent}; color: #fff; font-weight: 500; }
    .exp-btn.primary:hover { opacity: 0.88; }
    .exp-btn.danger { background: ${C.redDim}; border-color: ${C.red}; color: ${C.red}; }
    .exp-input { background: ${C.surface}; border: 1px solid ${C.border}; color: ${C.textPrimary};
      padding: 8px 12px; border-radius: 8px; font-family: ${sans}; font-size: 14px; width: 100%;
      outline: none; transition: border-color 0.15s; }
    .exp-input:focus { border-color: ${C.accent}; }
    .exp-input::placeholder { color: ${C.textTertiary}; }
    .exp-card { background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 12px; padding: 20px; }
    .kanban-col { background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 12px;
      padding: 16px; min-width: 220px; flex: 1; min-height: 200px; }
    .kanban-card { background: ${C.bg}; border: 1px solid ${C.border}; border-radius: 8px;
      padding: 12px; margin-bottom: 8px; cursor: grab; transition: all 0.15s; position: relative; }
    .kanban-card:hover { border-color: ${C.borderMid}; transform: translateY(-1px); }
    .kanban-card.dragging { opacity: 0.4; }
    .drop-zone { border: 2px dashed ${C.accentGlow}; border-radius: 8px; padding: 8px; margin-bottom: 8px;
      display: none; height: 48px; align-items: center; justify-content: center; color: ${C.accent}; font-size: 12px; }
    .drop-zone.active { display: flex; }
    .node-circle { cursor: pointer; transition: all 0.2s; }
    .node-circle:hover rect { stroke: ${C.accent}; stroke-width: 2px; }
    .wb-edge { stroke: ${C.textTertiary}; stroke-width: 1.5; fill: none; opacity: 0.6; }
    .wb-edge.highlighted { stroke: ${C.accent}; opacity: 1; }
    textarea.exp-input { resize: vertical; min-height: 100px; }
    .stat-bar { height: 6px; background: ${C.border}; border-radius: 3px; overflow: hidden; }
    .stat-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
    .pomo-ring { transform: rotate(-90deg); transform-origin: center; transition: stroke-dashoffset 1s linear; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px;
      cursor: pointer; font-size: 14px; color: ${C.textSecondary}; transition: all 0.15s;
      border: 1px solid transparent; font-family: ${sans}; background: none; width: 100%; text-align: left; }
    .nav-item:hover { background: ${C.surfaceHover}; color: ${C.textPrimary}; }
    .nav-item.active { background: ${C.accentDim}; color: ${C.accent}; border-color: ${C.accentGlow}; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
      font-family: ${font}; letter-spacing: 0.05em; }
    .slider-row { display: flex; align-items: center; gap: 12px; }
    .slider-row input[type=range] { flex: 1; accent-color: ${C.accent}; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    .fade-in { animation: fadeIn 0.25s ease; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    .pulse { animation: pulse 1.5s infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1s linear infinite; }
  `;
  document.head.appendChild(s);
};

// ═══════════════════════════════════════════════════════════════════════════
// POMODORO + FOCUS TIMER
// ═══════════════════════════════════════════════════════════════════════════
function PomodoroView({ onSession }) {
  const MODES = [
    { label: "Focus", duration: 25 * 60, color: C.accent },
    { label: "Short Break", duration: 5 * 60, color: C.green },
    { label: "Long Break", duration: 15 * 60, color: C.teal },
  ];
  const [mode, setMode] = useState(0);
  const [seconds, setSeconds] = useState(MODES[0].duration);
  const [running, setRunning] = useState(false);
  const [session, setSession] = useState(store.get("pomo_count", 0));
  const [focusTotal, setFocusTotal] = useState(store.get("focus_total", 0));
  const [customWork, setCustomWork] = useState(25);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const currentMode = MODES[mode];
  const total = mode === 0 ? customWork * 60 : currentMode.duration;
  const progress = 1 - seconds / total;
  const r = 90; const circ = 2 * Math.PI * r;

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now() - (total - seconds) * 1000;
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const left = Math.max(0, total - elapsed);
        setSeconds(left);
        if (left === 0) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (mode === 0) {
            const newCount = session + 1;
            const addedFocus = customWork;
            setSession(newCount);
            setFocusTotal(ft => { store.set("focus_total", ft + addedFocus); return ft + addedFocus; });
            store.set("pomo_count", newCount);
            onSession && onSession({ date: today(), minutes: customWork });
            try { new Notification("Exponent", { body: "Focus session complete! Take a break." }); } catch {}
          }
        }
      }, 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const reset = () => { setRunning(false); setSeconds(mode === 0 ? customWork * 60 : currentMode.duration); };
  const switchMode = (i) => { setMode(i); setRunning(false); setSeconds(i === 0 ? customWork * 60 : MODES[i].duration); };

  return (
    <div className="fade-in" style={{ maxWidth: 520, margin: "0 auto", paddingTop: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {MODES.map((m, i) => (
          <button key={i} className="exp-btn" onClick={() => switchMode(i)}
            style={{ flex: 1, fontSize: 12, background: mode === i ? m.color + "22" : undefined, borderColor: mode === i ? m.color : undefined, color: mode === i ? m.color : undefined }}>
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
        <div style={{ position: "relative", width: 220, height: 220 }}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r={r} fill="none" stroke={C.border} strokeWidth="8" />
            <circle cx="110" cy="110" r={r} fill="none" stroke={currentMode.color} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)} className="pomo-ring" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: font, fontSize: 42, fontWeight: 600, color: C.textPrimary, letterSpacing: "-1px" }}>{fmtTime(seconds)}</span>
            <span style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>{currentMode.label}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 32 }}>
        <button className="exp-btn primary" onClick={() => setRunning(r => !r)} style={{ minWidth: 120, fontSize: 15 }}>
          {running ? "⏸ Pause" : "▶ Start"}
        </button>
        <button className="exp-btn" onClick={reset}>↺ Reset</button>
        <button className="exp-btn" onClick={() => setShowSettings(s => !s)} style={{ color: C.textSecondary }}>⚙</button>
      </div>

      {showSettings && (
        <div className="exp-card fade-in" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 12 }}>Work duration</div>
          <div className="slider-row">
            <input type="range" min="5" max="90" step="5" value={customWork}
              onChange={e => { setCustomWork(+e.target.value); if (!running && mode === 0) setSeconds(+e.target.value * 60); }} />
            <span style={{ fontFamily: font, color: C.accent, minWidth: 48, fontSize: 14 }}>{customWork} min</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { label: "Sessions today", value: session, color: C.accent },
          { label: "Focus minutes", value: focusTotal, color: C.green },
          { label: "Deep work hrs", value: (focusTotal / 60).toFixed(1), color: C.teal },
        ].map((s, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontFamily: font, fontSize: 26, fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="exp-card" style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, fontFamily: font }}>// 2-MINUTE RULE</div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
          If a task takes less than 2 minutes — <span style={{ color: C.green }}>do it now</span>. Otherwise, schedule it in the Kanban board and dedicate a full Pomodoro to it.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// KANBAN BOARD
// ═══════════════════════════════════════════════════════════════════════════
const COLS = ["Backlog", "Today", "In Progress", "Done"];
const COL_COLORS = { Backlog: C.textTertiary, Today: C.amber, "In Progress": C.accent, Done: C.green };
const PRIORITY = { low: C.textTertiary, medium: C.amber, high: C.red };

function KanbanView() {
  const [tasks, setTasks] = useState(() => store.get("tasks", [
    { id: uid(), col: "Backlog", text: "Read 10 pages", priority: "low", tag: "reading" },
    { id: uid(), col: "Today", text: "Morning workout", priority: "high", tag: "health" },
    { id: uid(), col: "In Progress", text: "Deep work session", priority: "high", tag: "work" },
  ]));
  const [newText, setNewText] = useState("");
  const [newCol, setNewCol] = useState("Today");
  const [newPriority, setNewPriority] = useState("medium");
  const [newTag, setNewTag] = useState("");
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const save = (t) => { setTasks(t); store.set("tasks", t); };

  const addTask = () => {
    if (!newText.trim()) return;
    save([...tasks, { id: uid(), col: newCol, text: newText.trim(), priority: newPriority, tag: newTag.trim() || "general" }]);
    setNewText(""); setNewTag("");
  };

  const deleteTask = (id) => save(tasks.filter(t => t.id !== id));

  const onDragStart = (id) => setDragging(id);
  const onDragOver = (e, col) => { e.preventDefault(); setDragOver(col); };
  const onDrop = (col) => {
    if (dragging) save(tasks.map(t => t.id === dragging ? { ...t, col } : t));
    setDragging(null); setDragOver(null);
  };

  return (
    <div className="fade-in">
      <div className="exp-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <input className="exp-input" placeholder="New task..." value={newText}
            onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
            style={{ flex: 2, minWidth: 180 }} />
          <select className="exp-input" value={newCol} onChange={e => setNewCol(e.target.value)} style={{ flex: 1, minWidth: 110 }}>
            {COLS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="exp-input" value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{ flex: 1, minWidth: 100 }}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
          <input className="exp-input" placeholder="tag" value={newTag} onChange={e => setNewTag(e.target.value)} style={{ flex: 1, minWidth: 80 }} />
          <button className="exp-btn primary" onClick={addTask}>+ Add</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {COLS.map(col => {
          const colTasks = tasks.filter(t => t.col === col);
          return (
            <div key={col} className="kanban-col"
              onDragOver={e => onDragOver(e, col)} onDrop={() => onDrop(col)}
              style={{ borderTop: `2px solid ${COL_COLORS[col]}`, minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COL_COLORS[col], fontFamily: font, letterSpacing: "0.06em", textTransform: "uppercase" }}>{col}</span>
                <span style={{ background: COL_COLORS[col] + "22", color: COL_COLORS[col], borderRadius: 20, padding: "2px 8px", fontSize: 11, fontFamily: font }}>{colTasks.length}</span>
              </div>
              {dragOver === col && <div className="drop-zone active">Drop here</div>}
              {colTasks.map(task => (
                <div key={task.id} className={`kanban-card${dragging === task.id ? " dragging" : ""}`}
                  draggable onDragStart={() => onDragStart(task.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.5 }}>{task.text}</span>
                    <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: C.textTertiary, cursor: "pointer", fontSize: 14, lineHeight: 1, flexShrink: 0 }}>×</button>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRIORITY[task.priority], flexShrink: 0 }} />
                    <span className="tag" style={{ background: C.accentDim, color: C.accent }}>#{task.tag}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NOISE & BINAURAL BEATS
// ═══════════════════════════════════════════════════════════════════════════
const BINAURAL_PRESETS = [
  { name: "Deep Focus", freq: 200, beat: 14, band: "Beta 14Hz", desc: "Analytical thinking & concentration", color: C.accent },
  { name: "Flow State", freq: 180, beat: 40, band: "Gamma 40Hz", desc: "Peak performance & cognitive flex", color: C.teal },
  { name: "Calm Focus", freq: 210, beat: 10, band: "Alpha 10Hz", desc: "Relaxed awareness, reduced anxiety", color: C.green },
  { name: "Creative Mode", freq: 160, beat: 7, band: "Theta 7Hz", desc: "Creativity & divergent thinking", color: C.amber },
  { name: "Deep Rest", freq: 120, beat: 2, band: "Delta 2Hz", desc: "Recovery & deep relaxation", color: "#AA80FF" },
];

function SoundView() {
  const [active, setActive] = useState(null); // binaural preset index
  const [noiseType, setNoiseType] = useState(null); // "white"|"brown"|null
  const [binVol, setBinVol] = useState(60);
  const [noiseVol, setNoiseVol] = useState(50);
  const binNodeRef = useRef(null);
  const noiseNodeRef = useRef(null);

  const playBinaural = (i) => {
    if (binNodeRef.current) { binNodeRef.current.stop(); binNodeRef.current = null; }
    if (active === i) { setActive(null); return; }
    try {
      const ctx = getCtx(); if (ctx.state === "suspended") ctx.resume();
      const p = BINAURAL_PRESETS[i];
      const node = createBinauralNode(p.freq, p.beat);
      node.gainNode.gain.value = binVol / 500;
      binNodeRef.current = node;
      setActive(i);
    } catch (e) { console.error(e); }
  };

  const playNoise = (type) => {
    if (noiseNodeRef.current) { noiseNodeRef.current.stop(); noiseNodeRef.current = null; }
    if (noiseType === type) { setNoiseType(null); return; }
    try {
      const ctx = getCtx(); if (ctx.state === "suspended") ctx.resume();
      const node = createNoiseNode(type);
      node.gainNode.gain.value = noiseVol / 100;
      noiseNodeRef.current = node;
      setNoiseType(type);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (binNodeRef.current) binNodeRef.current.gainNode.gain.value = binVol / 500;
  }, [binVol]);
  useEffect(() => {
    if (noiseNodeRef.current) noiseNodeRef.current.gainNode.gain.value = noiseVol / 100;
  }, [noiseVol]);

  useEffect(() => () => {
    if (binNodeRef.current) binNodeRef.current.stop();
    if (noiseNodeRef.current) noiseNodeRef.current.stop();
  }, []);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: font, color: C.textSecondary, letterSpacing: "0.1em", marginBottom: 16 }}>// BINAURAL BEATS — USE HEADPHONES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {BINAURAL_PRESETS.map((p, i) => (
            <button key={i} onClick={() => playBinaural(i)} style={{
              background: active === i ? p.color + "18" : C.surface,
              border: `1px solid ${active === i ? p.color : C.border}`,
              borderRadius: 12, padding: 16, cursor: "pointer", text: "left", textAlign: "left",
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: active === i ? p.color : C.textPrimary }}>{p.name}</span>
                {active === i && <span style={{ fontSize: 10, color: p.color }} className="pulse">● LIVE</span>}
              </div>
              <span className="tag" style={{ background: p.color + "20", color: p.color, marginBottom: 8, display: "inline-block" }}>{p.band}</span>
              <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{p.desc}</div>
            </button>
          ))}
        </div>
        {active !== null && (
          <div className="slider-row" style={{ marginTop: 16 }}>
            <span style={{ fontSize: 12, color: C.textSecondary, minWidth: 80 }}>Volume</span>
            <input type="range" min="0" max="100" value={binVol} onChange={e => setBinVol(+e.target.value)} />
            <span style={{ fontFamily: font, color: C.accent, minWidth: 36, fontSize: 13 }}>{binVol}%</span>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 11, fontFamily: font, color: C.textSecondary, letterSpacing: "0.1em", marginBottom: 16 }}>// BACKGROUND NOISE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { type: "white", label: "White Noise", desc: "Masks all frequencies equally. Best for open offices.", icon: "≋", color: C.textPrimary },
            { type: "brown", label: "Brown Noise", desc: "Deep, rumbling tone. Ideal for deep focus & ADHD.", icon: "◉", color: C.amber },
          ].map(n => (
            <button key={n.type} onClick={() => playNoise(n.type)} style={{
              background: noiseType === n.type ? n.color + "12" : C.surface,
              border: `1px solid ${noiseType === n.type ? n.color : C.border}`,
              borderRadius: 12, padding: 20, cursor: "pointer", textAlign: "left", transition: "all 0.2s",
            }}>
              <div style={{ fontSize: 28, marginBottom: 10, color: n.color }}>{n.icon}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 500, color: noiseType === n.type ? n.color : C.textPrimary }}>{n.label}</span>
                {noiseType === n.type && <span style={{ fontSize: 10, color: n.color }} className="pulse">● LIVE</span>}
              </div>
              <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6, lineHeight: 1.5 }}>{n.desc}</div>
            </button>
          ))}
        </div>
        {noiseType && (
          <div className="slider-row" style={{ marginTop: 16 }}>
            <span style={{ fontSize: 12, color: C.textSecondary, minWidth: 80 }}>Volume</span>
            <input type="range" min="0" max="100" value={noiseVol} onChange={e => setNoiseVol(+e.target.value)} />
            <span style={{ fontFamily: font, color: C.amber, minWidth: 36, fontSize: 13 }}>{noiseVol}%</span>
          </div>
        )}
      </div>

      <div className="exp-card" style={{ marginTop: 24 }}>
        <div style={{ fontSize: 11, fontFamily: font, color: C.textSecondary, marginBottom: 8 }}>// SCIENCE NOTE</div>
        <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8 }}>
          Binaural beats require <span style={{ color: C.accent }}>stereo headphones</span>. Your brain perceives the frequency difference between ears, which can guide brainwave patterns toward desired states. Alpha (8–13Hz) reduces anxiety. Beta (14–30Hz) boosts analytical focus. Gamma (40Hz) enhances cognitive flexibility. <span style={{ color: C.textTertiary }}>Results vary by individual.</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI PLAN BUILDER — WHITEBOARD
// ═══════════════════════════════════════════════════════════════════════════
function WhiteboardView() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(null);
  const svgRef = useRef();

  const buildPlan = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setError(null); setNodes([]); setEdges([]);
    try {
      const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_KEY}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{
          text: `You are a personal development planner. The user gives you a messy, raw goal or life situation.
You must extract a clear action plan and return ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "title": "Short plan title",
  "nodes": [
    { "id": "1", "label": "Node label (max 4 words)", "type": "goal|phase|action|habit|obstacle|milestone", "detail": "One sentence description" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "optional" }
  ]
}
Types: goal = the main objective, phase = major phase, action = concrete step, habit = daily practice, obstacle = challenge to overcome, milestone = achievement checkpoint.
Create 8-16 nodes. Make it actionable and honest. Connect them logically. Acknowledge real obstacles.`
        }]
      },
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    }),
  }
);

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const plan = JSON.parse(clean);


      // Auto-layout nodes in a layered graph
      const TYPE_ORDER = { goal: 0, phase: 1, action: 2, habit: 3, milestone: 4, obstacle: 5 };
      const sorted = [...plan.nodes].sort((a, b) => (TYPE_ORDER[a.type] || 2) - (TYPE_ORDER[b.type] || 2));
      const cols = {};
      sorted.forEach(n => {
        const col = TYPE_ORDER[n.type] || 2;
        if (!cols[col]) cols[col] = [];
        cols[col].push(n);
      });
      const W = 760, H = 420;
      const colKeys = Object.keys(cols).sort((a, b) => +a - +b);
      const colW = W / (colKeys.length + 1);
      const positioned = {};
      colKeys.forEach((col, ci) => {
        const items = cols[col];
        const rowH = H / (items.length + 1);
        items.forEach((n, ri) => {
          positioned[n.id] = { x: colW * (ci + 1), y: rowH * (ri + 1) };
        });
      });

      setNodes(plan.nodes.map(n => ({ ...n, ...(positioned[n.id] || { x: 100 + Math.random() * 600, y: 100 + Math.random() * 300 }) })));
      setEdges(plan.edges || []);
    } catch (e) {
      setError("Could not parse plan. Try rephrasing your goal with more detail.");
    }
    setLoading(false);
  };

  const NODE_COLORS = {
    goal: { fill: C.accent + "22", stroke: C.accent, text: C.accent },
    phase: { fill: C.teal + "22", stroke: C.teal, text: C.teal },
    action: { fill: C.surface, stroke: C.borderMid, text: C.textPrimary },
    habit: { fill: C.green + "18", stroke: C.green, text: C.green },
    obstacle: { fill: C.red + "18", stroke: C.red, text: C.red },
    milestone: { fill: C.amber + "18", stroke: C.amber, text: C.amber },
  };

  const handleMouseDown = (e, id) => {
    e.stopPropagation();
    const svgRect = svgRef.current.getBoundingClientRect();
    const node = nodes.find(n => n.id === id);
    setDraggingNode(id);
    setOffset({ x: e.clientX - svgRect.left - node.x, y: e.clientY - svgRect.top - node.y });
    setSelected(id);
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingNode) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left - offset.x;
    const y = e.clientY - svgRect.top - offset.y;
    setNodes(ns => ns.map(n => n.id === draggingNode ? { ...n, x, y } : n));
  }, [draggingNode, offset]);

  const handleMouseUp = () => setDraggingNode(null);

  const selectedNode = nodes.find(n => n.id === selected);

  return (
    <div className="fade-in">
      <div className="exp-card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontFamily: font, color: C.textSecondary, letterSpacing: "0.1em", marginBottom: 10 }}>// DUMP YOUR BRAIN — AI BUILDS THE PLAN</div>
        <textarea className="exp-input" placeholder="e.g. 'I want to get fit but I keep quitting after 2 weeks. I work long hours, eat junk food, have no gym. I need to change my life but don't know where to start...'"
          value={prompt} onChange={e => setPrompt(e.target.value)} style={{ minHeight: 80, marginBottom: 12 }} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="exp-btn primary" onClick={buildPlan} disabled={loading} style={{ minWidth: 140 }}>
            {loading ? <span><span className="spin" style={{ display: "inline-block", marginRight: 6 }}>⟳</span>Planning...</span> : "✦ Build Plan"}
          </button>
        </div>
        {error && <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>

      {nodes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", top: 10, left: 12, fontSize: 10, fontFamily: font, color: C.textTertiary, zIndex: 2 }}>drag nodes to rearrange</div>
            <svg ref={svgRef} width="100%" height="460" viewBox="0 0 760 460"
              onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
              style={{ cursor: draggingNode ? "grabbing" : "default" }}>
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill={C.textTertiary} />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const from = nodes.find(n => n.id === e.from);
                const to = nodes.find(n => n.id === e.to);
                if (!from || !to) return null;
                const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
                return (
                  <g key={i}>
                    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={C.textTertiary} strokeWidth="1.5" strokeOpacity="0.5" markerEnd="url(#arrow)" />
                    {e.label && <text x={mx} y={my - 4} fontSize="9" fill={C.textTertiary} textAnchor="middle">{e.label}</text>}
                  </g>
                );
              })}
              {nodes.map(n => {
                const col = NODE_COLORS[n.type] || NODE_COLORS.action;
                const W = 110, H = 44;
                return (
                  <g key={n.id} transform={`translate(${n.x - W / 2},${n.y - H / 2})`}
                    onMouseDown={e => handleMouseDown(e, n.id)} style={{ cursor: "grab" }}>
                    <rect width={W} height={H} rx="8" fill={col.fill} stroke={selected === n.id ? col.stroke : col.stroke + "88"} strokeWidth={selected === n.id ? 2 : 1} />
                    <text x={W / 2} y={H / 2 - 6} fontSize="10" fill={col.text} textAnchor="middle" fontWeight="500" fontFamily={sans}>{n.label}</text>
                    <text x={W / 2} y={H / 2 + 8} fontSize="8" fill={C.textTertiary} textAnchor="middle" fontFamily={sans}>{n.type}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 11, fontFamily: font, color: C.textSecondary, letterSpacing: "0.06em" }}>// NODE LEGEND</div>
            {Object.entries(NODE_COLORS).map(([type, col]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: col.fill, border: `1px solid ${col.stroke}`, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.textSecondary }}>{type}</span>
              </div>
            ))}
            {selectedNode && (
              <div className="exp-card" style={{ marginTop: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: (NODE_COLORS[selectedNode.type] || NODE_COLORS.action).text, marginBottom: 6 }}>{selectedNode.label}</div>
                <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.6 }}>{selectedNode.detail}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {nodes.length === 0 && !loading && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ fontSize: 32, opacity: 0.2 }}>◈</div>
          <div style={{ color: C.textTertiary, fontSize: 13, fontFamily: font }}>// whiteboard empty — build a plan above</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STATS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
function StatsView({ sessions }) {
  const tasks = store.get("tasks", []);
  const doneTasks = tasks.filter(t => t.col === "Done").length;
  const totalFocus = store.get("focus_total", 0);
  const pomoCount = store.get("pomo_count", 0);
  const streak = store.get("streak", 1);

  // Build last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en", { weekday: "short" }).slice(0, 1);
    const mins = sessions.filter(s => s.date === key).reduce((a, s) => a + s.minutes, 0);
    return { key, label, mins };
  });
  const maxMins = Math.max(...days.map(d => d.mins), 1);

  const HACKS = [
    { title: "2-Minute Rule", desc: "Tasks under 2 min → do immediately. Kills micro-procrastination.", color: C.green },
    { title: "Time Blocking", desc: "Schedule specific tasks to specific hours. Intention > availability.", color: C.accent },
    { title: "The 5-Second Rule", desc: "Count 5-4-3-2-1 then move. Bypasses hesitation loops.", color: C.amber },
    { title: "Eat the Frog", desc: "Do your hardest task first. Willpower is highest in the morning.", color: C.teal },
    { title: "Environment Design", desc: "Remove friction. Phone in another room = 26% better focus.", color: "#AA80FF" },
    { title: "Ultradian Rhythms", desc: "Work 90 min, rest 20 min. Aligns with brain's natural cycle.", color: C.red },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Focus minutes", value: totalFocus, color: C.accent, icon: "◷" },
          { label: "Pomodoros", value: pomoCount, color: C.green, icon: "◉" },
          { label: "Tasks done", value: doneTasks, color: C.teal, icon: "✓" },
          { label: "Day streak", value: streak, color: C.amber, icon: "⚡" },
        ].map((s, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 20, color: s.color, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: font, fontSize: 28, fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="exp-card" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontFamily: font, color: C.textSecondary, letterSpacing: "0.08em", marginBottom: 16 }}>// FOCUS ACTIVITY — LAST 14 DAYS</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", height: Math.max(4, (d.mins / maxMins) * 64), background: d.mins > 0 ? C.accent : C.border, borderRadius: "3px 3px 0 0", transition: "height 0.4s ease", opacity: d.key === today() ? 1 : 0.7 }} />
              <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: font }}>{d.label}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: C.textTertiary, textAlign: "right" }}>Complete Pomodoros to fill the chart</div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontFamily: font, color: C.textSecondary, letterSpacing: "0.08em", marginBottom: 16 }}>// PROVEN PRODUCTIVITY HACKS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {HACKS.map((h, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderLeft: `3px solid ${h.color}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: h.color, marginBottom: 6 }}>{h.title}</div>
              <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.6 }}>{h.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════
const VIEWS = [
  { id: "pomo", label: "Focus Timer", icon: "◷" },
  { id: "kanban", label: "Task Board", icon: "⊞" },
  { id: "sound", label: "Sound Lab", icon: "◉" },
  { id: "plan", label: "AI Planner", icon: "✦" },
  { id: "stats", label: "Dashboard", icon: "▦" },
];

export default function App() {
  useEffect(() => { injectStyles(); }, []);
  const [view, setView] = useState("pomo");
  const [sessions, setSessions] = useState(() => store.get("sessions", []));

  const addSession = (s) => {
    const updated = [...sessions, s];
    setSessions(updated);
    store.set("sessions", updated);
  };

  const renderView = () => {
    switch (view) {
      case "pomo": return <PomodoroView onSession={addSession} />;
      case "kanban": return <KanbanView />;
      case "sound": return <SoundView />;
      case "plan": return <WhiteboardView />;
      case "stats": return <StatsView sessions={sessions} />;
      default: return null;
    }
  };

  const current = VIEWS.find(v => v.id === view);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: sans }}>
      {/* Sidebar */}
      <div style={{ width: 220, borderRight: `1px solid ${C.border}`, padding: "24px 12px", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "0 6px", marginBottom: 32 }}>
          <div style={{ fontFamily: font, fontSize: 18, fontWeight: 600, color: C.accent, letterSpacing: "-0.5px" }}>EXPONENT</div>
          <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>productivity OS</div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {VIEWS.map(v => (
            <button key={v.id} className={`nav-item${view === v.id ? " active" : ""}`} onClick={() => setView(v.id)}>
              <span style={{ fontFamily: font, fontSize: 14 }}>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "0 6px", borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: C.textTertiary, lineHeight: 1.6 }}>
            Built for people who are<br />
            <span style={{ color: C.accent }}>working on themselves.</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: font, fontSize: 20, color: C.accent }}>{current.icon}</span>
              <h1 style={{ fontFamily: sans, fontSize: 22, fontWeight: 500, color: C.textPrimary }}>{current.label}</h1>
            </div>
            <div style={{ width: 40, height: 2, background: C.accent, marginTop: 8, borderRadius: 1 }} />
          </div>
          {renderView()}
        </div>
      </div>
    </div>
  );
}