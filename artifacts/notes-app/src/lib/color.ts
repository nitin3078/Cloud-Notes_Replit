/**
 * Small color-conversion helpers for the "Custom" theme.
 * The app's CSS variables store raw HSL triplets (e.g. "24 54% 50%", no
 * `hsl()` wrapper), consumed as `hsl(var(--primary))` etc. — so a hex color
 * picked by the user needs to be converted into that exact triplet format.
 */

export function hexToHslTriplet(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Returns a lightness-shifted version of an "H S% L%" triplet, clamped to [0,100]. */
export function shiftLightness(triplet: string, deltaPercent: number): string {
  const [h, sRaw, lRaw] = triplet.split(' ');
  const s = sRaw.replace('%', '');
  const l = parseInt(lRaw.replace('%', ''), 10);
  const newL = Math.max(0, Math.min(100, l + deltaPercent));
  return `${h} ${s}% ${newL}%`;
}
