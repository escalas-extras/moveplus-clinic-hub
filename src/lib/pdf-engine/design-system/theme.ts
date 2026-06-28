import { hexToRgb } from "../tokens";
import type { ClinicData } from "../types";
import { DS_COLORS_BASE, DS_LOGO, DS_SPACING, DS_TYPOGRAPHY } from "./tokens";
import type { DocumentTheme, Rgb } from "./types";

function mix(a: Rgb, b: Rgb, w: number): Rgb {
  return a.map((v, i) => Math.round(v * w + b[i] * (1 - w))) as Rgb;
}

/** Cria Document Theme a partir da clínica (white label). */
export function createDocumentTheme(clinic: ClinicData): DocumentTheme {
  const primary = hexToRgb(clinic.primary_color) ?? DS_COLORS_BASE.primary;
  const secondary = hexToRgb(clinic.secondary_color) ?? DS_COLORS_BASE.secondary;
  return {
    colors: {
      ...DS_COLORS_BASE,
      primary,
      secondary,
      border: mix(primary, [255, 255, 255], 0.25),
      borderSoft: mix(primary, [255, 255, 255], 0.12),
      surfaceAlt: mix(primary, [255, 255, 255], 0.04),
    },
    type: { ...DS_TYPOGRAPHY },
    space: { ...DS_SPACING },
    logo: { ...DS_LOGO },
  };
}
