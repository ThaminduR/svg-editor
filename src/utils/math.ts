export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function decomposeMatrix(m: DOMMatrix): {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
} {
  const translateX = m.e;
  const translateY = m.f;
  const scaleX = Math.sqrt(m.a * m.a + m.b * m.b);
  const scaleY = Math.sqrt(m.c * m.c + m.d * m.d);
  const rotation = Math.atan2(m.b, m.a) * (180 / Math.PI);
  return { translateX, translateY, scaleX, scaleY, rotation };
}

export function pointDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleBetweenPoints(
  center: { x: number; y: number },
  point: { x: number; y: number }
): number {
  return Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI);
}

export function rectContainsPoint(
  rect: { x: number; y: number; width: number; height: number },
  point: { x: number; y: number }
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
