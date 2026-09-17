export type Raster = {
  data: Uint8ClampedArray;
  height: number;
  width: number;
};

export function createRaster(width: number, height: number): Raster {
  return {
    data: new Uint8ClampedArray(width * height * 4),
    height,
    width,
  };
}

export function toGrayscale(source: Raster) {
  const pixels = new Uint8ClampedArray(source.width * source.height);

  for (let index = 0; index < source.data.length; index += 4) {
    const gray =
      source.data[index] * 0.299 +
      source.data[index + 1] * 0.587 +
      source.data[index + 2] * 0.114;
    pixels[index / 4] = gray;
  }

  return pixels;
}

export function resizeImageData(source: Raster, width: number, height: number) {
  const output = createRaster(width, height);
  const scaleX = source.width / width;
  const scaleY = source.height / height;

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor(y * scaleY));

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(x * scaleX));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const index = (y * width + x) * 4;
      output.data[index] = source.data[sourceIndex];
      output.data[index + 1] = source.data[sourceIndex + 1];
      output.data[index + 2] = source.data[sourceIndex + 2];
      output.data[index + 3] = source.data[sourceIndex + 3];
    }
  }

  return output;
}

export function otsuThreshold(pixels: Uint8ClampedArray) {
  const histogram = new Array<number>(256).fill(0);

  for (const value of pixels) {
    histogram[value] += 1;
  }

  const total = pixels.length;
  let sum = 0;

  for (let index = 0; index < 256; index += 1) {
    sum += index * histogram[index];
  }

  let sumBackground = 0;
  let weightBackground = 0;
  let maximum = 0;
  let threshold = 127;

  for (let index = 0; index < 256; index += 1) {
    weightBackground += histogram[index];

    if (weightBackground === 0) {
      continue;
    }

    const weightForeground = total - weightBackground;

    if (weightForeground === 0) {
      break;
    }

    sumBackground += index * histogram[index];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const between =
      weightBackground *
      weightForeground *
      (meanBackground - meanForeground) ** 2;

    if (between > maximum) {
      maximum = between;
      threshold = index;
    }
  }

  return threshold;
}
