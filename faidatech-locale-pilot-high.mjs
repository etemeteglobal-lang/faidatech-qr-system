import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const skillClient = await import(pathToFileURL('/home/ubuntu/skills/builtin-llm-models/lib/llm.mjs').href);
const { LlmClient, messageText } = skillClient;
const model = 'gpt-6.1-sol';
const source = JSON.parse(await readFile('/tmp/faidatech-i18n-source.json', 'utf8'));
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
  'locale.choose','locale.globalTier','common.continue','common.back','common.save','common.cancel',
  'dashboard.title','dashboard.description','dashboard.activeDestinations','wizard.choosePurpose',
  'wizard.livePreview','purpose.menu','field.priceETB','visitor.chooseAudioLanguage','visitor.noAudio',
  'error.unauthorized','error.databaseUnavailable','error.databaseNotConfigured','analytics.acrossDestinations',
  'settings.description','qr.deleteDescription','visitor.downloadContact','common.downloadSvg','common.downloadPng',
];
const selected = Object.fromEntries(pilotKeys.map((key) => [key, source[key]]));
const localeSchema = Object.fromEntries(pilotKeys.map((key) => [key, { type: 'string' }]));
const required = [...pilotKeys];
const properties = Object.fromEntries(Object.keys(locales).map((code) => [code, {
  type: 'object', properties: localeSchema, required, additionalProperties: false,
}]));
const schema = {
  type: 'object', properties, required: Object.keys(locales), additionalProperties: false,
};
const system = [
  'You are a senior human-quality UX translator. Translate each English FaidATech interface string into every requested target language using natural, concise, culturally appropriate phrasing for a professional Ethiopian and regional African SaaS product.',
  'This output is an editorial draft, not a claim of native-speaker certification. Preserve every {placeholder} exactly, preserve product/brand names FaidATech, Telebirr, ETB and QR when natural, never invent features, and do not add explanations or quotation marks.',
  'Keep each string appropriate to its UI context. Use Modern Standard Arabic. Use correct Yoruba diacritics/tone marks. For Sidama, use Sidamu Afoo standard orthography; if uncertain, choose a concise conservative phrasing instead of inventing a term. Return exactly the required locale/key structure.',
].join(' ');
const user = JSON.stringify({ targetLocales: locales, strings: selected });
const llm = new LlmClient({ timeoutMs: 300000, maxRetries: 2 });
const response = await llm.chat({
  model,
  messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  max_completion_tokens: 16000,
  reasoning: { effort: 'high' },
  response_format: {
    type: 'json_schema',
    json_schema: { name: 'faidatech_locale_pilot', strict: true, schema },
  },
});
const text = messageText(response);
JSON.parse(text);
await writeFile('/tmp/faidatech-locale-pilot-output.json', `${text}\n`, 'utf8');
console.log(JSON.stringify({
  model,
  inputTokens: response.usage?.prompt_tokens ?? null,
  outputTokens: response.usage?.completion_tokens ?? null,
  totalTokens: response.usage?.total_tokens ?? null,
  locales: Object.keys(locales).length,
  keysPerLocale: pilotKeys.length,
  outputFile: '/tmp/faidatech-locale-pilot-output.json',
}));
