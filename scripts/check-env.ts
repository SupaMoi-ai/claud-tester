import "dotenv/config";

const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(
    `Missing required env vars: ${missing.join(", ")}\n` +
      "Copy .env.example to .env and fill in real Supabase credentials before running this script."
  );
  process.exit(1);
}

console.log("All required env vars are present.");
