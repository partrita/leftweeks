# Consolidated Design Review Report: `docs/designs/leftweeks_interactive_spa.md`

* **Target Document:** `docs/designs/leftweeks_interactive_spa.md`
* **Semantic Split:** `FeatureRange: 1..133`, `DetailedRange: 134..191`
* **Review Stages Executed:** Stage 5 (Zoom Out + Inventive Catalyst), Stage 6 (Comprehension), Stage 7 (Design + Structural/Style), Stage 9 (Implementation Readiness + Codebase Details)

---

## Comprehension Paraphrase (Stage 6)

### What this proposes
This document proposes replacing the existing Python CLI tool with a client-only interactive SPA (`Vite + TypeScript + React + Tailwind CSS`) deployed to GitHub Pages via GitHub Actions. Users can immediately interact with a sample life-in-weeks grid, enter their birth date, adjust life expectancy (50–120 years) in real time on an HTML5 `<canvas>`, inspect exact date ranges and ages per week (hover/click on desktop, "Year Focus Strip" bottom sheet on mobile), and attach short color-tagged notes (up to 120 chars). All data stays local (`localStorage`, compressed URL hash `#s=...`, JSON export/import), alongside PNG export, print styling, and `ko`/`en` localization. Before removing Python files, the last CLI commit is tagged `v0.1.0-python-cli`.

### How the existing system works, per this document
Currently, `leftweeks` is a Python 3.12 CLI (`src/leftweeks/`, `click`, `matplotlib`, `uv`) that takes a birth date in the terminal and outputs a static 90×52 PDF (`lifeweeks.pdf`). It approximates lived weeks via `round((days_lived / 365.25) * 52)`, which drifts at older ages, and lacks interactivity, note-taking, and link/file sharing.

---

## Consolidated Action Items (Deduplicated by Priority)

### 🔴 Blockers

1. **B1. URL 해시(`#s=...`) 진입 시 기존 `localStorage` 덮어쓰기 방지**
   - **Sources:** `design` #1 (Blocker), `comprehension` #1 (Major), `inventive-catalyst` #1 (Major), `implementation-readiness` #1 (Major)
   - **Problem:** 초기화 순서가 `URL Hash → localStorage → Sample`이고 모든 변경이 `localStorage`에 자동 저장되면, 이미 자신의 데이터를 저장해 둔 사용자가 남의 공유 링크를 여는 순간 개인 데이터가 덮어쓰이거나 손실될 수 있다.
   - **Action:** `#s=...`로 진입한 상태는 `viewMode: "shared"`(읽기 전용 미리보기)로 분리하고 `localStorage`에 자동 저장하지 않는다. 상단 배너에 **"내 차트로 저장(덮어쓰기)"** 및 **"내 차트로 돌아가기"** 액션을 명시한다. (`localStorage` 키 이름 예: `leftweeks:v1`도 명시)

---

### 🟡 Majors

2. **M1. 날짜 파싱 및 타임존/DST 오차 방지 (`lifeCalendar.ts`)**
   - **Sources:** `design` #2 (Major), `implementation-readiness` #2 (Major)
   - **Problem:** JS에서 `new Date("YYYY-MM-DD")`는 UTC 자정으로 파싱되어 음수 UTC 오프셋(미주 등)에서 하루 전으로 밀리며, 밀리초 기반 `+ 7일` 연산은 DST 전환 시 어긋난다.
   - **Action:** 모든 달력 계산을 `Date.UTC(y, m - 1, d)` 기반으로 수행하고, 로컬 `today`도 `Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())`로 정규화하며, `Intl.DateTimeFormat`에 `timeZone: "UTC"`를 지정한다. `week 51` 종료일은 고정 8/9일이 아니라 `nextRowStart - 1일`로 계산한다.

3. **M2. `package.json` 누락 개발 의존성 및 `deploy.yml` 필수 설정 보완**
   - **Sources:** `codebase-details` #1, #2 (Major), `implementation-readiness` #4, #5 (Nit)
   - **Problem:**
     - `package.json`에 `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`이 누락되어 React 빌드 및 `strict: true` 타입 체크가 실패한다.
     - `.github/workflows/deploy.yml`에서 `npm ci`를 쓰려면 `package-lock.json` 커밋이 필요하며, `actions/deploy-pages` 실행에 필수인 `permissions` (`contents: read`, `pages: write`, `id-token: write`), `environment: github-pages`, `concurrency` 설정이 빠져 있다.
   - **Action:** 누락된 3개 devDependencies와 `package-lock.json` 생성·커밋을 추가하고, `deploy.yml`에 `permissions`, `environment`, `concurrency`를 명시한다.

4. **M3. 데스크톱 vs 모바일 인터랙션 분기 기준 및 6px 행 오탭 보정**
   - **Sources:** `design` #3, #4 (Major), `implementation-readiness` #3 (Major), `comprehension` #2 (Nit)
   - **Problem:** 데스크톱 클릭과 모바일 탭의 분기 기준이 없어 태블릿·터치 노트북에서 동작이 모호하다. 또한 375px 모바일 화면에서 1개 연도 행 높이가 ~6px이므로 원하는 연도를 정확히 탭하기 어렵다.
   - **Action:** `PointerEvent.pointerType === "touch"`(또는 `(pointer: coarse)` + 뷰포트 폭) 기준으로 분기를 명시하고, `LifeGridCanvas` 히트 테스트에 축 여백(`gridOffsetX/Y`) 및 셀 간격(gutter) 데드존 처리를 정의한다. `MobileYearSheet` 헤더에 이전/다음 연도 이동 버튼(`< 만 29세 >`)을 추가해 오탭을 즉시 보정할 수 있게 한다.

5. **M4. 기대 수명 슬라이더 드래그 시 `localStorage` 동기 저장 분리 및 범위 외 메모 보존**
   - **Sources:** `inventive-catalyst` #2 (Major), `design` #6 (Major)
   - **Problem:** 슬라이더를 60fps로 드래그할 때마다 `localStorage.setItem(JSON.stringify(...))`을 동기 호출하면 프레임 드롭이 발생한다. 또한 기대 수명을 100 → 80으로 줄일 때 `year >= 80` 메모의 처리(삭제 vs 숨김)가 불명확하다.
   - **Action:** 슬라이더 드래그 중에는 메모리 상태로만 캔버스를 갱신하고 `localStorage` 저장은 디바운스(예: 250ms) 또는 `pointerup` 시점으로 분리한다. `lifeExpectancy` 축소 시 범위 외 메모는 삭제하지 않고 상태에 유지(렌더링만 제외)한다.

6. **M5. `<canvas>` 키보드 접근성 및 ARIA 전략 추가**
   - **Sources:** `design` #5 (Major), `inventive-catalyst` #3 (Nit)
   - **Problem:** 단일 `<canvas>`는 기본 키보드 포커스와 스크린 리더 탐색을 지원하지 않는다.
   - **Action:** `<canvas tabIndex={0}>`에 방향키(`Arrow*`) 가상 커서와 `Enter`(메모 편집 열기)를 추가하고, 단일 `aria-live="polite"` 영역으로 현재 포커스된 주의 날짜·나이·메모를 안내한다.

7. **M6. v1 범위 단순화 검토 (Zoom Out 권고)**
   - **Sources:** `zoom-out` #1, #2, #3 (Major)
   - **Problem:** 5가지 영속화/내보내기 경로(`localStorage`, `lz-string` URL 해시, JSON 파일, 오프스크린 PNG, `@media print`)와 이중 인터랙션 아키텍처는 v1 기준 과설계 여지가 있다.
   - **Action:** 작성자 판단 사항 — 모든 요구사항을 v1에 유지할지, 아니면 `exportPng.ts`를 단순 `canvas.toDataURL()`로 축소하거나 URL 해시 메모 포함을 v2로 미룰지 결정한다.

---

### 🟢 Nits

8. **N1. `build` 스크립트 타입 체크 및 미사용 테스트 의존성 정리** (`codebase-details` #3, `zoom-out` #4)
   - `build` 스크립트를 `tsc --noEmit && vite build`로 명시하고 `vite.config.ts`에서 `vitest/config`의 `defineConfig`를 사용한다. 컴포넌트 테스트 계획이 없다면 `@testing-library/react`, `jsdom`을 제거한다.
9. **N2. 경계 상태 및 보조 UI 명시** (`comprehension` #3, #4, `structural` #4, `implementation-readiness` #5)
   - 미래 생년월일(전체 `remaining`) 및 기대 수명 초과 나이(전체 `lived`, `current` 없음)의 셀 상태, `buildLifeSummary` 반환 필드, 인쇄용 이벤트 목록/요약 통계 컴포넌트 위치를 명시한다.
10. **N3. 비신뢰 입력 방어 및 `localStorage` 예외 처리** (`design` #7)
    - URL 해시와 `localStorage` 로드 시에도 JSON 가져오기와 동일한 스키마 검증(프로토타입 키 차단 포함)을 적용하고, `localStorage` 호출을 `try/catch`로 감싼다.
11. **N4. 문서 스타일 통일** (`structural` #1, #2, #3)
    - 목록 마커(`-`), `Technical Plan` 하위 `H3` 번호 매김, `Alternatives Considered`의 `Rejected by author:` 표기를 일관되게 정리한다.

---

## Traceability Matrix

| Consolidated ID | Priority | Raw Reviewer Findings |
| :--- | :--- | :--- |
| **B1** | 🔴 Blocker | `design` #1, `comprehension` #1, `inventive-catalyst` #1, `implementation-readiness` #1 |
| **M1** | 🟡 Major | `design` #2, `implementation-readiness` #2 |
| **M2** | 🟡 Major | `codebase-details` #1, #2, `implementation-readiness` #4, #5 |
| **M3** | 🟡 Major | `design` #3, #4, `implementation-readiness` #3, `comprehension` #2 |
| **M4** | 🟡 Major | `inventive-catalyst` #2, `design` #6 |
| **M5** | 🟡 Major | `design` #5, `inventive-catalyst` #3 |
| **M6** | 🟡 Major | `zoom-out` #1, #2, #3 |
| **N1** | 🟢 Nit | `codebase-details` #3, `zoom-out` #4 |
| **N2** | 🟢 Nit | `comprehension` #3, #4, `structural` #4, `implementation-readiness` #5 |
| **N3** | 🟢 Nit | `design` #7 |
| **N4** | 🟢 Nit | `structural` #1, #2, #3 |
