# react2

직접 구현한 React 스타일 런타임으로 `Component`, `State`, `Hooks`, `Virtual DOM + Diff + Patch`를 보여주는 실습 프로젝트입니다.

## 핵심 목표

- 함수형 컴포넌트 기반 UI 구성
- 루트 컴포넌트에서만 상태 관리
- `useState`, `useMemo`, `useEffect` 직접 구현
- Virtual DOM 생성 후 이전 트리와 diff
- 바뀐 부분만 실제 DOM에 patch

## 주요 모듈

- `src/lib/runtime.js`
  - `FunctionComponent`, `h`, `useState`, `useMemo`, `useEffect`
  - 루트 hooks 저장소와 microtask 기반 업데이트 처리
- `src/lib/vdom.js`
  - Virtual DOM 생성, diff, patch
- `src/demo`
  - 메인 Tic-Tac-Toe 데모와 hooks 시각화 패널
- `src/tic-tac-toe/model.js`
  - 게임 상태 전이, 승패 계산, 점수 계산

## 설치

```bash
npm install
```

## 실행

```bash
npm run dev
```

개발 서버 실행 후 기본 페이지 `/`에서 메인 데모를 확인할 수 있습니다.

## 사용 가능한 기능

- Tic-Tac-Toe 보드 플레이
- 루트 `hooks[]` 시각화 패널
- `useState`, `useMemo`, `useEffect` 슬롯별 값 확인
- 루트 상태 기반 렌더링 구조 확인

## 현재 구조 요약

- 모든 hooks는 루트 `FunctionComponent`의 `hooks[]` 배열에 저장됩니다.
- 자식 컴포넌트는 state 없이 props만 받는 순수 함수형 컴포넌트입니다.
- `setState`는 updater를 queue에 넣고 rerender를 예약합니다.
- `useMemo`는 dependency가 바뀔 때만 다시 계산됩니다.
- `useEffect`는 DOM patch 이후 실행되며, 필요하면 cleanup을 수행합니다.

## 테스트

```bash
npm run test
```

검증 범위:

- 루트 state 업데이트와 DOM 반영
- batching 동작
- `useMemo` 재계산 조건
- `useEffect` 실행 및 cleanup 순서
- 자식 컴포넌트에서 hooks 사용 금지
- Tic-Tac-Toe 상태 전이 및 승패 계산
- Virtual DOM diff / patch
