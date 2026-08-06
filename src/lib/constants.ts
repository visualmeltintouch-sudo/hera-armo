export const TOTEM_WIDTH = 1080;
export const TOTEM_HEIGHT = 1920;
export const PHOTO_WIDTH = 1920;
export const PHOTO_HEIGHT = 1080;

export const HERA_COLORS = {
  verde: "#00A651",
  ciano: "#00AEEF",
  magenta: "#EC008C",
} as const;

export const HERA_GRADIENT_STOPS = [
  { color: HERA_COLORS.verde, position: 0 },
  { color: HERA_COLORS.ciano, position: 0.5 },
  { color: HERA_COLORS.magenta, position: 1 },
] as const;

export const PROFILE_LABELS: Record<string, { color: string }> = {
  ambiente: { color: HERA_COLORS.verde },
  acqua: { color: HERA_COLORS.ciano },
  energia: { color: HERA_COLORS.magenta },
  hera: { color: "url(#hera-gradient)" },
};
