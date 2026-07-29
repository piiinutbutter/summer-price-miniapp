// 실행: npx tsx src/location.test.mjs
// 거리 계산과 근처 정렬이 깨지면 즉시 실패하는 최소 검증.
import assert from "node:assert/strict";
import { distanceKm, findNearby, formatDistance } from "./location.ts";

// 해운대(35.1587, 129.1604) ↔ 광안리(35.1532, 129.1187): 실제 약 3.9km
const d = distanceKm(35.1587, 129.1604, 35.1532, 129.1187);
assert.ok(d > 3 && d < 5, `해운대-광안리 거리 이상: ${d}`);

// 같은 지점은 0
assert.equal(distanceKm(35.1, 129.1, 35.1, 129.1), 0);

const places = [
  { id: "a", name: "가까운곳", lat: 35.1587, lng: 129.1604 },
  { id: "b", name: "먼곳", lat: 33.4996, lng: 126.5312 }, // 제주 (약 300km)
  { id: "c", name: "중간", lat: 35.1532, lng: 129.1187 },
];

// 해운대 근처에서 조회하면 가까운 순으로, 제주는 maxKm 밖이라 빠진다
const near = findNearby(places, 35.1587, 129.1604, 5, 60);
assert.equal(near.length, 2, "60km 밖(제주)은 제외돼야 함");
assert.equal(near[0].place.id, "a");
assert.equal(near[1].place.id, "c");
assert.ok(near[0].distance < near[1].distance, "거리순 정렬이어야 함");

// limit 적용
assert.equal(findNearby(places, 35.1587, 129.1604, 1, 60).length, 1);
// 모두 범위 밖이면 빈 배열 (오류 아님)
assert.deepEqual(findNearby(places, 37.5665, 126.978, 5, 1), []);

// 거리 표기
assert.equal(formatDistance(0.35), "350m");
assert.equal(formatDistance(3.94), "3.9km");

console.log("location: 모든 검증 통과");
