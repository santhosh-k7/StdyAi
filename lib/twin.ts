export type Twin = {
  name: string;
  grade: string;
  language: "en" | "hi" | "hinglish";
  level: "beginner" | "intermediate" | "advanced";
  modality: "text" | "audio" | "visual" | "interactive";
  pace: "slow" | "normal" | "fast";
  scoreAvg: number;
  attempts: number;
  needs: string[];
};

export const defaultTwin: Twin = {
  name: "Asha", grade: "Class 7", language: "hinglish",
  level: "beginner", modality: "visual", pace: "normal",
  scoreAvg: 55, attempts: 0, needs: ["dyslexia-friendly font"],
};

export function updateTwin(t: Twin, quizScore: number): Twin {
  const attempts = t.attempts + 1;
  const scoreAvg = Math.round((t.scoreAvg * t.attempts + quizScore) / attempts);
  let level = t.level;
  if (scoreAvg >= 80) level = "advanced";
  else if (scoreAvg >= 55) level = "intermediate";
  else level = "beginner";
  return { ...t, attempts, scoreAvg, level };
}

export function personalize(content: string, t: Twin): string {
  let c = content;
  if (t.language === "hi") c = "🇮🇳 हिंदी सारांश: मुख्य विचार को सरल शब्दों में समझो।\n\n" + c;
  else if (t.language === "hinglish") c = "🇮🇳 Hinglish help: pehle summary padho, phir activity karo!\n\n" + c;
  if (t.level === "beginner") c = "🌱 **Easy mode:** short paras, one idea at a time. Take it slow — you've got this!\n\n" + c;
  else if (t.level === "advanced") c = "🚀 **Challenge mode:** after Quick Check, invent your own 6th question!\n\n" + c;
  if (t.modality === "audio") c += "\n\n🔊 **Audio-first:** press Listen — full narration + slow pace available.";
  if (t.modality === "interactive") c += "\n\n🎮 **Interactive:** do the activity first, then read — learning by doing!";
  if (t.pace === "slow") c += "\n\n🐢 **Pace:** 10-min chunks with breaks. Tick 'I can now…' after each chunk.";
  return c;
}
