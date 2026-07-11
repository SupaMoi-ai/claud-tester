import { TextStyle } from "react-native";
import { colors } from "./tokens";
import type { Home, HomeOrBegge } from "@/lib/custody/resolveHome";

export type { Home, HomeOrBegge };

/**
 * Font family names as registered by useFonts() in app/_layout.tsx.
 * Keep these in sync with the keys passed to useFonts there.
 */
export const fonts = {
  loraMedium: "Lora_500Medium",
  loraSemiBold: "Lora_600SemiBold",
  loraMediumItalic: "Lora_500Medium_Italic",
  loraSemiBoldItalic: "Lora_600SemiBold_Italic",
  soraLight: "Sora_300Light",
  soraRegular: "Sora_400Regular",
  soraMedium: "Sora_500Medium",
  soraSemiBold: "Sora_600SemiBold",
  soraBold: "Sora_700Bold",
} as const;

export const textStyles = {
  heading1: {
    fontFamily: fonts.loraSemiBold,
    fontSize: 28,
    color: colors.ink,
  } satisfies TextStyle,
  heading2: {
    fontFamily: fonts.loraSemiBold,
    fontSize: 20,
    color: colors.ink,
  } satisfies TextStyle,
  numberLarge: {
    fontFamily: fonts.loraMedium,
    fontSize: 36,
    color: colors.ink,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.soraRegular,
    fontSize: 15,
    color: colors.ink,
  } satisfies TextStyle,
  bodyMedium: {
    fontFamily: fonts.soraMedium,
    fontSize: 15,
    color: colors.ink,
  } satisfies TextStyle,
  label: {
    fontFamily: fonts.soraSemiBold,
    fontSize: 12,
    color: colors.ink2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.soraRegular,
    fontSize: 13,
    color: colors.ink2,
  } satisfies TextStyle,
} as const;

/** Single source of truth for the home -> accent color mapping used across the app. */
export function homeColor(home: HomeOrBegge | null | undefined): string {
  switch (home) {
    case "mamma":
      return colors.mamma;
    case "pappa":
      return colors.terra;
    case "begge":
      return colors.pine;
    default:
      return colors.ink3;
  }
}

export function homeTintColor(home: HomeOrBegge | null | undefined): string {
  switch (home) {
    case "mamma":
      return colors.pineLt;
    case "pappa":
      return colors.terraLt;
    case "begge":
      return colors.pineLt;
    default:
      return colors.goldLt;
  }
}

export function homeLabel(home: HomeOrBegge | null | undefined): string {
  switch (home) {
    case "mamma":
      return "Mamma";
    case "pappa":
      return "Pappa";
    case "begge":
      return "Begge";
    default:
      return "Ukjent";
  }
}
