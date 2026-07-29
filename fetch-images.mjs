// TourAPI에서 여행지 대표 사진을 1회만 받아 places.json에 저장한다.
// 앱 실행 중에는 API를 부르지 않는다 (CORS 차단 + 일 1000건 제한 + 키 노출 방지).
// 실행: node fetch-images.mjs
import fs from "node:fs";

const KEY = fs
  .readFileSync(".env.local", "utf8")
  .split("\n")
  .find((l) => l.startsWith("TOUR_API_KEY="))
  ?.split("=")[1]
  ?.trim();

if (!KEY) {
  console.error(".env.local에 TOUR_API_KEY가 없습니다.");
  process.exit(1);
}

const DATA = "src/data/places.json";
const places = JSON.parse(fs.readFileSync(DATA, "utf8"));

const BASE = "https://apis.data.go.kr/B551011/KorService2/searchKeyword2";

// 좌표 거리(km). API가 동명이인 장소를 주는 경우가 많아 위치로 검증한다.
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function search(keyword) {
  const url =
    `${BASE}?serviceKey=${KEY}&numOfRows=20&pageNo=1&MobileOS=ETC` +
    `&MobileApp=BargainBuster&_type=json&keyword=${encodeURIComponent(keyword)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

let ok = 0,
  miss = 0;

for (const place of places) {
  // 축제는 이름이 길어 검색이 잘 안 되므로 괄호 앞부분만 쓴다
  const keyword = place.name.replace(/\s*\(.*$/, "");
  let picked = null;

  try {
    const results = await search(keyword);
    // 사진이 있고, 우리가 아는 좌표에서 15km 이내인 것만 채택
    const candidates = results
      .filter((r) => r.firstimage)
      .map((r) => ({
        ...r,
        dist: distanceKm(place.lat, place.lng, Number(r.mapy), Number(r.mapx)),
      }))
      .filter((r) => Number.isFinite(r.dist) && r.dist <= 15)
      .sort((a, b) => a.dist - b.dist);

    picked = candidates[0] ?? null;
  } catch (e) {
    console.log(`  ! ${place.name}: ${e.message}`);
  }

  if (picked) {
    place.image = picked.firstimage;
    place.imageCopyright = picked.cpyrhtDivCd ?? "";
    if (picked.overview) place.overview = String(picked.overview).slice(0, 300);
    ok++;
    console.log(`OK  ${place.name} (${picked.dist.toFixed(1)}km)`);
  } else {
    miss++;
    console.log(`--  ${place.name} 사진 없음`);
  }

  await new Promise((r) => setTimeout(r, 120)); // API 예의상 간격
}

fs.writeFileSync(DATA, JSON.stringify(places, null, 2) + "\n");
console.log(`\n완료: 사진 있음 ${ok}곳 / 없음 ${miss}곳 (전체 ${places.length})`);
