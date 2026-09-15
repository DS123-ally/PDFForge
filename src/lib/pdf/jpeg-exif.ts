export function jpegHasExifSegment(bytes: Uint8Array) {
  return readJpegExifMarkers(bytes).length > 0;
}

export function readJpegExifMarkers(bytes: Uint8Array) {
  const markers: string[] = [];

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return markers;
  }

  let offset = 2;

  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      break;
    }

    const marker = bytes[offset + 1];

    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const next = offset + 2 + size;

    if (size < 2 || next > bytes.length) {
      break;
    }

    if (marker === 0xe1) {
      const payload = bytes.subarray(offset + 4, next);
      const header = decoder.decode(payload.subarray(0, 6));

      if (header.startsWith("Exif")) {
        markers.push("EXIF");

        if (payload.includes(0x47) && asciiContains(payload, "GPS")) {
          markers.push("GPS");
        }

        if (asciiContains(payload, "DateTime")) {
          markers.push("DateTime");
        }
      }
    }

    offset = next;
  }

  return [...new Set(markers)];
}

export function stripJpegApp1Exif(bytes: Uint8Array) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return bytes;
  }

  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let offset = 2;
  let changed = false;

  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      parts.push(bytes.subarray(offset));
      return concat(parts);
    }

    const marker = bytes[offset + 1];

    if (marker === 0xda) {
      parts.push(bytes.subarray(offset));
      return concat(parts);
    }

    const size = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const next = offset + 2 + size;

    if (size < 2 || next > bytes.length) {
      parts.push(bytes.subarray(offset));
      return concat(parts);
    }

    const isExifApp1 =
      marker === 0xe1 &&
      decoder
        .decode(bytes.subarray(offset + 4, Math.min(next, offset + 10)))
        .startsWith("Exif");

    if (isExifApp1) {
      changed = true;
    } else {
      parts.push(bytes.subarray(offset, next));
    }

    offset = next;
  }

  parts.push(bytes.subarray(offset));
  return changed ? concat(parts) : bytes;
}

export function pngHasExifChunk(bytes: Uint8Array) {
  return asciiContains(
    bytes.subarray(0, Math.min(bytes.length, 256_000)),
    "eXIf",
  );
}

const decoder = new TextDecoder("latin1");

function asciiContains(bytes: Uint8Array, value: string) {
  return decoder.decode(bytes).includes(value);
}

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}
