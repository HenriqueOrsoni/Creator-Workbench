/**
 * Color Utilities for 'The Studio' Brand System
 * High-precision OKLCH conversions for web application dynamics.
 */

export interface OklchColor {
  l: number; // Luminance 0-1
  c: number; // Chroma 0-0.4
  h: number; // Hue 0-360
}

/**
 * Converts Hex string (#RRGGBB) to OKLCH.
 * Includes D65 linear sRGB and Oklab matrices.
 */
export function hexToOklch(hex: string): OklchColor {
  // 1. Hex -> RGB (0-255)
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // 2. Linear RGB
  const linearize = (val: number) => (val > 0.04045 ? Math.pow((val + 0.055) / 1.055, 2.4) : val / 12.92);
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  // 3. OKLCH (Simplified Matrix implementation for performance)
  const l_o = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_o = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_o = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = (l_o ** (1/3));
  const m_ = (m_o ** (1/3));
  const s_ = (s_o ** (1/3));

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const b_calc = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + b_calc * b_calc);
  let h = (Math.atan2(b_calc, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return {
    l: parseFloat(L.toFixed(3)),
    c: parseFloat(C.toFixed(3)),
    h: parseFloat(h.toFixed(1)),
  };
}

/**
 * Converts OKLCH to Hex string (#RRGGBB).
 */
export function oklchToHex(l: number, c: number, h: number): string {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b);
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b);
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b);

  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;

  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_final = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  const delinearize = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    return Math.round((clamped > 0.0031308 ? 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055 : clamped * 12.92) * 255);
  };

  const toHex = (val: number) => delinearize(val).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b_final)}`;
}
