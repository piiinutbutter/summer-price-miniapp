export interface PriceItem {
  label: string;
  price: number;
  /** 과금 단위. "개"·"대"처럼 일행 수와 무관한 단위도 있어 perPerson으로 구분한다. */
  unit: string;
}

export interface PlaceSource {
  name: string;
  url: string;
  /** 출처가 이 가격을 공시·게시한 날짜 (YYYY-MM-DD) */
  asOf: string;
}

export type PlaceType = "beach" | "festival" | "valley";

export const TYPE_LABEL: Record<PlaceType, string> = {
  beach: "해수욕장",
  festival: "축제",
  valley: "계곡",
};

export interface Place {
  id: string;
  name: string;
  region: string;
  type: PlaceType;
  lat: number;
  lng: number;
  /** 공식 공시로 확인된 가격만 담는다. 확인 실패 시 빈 배열. */
  items: PriceItem[];
  source: PlaceSource;
  note: string;
  /** 공식 공시 가격을 하나라도 확인했는지 */
  verified: boolean;
  /** TourAPI 대표 사진 (없을 수 있음). 공공누리 조건상 출처 표시 필요 */
  image?: string;
  /** 공공누리 유형 (Type1=변형 가능, Type3=변형 금지). 우리는 원본 그대로만 쓴다 */
  imageCopyright?: string;
  /**
   * 착한가격업소를 찾을 시군구 키. 실제 목록은 shops.json에 시군구별로 한 벌만 둔다
   * (제주시를 공유하는 여행지가 9곳이라 여행지마다 복사하면 용량이 3배가 된다).
   * "근처"가 아니라 "같은 행정구역"이라는 뜻이다 — 데이터에 좌표가 없다.
   */
  shopArea?: string;
}

export interface GoodPriceShop {
  name: string;
  /** 한식·중식 등 업종 */
  type: string;
  menus: { name: string; price: number }[];
}
