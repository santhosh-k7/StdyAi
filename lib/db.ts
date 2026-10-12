import { promises as fs } from "fs";
import os from "os";
import path from "path";

export type Role = "teacher" | "student";
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  passHash: string;
  salt: string;
  createdAt: string;
};
export type Session = { token: string; userId: string; expiresAt: number };
type DB = { users: User[]; sessions: Session[] };

// Serverless filesystems (Vercel/AWS Lambda) are read-only except /tmp.
// Local dev uses ./data (persisted, gitignored); production uses /tmp.
const DB_DIR = process.env.VERCEL === "1" ? path.join(os.tmpdir(), "stdyai-data") : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

async function ensureFile() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ users: [], sessions: [] }, null, 2));
  }
}

export async function readDB(): Promise<DB> {
  await ensureFile();
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const j = JSON.parse(raw);
    return { users: Array.isArray(j.users) ? j.users : [], sessions: Array.isArray(j.sessions) ? j.sessions : [] };
  } catch {
    return { users: [], sessions: [] };
  }
}

export async function writeDB(db: DB): Promise<void> {
  await ensureFile();
  const tmp = DB_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  // Retry rename: cloud-synced folders (OneDrive/Dropbox) briefly lock new files
  let lastErr: unknown = null;
  for (let i = 0; i < 8; i++) {
    try {
      await fs.rename(tmp, DB_PATH);
      return;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    }
  }
  // Fallback: copy over the destination instead of renaming
  try {
    await fs.copyFile(tmp, DB_PATH);
    await fs.unlink(tmp).catch(() => {});
    return;
  } catch {}
  throw lastErr;
}

export function publicUser(u: User) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}
