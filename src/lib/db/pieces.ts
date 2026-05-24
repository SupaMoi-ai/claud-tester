import { db } from "./dexie";
import type { Piece, PieceDraft } from "@/lib/types/piece";

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `piece_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createPiece(draft: PieceDraft): Promise<Piece> {
  const piece: Piece = {
    ...draft,
    id: newId(),
    created_at: now(),
    updated_at: now(),
  };
  await db().pieces.add(piece);
  return piece;
}

export async function getPiece(id: string): Promise<Piece | undefined> {
  return db().pieces.get(id);
}

export async function listPieces(): Promise<Piece[]> {
  return db().pieces.orderBy("created_at").reverse().toArray();
}

export async function updatePiece(
  id: string,
  changes: Partial<PieceDraft>,
): Promise<Piece | undefined> {
  await db().pieces.update(id, { ...changes, updated_at: now() });
  return getPiece(id);
}

export async function deletePiece(id: string): Promise<void> {
  await db().pieces.delete(id);
}

export async function clearAllPieces(): Promise<void> {
  await db().pieces.clear();
}
