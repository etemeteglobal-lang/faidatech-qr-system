const NAVY = "#0F172A";
const WHITE = "#FFFFFF";

function luminance(hex: string): number {
  if (!/^#[\da-f]{6}$/i.test(hex)) return 1;
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function colorContrastRatio(first: string, second: string): number {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

export function getReadableTextColor(background: string): typeof NAVY | typeof WHITE {
  return colorContrastRatio(background, NAVY) >= colorContrastRatio(background, WHITE) ? NAVY : WHITE;
}

export function isScanSafeQrForeground(color: string): boolean {
  return /^#[\da-f]{6}$/i.test(color) && colorContrastRatio(color, WHITE) >= 4.5;
}
