"use client";
import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [ev, setEv] = useState<{ prompt: () => void } | null>(null);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setEv(e as unknown as { prompt: () => void }); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!ev) return null;
  return (
    <button onClick={() => { ev.prompt(); setEv(null); }} className="btn-primary !py-2 !px-4 text-sm">
      📲 Install App (offline)
    </button>
  );
}
