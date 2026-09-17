import type { Point, Quad } from "@/lib/scan/quad";

export type Homography = Float64Array;

export function computeHomography(from: Quad, to: Quad): Homography {
  const matrix: number[][] = [];
  const known: number[] = [];

  for (let index = 0; index < 4; index += 1) {
    const { x, y } = from[index];
    const { x: u, y: v } = to[index];

    matrix.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    known.push(u);
    matrix.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    known.push(v);
  }

  const solved = solveLinearSystem(matrix, known);
  return new Float64Array([...solved, 1]);
}

export function applyHomography(
  homography: Homography,
  x: number,
  y: number,
): Point {
  const weight = homography[6] * x + homography[7] * y + homography[8];
  const divisor = Math.abs(weight) < 1e-8 ? 1e-8 : weight;

  return {
    x: (homography[0] * x + homography[1] * y + homography[2]) / divisor,
    y: (homography[3] * x + homography[4] * y + homography[5]) / divisor,
  };
}

function solveLinearSystem(matrix: number[][], known: number[]) {
  const size = known.length;
  const augmented = matrix.map((row, index) => [...row, known[index]]);

  for (let column = 0; column < size; column += 1) {
    let pivot = column;

    for (let row = column + 1; row < size; row += 1) {
      if (
        Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])
      ) {
        pivot = row;
      }
    }

    const swap = augmented[column];
    augmented[column] = augmented[pivot];
    augmented[pivot] = swap;

    const divisor = augmented[column][column];

    if (Math.abs(divisor) < 1e-12) {
      throw new Error("Could not compute a perspective transform.");
    }

    for (let index = column; index <= size; index += 1) {
      augmented[column][index] /= divisor;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) {
        continue;
      }

      const factor = augmented[row][column];

      for (let index = column; index <= size; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }

  return augmented.map((row) => row[size]);
}
