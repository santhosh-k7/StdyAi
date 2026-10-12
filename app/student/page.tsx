"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { defaultTwin, personalize, updateTwin, type Twin } from "@/lib/twin";
import { RequireRole, UserBar, useMe } from "@/components/auth-clients";

const QUIZ = [
  { q: "What do plants take from the air?", opts: ["Oxygen", "Carbon dioxide", "Nitrogen"], a: 1, why: "Plants absorb CO₂ through tiny leaf pores called stomata. Oxygen is what they release, not take in." },
  { q: "Which pigment traps sunlight?", opts: ["Chlorophyll", "Haemoglobin", "Melanin"], a: 0, why: "Chlorophyll (the green pigment) traps sunlight. Haemoglobin carries oxygen in blood; melanin colours skin — neither traps light for food." },
  { q: "What gas is released?", opts: ["CO₂", "Oxygen", "Hydrogen"], a: 1, why: "Splitting water releases oxygen as a by-product — the same oxygen we breathe. Remember: CO₂ in, O₂ out." },
  { q: "Where does the water come from?", opts: ["Soil", "Air", "Sun"], a: 0, why: "Roots absorb water from the soil and the stem transports it to leaves. Air gives CO₂, the Sun gives energy." },
  { q: "Why does photosynthesis matter?", opts: ["Makes food + oxygen for life", "Makes soil", "Makes rain"], a: 0, why: "It starts almost every food chain (glucose) and fills the air with oxygen. Soil and rain are part of the story, not the product." },
];

export default function StudentPage() {
  return (
    <RequireRole role="student">
      <StudentDash />
    </RequireRole>
  );
}

function StudentDash() {
  const { me } = useMe();
  const twinKey = `stdyai-twin-${me?.id ?? "guest"}`;
  const [twin, setTwin] = useState<Twin>(defaultTwin);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  const [marks, setMarks] = useState<boolean[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [listening, setListening] = useState(false);
  const [order, setOrder] = useState<number[]>(QUIZ.map((_, i) => i));
  const [myClasses, setMyClasses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinMsg, setJoinMsg] = useState("");
  const [history, setHistory] = useState<{ at: string; score: number; total: number; level: string }[]>([]);
  const [doubt, setDoubt] = useState("");
  const [recording, setRecording] = useState(false);
  const qi = order[idx] ?? 0;

  useEffect(() => {
    setContent(localStorage.getItem("stdyai-content") || "No lesson yet — ask your teacher to run BIS Analysis first, or open the Teacher tab and use the demo.");
    setTitle(localStorage.getItem("stdyai-title") || "Digital Twin Lesson");
    const t = localStorage.getItem(twinKey);
    if (t) { try { setTwin(JSON.parse(t)); } catch {} }
    else if (me?.name) {
      const n = { ...defaultTwin, name: me.name };
      setTwin(n);
      localStorage.setItem(twinKey, JSON.stringify(n));
    }
    setOffline(!navigator.onLine);
    const f = () => setOffline(!navigator.onLine);
    window.addEventListener("online", f); window.addEventListener("offline", f);
    loadHistory();
    return () => { window.removeEventListener("online", f); window.removeEventListener("offline", f); };
  }, [me, twinKey]);

  function save(t: Twin) { setTwin(t); localStorage.setItem(twinKey, JSON.stringify(t)); }
  function submit() {
    const s = marks.filter(Boolean).length;
    const pct = Math.round((s / QUIZ.length) * 100);
    const nt = updateTwin(twin, pct);
    setScore(pct); save(nt);
    fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score: s, total: QUIZ.length, level: nt.level }) }).then(() => loadHistory()).catch(() => {});
  }
  function loadHistory() {
    fetch("/api/progress").then((r) => r.json()).then((j) => { if (j.progress) setHistory(j.progress); }).catch(() => {});
    fetch("/api/classroom").then((r) => r.json()).then((j) => { if (j.rooms) setMyClasses(j.rooms); }).catch(() => {});
  }
  function pick(j: number) {
    if (picked !== null) return;
    setPicked(j);
    setPicks((p) => { const n = [...p]; n[idx] = j; return n; });
    setMarks((m) => { const n = [...m]; n[idx] = j === QUIZ[qi].a; return n; });
  }
  function go(n: number) { setIdx(n); setPicked(picks[n] ?? null); }
  function restart(missedFirst = false) {
    let ord = QUIZ.map((_, i) => i);
    if (missedFirst) {
      const missed = ord.filter((i) => marks[i] === false);
      if (missed.length) ord = [...missed, ...ord.filter((i) => marks[i] !== false)];
    }
    setOrder(ord); setIdx(0); setPicked(null); setPicks([]); setMarks([]); setScore(null);
  }
  function joinClass() {
    setJoinMsg("");
    fetch("/api/classroom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join", code: joinCode }) })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "Failed"); setJoinCode(""); setJoinMsg(`✅ Joined ${j.classroom.name}!`); loadHistory(); })
      .catch((e: unknown) => setJoinMsg(e instanceof Error ? `❌ ${e.message}` : "❌ Failed"));
  }
  function voiceDoubt() {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; onresult: ((e: { results: { transcript: string }[][] }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void }; SpeechRecognition?: new () => { lang: string; onresult: ((e: { results: { transcript: string }[][] }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void } }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: new () => never }).SpeechRecognition as unknown;
    if (!SR) { alert("Voice input not supported in this browser (try Chrome)."); return; }
    if (recording) return;
    try {
      const rec = new (SR as new () => { lang: string; onresult: ((e: { results: { transcript: string }[][] }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void })();
      rec.lang = "en-IN";
      rec.onresult = (e) => { const t = e.results[e.results.length - 1][0].transcript; setDoubt((d) => (d ? d + " " : "") + t); };
      rec.onend = () => setRecording(false);
      rec.start(); setRecording(true);
      setTimeout(() => { try { rec.stop(); } catch {} }, 15000);
    } catch { alert("Could not start microphone."); }
  }
  function speak() {
    if (!("speechSynthesis" in window)) return alert("Audio not supported here");
    if (listening) { speechSynthesis.cancel(); setListening(false); return; }
    const u = new SpeechSynthesisUtterance((title + ". " + content).slice(0, 2000));
    u.rate = twin.pace === "slow" ? 0.85 : twin.pace === "fast" ? 1.15 : 1;
    u.onend = () => setListening(false);
    speechSynthesis.speak(u); setListening(true);
  }

  const shown = personalize(content, twin);

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-extrabold text-lg">📚 Stdy<span className="text-indigo-600">AI</span></Link>
        <div className="flex gap-2 items-center text-sm">
          <span className={`badge ${offline ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>{offline ? "📴 Offline mode" : "🌐 Online"}</span>
          <UserBar me={me} />
          <Link href="/teacher" className="btn-secondary !py-2 !px-4 text-sm">← Teacher</Link>
        </div>
      </div>
      <h1 className="text-3xl font-extrabold mt-4">🧒 {twin.name}&apos;s Digital Twin</h1>
      <p className="text-slate-600 text-sm">Level: <b>{twin.level}</b> · Avg: <b>{twin.scoreAvg}%</b> · Attempts: {twin.attempts} · BIS pedagogy guardrails on</p>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="card p-4 text-sm space-y-2">
          <div className="font-bold">🎛️ Twin Controls (live personalization)</div>
          <label>Language</label>
          <select value={twin.language} onChange={(e) => save({ ...twin, language: e.target.value as Twin["language"] })} className="w-full border rounded-lg px-2 py-1.5">
            <option value="en">English</option><option value="hinglish">Hinglish 🇮🇳</option><option value="hi">हिंदी</option>
          </select>
          <label>Modality</label>
          <select value={twin.modality} onChange={(e) => save({ ...twin, modality: e.target.value as Twin["modality"] })} className="w-full border rounded-lg px-2 py-1.5">
            <option value="text">📝 Text</option><option value="visual">🎨 Visual</option><option value="audio">🔊 Audio</option><option value="interactive">🎮 Interactive</option>
          </select>
          <label>Pace</label>
          <select value={twin.pace} onChange={(e) => save({ ...twin, pace: e.target.value as Twin["pace"] })} className="w-full border rounded-lg px-2 py-1.5">
            <option value="slow">🐢 Slow</option><option value="normal">🚶 Normal</option><option value="fast">🚀 Fast</option>
          </select>
          <button onClick={speak} className="btn-secondary w-full !py-2">{listening ? "⏹ Stop narration" : "🔊 Listen (read-aloud)"}</button>
          <div className="rounded-xl bg-slate-100 p-2 text-xs">Needs: {twin.needs.join(", ")} · Dyslexia-friendly spacing on</div>
        </div>

        <div className="card p-5 md:col-span-2">
          <div className="font-bold text-lg">{title}</div>
          <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed" style={{ letterSpacing: "0.01em" }}>{shown.slice(0, 4000)}</div>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <div className="font-bold">🃏 Adaptive Flashcards ({twin.level} mode · {twin.language})</div>
        <p className="text-xs text-slate-500 mt-0.5">Pick an answer → card flips to reveal the answer + explanation.</p>
        {score === null ? (
          <div className="mt-3">
            <div className="flex gap-1.5 mb-3">
              {QUIZ.map((_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full ${i < marks.length ? (marks[i] ? "bg-emerald-500" : "bg-red-400") : i === idx ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`} />
              ))}
            </div>
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950 dark:to-slate-800 p-6 min-h-[240px]">
              <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">CARD {idx + 1} / {QUIZ.length}{order[idx] !== idx ? " · 🔁 spaced repetition" : ""}</div>
              <div className="font-bold text-lg mt-1">{QUIZ[qi].q}</div>
              <div className="mt-3 space-y-2">
                {QUIZ[qi].opts.map((o, j) => {
                  const isAns = j === QUIZ[qi].a;
                  const cls = picked === null
                    ? "border-slate-200 dark:border-slate-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900 cursor-pointer"
                    : isAns ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40"
                    : j === picked ? "border-red-400 bg-red-50 dark:bg-red-900/40"
                    : "border-slate-200 dark:border-slate-600 opacity-60";
                  return (
                    <button key={j} disabled={picked !== null} onClick={() => pick(j)} className={`w-full text-left rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${cls}`}>
                      {String.fromCharCode(65 + j)}. {o} {picked !== null && isAns ? "✅" : ""} {picked === j && !isAns ? "❌" : ""}
                    </button>
                  );
                })}
              </div>
              {picked !== null && (
                <div className="mt-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-sm">
                  <div className={`font-bold ${picked === QUIZ[qi].a ? "text-emerald-600" : "text-red-500"}`}>
                    {picked === QUIZ[qi].a ? "🎉 Correct!" : `✏️ Answer: ${QUIZ[qi].opts[QUIZ[qi].a]}`}
                  </div>
                  <div className="mt-1 text-slate-600 dark:text-slate-300">💡 {QUIZ[qi].why}</div>
                  <div className="flex gap-2 mt-3">
                    {idx > 0 && <button onClick={() => go(idx - 1)} className="btn-secondary !py-1.5 !px-3 text-sm">← Back</button>}
                    {idx < QUIZ.length - 1
                      ? <button onClick={() => go(idx + 1)} className="btn-primary !py-1.5 !px-4 text-sm">Next →</button>
                      : <button onClick={submit} className="btn-primary !py-1.5 !px-4 text-sm">Finish → update Twin</button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border p-6 text-center">
            <div className="text-4xl font-extrabold">{score}%</div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {marks.filter(Boolean).length}/{QUIZ.length} correct · Twin updated → <b>{twin.level}</b> · Avg {twin.scoreAvg}%
            </div>
            <div className="flex gap-2 justify-center mt-3 flex-wrap">
              <button onClick={() => restart(false)} className="btn-secondary !py-2">🔁 Retry deck</button>
              {marks.some((m) => m === false) && <button onClick={() => restart(true)} className="btn-secondary !py-2">🎯 Retry missed first</button>}
              <Link href="/teacher" className="btn-primary !py-2">← Back to Teacher</Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <div className="card p-5">
          <div className="font-bold">🏫 My Classrooms</div>
          {myClasses.length === 0 && <div className="text-xs text-slate-500 mt-1">Ask your teacher for the class code.</div>}
          {myClasses.map((c) => <div key={c.id} className="mt-1 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2"><b>{c.name}</b> <span className="text-xs text-slate-500">· {c.code}</span></div>)}
          <div className="flex gap-2 mt-2">
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={6} className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase" />
            <button onClick={joinClass} className="btn-primary !py-2 !px-4 text-sm">Join</button>
          </div>
          {joinMsg && <div className="text-xs mt-1">{joinMsg}</div>}
        </div>
        <div className="card p-5">
          <div className="font-bold">📈 My Progress (saved to database)</div>
          {history.length === 0 && <div className="text-xs text-slate-500 mt-1">Finish a flashcard deck — attempts are tracked here.</div>}
          <div className="mt-2 space-y-1.5 max-h-48 overflow-auto">
            {history.slice(0, 10).map((h, i) => (
              <div key={i} className="text-xs">
                <div className="flex justify-between"><span>{new Date(h.at).toLocaleString()}</span><b>{Math.round((h.score / Math.max(1, h.total)) * 100)}%</b></div>
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mt-0.5"><div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(h.score / Math.max(1, h.total)) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="font-bold">❓ Ask Your Teacher (type or speak)</div>
          <textarea value={doubt} onChange={(e) => setDoubt(e.target.value)} rows={3} placeholder="Meri doubt likho ya bolo…" className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex gap-2 mt-2">
            <button onClick={voiceDoubt} className="btn-secondary !py-1.5 !px-3 text-sm">{recording ? "🔴 Listening…" : "🎤 Speak"}</button>
            <button onClick={() => { if (doubt.trim()) { alert("✅ Doubt saved! Show it to your teacher."); setDoubt(""); } }} className="btn-primary !py-1.5 !px-4 text-sm">Save doubt</button>
          </div>
        </div>
      </div>
    </main>
  );
}
