import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const sourcePath = resolve(root, "src/i18n/catalogs/en.json");
const bundlePath = resolve(root, ".work/i18n-chunks/faidatech-locale-drafts.json");
const locales = ["am", "yo", "om", "ti", "so", "sid"];
const expectedTiers = {
  am: ["african", "ethiopian"],
  yo: ["african"],
  om: ["african", "ethiopian"],
  ti: ["ethiopian"],
  so: ["ethiopian"],
  sid: ["ethiopian"],
};
const tokenList = (text) => [...text.matchAll(/\{([A-Za-z0-9_.-]+)\}/g)].map((match) => match[1]).sort();
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const sourceCatalog = JSON.parse(await readFile(sourcePath, "utf8"));
const bundle = JSON.parse(await readFile(bundlePath, "utf8"));
const sourceMessages = sourceCatalog.messages;
const sourceKeys = Object.keys(sourceMessages);
if (sourceKeys.length !== 458) throw new Error(`Expected 458 English source keys; found ${sourceKeys.length}.`);
if (!same(Object.keys(bundle.catalogs ?? {}).sort(), [...locales].sort())) {
  throw new Error("The recovered bundle does not contain exactly the six requested locale codes.");
}
if (bundle.keyCount !== sourceKeys.length || typeof bundle.sourceJob !== "string") {
  throw new Error("The recovered bundle provenance or declared key count is invalid.");
}

const prepared = [];
const summaries = {};
for (const code of locales) {
  const draftMessages = bundle.catalogs[code];
  const draftKeys = Object.keys(draftMessages ?? {}).sort();
  const expectedKeys = [...sourceKeys].sort();
  if (!same(draftKeys, expectedKeys)) throw new Error(`${code}: translated key set differs from English.`);
  let changedFromEnglish = 0;
  for (const key of sourceKeys) {
    const value = draftMessages[key];
    if (typeof value !== "string" || !value.trim()) throw new Error(`${code}: empty or invalid message ${key}.`);
    if (!same(tokenList(value), tokenList(sourceMessages[key]))) throw new Error(`${code}: placeholder mismatch for ${key}.`);
    if (value !== sourceMessages[key]) changedFromEnglish += 1;
  }

  const catalogPath = resolve(root, `src/i18n/catalogs/${code}.json`);
  const existing = JSON.parse(await readFile(catalogPath, "utf8"));
  const meta = existing.meta ?? {};
  if (meta.code !== code || meta.sourceLocale !== "en" || meta.direction !== "ltr") {
    throw new Error(`${code}: locale identity or direction changed; refusing to overwrite.`);
  }
  if (!same(meta.tierMemberships, expectedTiers[code])) throw new Error(`${code}: tier metadata changed; refusing to overwrite.`);
  if (meta.reviewStatus !== "fallback_required" || meta.translationStatus !== "fallback_required" || meta.fallbackLocale !== "en") {
    throw new Error(`${code}: catalog status changed from the expected English fallback; refusing to overwrite.`);
  }
  for (const key of sourceKeys) {
    if (existing.messages?.[key] !== sourceMessages[key]) {
      throw new Error(`${code}: existing fallback changed at ${key}; refusing to overwrite.`);
    }
  }

  const orderedMessages = Object.fromEntries(sourceKeys.map((key) => [key, draftMessages[key]]));
  const updated = {
    ...existing,
    meta: {
      ...meta,
      translationStatus: "machine_draft",
      reviewStatus: "machine_draft",
      nativeReviewRequired: true,
      generatedBy: {
        workflow: "manus-agent-workflow",
        sourceJob: bundle.sourceJob,
        sourceAgentId: bundle.sourceAgentIds?.[code] ?? null,
      },
    },
    messages: orderedMessages,
  };
  delete updated.meta.fallbackLocale;
  prepared.push({ code, path: catalogPath, contents: `${JSON.stringify(updated, null, 2)}\n` });
  summaries[code] = { keys: sourceKeys.length, placeholderChecks: sourceKeys.length, changedFromEnglish };
}

const shouldWrite = process.argv.includes("--write");
if (shouldWrite) {
  const staged = [];
  for (const item of prepared) {
    const tempPath = `${item.path}.draft.tmp`;
    await writeFile(tempPath, item.contents, "utf8");
    staged.push({ ...item, tempPath });
  }
  for (const item of staged) await rename(item.tempPath, item.path);
}
console.log(JSON.stringify({ mode: shouldWrite ? "written" : "validated-only", sourceKeys: sourceKeys.length, locales: summaries }));
