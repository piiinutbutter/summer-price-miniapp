import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  // 콘솔 등록값과 반드시 일치해야 한다 (miniAppId 58539). 하이픈 없음에 주의.
  appName: "summerprice",
  brand: {
    displayName: "바가지 타파",
    primaryColor: "#3182F6",
    // 콘솔에 등록한 앱 로고 (다크모드용은 콘솔에서 별도 관리한다)
    icon: "https://static.toss.im/appsintoss/64101/4381e0ac-6fbe-47bd-819b-191e724532aa.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [
    // 예산 공유 카드를 클립보드에 복사하기 위해 필요
    { name: "clipboard", access: "write" },
    // "내 주변에서 찾기" — 버튼을 누른 순간에만 1회 조회하고 저장하지 않는다
    { name: "geolocation", access: "access" },
  ],
  outdir: "dist",
});
