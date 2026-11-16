import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "src", "i18n", "catalogs", "en.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const entries = Object.entries(source.messages ?? {});
if (entries.length !== 458) {
  throw new Error(`Expected 458 English message keys; found ${entries.length}`);
}
if (entries.some(([key, value]) => typeof key !== "string" || typeof value !== "string" || !value.trim())) {
  throw new Error("English source contains a non-string or empty message");
}

const outputRoot = path.join(root, ".work", "i18n-chunks");
const inputDir = path.join(outputRoot, "inputs");
const resultDir = path.join(outputRoot, "results");
fs.mkdirSync(inputDir, { recursive: true });
fs.mkdirSync(resultDir, { recursive: true });

const locales = ["am", "yo", "om", "ti", "so", "sid"];
const ranges = [[0, 229], [229, 458]];
for (const locale of locales) {
  for (const [start, end] of ranges) {
    const payload = { locale, start, end, total: entries.length, entries: entries.slice(start, end) };
    const file = path.join(inputDir, `${locale}-${start}.json`);
    fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  }
}

console.log(JSON.stringify({
  sourceKeys: entries.length,
  inputChunks: locales.length * ranges.length,
  chunkRanges: ranges,
  inputDirectory: inputDir,
  resultDirectory: resultDir,
}));
