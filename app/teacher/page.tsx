"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { sha256Hex, shortHash } from "@/lib/cert";
import { RequireRole, UserBar, useMe } from "@/components/auth-clients";

type Clause = { id: string; standard: string; title: string; score: number; status: string; feedback: string; suggestion: string; };
type Report = { overall: number; grade: string; clauses: Clause[]; summary: string; predictedGain: number; accessibilityCoverage: number; timestamp: string; };

const DEMO_TITLE = "Photosynthesis — Class 7 Science";
const DEMO_CONTENT = `Photosynthesis is how plants make food. Plants take water from soil and carbon dioxide from air. Chlorophyll traps sunlight. Then glucose is made and oxygen is released. This is important for life on earth. Students should remember the equation.`;

export default function TeacherPage() {
  return (
    <RequireRole role="teacher">
      <TeacherDash />
    </RequireRole>
  );
}

function TeacherDash() {
  const { me } = useMe();
  const [title, setTitle] = useState(DEMO_TITLE);
  const [content, setContent] = useState(DEMO_CONTENT);
  const [report, setReport] = useState<Report | null>(null);
  const [improved, setImproved] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [cert, setCert] = useState<{ hash: string; short: string; id?: string } | null>(null);
  const [err, setErr] = useState("");
  const [rooms, setRooms] = useState<{ id: string; name: string; code: string; members: { id: string; name: string; attempts: number; avg: number | null }[] }[]>([]);
  const [hist, setHist] = useState<{ id: string; title: string; overall: number; grade: string; at: string }[]>([]);
  const [clsName, setClsName] = useState("");

  async function refresh() {
    try {
      const [c, h] = await Promise.all([fetch("/api/classroom").then((r) => r.json()), fetch("/api/reports").then((r) => r.json())]);
      if (c.rooms) setRooms(c.rooms);
      if (h.reports) setHist(h.reports);
    } catch {}
  }
  useEffect(() => { refresh(); }, []);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (/\.(txt|md)$/i.test(f.name)) {
      const t = await f.text().catch(() => "");
      setContent(t.slice(0, 30000) || content);
      setTitle((t2) => t2 || f.name.replace(/\.[^.]+$/, ""));
      return;
    }
    setParsing(true); setErr("");
    try {
      const fd = new FormData(); fd.append("file", f);
      const r = await fetch("/api/parse", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Parse failed");
      setContent((j.text || "").slice(0, 30000));
      setTitle((t2) => (t2 === DEMO_TITLE ? (j.name || "").replace(/\.[^.]+$/, "") : t2));
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Parse failed"); }
    finally { setParsing(false); }
  }

  async function run(mode: "analyze" | "improve") {
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: mode === "improve" && improved ? improved : content, mode, report }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Analysis failed");
      if (mode === "analyze") {
        setReport(j.report);
        localStorage.setItem("stdyai-report", JSON.stringify(j.report));
        localStorage.setItem("stdyai-content", improved || content);
        localStorage.setItem("stdyai-title", title);
        fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, overall: j.report.overall, grade: j.report.grade }) }).then(() => refresh()).catch(() => {});
      } else {
        setImproved(j.improved);
        localStorage.setItem("stdyai-content", j.improved);
        localStorage.setItem("stdyai-title", title);
        // re-analyze improved
        const r2 = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content: j.improved, mode: "analyze" }) }).then((r) => r.json());
        if (r2.report) { setReport(r2.report); localStorage.setItem("stdyai-report", JSON.stringify(r2.report)); }
      }
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }

  async function certificate() {
    const payload = `${title}::${improved || content}::${report?.overall}::${new Date().toISOString()}`;
    const h = await sha256Hex(payload);
    const rec = { hash: h, short: shortHash(h), title, score: report?.overall, at: new Date().toISOString() };
    setCert(rec);
    localStorage.setItem("stdyai-cert", JSON.stringify(rec));
    try {
      const r = await fetch("/api/certs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, score: report?.overall ?? 0, hash: h }) }).then((x) => x.json());
      if (r.cert) setCert({ ...rec, id: r.cert.id });
    } catch {}
  }

  function download(kind: "md" | "txt" | "json") {
    const body = improved || content;
    let blob: Blob; let ext = kind;
    if (kind === "json") {
      const pack = { format: "stdyai-diksha-pack/1.0", title, subject: "General", board: "NCERT", language: "en", bisScore: report?.overall ?? null, grade: report?.grade ?? null, content: body, exportedAt: new Date().toISOString() };
      blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    } else {
      blob = new Blob([`# ${title}\n\n${body}`], { type: "text/plain" });
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(title || "lesson").replace(/[^\w\- ]+/g, "").slice(0, 40)}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const color = (s: string) => s === "pass" ? "bg-emerald-100 text-emerald-700" : s === "partial" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700";
  const gauge = useMemo(() => report?.overall ?? 0, [report]);

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-extrabold text-lg">📚 Stdy<span className="text-indigo-600">AI</span></Link>
        <div className="flex gap-2 items-center">
          <UserBar me={me} />
          <Link href="/student" className="btn-secondary !py-2 !px-4 text-sm">🧒 Student view →</Link>
        </div>
      </div>
      <h1 className="text-3xl font-extrabold mt-4">👩‍🏫 Teacher Co-Pilot Dashboard</h1>
      <p className="text-slate-600">Upload → BIS score → Auto-Improve → Certificate. All offline-capable.</p>

      <div className="grid md:grid-cols-2 gap-4 mt-5">
        <div className="card p-5">
          <label className="font-semibold text-sm">Lesson title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
          <label className="font-semibold text-sm mt-3 block">Lesson content <span className="font-normal text-slate-500">(.txt, .md, .docx, .pdf)</span></label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex gap-2 mt-3 flex-wrap items-center">
            <input type="file" accept=".txt,.md,.docx,.pdf" className="text-xs" onChange={(e) => onFile(e.target.files?.[0])} />
            {parsing && <span className="text-xs text-indigo-600">Parsing file…</span>}
          </div>
          {err && <div className="mt-2 text-sm text-red-600">{err}</div>}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={() => run("analyze")} disabled={loading} className="btn-primary !py-2.5">{loading ? "Analyzing…" : "🔍 Run BIS Analysis"}</button>
            <button onClick={() => run("improve")} disabled={loading || !content} className="btn-secondary !py-2.5">✨ Auto-Improve</button>
            <button onClick={() => { setTitle(DEMO_TITLE); setContent(DEMO_CONTENT); }} className="text-sm underline text-slate-500">Reset demo</button>
          </div>
        </div>

        <div className="card p-5">
          {!report ? <div className="text-slate-500 text-sm">No analysis yet. Click <b>Run BIS Analysis</b> — try the preloaded Photosynthesis demo.</div> : (
            <div>
              <div className="flex items-center gap-4">
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={gauge >= 85 ? "#10b981" : gauge >= 65 ? "#f59e0b" : "#ef4444"} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${gauge * 2.64} 264`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-extrabold">{gauge}</span><span className="text-[10px] text-slate-500">/ 100</span></div>
                </div>
                <div>
                  <div className="font-extrabold text-lg">{report.grade}</div>
                  <div className="text-sm text-slate-600">{report.summary}</div>
                  <div className="flex gap-2 mt-2 text-xs flex-wrap">
                    <span className="badge bg-indigo-100 text-indigo-700">📈 +{report.predictedGain}% outcome</span>
                    <span className="badge bg-emerald-100 text-emerald-700">♿ {report.accessibilityCoverage}% access</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2 max-h-72 overflow-auto pr-1">
                {report.clauses.map((c) => (
                  <details key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                    <summary className="cursor-pointer font-semibold flex items-center justify-between gap-2">
                      <span>{c.id} · {c.score}</span><span className={`badge ${color(c.status)}`}>{c.status}</span>
                    </summary>
                    <div className="mt-1 text-slate-600"><b>{c.title}</b></div>
                    <div className="text-slate-600">🔎 {c.feedback}</div>
                    <div className="mt-1 rounded-lg bg-indigo-50 p-2">💡 {c.suggestion}</div>
                  </details>
                ))}
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <button onClick={certificate} className="btn-primary !py-2">📜 Generate Living Certificate</button>
                <Link href="/student" className="btn-secondary !py-2">Send to Student Twin →</Link>
              </div>
              {cert && (
                <div className="mt-3 rounded-xl bg-slate-900 text-white p-4 text-sm">
                  <div className="font-bold">✅ BIS-Aligned Content Certificate</div>
                  <div>ID: {cert.id ?? `STDY-${cert.short}`}</div>
                  <div className="break-all text-xs opacity-80">SHA-256: {cert.hash}</div>
                  <div className="text-xs opacity-80">“{title}” · Score {report.overall}/100 · ⛓️ chain-registered</div>
                  <Link href={`/verify?id=${encodeURIComponent(cert.id ?? cert.hash)}`} className="text-xs underline opacity-90">Verify publicly →</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {improved && (
        <div className="card p-5 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold">✨ Auto-Improved (BIS-restructured) — editable, saved for Student Twin</div>
            <div className="flex gap-2 text-xs">
              <button onClick={() => download("md")} className="btn-secondary !py-1.5 !px-3">⬇ .md</button>
              <button onClick={() => download("txt")} className="btn-secondary !py-1.5 !px-3">⬇ .txt</button>
              <button onClick={() => download("json")} className="btn-secondary !py-1.5 !px-3">📦 DIKSHA-pack</button>
            </div>
          </div>
          <textarea value={improved} onChange={(e) => { setImproved(e.target.value); localStorage.setItem("stdyai-content", e.target.value); }} rows={16} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm whitespace-pre-wrap" />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="card p-5">
          <div className="font-bold">🏫 My Classrooms</div>
          <div className="flex gap-2 mt-2">
            <input value={clsName} onChange={(e) => setClsName(e.target.value)} placeholder="Class 7-A Science" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <button onClick={async () => { const r = await fetch("/api/classroom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: clsName }) }).then((x) => x.json()); if (r.classroom) { setClsName(""); refresh(); } }} className="btn-primary !py-2 !px-4 text-sm">+ Create</button>
          </div>
          <div className="mt-3 space-y-2 max-h-64 overflow-auto">
            {rooms.length === 0 && <div className="text-xs text-slate-500">No classrooms yet. Create one and share the code with students.</div>}
            {rooms.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm">
                <div className="flex justify-between items-center"><b>{r.name}</b><span className="badge bg-indigo-100 text-indigo-700">Code: {r.code}</span></div>
                <div className="mt-1 text-xs text-slate-500">{r.members.length} student(s)</div>
                {r.members.map((m) => (
                  <div key={m.id} className="flex justify-between text-xs mt-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1">
                    <span>{m.name}</span><span>{m.attempts} quiz · {m.avg === null ? "—" : `${m.avg}% avg`}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <div className="font-bold">📊 Compliance History (audit log)</div>
          <div className="mt-2 space-y-1.5 max-h-64 overflow-auto text-sm">
            {hist.length === 0 && <div className="text-xs text-slate-500">Run your first BIS analysis — it will be logged here.</div>}
            {hist.map((h) => (
              <div key={h.id} className="flex justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                <span className="truncate">{h.title}</span>
                <span className="shrink-0"><b>{h.overall}</b> · {h.grade.split(" ")[0]} · <span className="text-xs text-slate-500">{new Date(h.at).toLocaleDateString()}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
