import { createHash, pbkdf2Sync, randomBytes, randomUUID } from "crypto";
import { cookies } from "next/headers";
import { readDB, writeDB, publicUser, type User } from "./db";

export const SESSION_COOKIE = "stdyai_session";
const SESSION_DAYS = 7;

export function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
}
export function newSalt(): string {
  return randomBytes(16).toString("hex");
}
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}
export function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export async function createSession(userId: string): Promise<string> {
  const db = await readDB();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  db.sessions = db.sessions.filter((s) => s.expiresAt > now && s.userId !== userId);
  db.sessions.push({ token, userId, expiresAt: now + SESSION_DAYS * 864e5 });
  await writeDB(db);
  return token;
}

export async function destroySession(token: string): Promise<void> {
  const db = await readDB();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  await writeDB(db);
}

export async function getSessionUser(): Promise<ReturnType<typeof publicUser> | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await readDB();
  const s = db.sessions.find((x) => x.token === token && x.expiresAt > Date.now());
  if (!s) return null;
  const u: User | undefined = db.users.find((x) => x.id === s.userId);
  return u ? publicUser(u) : null;
}

export function sessionCookieHeader(token: string, host?: string | null): string {
  const local = (host || "").startsWith("localhost") || (host || "").startsWith("127.0.0.1");
  const secure = process.env.NODE_ENV === "production" && !local ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}
export function clearCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function fingerprint(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 12);
}
