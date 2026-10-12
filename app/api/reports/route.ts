import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { newId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "teacher") return NextResponse.json({ error: "Teacher login required." }, { status: 403 });
  const { title = "", overall = 0, grade = "" } = await req.json();
  const db = await readDB();
  const rec = { id: newId("rep"), teacherId: me.id, title: String(title).slice(0, 120), overall: Number(overall) || 0, grade: String(grade).slice(0, 40), at: new Date().toISOString() };
  db.reports.unshift(rec);
  db.reports = db.reports.slice(0, 100);
  db.audit.unshift({ id: newId("aud"), actorId: me.id, action: "analyze", detail: `${rec.title} → ${rec.overall}/100`, at: rec.at });
  db.audit = db.audit.slice(0, 200);
  await writeDB(db);
  return NextResponse.json({ ok: true, id: rec.id });
}

export async function GET() {
  const me = await getSessionUser();
  if (!me || me.role !== "teacher") return NextResponse.json({ error: "Teacher login required." }, { status: 403 });
  const db = await readDB();
  return NextResponse.json({
    reports: db.reports.filter((r) => r.teacherId === me.id).slice(0, 30),
    audit: db.audit.filter((a) => a.actorId === me.id).slice(0, 30),
  });
}
