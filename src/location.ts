import { Accuracy, getCurrentLocation } from "@apps-in-toss/web-framework";

import type { Place } from "./types";

export type LocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "ready"; lat: number; lng: number };

/**
 * 현위치를 1회 조회한다. 계속 추적하지 않고, 좌표를 저장하지도 않는다
 * (서버가 없어 어차피 기기 밖으로 나가지 않는다).
 *
 * 거부·미지원은 오류가 아니라 정상 흐름이다. 검색으로도 쓸 수 있으므로
 * 실패해도 앱은 그대로 동작해야 한다.
 */
export async function fetchLocation(): Promise<LocationState> {
  try {
    // 근처 해수욕장을 찾는 용도라 도로 단위 정확도면 충분하다.
    const loc = await getCurrentLocation({ accuracy: Accuracy.Balanced });
    const { latitude, longitude } = loc.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { status: "unavailable" };
    }
    return { status: "ready", lat: latitude, lng: longitude };
  } catch (e) {
    // 권한 거부와 그 외(토스 앱 밖에서 실행 등)를 구분해 안내를 다르게 한다.
    const name = e instanceof Error ? e.name : "";
    const msg = e instanceof Error ? e.message : String(e);
    if (/permission|denied|권한/i.test(name + msg)) return { status: "denied" };
    return { status: "unavailable" };
  }
}

/** 두 지점 사이 거리(km). 근처 정렬용이라 이 정도 정밀도면 충분하다. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface NearbyPlace {
  place: Place;
  distance: number;
}

/**
 * 현위치에서 가까운 여행지를 거리순으로 반환한다.
 * 너무 먼 곳은 "근처"가 아니므로 maxKm으로 자른다.
 */
export function findNearby(
  places: Place[],
  lat: number,
  lng: number,
  limit = 5,
  maxKm = 60,
): NearbyPlace[] {
  return places
    .map((place) => ({ place, distance: distanceKm(lat, lng, place.lat, place.lng) }))
    .filter((n) => n.distance <= maxKm)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

/** 거리 표기. 1km 미만은 m로 보여준다. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
