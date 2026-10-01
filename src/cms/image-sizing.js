export function imageSize(width, height, target = 2400) {
  if (!(width > 0 && height > 0)) throw Error('Invalid image dimensions.');
  const limit = Math.min(2560, Math.max(640, Number(target) || 2400));
  const scale = Math.min(1, limit / Math.max(width, height));
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}
