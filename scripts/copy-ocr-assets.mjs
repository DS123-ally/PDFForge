import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public", "ocr");

mkdirSync(dest, { recursive: true });

const copies = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  [
    "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js",
    "tesseract-core-lstm.wasm.js",
  ],
  [
    "node_modules/tesseract.js-core/tesseract-core-lstm.wasm",
    "tesseract-core-lstm.wasm",
  ],
  [
    "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm.js",
  ],
  [
    "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm",
    "tesseract-core-simd-lstm.wasm",
  ],
  [
    "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    "eng.traineddata.gz",
  ],
];

for (const [from, to] of copies) {
  copyFileSync(join(root, from), join(dest, to));
}

console.log("Copied on-device OCR assets to public/ocr.");
