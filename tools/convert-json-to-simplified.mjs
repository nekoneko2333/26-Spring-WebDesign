import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const file = path.resolve(process.argv[2] ?? 'public/data/live-landmarks.json');

const pairs = [
  ['臺', '台'], ['灣', '湾'], ['體', '体'], ['義', '义'], ['廣', '广'], ['東', '东'],
  ['門', '门'], ['風', '风'], ['龍', '龙'], ['國', '国'], ['學', '学'], ['藝', '艺'],
  ['覽', '览'], ['觀', '观'], ['讓', '让'], ['變', '变'], ['關', '关'], ['開', '开'],
  ['聖', '圣'], ['羅', '罗'], ['蘭', '兰'], ['橋', '桥'], ['宮', '宫'], ['館', '馆'],
  ['萬', '万'], ['與', '与'], ['興', '兴'], ['會', '会'], ['專', '专'], ['業', '业'],
  ['歷', '历'], ['遺', '遗'], ['跡', '迹'], ['區', '区'], ['劃', '划'], ['價', '价'],
  ['資', '资'], ['訊', '讯'], ['電', '电'], ['話', '话'], ['預', '预'], ['約', '约'],
  ['時', '时'], ['閉', '闭'], ['間', '间'], ['號', '号'], ['頁', '页'], ['點', '点'],
  ['鄉', '乡'], ['縣', '县'], ['車', '车'], ['鐵', '铁'], ['線', '线'], ['圓', '圆'],
  ['鬥', '斗'], ['獸', '兽'], ['場', '场'], ['爾', '尔'], ['橫', '横'], ['運', '运'],
  ['樑', '梁'], ['屬', '属'], ['復', '复'], ['稱', '称'], ['兩', '两'], ['旁', '旁'],
  ['羅', '罗'], ['馬', '马'], ['競', '竞'], ['劇', '剧'], ['遷', '迁'], ['現', '现'],
  ['從', '从'], ['費', '费'], ['個', '个'], ['紀', '纪'], ['歐', '欧'], ['羅', '罗'],
  ['佛', '佛'], ['倫', '伦'], ['薩', '萨'], ['總', '总'], ['終', '终'], ['貢', '贡'],
  ['建築', '建筑'], ['設計', '设计'], ['傾', '倾'], ['頂', '顶'], ['亞', '亚'],
  ['據', '据'], ['號', '号'], ['殿', '殿'], ['廟', '庙'], ['獻', '献'], ['後', '后'],
  ['憑', '凭'], ['藉', '借'], ['謹', '谨'], ['嚴', '严'], ['幾', '几'], ['譽', '誉'],
  ['認', '认'], ['噴', '喷'], ['遊', '游'], ['許', '许'], ['願', '愿'], ['廣場', '广场'],
  ['導', '导'], ['覽', '览'], ['鐘', '钟'], ['樓', '楼'], ['舊', '旧'], ['來', '来'],
  ['處', '处'], ['頭', '头'], ['條', '条'], ['戶', '户'], ['務', '务'], ['數', '数'],
  ['據', '据'], ['庫', '库'], ['寫', '写'], ['歲', '岁'], ['報', '报'], ['應', '应'],
  ['環', '环'], ['島', '岛'], ['灣', '湾'], ['灣', '湾'], ['濱', '滨'], ['參', '参'],
  ['觀', '观'], ['團', '团'], ['營', '营'], ['鐘', '钟'], ['裝', '装'], ['裡', '里'],
];

const map = new Map();
for (const [from, to] of pairs) {
  if (from.length === 1) map.set(from, to);
}
const phrasePairs = pairs.filter(([from]) => from.length > 1);

function simplifyString(value) {
  let output = value;
  for (const [from, to] of phrasePairs) output = output.split(from).join(to);
  return [...output].map((char) => map.get(char) ?? char).join('');
}

function simplify(value) {
  if (typeof value === 'string') return simplifyString(value);
  if (Array.isArray(value)) return value.map(simplify);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, simplify(item)]));
  }
  return value;
}

const payload = JSON.parse(await readFile(file, 'utf8'));
await writeFile(file, `${JSON.stringify(simplify(payload), null, 2)}\n`, 'utf8');
console.log(`Converted JSON strings to Simplified Chinese: ${file}`);
