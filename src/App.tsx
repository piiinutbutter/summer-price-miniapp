import { Fragment, useMemo, useState } from "react";
import { Badge, SearchField, Top } from "@toss/tds-mobile";

import placesData from "./data/places.json";
import { priceHint } from "./budget";
import { fetchLocation, findNearby, formatDistance, type LocationState } from "./location";
import { TYPE_LABEL, type Place } from "./types";
import PlaceDetail from "./PlaceDetail";
import BudgetScreen from "./BudgetScreen";
import "./App.css";

const places = placesData as Place[];

/** 좌표 거리(km). 근처 여행지 추천에만 쓰므로 정밀도는 충분하다. */
function distanceKm(a: Place, b: Place): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 가격 정보가 없는 여행지에서 화면이 비지 않도록, 가격을 확인할 수 있는 곳을 추천한다.
 * 같은 지역을 먼저 보여주고, 그 다음 가까운 순으로 최대 3곳.
 */
function nearbyWithPrice(place: Place): Place[] {
  return places
    .filter((p) => p.id !== place.id && p.items.length > 0)
    .map((p) => ({ p, sameRegion: p.region === place.region, dist: distanceKm(place, p) }))
    .sort((x, y) => {
      if (x.sameRegion !== y.sameRegion) return x.sameRegion ? -1 : 1;
      return x.dist - y.dist;
    })
    .slice(0, 3)
    .map((x) => x.p);
}

type Filter = "all" | Place["type"];

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "beach", label: "해수욕장" },
  { key: "festival", label: "축제" },
  { key: "valley", label: "계곡" },
];

function App() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Place | null>(null);
  const [budgetFor, setBudgetFor] = useState<Place | null>(null);
  const [loc, setLoc] = useState<LocationState>({ status: "idle" });

  async function onFindNearby() {
    if (loc.status === "ready") {
      setLoc({ status: "idle" }); // 다시 누르면 해제
      return;
    }
    setLoc({ status: "loading" });
    setLoc(await fetchLocation());
  }

  const nearby = useMemo(
    () => (loc.status === "ready" ? findNearby(places, loc.lat, loc.lng) : []),
    [loc],
  );

  const results = useMemo(() => {
    const q = query.trim();
    const matched = places.filter((p) => {
      if (filter !== "all" && p.type !== filter) return false;
      if (q === "") return true;
      return p.name.includes(q) || p.region.includes(q);
    });
    // 공시 가격이 있는 곳을 위로. 같은 등급이면 지역 가나다순.
    return matched.sort((a, b) => {
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return a.region.localeCompare(b.region, "ko");
    });
  }, [query, filter]);

  if (budgetFor != null) {
    return <BudgetScreen place={budgetFor} onBack={() => setBudgetFor(null)} />;
  }

  if (selected != null) {
    return (
      <PlaceDetail
        place={selected}
        onBack={() => setSelected(null)}
        onCalculate={() => setBudgetFor(selected)}
        alternatives={selected.items.length === 0 ? nearbyWithPrice(selected) : []}
        onSelect={setSelected}
      />
    );
  }

  const verifiedCount = places.filter((p) => p.verified).length;

  return (
    <div className="page">
      <Top
        title={<Top.TitleParagraph size={22}>어디로 가세요?</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={15}>
            가기 전 30초, 공식 공시 가격으로 예산을 확인하세요
          </Top.SubtitleParagraph>
        }
      />

      <div className="search-area">
        <SearchField
          placeholder="해운대, 제주, 강원…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onDeleteClick={() => setQuery("")}
        />
      </div>

      <div className="near-area">
        <button
          type="button"
          className={`near-btn ${loc.status === "ready" ? "near-btn--on" : ""}`}
          onClick={onFindNearby}
          disabled={loc.status === "loading"}
        >
          {loc.status === "loading"
            ? "위치 확인 중…"
            : loc.status === "ready"
              ? "내 주변 끄기"
              : "내 주변에서 찾기"}
        </button>

        {loc.status === "denied" && (
          <p className="near-msg">
            위치 권한이 꺼져 있어요. 검색으로 찾아보시거나, 토스 설정에서 위치 권한을
            켜주세요.
          </p>
        )}
        {loc.status === "unavailable" && (
          <p className="near-msg">
            지금은 위치를 확인할 수 없어요. 아래에서 지역 이름으로 검색해 보세요.
          </p>
        )}
        {loc.status === "ready" && nearby.length === 0 && (
          <p className="near-msg">
            60km 안에 등록된 여행지가 없어요. 검색으로 찾아보세요.
          </p>
        )}
      </div>

      {nearby.length > 0 && (
        <div className="near-list">
          <p className="near-title">지금 계신 곳에서 가까운 순</p>
          <ul className="list">
            {nearby.map(({ place, distance }) => (
              <li key={place.id}>
                <button type="button" className="card-row" onClick={() => setSelected(place)}>
                  {place.image != null ? (
                    <img className="card-thumb" src={place.image} alt="" loading="lazy" />
                  ) : (
                    <span className="card-thumb card-thumb--empty" aria-hidden="true" />
                  )}
                  <span className="card-main">
                    <span className="card-top">
                      <span className="card-name">{place.name}</span>
                      <Badge size="xsmall" variant="weak" color="teal">
                        {formatDistance(distance)}
                      </Badge>
                    </span>
                    <span className="card-region">
                      {place.region} · {TYPE_LABEL[place.type]}
                    </span>
                    <span className={`card-price ${place.verified ? "" : "card-price--none"}`}>
                      {priceHint(place)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip ${filter === f.key ? "chip--on" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="hint">
        공식 공시 가격 {verifiedCount}곳 · 전체 {places.length}곳
      </p>

      <div className="list-area">
      {results.length === 0 ? (
        <p className="empty">
          검색 결과가 없어요.
          <br />
          다른 이름이나 지역으로 찾아보세요.
        </p>
      ) : (
        <ul className="list">
          {results.map((place, i) => (
            <Fragment key={place.id}>
              {/* 공시가 그룹과 정보만 그룹의 경계에 안내를 넣는다 */}
              {i > 0 && results[i - 1].verified && !place.verified && (
                <li className="group-divider">
                  아래는 공식 공시를 찾지 못한 곳이에요 · {results.length - i}곳
                </li>
              )}
            <li>
              <button type="button" className="card-row" onClick={() => setSelected(place)}>
                {place.image != null ? (
                  <img className="card-thumb" src={place.image} alt="" loading="lazy" />
                ) : (
                  <span className="card-thumb card-thumb--empty" aria-hidden="true" />
                )}
                <span className="card-main">
                  <span className="card-top">
                    <span className="card-name">{place.name}</span>
                    {place.verified ? (
                      <Badge size="xsmall" variant="weak" color="blue">
                        공시가
                      </Badge>
                    ) : (
                      <Badge size="xsmall" variant="weak" color="elephant">
                        정보
                      </Badge>
                    )}
                  </span>
                  <span className="card-region">
                    {place.region} · {TYPE_LABEL[place.type]}
                  </span>
                  <span className={`card-price ${place.verified ? "" : "card-price--none"}`}>
                    {priceHint(place)}
                  </span>
                </span>
              </button>
            </li>
            </Fragment>
          ))}
        </ul>
      )}
      </div>

      <p className="footer-note">
        지자체·주최 측이 공식 공시한 가격만 싣습니다. 현장 사정에 따라 달라질 수 있어요.
      </p>
    </div>
  );
}

export default App;
