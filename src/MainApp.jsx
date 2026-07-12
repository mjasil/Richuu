import { useState, useRef, useCallback, useEffect } from "react";
import { Zap, X, Clock, Globe, ArrowLeft, Shield, LogOut, MessageCircle } from "lucide-react";
import logoCircle from "./logo-circle.png";
import { supabase } from "./supabaseClient";

function useSounds() {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  };

  const playClick = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.09);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.14);
  }, []);

  const playRoll = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(260 + i * 30, now + i * 0.1);
      gain.gain.setValueAtTime(0.07, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.09);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.09);
    }
  }, []);

  const playReveal = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    [392, 493.88, 587.33].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.001, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.14, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.1); osc.stop(now + i * 0.1 + 0.4);
    });
  }, []);

  const playClose = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.16);
  }, []);

  const playLogo = useCallback(() => {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.4);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.5);
  }, []);

  return { playClick, playRoll, playReveal, playClose, playLogo };
}

const COOLDOWN_MS = 60 * 1000;
const TOTAL_SEGMENTS = 20;

// Hexagonal badge showing the timer, built from a clipped div (not SVG)
function HexTimer({ progressPct, label }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 74, height: 74 }}>
      <div
        className="absolute inset-0"
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 25%, 0% 75%)",
          background: "conic-gradient(#22c55e 0%, #22c55e " + progressPct + "%, rgba(255,255,255,0.08) " + progressPct + "%, rgba(255,255,255,0.08) 100%)",
        }}
      />
      <div
        className="absolute inset-[3px] flex items-center justify-center"
        style={{
          clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 25%, 0% 75%)",
          background: "#0a1a10",
        }}
      >
        <span className="text-white text-[11px] font-bold tabular-nums">{label}</span>
      </div>
    </div>
  );
}

// Segmented dot ring showing recent history, instead of a smooth gradient bar
function SegmentedProgress({ progressPct }) {
  const filled = Math.round((progressPct / 100) * TOTAL_SEGMENTS);
  return (
    <div className="flex gap-[3px] justify-center">
      {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
        <span
          key={i}
          className="rounded-full"
          style={{
            width: 4,
            height: i < filled ? 10 : 6,
            background: i < filled ? "linear-gradient(180deg, #4ade80, #16a34a)" : "rgba(255,255,255,0.12)",
            transition: "height 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

export default function MainApp({ profile, onLogout, onOpenAdmin }) {
  const [open, setOpen] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [displayNum, setDisplayNum] = useState(0);
  const [msLeftInCycle, setMsLeftInCycle] = useState(0);
  const [usedThisCycle, setUsedThisCycle] = useState(false);
  const [waitFlash, setWaitFlash] = useState(false);
  const [history, setHistory] = useState([]);
  const [viewingUrl, setViewingUrl] = useState(null);
  const [fixedLink, setFixedLink] = useState(null);
  const [appTitle, setAppTitle] = useState("Richuu");
  const [tagline, setTagline] = useState("Opens a random small/big generator — one per minute");
  const [footerNote, setFooterNote] = useState("Random generator · for fun only");
  const [popupPos, setPopupPos] = useState({ x: null, y: null });
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const cycleIndexRef = useRef(-1);
  const { playClick, playRoll, playReveal, playClose, playLogo } = useSounds();

  useEffect(() => {
    supabase
      .from("app_content")
      .select("key, value")
      .then(({ data }) => {
        if (!data) return;
        const map = Object.fromEntries(data.map((row) => [row.key, row.value]));
        if (map.fixed_link) setFixedLink(map.fixed_link);
        if (map.app_title) setAppTitle(map.app_title);
        if (map.tagline) setTagline(map.tagline);
        if (map.footer_note) setFooterNote(map.footer_note);
      });
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const cycleIndex = Math.floor(now.getTime() / COOLDOWN_MS);
      const msIntoCycle = now.getTime() % COOLDOWN_MS;
      setMsLeftInCycle(COOLDOWN_MS - msIntoCycle);

      if (cycleIndexRef.current === -1) {
        cycleIndexRef.current = cycleIndex;
      } else if (cycleIndex !== cycleIndexRef.current) {
        cycleIndexRef.current = cycleIndex;
        setUsedThisCycle(false);
        setResult(null);
      }
    };
    tick();
    const iv = setInterval(tick, 200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!rolling) return;
    const iv = setInterval(() => setDisplayNum(Math.floor(Math.random() * 10)), 70);
    return () => clearInterval(iv);
  }, [rolling]);

  const openPopup = () => {
    playClick();
    setOpen(true);
    setTimeout(() => playLogo(), 250);
  };
  const closePopup = () => { playClose(); setOpen(false); };

  const handleDragStart = (clientX, clientY) => {
    dragState.current = {
      dragging: true, startX: clientX, startY: clientY,
      origX: popupPos.x ?? window.innerWidth / 2 - 130,
      origY: popupPos.y ?? window.innerHeight / 2 - 180,
    };
  };
  const handleDragMove = (clientX, clientY) => {
    if (!dragState.current.dragging) return;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    setPopupPos({ x: dragState.current.origX + dx, y: dragState.current.origY + dy });
  };
  const handleDragEnd = () => { dragState.current.dragging = false; };
  const onHeaderPointerDown = (e) => {
    e.preventDefault();
    handleDragStart(e.clientX ?? e.touches?.[0]?.clientX, e.clientY ?? e.touches?.[0]?.clientY);
  };
  const onHeaderPointerMove = (e) => {
    handleDragMove(e.clientX ?? e.touches?.[0]?.clientX, e.clientY ?? e.touches?.[0]?.clientY);
  };

  const openUrl = () => {
    if (!fixedLink) return;
    let url = fixedLink.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    playClick();
    setViewingUrl(url);
  };
  const closeWebsite = () => { playClose(); setViewingUrl(null); };

  const generate = () => {
    if (rolling) return;
    if (usedThisCycle) {
      playClick();
      setWaitFlash(true);
      setTimeout(() => setWaitFlash(false), 1400);
      return;
    }
    playRoll();
    setRolling(true);
    setResult(null);

    setTimeout(() => {
      setRolling(false);
      const finalNum = Math.floor(Math.random() * 10);
      const side = finalNum <= 4 ? "small" : "big";
      setResult(side);
      setUsedThisCycle(true);
      setHistory((h) => [side, ...h].slice(0, 8));
      playReveal();

      if (profile?.id) {
        supabase.from("result_history").insert({ user_id: profile.id, result: side })
          .then(({ error }) => { if (error) console.error("Failed to log result:", error); });
      }
    }, 1400);
  };

  const secondsLeft = Math.ceil(msLeftInCycle / 1000);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const progressPct = Math.max(0, Math.min(100, 100 - (msLeftInCycle / COOLDOWN_MS) * 100));

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at top, #0f2a1a 0%, #081410 60%, #040a08 100%)" }}
    >
      <style>{`
        @keyframes floatUp { 0% { transform: translateY(24px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes leafGlow { 0%,100% { box-shadow: 0 0 20px 2px rgba(34,197,94,0.35); } 50% { box-shadow: 0 0 36px 6px rgba(132,204,22,0.45); } }
        @keyframes popIn { 0% { transform: scale(0.8) translateY(16px); opacity: 0; } 60% { transform: scale(1.03); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-18px,20px); } }
        @keyframes resultPop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes leafSway { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
      `}</style>

      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-25"
        style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)", top: "-10%", left: "-12%", animation: "drift 15s ease-in-out infinite" }}
      />
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #84cc16, transparent 70%)", bottom: "-8%", right: "-12%", animation: "drift 18s ease-in-out infinite reverse" }}
      />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex items-center justify-between mb-8">
          <p className="text-white/50 text-xs">
            <span className="text-white/70 font-medium">{profile?.username}</span>
          </p>
          <div className="flex items-center gap-3">
            {profile?.role === "admin" && (
              <button onClick={onOpenAdmin} className="text-green-300 hover:text-green-100" title="Admin panel">
                <Shield size={17} />
              </button>
            )}
            <button onClick={onLogout} className="text-white/40 hover:text-white" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <div className="text-center mb-10" style={{ animation: "floatUp 0.6s ease-out" }}>
          <div
            className="w-16 h-16 mx-auto mb-4 overflow-hidden rounded-full"
            style={{ animation: "leafGlow 3s ease-in-out infinite" }}
          >
            <img src={logoCircle} alt="logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white text-2xl font-semibold mb-1">{appTitle}</h1>
          <p className="text-white/40 text-sm">{tagline}</p>
        </div>

        <button
          onClick={openPopup}
          className="w-full text-white font-semibold py-4 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #22c55e, #84cc16)",
            animation: "leafGlow 3s ease-in-out infinite",
          }}
        >
          <Zap size={18} strokeWidth={2.5} />
          Start
        </button>

        {fixedLink && (
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-white/40 text-xs tracking-widest uppercase mb-3 flex items-center gap-2">
              <Globe size={13} /> Website
            </p>
            <button
              onClick={openUrl}
              className="w-full py-3 rounded-full text-white text-sm font-semibold active:scale-95 transition-transform border border-white/15"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              Open Website
            </button>
          </div>
        )}

        <a
          href="https://t.me/KINGRICHUUZ"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-1.5 text-white/40 text-[11px] border border-white/10 rounded-full py-1.5 hover:text-white/70 hover:border-white/25 transition-colors"
        >
          <MessageCircle size={11} /> Contact
        </a>
      </div>

      {viewingUrl && (
        <div className="fixed inset-0 bg-[#040a08] z-40 flex flex-col">
          <div className="flex items-center gap-3 px-3 py-3 bg-[#0a1a10] border-b border-white/10">
            <button onClick={closeWebsite} className="text-white/70 hover:text-white p-1">
              <ArrowLeft size={20} />
            </button>
            <p className="text-white/50 text-xs truncate flex-1">{viewingUrl}</p>
          </div>
          <iframe
            src={viewingUrl}
            title="In-app website"
            className="flex-1 w-full border-0 bg-white"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          />
          <button
            onClick={openPopup}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-10"
            style={{ background: "linear-gradient(135deg, #22c55e, #84cc16)", boxShadow: "0 4px 25px rgba(34,197,94,0.6)" }}
          >
            <Zap size={22} className="text-white" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed z-50"
          style={{
            left: popupPos.x ?? "50%",
            top: popupPos.y ?? "50%",
            transform: popupPos.x === null ? "translate(-50%, -50%)" : "none",
            pointerEvents: "none",
          }}
          onPointerMove={onHeaderPointerMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          onTouchMove={(e) => onHeaderPointerMove(e)}
          onTouchEnd={handleDragEnd}
        >
          <div
            className="relative w-[260px] rounded-[28px] overflow-hidden"
            style={{
              background: "linear-gradient(180deg, #0f2a1a, #040a08)",
              border: "1px solid rgba(34,197,94,0.3)",
              animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
              boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
              pointerEvents: "auto",
            }}
          >
            <div
              onPointerDown={onHeaderPointerDown}
              onTouchStart={(e) => onHeaderPointerDown(e)}
              className="flex justify-center pt-3 pb-1 cursor-move touch-none"
            >
              <div className="w-8 h-1 rounded-full bg-white/20" style={{ animation: "leafSway 2s ease-in-out infinite" }} />
            </div>

            <div className="px-5 pb-5 pt-1 text-center relative">
              <button onClick={closePopup} className="absolute top-2 right-3 text-white/40 hover:text-white">
                <X size={16} />
              </button>

              <p className="text-green-300/70 text-[9px] tracking-[0.2em] uppercase mb-1">
                Small / Big
              </p>
              <h2 className="text-white text-sm font-bold mb-4">
                {rolling ? "Rolling..." : result ? result.toUpperCase() : "Ready"}
              </h2>

              <div className="flex items-center justify-center gap-4 mb-3">
                <HexTimer progressPct={progressPct} label={`${mm}:${ss}`} />

                <div
                  key={rolling ? "rolling" : `still-${result}`}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold select-none"
                  style={{
                    background: result === "small"
                      ? "linear-gradient(135deg, #38bdf8, #0369a1)"
                      : result === "big"
                      ? "linear-gradient(135deg, #facc15, #b45309)"
                      : "linear-gradient(135deg, #22c55e, #84cc16)",
                    color: "#fff",
                    animation: !rolling && result ? "resultPop 0.4s ease-out" : "none",
                  }}
                >
                  {rolling ? displayNum : result ? result.toUpperCase() : "?"}
                </div>
              </div>

              <div className="mb-4">
                <SegmentedProgress progressPct={progressPct} />
              </div>

              {history.length > 0 && (
                <div className="flex items-center justify-center gap-1 mb-4">
                  {history.map((h, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: h === "small" ? "#38bdf8" : "#facc15", opacity: 1 - i * 0.1 }}
                    />
                  ))}
                </div>
              )}

              {waitFlash ? (
                <div className="w-full flex items-center justify-center gap-1.5 text-green-200 text-[10px] tracking-wide border border-green-400/30 rounded-full py-2">
                  <Clock size={11} /> Wait for next minute
                </div>
              ) : (
                <button
                  onClick={generate}
                  disabled={rolling}
                  className="w-full text-white font-bold text-xs py-2.5 rounded-full transition-transform active:scale-95 disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #22c55e, #84cc16)" }}
                >
                  {rolling ? "Rolling..." : "Start"}
                </button>
              )}

              <p className="text-white/25 text-[9px] tracking-wide mt-3 mb-1.5">{footerNote}</p>

              <a
                href="https://t.me/KINGRICHUUZ"
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center gap-1 text-white/40 text-[9px] border border-white/10 rounded-full py-1 hover:text-white/70 transition-colors"
              >
                <MessageCircle size={9} /> Contact
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
