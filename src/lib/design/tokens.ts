export const palette = {
  ink: "#0f0d0b",
  cream: "#f4f0e8",
  ochre: "#8a6840",
  sage: "#5a7858",
  cognac: "#6a4a3a",
  gold: "#c8a050",
} as const;

export type PaletteToken = keyof typeof palette;

export const fonts = {
  display: "Cormorant Garamond",
  body: "EB Garamond",
  label: "Barlow Condensed",
} as const;

export type FontToken = keyof typeof fonts;
