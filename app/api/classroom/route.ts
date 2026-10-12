import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, publicUser } from "@/lib/db";
import { getSessionUser, newId } from "@/lib/auth";

function code(): string {
  const c = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { action = "", name = "", code: joinCode = "" } = await req.json();
  const db = await readDB();
  if (action === "create") {
    if (me.role !== "teacher") return NextResponse.json({ error: "Teachers only." }, { status: 403 });
    const room = { id: newId("cls"), name: String(name).trim().slice(0, 60) || "My Class", code: code(), teacherId: me.id, students: [] as string[], createdAt: new Date().toISOString() };
    db.classrooms.push(room);
    await writeDB(db);
    return NextResponse.json({ classroom: room });
  }
  if (action === "join") {
    if (me.role !== "student") return NextResponse.json({ error: "Students only." }, { status: 403 });
    const room = db.classrooms.find((c) => c.code === String(joinCode).trim().toUpperCase());
    if (!room) return NextResponse.json({ error: "Invalid class code." }, { status: 404 });
    if (!room.students.includes(me.id)) room.students.push(me.id);
    await writeDB(db);
    return NextResponse.json({ classroom: { id: room.id, name: room.name, code: room.code } });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const db = await readDB();
  if (me.role === "teacher") {
    const rooms = db.classrooms.filter((c) => c.teacherId === me.id);
    const roster = rooms.map((r) => ({
      ...r,
      members: r.students.map((sid) => {
        const u = db.users.find((x) => x.id === sid);
        const prog = db.progress.filter((p) => p.userId === sid);
        const avg = prog.length ? Math.round(prog.reduce((a, p) => a + (p.score / Math.max(1, p.total)) * 100, 0) / prog.length) : null;
        return { ...(u ? publicUser(u) : { id: sid, name: "Unknown", email: "", role: "student" as const }), attempts: prog.length, avg };
      }),
    }));
    return NextResponse.json({ rooms: roster });
  }
  const mine = db.classrooms.filter((c) => c.students.includes(me.id)).map((c) => ({ id: c.id, name: c.name, code: c.code }));
  return NextResponse.json({ rooms: mine });
}
