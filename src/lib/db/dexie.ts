import Dexie, { type Table } from "dexie";
import type { Piece } from "@/lib/types/piece";

class FareDB extends Dexie {
  pieces!: Table<Piece, string>;

  constructor() {
    super("FareDB");
    this.version(1).stores({
      pieces: "id, brand, status, era_decade, acquired_at, created_at",
    });
  }
}

let _db: FareDB | undefined;

export function db(): FareDB {
  if (typeof window === "undefined") {
    throw new Error("FareDB is only available in the browser.");
  }
  if (!_db) _db = new FareDB();
  return _db;
}
