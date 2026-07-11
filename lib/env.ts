import Constants from "expo-constants";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env and fill it in, then restart the dev server.`
    );
  }
  return value;
}

export const env = {
  get supabaseUrl(): string {
    return required(
      "EXPO_PUBLIC_SUPABASE_URL",
      process.env.EXPO_PUBLIC_SUPABASE_URL
    );
  },
  get supabaseAnonKey(): string {
    return required(
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    );
  },
  get easProjectId(): string | undefined {
    return (
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
      Constants.expoConfig?.extra?.eas?.projectId ||
      undefined
    );
  },
} as const;
