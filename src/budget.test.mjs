// 실행: npx tsx src/budget.test.mjs  (또는 빌드 후 node)
// 계산 로직이 깨지면 즉시 실패하는 최소 검증.
import assert from "node:assert/strict";
import {
  defaultQuantity,
  calculateBudget,
  formatWon,
  compareSpending,
  priceHint,
  checkAgainstOfficial,
} from "./budget.ts";

const parasol = { label: "파라솔 (종일)", price: 20000, unit: "개" };
const tube = { label: "튜브 대여", price: 5000, unit: "개" };

// 공유 품목은 4명당 1개, 개인 품목은 인원수만큼
assert.equal(defaultQuantity(parasol, 4), 1);
assert.equal(defaultQuantity(parasol, 5), 2);
assert.equal(defaultQuantity(parasol, 1), 1);
assert.equal(defaultQuantity(tube, 4), 4);

// 선택 품목은 기본 0이어야 한다 (합계가 비현실적으로 부풀지 않도록)
const locker = { label: "물품보관함 (대)", price: 4000, unit: "개" };
const boat = { label: "대형보트 등", price: 4000, unit: "개" };
const tubeSmall = { label: "공기주입 튜브 (소)", price: 2000, unit: "개" };
const shower = { label: "샤워탈의장 (1회 60초)", price: 1000, unit: "회" };
assert.equal(defaultQuantity(locker, 4), 0);
assert.equal(defaultQuantity(boat, 4), 0);
assert.equal(defaultQuantity(tubeSmall, 4), 0);
assert.equal(defaultQuantity(shower, 4), 0);

// 합계
const { lines, total } = calculateBudget([parasol, tube], {
  "파라솔 (종일)": 2,
  "튜브 대여": 4,
});
assert.equal(total, 20000 * 2 + 5000 * 4);
assert.equal(lines.length, 2);

// 수량 0은 제외
assert.equal(calculateBudget([parasol, tube], { "파라솔 (종일)": 1 }).lines.length, 1);
assert.equal(calculateBudget([], {}).total, 0);

// 통화 표기
assert.equal(formatWon(60000), "60,000원");

// 예산 대비 비교
assert.deepEqual(compareSpending(50000, 30000), { diff: 20000, saved: true, percent: 40 });
assert.deepEqual(compareSpending(50000, 70000), { diff: 20000, saved: false, percent: 40 });
assert.equal(compareSpending(0, 1000).percent, null); // 0으로 나누지 않는다

// 무료(0원) 품목: 합계는 0이지만 품목 자체는 유효하다
const freeItem = { label: "파라솔", price: 0, unit: "개" };
const freeResult = calculateBudget([freeItem], { 파라솔: 2 });
assert.equal(freeResult.total, 0);
assert.equal(freeResult.lines.length, 1); // 무료라고 목록에서 사라지면 안 된다

// 목록 미리보기: 곳마다 같은 기준(파라솔)으로 비교돼야 한다
const place = (items) => ({ items });
// 샤워 1,000원이 아니라 파라솔(20,000원)이 대표로 잡혀야 함
assert.equal(
  priceHint(place([{ label: "샤워탈의장 (1회 60초)", price: 1000, unit: "회" }, parasol])),
  "파라솔 20,000원",
);
assert.equal(priceHint(place([])), "가격 정보 없음");
assert.equal(priceHint(place([{ label: "파라솔", price: 0, unit: "개" }])), "이용료 무료");
// 파라솔·평상이 없으면 가장 비싼 품목으로 대표를 삼는다
assert.equal(
  priceHint(place([{ label: "샤워", price: 1000, unit: "회" }, tube])),
  "튜브 대여 5,000원",
);

// 공시가 대비 현장가 확인
assert.deepEqual(checkAgainstOfficial(10000, 25000), {
  verdict: "higher",
  gap: 15000,
  percent: 150,
});
assert.deepEqual(checkAgainstOfficial(10000, 10000), {
  verdict: "same",
  gap: 0,
  percent: 0,
});
assert.deepEqual(checkAgainstOfficial(20000, 15000), {
  verdict: "cheaper",
  gap: 5000,
  percent: 25,
});
// 무료(0원) 품목은 비율을 낼 수 없다 — 0으로 나누지 않는다
assert.equal(checkAgainstOfficial(0, 5000).percent, null);
assert.equal(checkAgainstOfficial(0, 5000).verdict, "higher");

console.log("budget: 모든 검증 통과");
