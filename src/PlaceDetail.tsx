import { useState } from "react";
import { Badge, FixedBottomCTA, Top } from "@toss/tds-mobile";

import shopsByArea from "./data/shops.json";
import { TYPE_LABEL, type GoodPriceShop, type Place } from "./types";

/** 처음에 보여줄 업소 수. 나머지는 '더 보기'로 펼친다. */
const SHOP_PREVIEW = 5;
import { formatWon, priceHint, checkAgainstOfficial } from "./budget";
import { buildShareText, shareOrCopy } from "./share";

interface Props {
  place: Place;
  onBack: () => void;
  /** 예산 계산기 화면으로 이동 */
  onCalculate: () => void;
  /** 가격 없는 곳에서 대신 보여줄 후보. 같은 지역 우선, 없으면 가까운 순. */
  alternatives?: Place[];
  onSelect?: (p: Place) => void;
}

export default function PlaceDetail({
  place,
  onBack,
  onCalculate,
  alternatives = [],
  onSelect,
}: Props) {
  const [copied, setCopied] = useState(false);
  // 현장 가격 확인: 어떤 품목을, 얼마에 받았는지
  const [checkLabel, setCheckLabel] = useState("");
  const [checkPrice, setCheckPrice] = useState("");
  const [showAllShops, setShowAllShops] = useState(false);

  const shops: GoodPriceShop[] =
    place.shopArea != null ? (shopsByArea as Record<string, GoodPriceShop[]>)[place.shopArea] ?? [] : [];
  const shownShops = showAllShops ? shops : shops.slice(0, SHOP_PREVIEW);

  // 지자체가 전 품목을 무료 제공하는 곳(진하·선유도 등)은 계산기가 의미 없다.
  const allFree = place.items.length > 0 && place.items.every((i) => i.price === 0);

  // 무료 여행지 전용 공유 (유료는 예산 계산기 화면에서 공유한다)
  async function onShare() {
    const result = await shareOrCopy(
      buildShareText({
        placeName: place.name,
        people: 1,
        total: 0,
        lines: place.items.map((i) => ({ ...i, quantity: 1, subtotal: 0 })),
        sourceName: place.source.name,
        asOf: place.source.asOf,
        allFree: true,
      }),
    );
    setCopied(result === "copied");
  }

  // 현장 가격 확인 — 공시가가 있는 유료 품목만 비교 대상
  const checkable = place.items.filter((i) => i.price > 0);
  const checkedItem = checkable.find((i) => i.label === checkLabel) ?? checkable[0];
  const checkNumber = Number(checkPrice.replace(/[^0-9]/g, ""));
  const priceCheck =
    checkedItem != null && checkPrice !== "" && checkNumber > 0
      ? checkAgainstOfficial(checkedItem.price, checkNumber)
      : null;

  return (
    <div className="page page--detail">
      <div className="detail-nav">
        <button type="button" className="back" onClick={onBack}>
          ← 목록
        </button>
      </div>

      {place.image != null && (
        <div className="hero">
          <img src={place.image} alt={place.name} />
          <span className="hero-credit">사진: 한국관광공사</span>
        </div>
      )}

      <Top
        title={<Top.TitleParagraph size={22}>{place.name}</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            {place.region} · {TYPE_LABEL[place.type]}
          </Top.SubtitleParagraph>
        }
      />

      {place.items.length === 0 ? (
        <>
          <div className="card card--info">
            <p className="card-title">공식 공시 가격이 없는 곳이에요</p>
            <p className="card-main">
              {place.note ||
                "이 여행지는 아직 공식적으로 공개된 이용 요금이 없어요. 확인되지 않은 가격은 싣지 않습니다."}
            </p>
          </div>

          {alternatives.length > 0 && (
            <div className="alts">
              <p className="alts-title">가격을 확인할 수 있는 근처 여행지</p>
              <ul className="list">
                {alternatives.map((alt) => (
                  <li key={alt.id}>
                    <button
                      type="button"
                      className="card-row"
                      onClick={() => onSelect?.(alt)}
                    >
                      {alt.image != null ? (
                        <img className="card-thumb" src={alt.image} alt="" loading="lazy" />
                      ) : (
                        <span className="card-thumb card-thumb--empty" aria-hidden="true" />
                      )}
                      <span className="card-main">
                        <span className="card-top">
                          <span className="card-name">{alt.name}</span>
                          <Badge size="xsmall" variant="weak" color="blue">
                            공시가
                          </Badge>
                        </span>
                        <span className="card-region">
                          {alt.region} · {TYPE_LABEL[alt.type]}
                        </span>
                        <span className="card-price">{priceHint(alt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 상세는 '읽는 화면'이다. 수량 조절은 예산 계산기로 넘긴다. */}
          <div className="rate-head">
            <Badge size="small" variant="weak" color="blue">
              공시
            </Badge>
            <span className="rate-title">
              표준가격 ({place.source.asOf.slice(0, 4)}년 기준)
            </span>
          </div>

          <ul className="rates">
            {place.items.map((item) => (
              <li key={item.label} className="rate">
                <span className="rate-label">{item.label}</span>
                <span className="rate-price">
                  {item.price === 0 ? "무료" : formatWon(item.price)}
                </span>
              </li>
            ))}
          </ul>

          {checkable.length > 0 && (
            <div className="check-card">
              <p className="card-title">현장 가격이 공시가와 다른가요?</p>
              <p className="card-body">
                지금 받는 금액을 넣으면 공식 공시가와 비교해 드려요.
              </p>

              <div className="check-row">
                <select
                  className="check-select"
                  value={checkedItem?.label ?? ""}
                  onChange={(e) => setCheckLabel(e.target.value)}
                  aria-label="품목 선택"
                >
                  {checkable.map((i) => (
                    <option key={i.label} value={i.label}>
                      {i.label}
                    </option>
                  ))}
                </select>
                <input
                  className="check-input"
                  inputMode="numeric"
                  placeholder="현장 금액"
                  value={checkPrice}
                  onChange={(e) => setCheckPrice(e.target.value)}
                />
              </div>

              {checkedItem != null && (
                <p className="check-official">
                  공시가 {formatWon(checkedItem.price)} / {checkedItem.unit}
                </p>
              )}

              {priceCheck != null && checkedItem != null && (
                <div className={`check-result check-result--${priceCheck.verdict}`}>
                  {priceCheck.verdict === "same" && <p>공시가와 같아요.</p>}
                  {priceCheck.verdict === "cheaper" && (
                    <p>공시가보다 {formatWon(priceCheck.gap)} 저렴해요.</p>
                  )}
                  {priceCheck.verdict === "higher" && (
                    <>
                      <p className="check-headline">
                        공시가보다 {formatWon(priceCheck.gap)} 비싸요
                        {priceCheck.percent != null && ` (${priceCheck.percent}% 높음)`}
                      </p>
                      <p className="check-guide">
                        현장에 게시된 가격표를 먼저 확인해 보세요. 공시가와 다르면
                        지자체나 관광불편신고센터에 문의할 수 있어요.
                      </p>
                      <a className="check-call" href="tel:1330">
                        관광불편신고 1330 전화하기
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="source">
            <Badge size="small" variant="weak" color="blue">
              공식 공시
            </Badge>
            <p className="source-text">
              {place.source.name} · 기준일 {place.source.asOf}
            </p>
            {place.source.url !== "" && (
              <a
                className="source-link"
                href={place.source.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                출처 확인하기
              </a>
            )}
          </div>

          {place.note !== "" && <p className="note">{place.note}</p>}

        </>
      )}

      {/* 밥값은 공시 요금 유무와 상관없이 모든 여행지에 보여준다.
          가격 정보가 없는 곳에서도 최소한의 물가 정보가 남게 하는 장치다. */}
      {shops.length > 0 && (
        <div className="shops">
          <p className="shops-title">
            {place.shopArea} 착한가격업소 <span className="shops-count">{shops.length}곳</span>
          </p>
          <p className="shops-sub">
            지자체가 저렴한 가격으로 지정한 식당이에요. 같은 시군구 기준이라 거리는
            제각각일 수 있어요.
          </p>
          <ul className="shop-list">
            {shownShops.map((shop) => (
              <li key={shop.name} className="shop">
                <div className="shop-head">
                  <span className="shop-name">{shop.name}</span>
                  <Badge size="xsmall" variant="weak" color="green">
                    {shop.type}
                  </Badge>
                </div>
                <div className="shop-menus">
                  {shop.menus.slice(0, 3).map((m) => (
                    <span key={m.name} className="shop-menu">
                      {m.name} <strong>{m.price.toLocaleString("ko-KR")}원</strong>
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          {shops.length > SHOP_PREVIEW && (
            <button
              type="button"
              className="shops-more"
              onClick={() => setShowAllShops((v) => !v)}
            >
              {showAllShops
                ? "접기"
                : `${shops.length - SHOP_PREVIEW}곳 더 보기`}
            </button>
          )}
          <p className="shops-source">행정안전부 착한가격업소 · 2026-06-30 기준</p>
        </div>
      )}

      <div className="cta-space" />

      {place.items.length > 0 &&
        (allFree ? (
          <FixedBottomCTA onClick={onShare}>
            {copied ? "복사됐어요! 친구에게 붙여넣기" : "무료 정보 공유하기"}
          </FixedBottomCTA>
        ) : (
          <FixedBottomCTA onClick={onCalculate}>예산 계산하기</FixedBottomCTA>
        ))}
    </div>
  );
}
