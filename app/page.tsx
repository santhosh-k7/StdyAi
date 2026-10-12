import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="font-extrabold text-xl">📚 Stdy<span className="text-indigo-600">AI</span></div>
        <div className="flex gap-2 text-sm items-center">
          <span className="badge bg-indigo-100 text-indigo-700">IS 19450:2025</span>
          <span className="badge bg-emerald-100 text-emerald-700">IS 18888</span>
          <span className="badge bg-amber-100 text-amber-800">ISO 21001</span>
          <span className="badge bg-slate-900 text-white">NEP 2020</span>
          <Link href="/login" className="btn-secondary !py-1.5 !px-4 !text-sm">🔑 Login</Link>
        </div>
      </nav>
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            BIS-Compliant Adaptive Learning for <span className="text-indigo-600">Every Indian Classroom</span>
          </h1>
          <p className="mt-4 text-slate-600 text-lg">
            Upload any lesson → instant compliance score against IS 19450 &amp; IS 18888 → one-click AI rewrite →
            personalized Digital Twin → verifiable Living Certificate. Works offline.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/teacher" className="btn-primary">👩‍🏫 Teacher Co-Pilot</Link>
            <Link href="/student" className="btn-secondary">🧒 Student Digital Twin</Link>
            <Link href="/verify" className="btn-secondary">🔍 Verify Certificate</Link>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[["Compliance Engine", "10 clauses"], ["Digital Twin", "Adaptive"], ["Certificate", "SHA-256"]].map(([a, b]) => (
              <div key={a} className="card p-3"><div className="font-bold text-sm">{a}</div><div className="text-xs text-slate-500">{b}</div></div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <div className="font-bold mb-2">🎬 60-Second Demo Flow (for judges)</div>
          <ol className="text-sm space-y-2 list-decimal ml-5 text-slate-700">
            <li>Teacher uploads a sample lesson (or use preloaded demo).</li>
            <li>Click <b>Run BIS Analysis</b> → score + clause-wise feedback.</li>
            <li>Click <b>✨ Auto-Improve</b> → AI rewrite to 85+.</li>
            <li>Open <b>Student</b> tab → Digital Twin personalizes + quiz adapts.</li>
            <li>Generate <b>Living Certificate</b> with unique hash. Toggle offline.</li>
          </ol>
          <div className="mt-4 rounded-xl bg-slate-900 text-white p-4 text-xs">
            Rural-first: PWA offline • Hinglish + Hindi glossary • Text-first &lt;500KB • Dyslexia-friendly
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-4">
        {[
          ["⚙️ Generative BIS Engine", "Scores 10 clauses across IS 19450, IS 18888 (1–3), ISO 21001 with precise fixes."],
          ["👥 Adaptive Digital Twin", "Tracks level, modality, pace, language. Personalizes difficulty + audio/visual/interactive."],
          ["📜 Living Certificate", "SHA-256 verifiable BIS-Aligned certificate. Marketplace-ready trust signal."],
        ].map(([t, d]) => (
          <div key={t} className="card p-5"><div className="font-bold">{t}</div><p className="text-sm text-slate-600 mt-1">{d}</p></div>
        ))}
      </section>
      <footer className="text-center text-xs text-slate-500 pb-8">StdyAI • Hackathon MVP • DIKSHA/SWAYAM-ready • Future: full IS 18888, 22 languages, blockchain registry</footer>
    </main>
  );
}
