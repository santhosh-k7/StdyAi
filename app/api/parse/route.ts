import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
// pdf-parse has no types; loaded lazily so missing dep fails gracefully
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParse: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfParse = require("pdf-parse");
} catch {}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  const name = (file.name || "upload").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 8MB)." }, { status: 400 });
  try {
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      return NextResponse.json({ text: buf.toString("utf8").slice(0, 30000), name: file.name });
    }
    if (name.endsWith(".docx")) {
      const r = await mammoth.extractRawText({ buffer: buf });
      return NextResponse.json({ text: (r.value || "").slice(0, 30000), name: file.name });
    }
    if (name.endsWith(".pdf")) {
      if (!pdfParse) return NextResponse.json({ error: "PDF support not installed on server (pdf-parse missing)." }, { status: 501 });
      const r = await pdfParse(buf);
      return NextResponse.json({ text: String(r.text || "").slice(0, 30000), name: file.name, pages: r.numpages });
    }
    return NextResponse.json({ error: "Supported: .txt, .md, .docx, .pdf" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Could not read this file. Try .txt or .docx." }, { status: 422 });
  }
}
