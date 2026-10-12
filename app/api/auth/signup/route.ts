import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB, publicUser } from "@/lib/db";
import { hashPassword, newSalt, newId, validEmail, createSession, sessionCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { name = "", email = "", password = "", role = "" } = await req.json();
  const cleanName = String(name).trim().slice(0, 60);
  const cleanEmail = String(email).trim().toLowerCase().slice(0, 120);
  const pw = String(password);
  if (cleanName.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!validEmail(cleanEmail)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (pw.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  if (role !== "teacher" && role !== "student")
    return NextResponse.json({ error: "Pick a role: Teacher or Student." }, { status: 400 });

  const db = await readDB();
  if (db.users.some((u) => u.email === cleanEmail))
    return NextResponse.json({ error: "This email is already registered. Please log in." }, { status: 409 });

  const salt = newSalt();
  const user = {
    id: newId(role === "teacher" ? "tch" : "stu"),
    name: cleanName, email: cleanEmail, role,
    passHash: hashPassword(pw, salt), salt,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await writeDB(db);
  const token = await createSession(user.id);
  const res = NextResponse.json({ user: publicUser(user) });
  res.headers.set("Set-Cookie", sessionCookieHeader(token, req.headers.get("host")));
  return res;
}
