"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("stdyai-theme");
    const d = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(d);
    document.documentElement.classList.toggle("dark", d);
  }, []);
  function toggle() {
    const nd = !dark;
    setDark(nd);
    document.documentElement.classList.toggle("dark", nd);
    localStorage.setItem("stdyai-theme", nd ? "dark" : "light");
  }
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="fixed bottom-5 right-5 z-50 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg w-12 h-12 text-xl hover:scale-105 transition"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
