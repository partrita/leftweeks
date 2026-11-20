# Leftweeks — Your Life in Weeks

인터랙티브 주차별 인생 그래프 웹 애플리케이션입니다. 모든 데이터는 서버 없이 브라우저 로컬에서만 처리됩니다.

- **Live Demo (GitHub Pages):** https://partrita.github.io/leftweeks/
- **Legacy Python CLI:** Git 태그 `v0.1.0-python-cli`에 보존되어 있습니다.

## 주요 기능 / Features

- **인터랙티브 52주 × N년 그래프**: 생년월일 입력 및 기대 수명(50~120세) 실시간 슬라이더 조절
- **정확한 생일 기준 주차 계산**: `Date.UTC` 기반 연도별 52주 행 고정(윤년 및 잔여 일수 보정)
- **인생 이벤트/메모 기록**: 특정 주에 최대 120자 메모와 5가지 색상 태그 기록
- **모바일 대응**: 연도 탭 시 52주를 44px 이상 크기로 확대하는 Year Focus Strip 및 `< 이전/다음 연도 >` 보정 지원
- **로컬 저장 및 안전한 공유**: `localStorage` 자동 저장, URL 해시(`#s=...`) 압축 공유(읽기 전용 미리보기, 메모 포함 토글), JSON 내보내기/가져오기
- **출력물 지원**: 고해상도 PNG 다운로드 및 인쇄용 스타일(`@media print`)
- **이중 언어**: 한국어(`ko`, 만 나이 표기) / 영어(`en`) 전환

## 로컬 개발 / Local Development

```bash
npm install
npm run dev      # 개발 서버 실행
npm test         # Vitest 단위 테스트
npm run build    # 타입 체크 + 프로덕션 빌드
```
