import { NextRequest, NextResponse } from "next/server";
import { analyzeCompliance, autoImprove, tryGeminiImprove } from "@/lib/bis-engine";

export async function POST(req: NextRequest) {
  const { title = "", content = "", mode = "analyze", report = null } = await req.json();
  if (!content || content.trim().length < 20)
    return NextResponse.json({ error: "Please paste at least 20 characters of lesson content." }, { status: 400 });
  if (mode === "improve") {
    const rep = report ?? analyzeCompliance(title, content);
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (apiKey) {
      const g = await tryGeminiImprove(apiKey, title, content);
      if (g) return NextResponse.json({ improved: g, engine: "gemini-1.5-flash" });
    }
    return NextResponse.json({ improved: autoImprove(title, content, rep), engine: "stdyai-local" });
  }
  const r = analyzeCompliance(title, content);
  return NextResponse.json({ report: r, engine: "stdyai-local" });
}
