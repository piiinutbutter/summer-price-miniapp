import type { BudgetLine } from "./budget";

export interface CardData {
  placeName: string;
  region: string;
  people: number;
  total: number;
  lines: BudgetLine[];
  sourceName: string;
  asOf: string;
}

const W = 720;
const H = 1000;

/**
 * 공유 카드를 Canvas로 그려 PNG data URL을 만든다.
 * html2canvas 같은 의존성 없이 표준 Canvas만 쓴다 — 번들 용량과
 * WebView 호환성 양쪽에서 이득이고, 그릴 내용이 고정이라 충분하다.
 */
export function drawShareCard(data: CardData): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (ctx == null) return null;

  const F = "-apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif";

  // 배경 (어두운 남색 — 시안 기준)
  ctx.fillStyle = "#16181D";
  ctx.fillRect(0, 0, W, H);

  // 흰 카드
  const cx = 60, cy = 90, cw = W - 120, ch = H - 250;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, cx, cy, cw, ch, 32);
  ctx.fill();

  const mid = W / 2;
  let y = cy + 78;

  // 상단 라벨
  ctx.textAlign = "center";
  ctx.fillStyle = "#3182F6";
  ctx.font = `600 24px ${F}`;
  ctx.fillText("여름 휴가 예산", mid, y);

  // 여행지 이름
  y += 58;
  ctx.fillStyle = "#191F28";
  ctx.font = `bold 42px ${F}`;
  ctx.fillText(data.placeName, mid, y);

  // 지역 · 인원
  y += 42;
  ctx.fillStyle = "#8B95A1";
  ctx.font = `400 24px ${F}`;
  ctx.fillText(`${data.region} · ${data.people}명`, mid, y);

  // 예상 비용
  y += 76;
  ctx.fillStyle = "#6B7684";
  ctx.font = `500 24px ${F}`;
  ctx.fillText("예상 비용", mid, y);

  y += 74;
  ctx.fillStyle = "#3182F6";
  ctx.font = `bold 68px ${F}`;
  ctx.fillText(`${data.total.toLocaleString("ko-KR")}원`, mid, y);

  // 1인당
  if (data.people > 0 && data.total > 0) {
    y += 44;
    ctx.fillStyle = "#8B95A1";
    ctx.font = `500 24px ${F}`;
    const per = Math.round(data.total / data.people);
    ctx.fillText(`1인당 ${per.toLocaleString("ko-KR")}원`, mid, y);
  }

  // 구분선
  y += 52;
  ctx.strokeStyle = "#F2F4F6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 60, y);
  ctx.lineTo(cx + cw - 60, y);
  ctx.stroke();

  // 품목 (최대 5개)
  y += 46;
  ctx.font = `400 24px ${F}`;
  for (const line of data.lines.slice(0, 5)) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#4E5968";
    ctx.fillText(`${shorten(line.label, 12)} x${line.quantity}`, cx + 60, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#191F28";
    ctx.fillText(`${line.subtotal.toLocaleString("ko-KR")}원`, cx + cw - 60, y);
    y += 40;
  }
  if (data.lines.length > 5) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#B0B8C1";
    ctx.fillText(`외 ${data.lines.length - 5}개`, cx + 60, y);
    y += 40;
  }

  // 출처 (이 앱의 신뢰 근거라 잘리지 않게 두 줄까지 쓴다)
  ctx.textAlign = "center";
  ctx.fillStyle = "#B0B8C1";
  ctx.font = `400 19px ${F}`;
  const srcLines = wrap(ctx, `${data.sourceName} 공시 · ${data.asOf} 기준`, cw - 100, 2);
  let sy = cy + ch - 42 - (srcLines.length - 1) * 26;
  for (const line of srcLines) {
    ctx.fillText(line, mid, sy);
    sy += 26;
  }

  // 하단 앱 이름
  ctx.fillStyle = "#6B7684";
  ctx.font = `600 24px ${F}`;
  ctx.fillText("바가지 타파", mid, H - 92);
  ctx.fillStyle = "#4E5968";
  ctx.font = `400 20px ${F}`;
  ctx.fillText("토스에서 검색해 보세요", mid, H - 56);

  return canvas.toDataURL("image/png");
}

function shorten(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

/** 폭에 맞춰 줄바꿈. maxLines를 넘으면 마지막 줄을 …로 줄인다. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : `${cur} ${w}`;
    if (ctx.measureText(next).width <= maxWidth) {
      cur = next;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    }
  }
  if (cur !== "" && lines.length < maxLines) lines.push(cur);
  // 마지막 줄이 넘치면 글자 단위로 자른다
  const last = lines[lines.length - 1];
  if (last != null && ctx.measureText(last).width > maxWidth) {
    let s = last;
    while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth) s = s.slice(0, -1);
    lines[lines.length - 1] = s + "…";
  }
  return lines;
}

/** data URL을 공유용 File로 바꾼다. 변환할 수 없으면 null. */
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const [head, body] = dataUrl.split(",");
    if (body == null) return null;
    const mime = head.match(/data:([^;]+)/)?.[1] ?? "image/png";
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}

/** data URL을 파일로 내려받는다. */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
