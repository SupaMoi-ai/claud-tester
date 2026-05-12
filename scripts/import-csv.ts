import { readFile } from "node:fs/promises";

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: tsx scripts/import-csv.ts <path-to-csv> [base-url]");
    process.exit(1);
  }
  const base = process.argv[3] ?? "http://localhost:3000";
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    console.error("ADMIN_TOKEN env var required.");
    process.exit(1);
  }
  const body = await readFile(path, "utf8");
  const resp = await fetch(`${base}/api/admin/import`, {
    method: "POST",
    headers: { "Content-Type": "text/csv", "x-admin-token": token },
    body,
  });
  const json = (await resp.json()) as unknown;
  console.log(JSON.stringify(json, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
