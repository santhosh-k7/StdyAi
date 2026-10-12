import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/db";
import { getSessionUser, newId } from "@/lib/auth";

const GENESIS = "STDYAI-GENESIS";

// Simulated blockchain: each certificate chains to the previous (prev + hash → chainHash).
// Publicly verifiable via GET /api/certs?id= — a real chain (e.g. Polygon) can replace this ledger later.
function chainHash(prev: string, hash: string): string {
  return createHash("sha256").update(prev + hash).digest("hex");
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me || me.role !== "teacher") return NextResponse.json({ error: "Teacher login required." }, { status: 403 });
  const { title = "", score = 0, hash = "" } = await req.json();
  if (!hash || String(hash).length < 16) return NextResponse.json({ error: "Invalid content hash." }, { status: 400 });
  const db = await readDB();
  const prev = db.certs.length ? db.certs[0].chainHash : GENESIS;
  const rec = {
    id: newId("stdy").replace("_", "-").toUpperCase(),
    hash: String(hash), chainHash: chainHash(prev, String(hash)), prev,
    title: String(title).slice(0, 120), score: Number(score) || 0,
    teacherId: me.id, at: new Date().toISOString(),
  };
  db.certs.unshift(rec);
  await writeDB(db);
  return NextResponse.json({ cert: rec });
}

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get("id") || "";
  const db = await readDB();
  const c = db.certs.find((x) => x.id.toLowerCase() === q.trim().toLowerCase() || x.hash.toLowerCase() === q.trim().toLowerCase());
  if (!c) return NextResponse.json({ found: false }, { status: 404 });
  // Verify chain link
  const idx = db.certs.findIndex((x) => x.id === c.id);
  const next = db.certs[idx + 1]; // older cert this one chained from
  const expectPrev = next ? next.chainHash : GENESIS;
  const valid = c.prev === expectPrev && c.chainHash === chainHash(c.prev, c.hash);
  const teacher = db.users.find((u) => u.id === c.teacherId)?.name ?? "Verified teacher";
  return NextResponse.json({ found: true, valid, cert: { ...c, teacher } });
}
