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
export type Progress = { userId: string; at: string; score: number; total: number; level: string };
export type ReportRec = { id: string; teacherId: string; title: string; overall: number; grade: string; at: string };
export type CertRec = { id: string; hash: string; chainHash: string; prev: string; title: string; score: number; teacherId: string; at: string };
export type Classroom = { id: string; name: string; code: string; teacherId: string; students: string[]; createdAt: string };
export type Audit = { id: string; actorId: string; action: string; detail: string; at: string };
type DB = { users: User[]; sessions: Session[]; progress: Progress[]; reports: ReportRec[]; certs: CertRec[]; classrooms: Classroom[]; audit: Audit[] };

const EMPTY: DB = { users: [], sessions: [], progress: [], reports: [], certs: [], classrooms: [], audit: [] };

// Serverless filesystems (Vercel/AWS Lambda) are read-only except /tmp.
// Local dev uses ./data (persisted, gitignored); production uses /tmp.
const DB_DIR = process.env.VERCEL === "1" ? path.join(os.tmpdir(), "stdyai-data") : path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

async function ensureFile() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify(EMPTY, null, 2));
  }
}

function normalize(j: Partial<DB>): DB {
  return {
    users: Array.isArray(j.users) ? j.users : [],
    sessions: Array.isArray(j.sessions) ? j.sessions : [],
    progress: Array.isArray(j.progress) ? j.progress : [],
    reports: Array.isArray(j.reports) ? j.reports : [],
    certs: Array.isArray(j.certs) ? j.certs : [],
    classrooms: Array.isArray(j.classrooms) ? j.classrooms : [],
    audit: Array.isArray(j.audit) ? j.audit : [],
  };
}

export async function readDB(): Promise<DB> {
  await ensureFile();
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return normalize(JSON.parse(raw));
  } catch {
    return { ...EMPTY };
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
