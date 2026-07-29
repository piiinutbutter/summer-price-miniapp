import type { Place, PriceItem } from "./types";

/**
 * 목록 카드에 보여줄 대표 품목 (최대 2개).
 * 최저가를 쓰면 곳마다 다른 품목(해운대는 샤워 1,000원, 제주는 파라솔 20,000원)이
 * 잡혀 서로 비교가 안 되므로, 파라솔·평상처럼 누구나 빌리는 품목을 우선 고른다.
 */
export function headlineItems(place: Place): PriceItem[] {
  const paid = place.items.filter((i) => i.price > 0);
  if (paid.length === 0) return [];

  const picked: PriceItem[] = [];
  for (const pattern of [/파라솔/, /평상/, /입장|이용권|티켓/, /튜브/]) {
    const hit = paid.find((i) => pattern.test(i.label) && !picked.includes(i));
    if (hit != null) picked.push(hit);
    if (picked.length === 2) break;
  }
  // 대표 품목이 하나도 없으면 가장 비싼 것으로 대신한다
  if (picked.length === 0) picked.push(paid.reduce((a, b) => (a.price >= b.price ? a : b)));
  return picked;
}

/** 괄호 설명을 뗀 짧은 품목명. 카드가 좁아 한 줄에 들어가야 한다. */
export function shortLabel(label: string): string {
  return label.replace(/\s*\(.*$/, "");
}

/** 목록 한 줄 요약. 예: "파라솔 15,000원 · 평상 25,000원" */
export function priceHint(place: Place): string {
  if (place.items.length === 0) return "가격 정보 없음";
  const heads = headlineItems(place);
  if (heads.length === 0) return "이용료 무료";
  return heads
    .map((i) => `${shortLabel(i.label)} ${i.price.toLocaleString("ko-KR")}원`)
    .join(" · ");
}

/**
 * 품목별 수량 기본값을 일행 수에서 추정한다.
 *
 * 기본값은 "일반적인 가족이 실제로 빌리는 만큼"이어야 한다. 모든 품목을 인원수만큼
 * 잡으면 합계가 현실과 동떨어지게 부풀고(예: 튜브 3종 + 보트 + 사물함 3종 동시 대여),
 * 이 앱이 내세우는 신뢰가 무너진다. 그래서 선택 품목은 0으로 두고 사용자가 직접 올린다.
 */
export function defaultQuantity(item: PriceItem, people: number): number {
  // 사물함·보트처럼 규격/종류가 갈리는 선택 품목은 기본 0 (사용자가 필요한 것만 담는다)
  const optional = /보관함|사물함|보트|바나나|제트|샤워|탈의|주차/;
  if (optional.test(item.label)) return 0;

  // 같은 용도의 대체 품목(튜브 소/대, 비치베드 등)은 하나만 기본 선택되게 0으로 둔다
  const alternative = /\((소|대|중|특대)\)|비치베드/;
  if (alternative.test(item.label)) return 0;

  // 파라솔·평상처럼 여럿이 나눠 쓰는 품목은 4명당 1개
  const shared = /파라솔|평상|그늘막|텐트|자리|카바나/;
  if (shared.test(item.label)) return Math.max(1, Math.ceil(people / 4));

  // 튜브·구명조끼처럼 1인 1개인 품목
  return Math.max(1, people);
}

export interface BudgetLine extends PriceItem {
  quantity: number;
  subtotal: number;
}

/** 선택된 수량으로 합계를 낸다. 수량 0인 품목은 제외한다. */
export function calculateBudget(
  items: PriceItem[],
  quantities: Record<string, number>,
): { lines: BudgetLine[]; total: number } {
  const lines: BudgetLine[] = [];
  for (const item of items) {
    const quantity = quantities[item.label] ?? 0;
    if (quantity <= 0) continue;
    lines.push({ ...item, quantity, subtotal: item.price * quantity });
  }
  return { lines, total: lines.reduce((sum, l) => sum + l.subtotal, 0) };
}

export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export type PriceVerdict = "same" | "cheaper" | "higher";

export interface PriceCheck {
  verdict: PriceVerdict;
  /** 공시가와의 차액 (절댓값) */
  gap: number;
  /** 공시가 대비 비율. 공시가가 0원(무료)이면 null */
  percent: number | null;
}

/**
 * 현장에서 받는 금액을 공식 공시가와 비교한다.
 *
 * 우리가 "바가지"라고 판정하지 않는다. 지자체가 공시한 숫자와 얼마나 다른지
 * 사실만 알려주고 판단은 사용자에게 맡긴다. 이 구분이 명예훼손 리스크를 없애고,
 * 근거를 댈 수 없는 추측(예: "컵라면 200%")을 배제하는 기준선이다.
 */
export function checkAgainstOfficial(official: number, actual: number): PriceCheck {
  const diff = actual - official;
  const verdict: PriceVerdict = diff === 0 ? "same" : diff > 0 ? "higher" : "cheaper";
  return {
    verdict,
    gap: Math.abs(diff),
    percent: official > 0 ? Math.round((Math.abs(diff) / official) * 100) : null,
  };
}

/** 예산 대비 실제 지출. 양수면 아낀 금액, 음수면 더 쓴 금액. */
export function compareSpending(budget: number, actual: number) {
  const diff = budget - actual;
  return {
    diff: Math.abs(diff),
    saved: diff >= 0,
    /** 예산이 0이면 비율은 의미가 없으므로 null */
    percent: budget > 0 ? Math.round((Math.abs(diff) / budget) * 100) : null,
  };
}
