"use client";
import { useEffect, useState } from "react";

// Accessibility toolbar: font size, high contrast, dyslexia-friendly spacing. Persisted.
export default function A11yBar() {
  const [big, setBig] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [dys, setDys] = useState(true);
  useEffect(() => {
    setBig(localStorage.getItem("stdyai-a11y-big") === "1");
    setContrast(localStorage.getItem("stdyai-a11y-contrast") === "1");
    setDys(localStorage.getItem("stdyai-a11y-dys") !== "0");
  }, []);
  useEffect(() => {
    document.documentElement.style.fontSize = big ? "19px" : "";
    document.documentElement.classList.toggle("a11y-contrast", contrast);
    document.documentElement.classList.toggle("a11y-dys", dys);
    localStorage.setItem("stdyai-a11y-big", big ? "1" : "0");
    localStorage.setItem("stdyai-a11y-contrast", contrast ? "1" : "0");
    localStorage.setItem("stdyai-a11y-dys", dys ? "1" : "0");
  }, [big, contrast, dys]);
  const btn = (on: boolean) => `rounded-lg px-2 py-1 text-xs font-bold border ${on ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 dark:border-slate-600"}`;
  return (
    <div className="fixed bottom-5 left-5 z-50 card !rounded-full px-2 py-1.5 flex gap-1 items-center shadow-lg">
      <span className="text-xs px-1">♿</span>
      <button onClick={() => setBig(!big)} className={btn(big)} title="Larger text">A+</button>
      <button onClick={() => setContrast(!contrast)} className={btn(contrast)} title="High contrast">◐</button>
      <button onClick={() => setDys(!dys)} className={btn(dys)} title="Dyslexia-friendly spacing">↔</button>
    </div>
  );
}
