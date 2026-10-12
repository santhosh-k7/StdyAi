import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "student") return NextResponse.json({ error: "Student login required." }, { status: 403 });
  const { score = 0, total = 5, level = "" } = await req.json();
  const db = await readDB();
  db.progress.unshift({ userId: me.id, at: new Date().toISOString(), score: Number(score) || 0, total: Number(total) || 5, level: String(level).slice(0, 20) });
  db.progress = db.progress.slice(0, 500);
  await writeDB(db);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const db = await readDB();
  const qid = new URL(req.url).searchParams.get("studentId");
  if (qid) {
    if (me.role !== "teacher") return NextResponse.json({ error: "Teachers only." }, { status: 403 });
    const mine = db.classrooms.some((c) => c.teacherId === me.id && c.students.includes(qid));
    if (!mine) return NextResponse.json({ error: "Not your student." }, { status: 403 });
    return NextResponse.json({ progress: db.progress.filter((p) => p.userId === qid).slice(0, 30) });
  }
  return NextResponse.json({ progress: db.progress.filter((p) => p.userId === me.id).slice(0, 30) });
}
