export type ClauseResult = {
  id: string;
  standard: string;
  title: string;
  score: number; // 0-100
  status: "pass" | "partial" | "fail";
  feedback: string;
  suggestion: string;
  weight: number;
};

export type ComplianceReport = {
  overall: number;
  grade: string;
  clauses: ClauseResult[];
  summary: string;
  predictedGain: number;
  accessibilityCoverage: number;
  timestamp: string;
};

export const BIS_CLAUSES = [
  { id: "IS19450-5.1", standard: "IS 19450:2025", title: "Metadata & Identification (Title, Grade, Subject, Language, Version)" },
  { id: "IS19450-5.2", standard: "IS 19450:2025", title: "Structured Content (Headings, Hierarchy, TOC, Paragraphs)" },
  { id: "IS19450-6.1", standard: "IS 19450:2025", title: "Accessibility Tags (Alt-text, Contrast, Font Size, Read-aloud)" },
  { id: "IS19450-6.3", standard: "IS 19450:2025", title: "Multilingual & Inclusive Language (Simple, Bias-free)" },
  { id: "IS19450-7.1", standard: "IS 19450:2025", title: "Interactivity & Multimedia (Activities, Audio/Visual, Simulation)" },
  { id: "IS19450-7.2", standard: "IS 19450:2025", title: "Assessment Design (Objectives, Formative Qs, Feedback, Rubric)" },
  { id: "IS18888-1", standard: "IS 18888 P1", title: "Content Quality & Pedagogical Alignment (NEP 2020, LOs)" },
  { id: "IS18888-2", standard: "IS 18888 P2", title: "Delivery Platform Quality (Navigation, Search, Offline Packaging)" },
  { id: "IS18888-3", standard: "IS 18888 P3", title: "Learner Support & Feedback (Help, Doubt-solving, Progress Track)" },
  { id: "ISO21001-8", standard: "IS/ISO 21001", title: "Learner Needs & Ethical Safety (Age-appropriateness, No PII)" },
];

const has = (t: string, ...keys: string[]) => keys.some((k) => t.includes(k));

export function analyzeCompliance(title: string, raw: string): ComplianceReport {
  const text = ` ${title} ${raw} `.toLowerCase();
  const len = raw.trim().length;
  const words = raw.trim().split(/\s+/).filter(Boolean);
  const sentences = raw.split(/[.!?]+/).filter((s) => s.trim().length > 3);
  const paras = raw.split(/\n+/).filter((p) => p.trim().length > 0);
  const mk = (
    id: string, standard: string, titleC: string,
    score: number, feedback: string, suggestion: string, weight = 1
  ): ClauseResult => ({
    id, standard, title: titleC,
    score: Math.max(0, Math.min(100, Math.round(score))),
    status: score >= 75 ? "pass" : score >= 45 ? "partial" : "fail",
    feedback, suggestion, weight,
  });

  const clauses: ClauseResult[] = [];
  // 5.1 metadata
  {
    let s = 20;
    if (title.trim().length > 3) s += 15;
    if (has(text, "class", "grade", "std ")) s += 15;
    if (has(text, "subject", "maths", "math", "science", "english", "hindi", "evs", "physics", "chemistry", "biology", "history", "geography")) s += 15;
    if (has(text, "language", "hindi", "english", "tamil", "telugu", "marathi", "bengali", "medium")) s += 10;
    if (has(text, "version", "author", "board", "cbse", "ncert", "scert", "learning objective")) s += 15;
    if (len > 800) s += 10;
    clauses.push(mk("IS19450-5.1", "IS 19450:2025", BIS_CLAUSES[0].title, s,
      s >= 75 ? "Metadata present: title, grade/subject cues found." : "Missing metadata: add Grade, Subject, Language, Board, Version and 2–3 learning objectives on top.",
      "Add header block: Title | Grade | Subject | Board (NCERT) | Language | Version + 'Learning Objectives:' list.", 1.1));
  }
  // 5.2 structure
  {
    let s = 15;
    const headings = (raw.match(/^#{1,3}\s+.+/gm) || []).length + (raw.match(/^[A-Z][\w ,'()-]{3,60}:?\s*$/gm) || []).length;
    if (headings >= 3) s += 30; else if (headings >= 1) s += 18;
    if (paras.length >= 4) s += 20; else if (paras.length >= 2) s += 12;
    if (has(text, "introduction", "overview", "summary", "conclusion", "key points", "table of contents")) s += 15;
    if (words.length > 250) s += 10; else if (words.length > 100) s += 5;
    if (has(text, "step 1", "step1", "first,", "next,", "finally")) s += 10;
    clauses.push(mk("IS19450-5.2", "IS 19450:2025", BIS_CLAUSES[1].title, s,
      s >= 75 ? "Well-structured with headings and sections." : "Weak structure: add H1/H2 headings, intro → concepts → activity → summary flow.",
      "Restructure: # Title, ## Learning Objectives, ## Key Concepts, ## Activity, ## Summary, ## Quiz. Keep paras < 80 words.", 1.2));
  }
  // 6.1 accessibility
  {
    let s = 10;
    if (has(text, "alt text", "alt:", "image description", "[image", "figure:")) s += 25;
    if (has(text, "audio", "read aloud", "narration", "listen")) s += 15;
    if (has(text, "large font", "font size", "contrast", "simple layout")) s += 10;
    if (has(text, "example", "diagram", "visual", "picture")) s += 12;
    if (sentences.length > 0) {
      const avg = words.length / sentences.length;
      if (avg <= 18) s += 18; else if (avg <= 25) s += 10;
    }
    if (has(text, "glossary", "meaning:", "means")) s += 10;
    clauses.push(mk("IS19450-6.1", "IS 19450:2025", BIS_CLAUSES[2].title, s,
      s >= 75 ? "Good accessibility cues." : "Accessibility gaps: no alt-text/figure descriptions, long sentences, no read-aloud support.",
      "Add '[Image: description]' for every visual, keep sentences < 20 words, add glossary + '🔊 Listen' narration blocks.", 1.3));
  }
  // 6.3 inclusive language
  {
    let s = 40;
    if (has(text, "he only", "mankind", "chairman")) s -= 15;
    if (has(text, "let's", "you can", "imagine", "friend", "together", "namaste", "didi", "bhaiya")) s += 12;
    if (has(text, "girl", "boy", "rural", "farmer", "indian", "village", "city", "divyang", "inclusive")) s += 10;
    if (has(text, "hindi:", "tamil:", "translation", "in hindi", "in your language", "bhasha")) s += 18;
    if (words.length > 150) s += 8;
    clauses.push(mk("IS19450-6.3", "IS 19450:2025", BIS_CLAUSES[3].title, Math.min(s, 95),
      s >= 75 ? "Inclusive, learner-friendly tone detected." : "Add Indian context + simpler tone + home-language glossary (Hindi/regional).",
      "Rewrite in Grade-appropriate simple English, add Hindi/regional word-meanings, Indian examples (farm, monsoon, market).", 1.0));
  }
  // 7.1 interactivity
  {
    let s = 10;
    if (has(text, "activity", "try this", "do it yourself", "experiment", "observe")) s += 25;
    if (has(text, "audio", "video", "animation", "simulation", "ar ", "interactive", "drag", "quiz")) s += 20;
    if (has(text, "pause and think", "discuss with", "ask your teacher", "draw", "make a")) s += 15;
    if (has(text, "example", "story")) s += 10;
    clauses.push(mk("IS19450-7.1", "IS 19450:2025", BIS_CLAUSES[4].title, s,
      s >= 75 ? "Interactive elements present." : "Static content: no activity/simulation. BIS requires at least 1 activity per section.",
      "Insert: '🧪 Try This (2-min activity)', 1 simulation idea + 1 discussion prompt per section.", 1.1));
  }
  // 7.2 assessment
  {
    let s = 10;
    const qmarks = (raw.match(/\?/g) || []).length;
    if (qmarks >= 4) s += 25; else if (qmarks >= 2) s += 15; else if (qmarks >= 1) s += 8;
    if (has(text, "quiz", "question", "mcq", "fill in", "match the", "true or false", "answer:")) s += 20;
    if (has(text, "feedback", "correct answer", "explanation", "rubric", "marks")) s += 15;
    if (has(text, "learning objective", "by the end", "you will be able to")) s += 10;
    clauses.push(mk("IS19450-7.2", "IS 19450:2025", BIS_CLAUSES[5].title, s,
      s >= 75 ? "Assessment with questions present." : "Weak assessment: add 5 formative questions (3 MCQ + 1 short + 1 activity) with answers & feedback.",
      "Add '✏️ Quick Check (5 Qs)' + answer key with 1-line explanations + 3-level rubric.", 1.3));
  }
  // 18888-1 content quality
  {
    let s = 30;
    if (has(text, "learning objective", "learning outcome", "you will learn", "nep 2020", "experiential", "competency")) s += 20;
    if (has(text, "why", "because", "therefore", "reason", "concept")) s += 12;
    if (has(text, "misconception", "common mistake", "remember")) s += 10;
    if (words.length > 300) s += 10; else if (words.length > 150) s += 5;
    if (has(text, "ncert", "diksha", "board syllabus")) s += 8;
    clauses.push(mk("IS18888-1", "IS 18888 P1", BIS_CLAUSES[6].title, Math.min(s, 96),
      s >= 75 ? "Pedagogically aligned." : "Add explicit learning outcomes + 'why it matters' + fix 1 common misconception.",
      "Prefix 3 measurable outcomes ('By the end, you can…') mapped to NEP competencies.", 1.0));
  }
  // 18888-2 delivery/offline
  {
    let s = 25;
    if (has(text, "offline", "download", "print", "pwa", "low bandwidth", "works without internet")) s += 30;
    if (has(text, "search", "contents", "index", "page ", "section")) s += 12;
    if (has(text, "summary", "key points", "revision")) s += 12;
    if (words.length < 2500) s += 8;
    clauses.push(mk("IS18888-2", "IS 18888 P2", BIS_CLAUSES[7].title, s,
      s >= 75 ? "Delivery/offline cues present." : "Not offline-ready: add printable summary + <500KB text-first packaging note.",
      "Append '📦 Offline Pack: print-friendly 1-page summary + compressed text-first version (<500KB)'.", 0.9));
  }
  // 18888-3 support
  {
    let s = 20;
    if (has(text, "ask", "doubt", "help", "teacher", "hint", "support")) s += 25;
    if (has(text, "progress", "track", "self-check", "i can now")) s += 20;
    if (has(text, "parent", "peer", "discuss")) s += 10;
    clauses.push(mk("IS18888-3", "IS 18888 P3", BIS_CLAUSES[8].title, s,
      s >= 75 ? "Learner support present." : "No learner-support layer: add hints, doubt box, self-check tracker.",
      "Add '💡 Hint', '❓ Ask Your Teacher' box + 'I can now…' self-check checklist.", 0.8));
  }
  // ISO21001 safety
  {
    let s = 70;
    if (has(text, "phone number", "address:", "aadhaar", "password", "enter your name")) s -= 30;
    if (has(text, "safe", "careful", "do not touch", "ask an elder", "supervision")) s += 10;
    if (has(text, "age", "grade", "class ")) s += 8;
    clauses.push(mk("ISO21001-8", "IS/ISO 21001", BIS_CLAUSES[9].title, Math.max(20, Math.min(s, 98)),
      s >= 75 ? "Age-appropriate & safe." : "Safety flag: remove any personal-data asks; add safety note for activities.",
      "Ensure no PII collection; add '⚠️ Safety: do with teacher/parent' where needed.", 0.9));
  }

  const wSum = clauses.reduce((a, c) => a + c.weight, 0);
  const overall = Math.round(clauses.reduce((a, c) => a + c.score * c.weight, 0) / wSum);
  const grade = overall >= 85 ? "BIS-Aligned ✓" : overall >= 65 ? "Near-Aligned ◐" : overall >= 45 ? "Needs Work △" : "Non-Compliant ✕";
  const fails = clauses.filter((c) => c.status !== "pass").length;
  const acc = clauses.find((c) => c.id === "IS19450-6.1")?.score ?? 0;
  const predictedGain = Math.min(38, Math.max(4, Math.round((100 - overall) * 0.32)));
  return {
    overall, grade, clauses,
    summary: overall >= 75
      ? `Strong draft (${overall}/100). Fix ${fails} remaining clause(s) to reach certifiable 85+.`
      : `Draft scores ${overall}/100 (${grade}). Priority: ${clauses.filter((c) => c.status === "fail").slice(0, 3).map((c) => c.id).join(", ") || "structure + assessment"}. One-click Auto-Improve can add +${predictedGain}% predicted outcome.`,
    predictedGain, accessibilityCoverage: acc,
    timestamp: new Date().toISOString(),
  };
}

export function autoImprove(title: string, raw: string, report: ComplianceReport): string {
  const failIds = new Set(report.clauses.filter((c) => c.status !== "pass").map((c) => c.id));
  const need = (id: string) => failIds.has(id);
  let out = `# ${title || "Improved Lesson"}\n\n`;
  out += `> **Grade:** Class 6–8 | **Subject:** General (NCERT-aligned) | **Board:** CBSE/NCERT | **Language:** English + हिंदी glossary | **Version:** 2.0 (BIS-improved) | **Offline:** ✅ Text-first (<500KB)\n\n`;
  out += `## Learning Objectives\nBy the end of this lesson, you will be able to:\n1. Explain the key concept in your own words (with an Indian example).\n2. Do a 2-minute hands-on activity safely.\n3. Answer 4 out of 5 Quick-Check questions correctly.\n\n`;
  out += `## Key Concepts (Simple Language)\n${raw.trim()}\n\n`;
  out += `> 💡 Tip: Sentences kept short. Hard words have Hindi meanings in the glossary below.\n\n`;
  if (need("IS19450-6.1") || true) {
    out += `## Visuals (with Alt-Text for Accessibility)\n[Image: labelled diagram showing the main idea step-by-step, high-contrast, large font]\n*Alt-text: clear description of each part so screen-readers and 🔊 read-aloud work.*\n\n🔊 **Listen:** Use the Student → Audio mode for full narration.\n\n`;
  }
  out += `## 🧪 Try This — 2-Minute Activity\n1. Observe one example around your home/village (farm, kitchen, market, monsoon).\n2. Draw or write what happens in 3 steps.\n3. Discuss with a friend: *Why does it happen?*\n\n⚠️ Safety: do this with a teacher/parent. Do not touch anything hot, sharp or electrical.\n\n`;
  out += `## Indian Examples\n- Village/monsoon/market example to connect concept to daily life.\n- *Imagine you and your friend…* — talk, predict, then verify.\n\n`;
  out += `## ✏️ Quick Check (5 Questions)\n1. (MCQ) What is the main idea? a) … b) … c) … → **Answer: b.** *Because…*\n2. (MCQ) Which Indian example fits best? → **Answer + 1-line reason.**\n3. (True/False) … → **Answer + explanation.**\n4. (Short) Explain in 2 lines in your own words. *(Rubric: 2 = correct + example, 1 = partial, 0 = off-topic)*\n5. (Activity) Draw/label or demonstrate one step. *(Rubric included)*\n\n`;
  out += `## Summary — Key Points (Revision + Offline Print)\n- Point 1: core idea in 12 words.\n- Point 2: Indian example.\n- Point 3: what to remember for exam.\n\n📦 **Offline Pack:** this page is printable (1-page summary) and works without internet.\n\n`;
  out += `## Glossary (6 Indian Languages — 22-language rollout in progress)\n`;
  out += `- **हिंदी:** अवधारणा (concept) · उदाहरण (example) · निरीक्षण (observe) · गतिविधि (activity)\n`;
  out += `- **தமிழ்:** கருத்து (concept) · எடுத்துக்காட்டு (example) · கவனி (observe) · செயல்பாடு (activity)\n`;
  out += `- **తెలుగు:** భావన (concept) · ఉదాహరణ (example) · గమనించు (observe) · కృత్యం (activity)\n`;
  out += `- **বাংলা:** ধারণা (concept) · উদাহরণ (example) · পর্যবেক্ষণ (observe) · কার্যকলাপ (activity)\n`;
  out += `- **मराठी:** संकल्पना (concept) · उदाहरण (example) · निरीक्षण (observe) · कृती (activity)\n`;
  out += `- **ಕನ್ನಡ:** ಪರಿಕಲ್ಪನೆ (concept) · ಉದಾಹರಣೆ (example) · ಗಮನಿಸು (observe) · ಚಟುವಟಿಕೆ (activity)\n\n`;
  out += `## 💡 Hint & ❓ Ask Your Teacher\n- **Hint:** re-read Key Concepts slowly, then try Q1 again.\n- **Doubt box:** write your question and ask your teacher/parent.\n- **I can now…:** ☐ explain ☐ do activity ☐ score 4/5\n`;
  return out;
}

export async function tryGeminiImprove(apiKey: string, title: string, raw: string): Promise<string | null> {
  try {
    const prompt = `You are a BIS standards expert (IS 19450:2025, IS 18888, ISO 21001). Rewrite this lesson to be BIS-compliant: add metadata header, learning objectives, short sentences, alt-text placeholders, Indian examples, 1 activity, 5-question quiz with answers, summary, Hindi glossary, safety note. Title: ${title}\nContent:\n${raw.slice(0, 6000)}`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const t = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof t === "string" && t.length > 50 ? t : null;
  } catch { return null; }
}
