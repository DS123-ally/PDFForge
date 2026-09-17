export type Point = {
  x: number;
  y: number;
};

export type Quad = [Point, Point, Point, Point];

export function fullFrameQuad(width: number, height: number): Quad {
  const maxX = Math.max(0, width - 1);
  const maxY = Math.max(0, height - 1);

  return [
    { x: 0, y: 0 },
    { x: maxX, y: 0 },
    { x: maxX, y: maxY },
    { x: 0, y: maxY },
  ];
}

export function orderQuad(points: readonly Point[]): Quad {
  if (points.length !== 4) {
    throw new Error("A document outline needs four corners.");
  }

  const bySum = [...points].sort(
    (left, right) => left.x + left.y - (right.x + right.y),
  );
  const byDiff = [...points].sort(
    (left, right) => left.x - left.y - (right.x - right.y),
  );

  return [bySum[0], byDiff[3], bySum[3], byDiff[0]];
}

export function quadFromExtremes(points: readonly Point[]): Quad | null {
  if (points.length < 4) {
    return null;
  }

  let topLeft = points[0];
  let topRight = points[0];
  let bottomRight = points[0];
  let bottomLeft = points[0];

  for (const point of points) {
    const sum = point.x + point.y;
    const diff = point.x - point.y;

    if (sum < topLeft.x + topLeft.y) {
      topLeft = point;
    }

    if (sum > bottomRight.x + bottomRight.y) {
      bottomRight = point;
    }

    if (diff > topRight.x - topRight.y) {
      topRight = point;
    }

    if (diff < bottomLeft.x - bottomLeft.y) {
      bottomLeft = point;
    }
  }

  const unique = new Set(
    [topLeft, topRight, bottomRight, bottomLeft].map(
      (point) => `${point.x},${point.y}`,
    ),
  );

  if (unique.size !== 4) {
    return null;
  }

  return [topLeft, topRight, bottomRight, bottomLeft];
}

export function scaleQuad(quad: Quad, scaleX: number, scaleY: number): Quad {
  return [
    { x: quad[0].x * scaleX, y: quad[0].y * scaleY },
    { x: quad[1].x * scaleX, y: quad[1].y * scaleY },
    { x: quad[2].x * scaleX, y: quad[2].y * scaleY },
    { x: quad[3].x * scaleX, y: quad[3].y * scaleY },
  ];
}

export function clampQuad(quad: Quad, width: number, height: number): Quad {
  return quad.map((point) => ({
    x: clamp(point.x, 0, Math.max(0, width - 1)),
    y: clamp(point.y, 0, Math.max(0, height - 1)),
  })) as Quad;
}

export function distance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function outputSizeForQuad(quad: Quad, maxEdge = 1600) {
  const width = Math.max(
    distance(quad[0], quad[1]),
    distance(quad[3], quad[2]),
  );
  const height = Math.max(
    distance(quad[0], quad[3]),
    distance(quad[1], quad[2]),
  );
  const longEdge = Math.max(width, height, 1);
  const scale = Math.min(1, maxEdge / longEdge);

  return {
    height: Math.max(32, Math.round(height * scale)),
    width: Math.max(32, Math.round(width * scale)),
  };
}

export function quadsAreStable(
  previous: Quad | null,
  next: Quad,
  threshold = 10,
) {
  if (!previous) {
    return false;
  }

  return previous.every(
    (point, index) => distance(point, next[index]) <= threshold,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
