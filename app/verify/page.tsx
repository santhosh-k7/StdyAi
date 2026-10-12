"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Cert = { id: string; hash: string; chainHash: string; prev: string; title: string; score: number; teacher: string; at: string };

function VerifyForm() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("id") || "");
  const [res, setRes] = useState<{ found: boolean; valid?: boolean; cert?: Cert } | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(id?: string) {
    const query = (id ?? q).trim();
    if (!query) return;
    setBusy(true); setRes(null);
    try {
      const r = await fetch(`/api/certs?id=${encodeURIComponent(query)}`);
      setRes(await r.json());
    } catch { setRes({ found: false }); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-6 py-10">
      <Link href="/" className="font-extrabold text-lg">📚 Stdy<span className="text-indigo-600">AI</span></Link>
      <h1 className="text-3xl font-extrabold mt-4">🔍 Certificate Verification Portal</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">Public lookup by certificate ID or SHA-256 hash. Chain integrity is re-checked on every lookup.</p>
      <div className="card p-5 mt-4">
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="STDY-XXXX… or SHA-256 hash" className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={() => check()} disabled={busy} className="btn-primary !py-2">{busy ? "…" : "Verify"}</button>
        </div>
        {res && !res.found && <div className="mt-3 text-sm text-red-600">❌ No certificate found for this ID/hash.</div>}
        {res?.found && res.cert && (
          <div className={`mt-3 rounded-xl border-2 p-4 text-sm ${res.valid ? "border-emerald-500" : "border-red-400"}`}>
            <div className="font-extrabold text-lg">{res.valid ? "✅ Valid & chain-verified" : "⚠️ Found but chain broken"}</div>
            <div className="mt-2 space-y-1">
              <div><b>ID:</b> {res.cert.id}</div>
              <div><b>Lesson:</b> {res.cert.title}</div>
              <div><b>Score:</b> {res.cert.score}/100 · <b>Teacher:</b> {res.cert.teacher}</div>
              <div><b>Issued:</b> {new Date(res.cert.at).toLocaleString()}</div>
              <div className="break-all text-xs"><b>Content hash:</b> {res.cert.hash}</div>
              <div className="break-all text-xs"><b>Chain hash:</b> {res.cert.chainHash}</div>
              <div className="break-all text-xs opacity-70"><b>Prev:</b> {res.cert.prev}</div>
            </div>
          </div>
        )}
      </div>
      <div className="text-xs text-slate-500 mt-3">⛓️ Simulated blockchain ledger: each certificate embeds the previous certificate's chain hash. A future upgrade anchors these to a public chain.</div>
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense><VerifyForm /></Suspense>;
}
