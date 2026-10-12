"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "";
  const [tab, setTab] = useState<"teacher" | "student">(next.includes("student") ? "student" : "teacher");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setErr("");
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body = mode === "login" ? { email, password } : { name, email, password, role: tab };
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      const role: string = j.user.role;
      router.push(next || (role === "teacher" ? "/teacher" : "/student"));
      router.refresh();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen max-w-md mx-auto px-6 py-10">
      <Link href="/" className="font-extrabold text-lg">📚 Stdy<span className="text-indigo-600">AI</span></Link>
      <h1 className="text-3xl font-extrabold mt-4">🔑 {mode === "login" ? "Welcome back" : "Create account"}</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">Separate logins for teachers &amp; students, stored securely (hashed passwords + sessions).</p>

      <div className="grid grid-cols-2 gap-2 mt-5 p-1 rounded-xl bg-slate-200 dark:bg-slate-800">
        {(["teacher", "student"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg py-2 font-bold text-sm ${tab === t ? "bg-white dark:bg-slate-900 shadow" : "text-slate-500"}`}>
            {t === "teacher" ? "👩‍🏫 Teacher" : "🧒 Student"}
          </button>
        ))}
      </div>

      <div className="card p-5 mt-3 space-y-3">
        {mode === "signup" && (
          <div><label className="text-sm font-semibold">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meera / Arjun" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></div>
        )}
        <div><label className="text-sm font-semibold">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.in" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></div>
        <div><label className="text-sm font-semibold">Password <span className="font-normal text-slate-500">(min 6 chars)</span></label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button onClick={submit} disabled={busy} className="btn-primary w-full">
          {busy ? "Please wait…" : mode === "login" ? `Login as ${tab}` : `Sign up as ${tab}`}
        </button>
        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }} className="text-sm underline text-slate-500 w-full text-center">
          {mode === "login" ? "New here? Create an account" : "Have an account? Log in"}
        </button>
      </div>
      <div className="text-xs text-slate-500 mt-3 text-center">Demo tip: sign up once as Teacher and once as Student (different emails) to see both sides.</div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
