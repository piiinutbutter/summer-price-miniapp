import { setClipboardText } from "@apps-in-toss/web-framework";

/**
 * 공유 카드 텍스트. 이 앱의 유일한 무료 유입 채널이라, 숫자와 출처가
 * 한눈에 보이도록 구성한다 (받는 사람이 앱을 몰라도 정보로서 가치가 있게).
 */
export function buildShareText(params: {
  placeName: string;
  people: number;
  total: number;
  lines: { label: string; quantity: number; subtotal: number }[];
  sourceName: string;
  asOf: string;
  allFree: boolean;
}): string {
  const { placeName, people, total, lines, sourceName, asOf, allFree } = params;

  if (allFree) {
    return [
      `[${placeName}] 이용료 전부 무료`,
      ``,
      lines.map((l) => `· ${l.label} 무료`).join("\n"),
      ``,
      `※ ${sourceName} 공식 공시 기준 (${asOf})`,
      `바가지 타파 미니앱에서 확인했어요`,
    ].join("\n");
  }

  const body = lines
    .map((l) => `· ${l.label} ${l.quantity}개 ${l.subtotal.toLocaleString("ko-KR")}원`)
    .join("\n");

  return [
    `[${placeName}] ${people}명 예상 비용`,
    ``,
    body,
    ``,
    `합계 ${total.toLocaleString("ko-KR")}원`,
    ``,
    `※ ${sourceName} 공식 공시 기준 (${asOf})`,
    `바가지 타파 미니앱에서 계산했어요`,
  ].join("\n");
}

export type ShareResult = "shared" | "copied" | "failed";

/**
 * 공유 시도 순서: 네이티브 공유 시트 → 클립보드 복사.
 *
 * SDK 2.10.8에는 토스 Share API가 없다(3.0 rc에만 존재). 그래서 웹 표준
 * navigator.share를 먼저 시도한다 — 되면 카카오톡 등으로 바로 넘어가고,
 * 지원하지 않거나 사용자가 취소하면 기존 클립보드 방식으로 떨어진다.
 * 최악의 경우에도 이전 동작과 같으므로 손해가 없다.
 *
 * @param file 함께 보낼 이미지(공유 카드). 파일 공유를 지원하지 않으면 텍스트만 보낸다.
 */
export async function shareOrCopy(text: string, file?: File): Promise<ShareResult> {
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>;
    canShare?: (data: ShareData) => boolean;
  };

  if (typeof nav.share === "function") {
    // 이미지까지 보낼 수 있으면 카드와 함께, 아니면 텍스트만
    const withFile = file != null && nav.canShare?.({ files: [file] }) === true;
    try {
      await nav.share(withFile ? { text, files: [file] } : { text });
      return "shared";
    } catch (e) {
      // 사용자가 공유 시트를 닫은 경우는 실패가 아니므로 복사도 하지 않는다
      if (e instanceof Error && e.name === "AbortError") return "shared";
      // 그 외(미지원·권한 등)는 아래 클립보드로 넘어간다
    }
  }

  return (await copyToClipboard(text)) ? "copied" : "failed";
}

/**
 * 토스 환경에서는 네이티브 클립보드, 그 외(브라우저 개발)에서는 웹 클립보드로
 * 대체한다. 어느 쪽도 없으면 조용히 실패하지 않고 false를 돌려준다.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await setClipboardText(text);
    return true;
  } catch {
    // 토스 앱 밖(브라우저)에서 실행 중일 때
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
