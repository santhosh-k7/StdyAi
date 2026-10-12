"use client";
import { useMemo, useState } from "react";
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
  const [cert, setCert] = useState<{ hash: string; short: string } | null>(null);
  const [err, setErr] = useState("");

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
    setCert({ hash: h, short: shortHash(h) });
    localStorage.setItem("stdyai-cert", JSON.stringify({ hash: h, short: shortHash(h), title, score: report?.overall, at: new Date().toISOString() }));
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
          <label className="font-semibold text-sm mt-3 block">Lesson content <span className="font-normal text-slate-500">(paste text, .txt, or Word text)</span></label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex gap-2 mt-3 flex-wrap">
            <input type="file" accept=".txt,.md,.doc,.docx" className="text-xs" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const t = await f.text().catch(() => ""); setContent(t.slice(0, 12000) || content);
              if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
            }} />
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
                  <div>ID: STDY-{cert.short}</div>
                  <div className="break-all text-xs opacity-80">SHA-256: {cert.hash}</div>
                  <div className="text-xs opacity-80">“{title}” · Score {report.overall}/100 · Verifiable offline</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {improved && (
        <div className="card p-5 mt-4">
          <div className="font-bold">✨ Auto-Improved (BIS-restructured) — editable, saved for Student Twin</div>
          <textarea value={improved} onChange={(e) => { setImproved(e.target.value); localStorage.setItem("stdyai-content", e.target.value); }} rows={16} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm whitespace-pre-wrap" />
        </div>
      )}
    </main>
  );
}
