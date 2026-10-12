import { NextRequest, NextResponse } from "next/server";
import { readDB, publicUser } from "@/lib/db";
import { hashPassword, createSession, sessionCookieHeader } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email = "", password = "" } = await req.json();
  const cleanEmail = String(email).trim().toLowerCase();
  const db = await readDB();
  const user = db.users.find((u) => u.email === cleanEmail);
  if (!user || hashPassword(String(password), user.salt) !== user.passHash)
    return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
  const token = await createSession(user.id);
  const res = NextResponse.json({ user: publicUser(user) });
  res.headers.set("Set-Cookie", sessionCookieHeader(token, req.headers.get("host")));
  return res;
}
