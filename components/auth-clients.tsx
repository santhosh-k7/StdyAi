"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type Me = { id: string; name: string; email: string; role: "teacher" | "student" } | null;

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((j) => setMe(j.user ?? null))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);
  return { me, loading };
}

export function RequireRole({ role, children }: { role: "teacher" | "student"; children: React.ReactNode }) {
  const { me, loading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!me) router.replace(`/login?next=/${role === "teacher" ? "teacher" : "student"}`);
    else if (me.role !== role) router.replace(me.role === "teacher" ? "/teacher" : "/student");
  }, [me, loading, role, router]);
  if (loading) return <main className="min-h-screen flex items-center justify-center text-slate-500">Checking login…</main>;
  if (!me || me.role !== role) return null;
  return <>{children}</>;
}

export function UserBar({ me }: { me: Me }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  if (!me) return <Link href="/login" className="btn-secondary !py-2 !px-4 text-sm">🔑 Login</Link>;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="badge bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
        {me.role === "teacher" ? "👩‍🏫" : "🧒"} {me.name}
      </span>
      <button onClick={logout} className="underline text-slate-500 text-xs">Logout</button>
    </div>
  );
}
