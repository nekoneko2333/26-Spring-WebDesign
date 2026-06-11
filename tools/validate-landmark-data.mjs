import { readFile } from 'node:fs/promises';
import path from 'node:path';

const file = path.resolve(process.argv[2] ?? 'public/data/live-landmarks.json');
const payload = JSON.parse(await readFile(file, 'utf8'));
const items = payload.items ?? [];
const expected = Number(process.env.LANDMARK_COUNT ?? payload.catalog?.targetCount ?? items.length);
const fastCatalog = payload.catalog?.languagePolicy?.includes('Fast catalog mode') || process.env.FAST_CATALOG_ONLY === '1';
const errors = [];
const traditionalPattern = /[臺灣體義廣東門風龍國學藝覽觀讓變關開聖羅蘭橋宮館萬與興會專業歷遺跡區劃價資資訊電話預約時閉間號頁點鄉縣車鐵線館]/;

function duplicateValues(values) {
  const counts = new Map();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

if (items.length !== expected) errors.push(`Expected ${expected} items, found ${items.length}`);
for (const [label, values] of [
  ['id', items.map((item) => item.id)],
  ['wikidataId', items.map((item) => item.wikidataId)],
  ['coordinates', items.map((item) => `${item.coordinates?.lat},${item.coordinates?.lon}`)],
]) {
  const duplicates = duplicateValues(values);
  if (duplicates.length) errors.push(`Duplicate ${label}: ${duplicates.slice(0, 10).join(', ')}`);
}

items.forEach((item) => {
  const required = [
    ['name.en', item.name?.en],
    ['name.zh', item.name?.zh],
    ['wikidata.source', item.wikidata?.source],
  ];
  if (!fastCatalog) {
    required.push(
      ['wikipedia.en.extract', item.wikipedia?.en?.extract],
      ['wikipedia.zh.extract', item.wikipedia?.zh?.extract],
    );
  }
  required.forEach(([field, value]) => {
    if (!String(value ?? '').trim()) errors.push(`${item.id}: missing ${field}`);
  });
  if (![item.coordinates?.lat, item.coordinates?.lon].every(Number.isFinite)) {
    errors.push(`${item.id}: invalid coordinates`);
  }
  const chinese = JSON.stringify({
    name: item.name?.zh,
    summary: item.wikipedia?.zh?.extract,
    location: item.location,
    visitorInfo: item.visitorInfo,
    search: item.search?.aliases?.zh,
  });
  if (traditionalPattern.test(chinese)) errors.push(`${item.id}: traditional Chinese residue`);
});

if (errors.length) {
  console.error(`Landmark data validation failed with ${errors.length} issue(s):`);
  errors.slice(0, 100).forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Validated ${items.length} unique bilingual landmarks.`);
}
