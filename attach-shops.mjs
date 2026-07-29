// 착한가격업소 CSV를 읽어 여행지별 '같은 시군구' 식당을 붙인다.
// CSV에 좌표가 없어 거리 계산이 불가능하므로 행정구역(시군)으로 묶는다.
// 실행: node attach-shops.mjs
import fs from "node:fs";

const CSV = "/tmp/claude-1000/-home-wpnut-AI-2nd-brain--------/0cef9317-f978-430a-81a7-6f3d716caee4/scratchpad/gp_utf8.csv";
const DATA = "src/data/places.json";
const SHOPS_OUT = "src/data/shops.json";

// 여행지가 속한 시군구 (지자체 공시 자료·주소 기준으로 확인한 값)
const SIGUNGU = {
  haeundae: ["부산광역시", "해운대구"],
  songjeong: ["부산광역시", "해운대구"],
  gwangalli: ["부산광역시", "수영구"],
  dadaepo: ["부산광역시", "사하구"],
  "songdo-busan": ["부산광역시", "서구"],
  "jungmun-saekdal": ["제주특별자치도", "서귀포시"],
  hamdeok: ["제주특별자치도", "제주시"],
  hyeopjae: ["제주특별자치도", "제주시"],
  geumneung: ["제주특별자치도", "제주시"],
  "iho-tewoo": ["제주특별자치도", "제주시"],
  woljeong: ["제주특별자치도", "제주시"],
  samyang: ["제주특별자치도", "제주시"],
  gwakji: ["제주특별자치도", "제주시"],
  gimnyeong: ["제주특별자치도", "제주시"],
  pyoseon: ["제주특별자치도", "서귀포시"],
  "sinyang-seopji": ["제주특별자치도", "서귀포시"],
  "hwasun-geummorae": ["제주특별자치도", "서귀포시"],
  jinha: ["울산광역시", "울주군"],
  seonyudo: ["전북특별자치도", "군산시"],
  "boryeong-mud-festival": ["충청남도", "보령시"],
  daecheon: ["충청남도", "보령시"],
  mallipo: ["충청남도", "태안군"],
  chunjangdae: ["충청남도", "서천군"],
  gyeongpo: ["강원특별자치도", "강릉시"],
  gangmun: ["강원특별자치도", "강릉시"],
  jeongdongjin: ["강원특별자치도", "강릉시"],
  sokcho: ["강원특별자치도", "속초시"],
  "sokcho-summer-festival": ["강원특별자치도", "속초시"],
  naksan: ["강원특별자치도", "양양군"],
  jeungsan: ["강원특별자치도", "삼척시"],
  eurwangni: ["인천광역시", "중구"],
  "sorae-festival": ["인천광역시", "남동구"],
  "sangju-eunmorae": ["경상남도", "남해군"],
  yulpo: ["전라남도", "보성군"],
  myeongsasimni: ["전라남도", "완도군"],
  byeonsan: ["전북특별자치도", "부안군"],
  gyeokpo: ["전북특별자치도", "부안군"],
  goraebul: ["경상북도", "영덕군"],
};

// 따옴표를 고려한 최소 CSV 파서 (이 파일은 따옴표가 거의 없지만 안전하게)
function parseLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

const text = fs.readFileSync(CSV, "utf8");
const rows = text.split(/\r?\n/).slice(1).filter((l) => l.trim() !== "").map(parseLine);

// 음식점만 (미용실·목욕탕 등 제외 — 휴가지 밥값이 목적)
const FOOD = /한식|중식|양식|일식|분식|기타요식|외식/;

const places = JSON.parse(fs.readFileSync(DATA, "utf8"));
const shopsByArea = {};
let attached = 0, none = 0;

for (const place of places) {
  const loc = SIGUNGU[place.id];
  if (loc == null) { none++; console.log(`--  ${place.name}: 시군구 미지정`); continue; }
  const [sido, sigun] = loc;

  const matched = rows
    .filter((r) => r[0] === sido && r[1] === sigun && FOOD.test(r[2] ?? ""))
    .map((r) => {
      const menus = [];
      for (const [m, p] of [[r[6], r[7]], [r[8], r[9]], [r[10], r[11]], [r[12], r[13]]]) {
        const price = Number(String(p ?? "").replace(/[^0-9]/g, ""));
        if (m && m.trim() !== "" && price > 0) menus.push({ name: m.trim(), price });
      }
      return { name: r[3]?.trim(), type: r[2]?.trim(), menus };
    })
    .filter((s) => s.name && s.menus.length > 0)
    // 휴가지에서 "한 끼 얼마"를 알려는 것이므로 식사류를 우선한다.
    // 최저가순으로만 두면 빵집·떡집이 위로 올라와 밥값 감이 안 잡힌다.
    .map((s) => {
      const meal = s.menus.find((m) => /찌개|국|밥|면|국수|탕|백반|정식|덮밥|칼국수|비빔/.test(m.name));
      return { ...s, isMeal: meal != null, key: (meal ?? s.menus[0]).price };
    })
    // 시군구 전체를 담되, 화면에는 앞 5곳만 보이고 나머지는 '더 보기'로 펼친다.
    .sort((a, b) => (a.isMeal !== b.isMeal ? (a.isMeal ? -1 : 1) : a.key - b.key))
    .map(({ isMeal: _i, key: _k, ...s }) => ({
      ...s,
      // 메뉴는 3개까지만 (화면에 그 이상 안 쓰므로 용량 낭비를 막는다)
      menus: s.menus.slice(0, 3),
    }));

  if (matched.length > 0) {
    // 같은 시군구를 공유하는 여행지(제주시 9곳 등)가 목록을 중복 저장하지 않도록
    // 업소는 시군구별로 한 번만 두고, 여행지는 그 키만 가리킨다.
    shopsByArea[sigun] = matched;
    place.shopArea = sigun;
    attached++;
    console.log(`OK  ${place.name} → ${sigun} ${matched.length}곳`);
  } else {
    none++;
    console.log(`--  ${place.name} (${sigun}): 해당 업소 없음`);
  }
}

fs.writeFileSync(DATA, JSON.stringify(places, null, 2) + "\n");
fs.writeFileSync(SHOPS_OUT, JSON.stringify(shopsByArea, null, 2) + "\n");
const uniqueShops = Object.values(shopsByArea).reduce((s, a) => s + a.length, 0);
console.log(`\n완료: 여행지 ${attached}곳 / 미지정 ${none}곳`);
console.log(`업소: ${Object.keys(shopsByArea).length}개 시군구, ${uniqueShops}곳`);
