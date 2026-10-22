import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ranges = {
  cyrillic:
    "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116",
  "cyrillic-ext":
    "U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F",
  devanagari:
    "U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF",
  greek:
    "U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF",
  "greek-ext": "U+1F00-1FFF",
  hebrew:
    "U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F",
  latin:
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
  "latin-ext":
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
  symbols: "U+20D0-20FF,U+FE00-FE0F,U+FFF0-FFFD",
  vietnamese:
    "U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
};

const packs = [
  ["carlito", ["Calibri", "Calibri Light", "Aptos", "Aptos Display", "Aptos Narrow", "Candara", "Corbel"]],
  ["caladea", ["Cambria", "Constantia"]],
  ["arimo", ["Arial", "Arial Narrow", "Helvetica"]],
  ["tinos", ["Times New Roman", "Times"]],
  ["cousine", ["Courier New", "Courier"]],
  ["gelasio", ["Georgia"]],
  ["eb-garamond", ["Garamond", "Palatino Linotype", "Book Antiqua", "Palatino"]],
  ["comic-neue", ["Comic Sans MS", "Comic Sans"]],
  ["libre-franklin", ["Franklin Gothic", "Franklin Gothic Medium"]],
  ["source-code-pro", ["Consolas"]],
  ["cascadia-mono", ["Cascadia Mono", "Cascadia Code"]],
  ["libre-baskerville", ["Bookman Old Style"]],
  ["anton", ["Impact"]],
  ["inter", ["Segoe UI", "Segoe UI Variable"]],
  ["roboto", ["Roboto"]],
  ["open-sans", ["Open Sans"]],
  ["lato", ["Lato"]],
  ["merriweather", ["Merriweather"]],
  ["pt-serif", ["PT Serif"]],
  ["pt-sans", ["PT Sans"]],
  ["source-sans-3", ["Source Sans 3", "Source Sans Pro"]],
  ["source-serif-4", ["Source Serif 4", "Source Serif Pro"]],
  ["crimson-pro", ["Crimson Pro"]],
  ["libre-caslon-text", ["Libre Caslon", "Caslon"]],
  ["noto-sans", ["Noto Sans"]],
  ["noto-serif", ["Noto Serif"]],
  ["noto-sans-devanagari", ["Noto Sans Devanagari", "Mangal", "Nirmala UI", "Nirmala", "Kokila"]],
];

const rules = [];
const names = new Set();

for (const [pack, aliases] of packs) {
  for (const sheet of ["400.css", "400-italic.css", "700.css", "700-italic.css"]) {
    const cssPath = `node_modules/@fontsource/${pack}/${sheet}`;
    if (!existsSync(cssPath)) {
      continue;
    }

    const css = readFileSync(cssPath, "utf8");
    for (const block of css.split("/*").slice(1)) {
      const fileName = block.match(/([\w.-]+\.woff2)/)?.[1];
      if (!fileName) {
        continue;
      }

      const weight = sheet.startsWith("700") ? "700" : "400";
      const style = sheet.includes("italic") ? "italic" : "normal";
      const subset = fileName
        .replace(`${pack}-`, "")
        .replace(`-${weight}-${style}.woff2`, "");
      const range =
        block.match(/unicode-range:\s*([^;]+)/)?.[1]?.trim() ??
        ranges[subset];
      if (!range) {
        continue;
      }

      for (const name of aliases) {
        names.add(name);
        rules.push(
          `@font-face { font-family: "${name}"; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url("../../../node_modules/@fontsource/${pack}/files/${fileName}") format("woff2"); unicode-range: ${range}; }`,
        );
      }
    }
  }
}

writeFileSync("src/lib/convert/docx-fonts.css", `${rules.join("\n")}\n`);
writeFileSync(
  "src/lib/convert/docx-font-names.ts",
  `export const bundledWordFamilies = ${JSON.stringify([...names].sort(), null, 2)};\n`,
);
console.log(rules.length, "rules", names.size, "families");
