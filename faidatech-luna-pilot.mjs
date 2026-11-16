import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { LlmClient, messageText } = await import(pathToFileURL('/home/ubuntu/skills/builtin-llm-models/lib/llm.mjs').href);
const model = 'gpt-6-luna';
const english = JSON.parse(await readFile('/home/ubuntu/faidatech/src/i18n/catalogs/en.json', 'utf8'));
const liveModels = JSON.parse(await readFile('/tmp/faidatech-live-models-current.json', 'utf8'));
const modelInfo = (Array.isArray(liveModels) ? liveModels : []).find((item) => item.id === model);
if (!modelInfo || !modelInfo.capabilities?.supports_response_format_json_schema) throw new Error('Selected model is missing or lacks strict JSON schema support.');

const locales = {
  fr: 'French (France, natural modern product UI)',
  es: 'Spanish (neutral international Spanish)',
  ar: 'Modern Standard Arabic, naturally phrased for software UI; right-to-left language',
  'zh-CN': 'Simplified Chinese (Mainland China, modern software UI)',
  sw: 'Kiswahili / Swahili (standard East African usage)',
  am: 'Amharic (standard modern Ethiopian usage)',
  ha: 'Hausa (standard contemporary usage)',
  yo: 'Yoruba (standard contemporary usage with correct diacritics and tone marks)',
  om: 'Afaan Oromoo / Oromo (standard contemporary usage)',
  ti: 'Tigrinya / Tigrigna (standard contemporary Eritrean/Ethiopian usage)',
  so: 'Somali (standard contemporary usage)',
  sid: 'Sidama (Sidamu Afoo; use established orthography and natural contemporary phrasing)',
};
const pilotKeys = [
  'locale.choose', 'locale.globalTier', 'common.continue', 'common.back', 'common.save', 'common.cancel',
  'dashboard.title', 'dashboard.description', 'dashboard.activeDestinations', 'wizard.choosePurpose',
  'wizard.livePreview', 'purpose.menu', 'field.priceETB', 'visitor.chooseAudioLanguage', 'visitor.noAudio',
  'error.unauthorized', 'error.databaseUnavailable', 'error.databaseNotConfigured', 'analytics.acrossDestinations',
  'settings.description', 'qr.deleteDescription', 'visitor.downloadContact', 'common.downloadSvg', 'common.downloadPng',
];
const strings = Object.fromEntries(pilotKeys.map((key) => {
  if (typeof english.messages[key] !== 'string') throw new Error(`Pilot key missing from source catalog: ${key}`);
  return [key, english.messages[key]];
}));
const messageSchema = {
  type: 'object',
  properties: Object.fromEntries(pilotKeys.map((key) => [key, { type: 'string' }])),
  required: pilotKeys,
  additionalProperties: false,
};
const schema = {
  type: 'object',
  properties: Object.fromEntries(Object.keys(locales).map((code) => [code, messageSchema])),
  required: Object.keys(locales),
  additionalProperties: false,
};
const system = [
  'You are a senior UX translator for a professional Ethiopian and regional African SaaS product.',
  'Translate each provided English interface message into the requested language using natural, concise, culturally appropriate contemporary phrasing. This is an editorial draft, not native-speaker certification.',
  'Preserve every {placeholder} exactly, preserve brand/product names FaidATech, Telebirr, ETB and QR when natural, never invent features, and return exactly the requested locale/key structure without commentary.',
  'Use Modern Standard Arabic. Use correct Yoruba diacritics and tone marks. For Sidama, use Sidamu Afoo established orthography; if uncertain, prefer a concise conservative phrase rather than inventing terminology.',
].join(' ');
const client = new LlmClient({ timeoutMs: 300000, maxRetries: 2 });
const response = await client.chat({
  model,
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: JSON.stringify({ targetLocales: locales, messages: strings }) },
  ],
  max_completion_tokens: 16000,
  reasoning: { effort: 'low' },
  response_format: { type: 'json_schema', json_schema: { name: 'faidatech_translation_pilot', strict: true, schema } },
});
const translations = JSON.parse(messageText(response));
const placeholderTokens = (value) => [...value.matchAll(/\{([A-Za-z0-9_.-]+)\}/g)].map((match) => match[1]).sort().join('|');
for (const [locale, messages] of Object.entries(translations)) {
  if (Object.keys(messages).length !== pilotKeys.length) throw new Error(`${locale}: pilot key count mismatch.`);
  for (const key of pilotKeys) {
    if (typeof messages[key] !== 'string' || !messages[key].trim()) throw new Error(`${locale}: empty translation for ${key}.`);
    if (placeholderTokens(messages[key]) !== placeholderTokens(strings[key])) throw new Error(`${locale}: placeholder mismatch for ${key}.`);
  }
}
const usage = response.usage ?? {};
const inputTokens = usage.prompt_tokens ?? 0;
const outputTokens = usage.completion_tokens ?? 0;
const inputPrice = modelInfo.pricing?.input_per_1m_usd ?? 0;
const outputPrice = modelInfo.pricing?.output_per_1m_usd ?? 0;
const estimatedCostUsd = inputTokens && outputTokens ? (inputTokens * inputPrice + outputTokens * outputPrice) / 1_000_000 : null;
await writeFile('/tmp/faidatech-luna-pilot-output.json', `${JSON.stringify(translations, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ model, effort: 'low', locales: Object.keys(locales).length, keysPerLocale: pilotKeys.length, inputTokens, outputTokens, estimatedCostUsd, outputFile: '/tmp/faidatech-luna-pilot-output.json' }));
