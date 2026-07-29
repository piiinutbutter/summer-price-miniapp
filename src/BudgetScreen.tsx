import { useMemo, useState } from "react";
import { Badge } from "@toss/tds-mobile";

import type { Place } from "./types";
import { calculateBudget, defaultQuantity, formatWon } from "./budget";
import { buildShareText, shareOrCopy } from "./share";
import { drawShareCard, downloadDataUrl, dataUrlToFile } from "./shareCard";

interface Props {
  place: Place;
  onBack: () => void;
}

export default function BudgetScreen({ place, onBack }: Props) {
  const [people, setPeople] = useState(4);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [cardMsg, setCardMsg] = useState("");

  const paidItems = useMemo(() => place.items.filter((i) => i.price > 0), [place.items]);

  const quantities = useMemo(() => {
    const q: Record<string, number> = {};
    for (const item of paidItems) {
      q[item.label] = overrides[item.label] ?? defaultQuantity(item, people);
    }
    return q;
  }, [paidItems, people, overrides]);

  const { lines, total } = useMemo(
    () => calculateBudget(paidItems, quantities),
    [paidItems, quantities],
  );

  const perPerson = people > 0 ? Math.round(total / people) : 0;

  function toggle(label: string) {
    const item = paidItems.find((i) => i.label === label);
    if (item == null) return;
    const now = quantities[label];
    // 체크 해제는 0, 다시 체크하면 인원수 기준 기본값으로 되돌린다
    setOverrides((prev) => ({
      ...prev,
      [label]: now > 0 ? 0 : defaultQuantity(item, people),
    }));
    setCopied(false);
  }

  function setQuantity(label: string, next: number) {
    setOverrides((prev) => ({ ...prev, [label]: Math.max(0, next) }));
    setCopied(false);
  }

  function changePeople(next: number) {
    setPeople(Math.min(20, Math.max(1, next)));
    setOverrides({});
    setCopied(false);
  }

  async function onShare() {
    const text = buildShareText({
      placeName: place.name,
      people,
      total,
      lines,
      sourceName: place.source.name,
      asOf: place.source.asOf,
      allFree: false,
    });

    // 공유 카드 이미지를 함께 보낸다. 카드를 못 만들어도 텍스트 공유는 진행한다.
    const url = drawShareCard(cardData());
    const file = url != null ? dataUrlToFile(url, `${place.name}_예산.png`) : null;

    const result = await shareOrCopy(text, file ?? undefined);
    setCopied(result === "copied");
    // 네이티브 공유가 열렸으면 안내가 필요 없다 (공유 시트가 이미 결과를 보여준다)
    setCardMsg(
      result === "shared"
        ? ""
        : result === "copied"
          ? "복사했어요. 카카오톡 등에 붙여넣기 해주세요."
          : "공유할 수 없어요. '카드 저장'을 눌러 이미지로 받아보세요.",
    );
  }

  function cardData() {
    return {
      placeName: place.name,
      region: place.region,
      people,
      total,
      lines,
      sourceName: place.source.name,
      asOf: place.source.asOf,
    };
  }

  function onSaveCard() {
    const url = drawShareCard(cardData());
    if (url == null) {
      setCardMsg("카드를 만들 수 없어요.");
      return;
    }
    downloadDataUrl(url, `${place.name}_예산.png`);
    setCardMsg("카드를 저장했어요.");
  }

  return (
    <div className="page page--budget">
      <div className="budget-nav">
        <button type="button" className="back" onClick={onBack}>
          ← 뒤로
        </button>
        <span className="budget-nav-title">예산 계산기</span>
        <span className="budget-nav-space" />
      </div>

      <div className="budget-place">
        <Badge size="small" variant="weak" color="blue">
          {place.name}
        </Badge>
      </div>

      <div className="budget-section">
        <p className="budget-label">일행 수</p>
        <div className="people-row people-row--plain">
          <div className="stepper">
            <button type="button" onClick={() => changePeople(people - 1)} aria-label="인원 감소">
              −
            </button>
            <span className="stepper-value">{people}명</span>
            <button type="button" onClick={() => changePeople(people + 1)} aria-label="인원 증가">
              +
            </button>
          </div>
        </div>
      </div>

      <div className="budget-section">
        <p className="budget-label">사용 항목 선택</p>
        <ul className="pick-list">
          {paidItems.map((item) => {
            const qty = quantities[item.label];
            const on = qty > 0;
            return (
              <li key={item.label} className={`pick ${on ? "pick--on" : ""}`}>
                <button
                  type="button"
                  className="pick-check"
                  onClick={() => toggle(item.label)}
                  aria-label={`${item.label} ${on ? "빼기" : "담기"}`}
                >
                  <span className={`box ${on ? "box--on" : ""}`}>{on ? "✓" : ""}</span>
                  <span className="pick-name">{item.label}</span>
                </button>
                <div className="pick-right">
                  {on && (
                    <div className="stepper stepper--small">
                      <button
                        type="button"
                        onClick={() => setQuantity(item.label, qty - 1)}
                        aria-label={`${item.label} 수량 감소`}
                      >
                        −
                      </button>
                      <span className="stepper-value">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item.label, qty + 1)}
                        aria-label={`${item.label} 수량 증가`}
                      >
                        +
                      </button>
                    </div>
                  )}
                  <span className="pick-price">
                    {on ? formatWon(item.price * qty) : formatWon(item.price)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="budget-total">
        <div className="budget-total-row">
          <span>예상 총 비용</span>
          <strong>{formatWon(total)}</strong>
        </div>
        {total > 0 && (
          <p className="budget-per">1인당 {formatWon(perPerson)}</p>
        )}
      </div>

      <p className="budget-source">
        {place.source.name} 공시 기준 ({place.source.asOf})
      </p>

      {cardMsg !== "" && <p className="budget-msg">{cardMsg}</p>}

      <div className="budget-cta">
        <button type="button" className="btn btn--ghost" onClick={onShare}>
          {copied ? "복사됨" : "공유하기"}
        </button>
        <button type="button" className="btn btn--fill" onClick={onSaveCard}>
          카드 저장
        </button>
      </div>
    </div>
  );
}
