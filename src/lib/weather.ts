import "server-only";

export interface WeatherInfo {
  tempC: number;
  /** WMO 날씨 코드. https://open-meteo.com/en/docs 참고. */
  code: number;
}

// 한양대학교병원(서울)이 있는 위치.
const SEOUL_LAT = 37.5665;
const SEOUL_LON = 126.978;

/**
 * 서울 현재 날씨를 가져온다. API 키가 필요 없는 Open-Meteo를 쓴다.
 * 실패해도 화면 전체가 죽으면 안 되므로 null을 돌려주고 조용히 넘어간다.
 */
export async function getSeoulWeather(): Promise<WeatherInfo | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${SEOUL_LAT}&longitude=${SEOUL_LON}&current=temperature_2m,weather_code&timezone=Asia%2FSeoul`;
    // 매 요청마다 외부 API를 부르지 않도록 10분 동안 캐시한다.
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const tempC = data?.current?.temperature_2m;
    const code = data?.current?.weather_code;
    if (typeof tempC !== "number" || typeof code !== "number") return null;

    return { tempC, code };
  } catch (error) {
    console.error("날씨 조회 실패:", error);
    return null;
  }
}
