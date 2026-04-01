# react

`react`는 React의 핵심 개념인 Component, State, Hooks를 4주차에 구현했던 Virtual DOM 위에 확장한 학습형 프로젝트입니다.

## 1. 핵심 구현 내용

### Root-Level Hooks Runtime

- `FunctionComponent` 클래스로 루트 컴포넌트를 관리
- `useState`, `useMemo`, `useEffect`를 직접 구현
- 모든 Hook 상태는 루트 컴포넌트의 `hooks[]` 배열에 저장
- Hook 호출 순서를 인덱스로 추적해 안정적인 실행 순서 유지
- 자식 컴포넌트에서는 Hook 사용을 제한하여 현재 런타임 설계를 명확히 유지

### 상태 업데이트와 배치 처리

- `setState`는 즉시 DOM을 바꾸지 않고 updater를 queue에 저장
- 여러 상태 변경은 microtask 단위로 batch 처리
- 같은 이벤트 안의 연속 `setState`도 하나의 Re-Render로 합쳐짐

### Virtual DOM Diff / Patch 엔진

- VNode 생성, DOM -> VNode 변환, HTML 직렬화 지원
- 이전 트리와 다음 트리를 비교해 patch operation 생성
- `UPDATE_PROPS`, `UPDATE_TEXT`, `INSERT_CHILD`, `REMOVE_CHILD`, `MOVE_CHILD` 지원
- key 기반 자식 재정렬을 통해 이동 연산 처리
- 필요한 부분만 실제 DOM에 반영

### Effect / Memo 동작 검증

- `useMemo`는 dependency가 바뀔 때만 재계산
- `useEffect`는 commit 이후 실행
- effect 재실행 전 cleanup 보장

### Runtime Inspector

- 현재 Hook 슬롯 상태를 요약해서 표시
- 이전 값과 현재 값을 비교해 변경 여부 확인
- 렌더 횟수와 최신 상태 흐름을 발표용으로 바로 설명 가능

## 렌더링 코어 다이어그램

초기화와 Re-Render 시점의 차이를 한눈에 설명할 수 있도록 핵심 흐름만 분리해 정리했습니다.

### 초기화 1. 첫 마운트 전체 흐름

첫 렌더에서는 이전 트리가 없기 때문에 `diff` 없이 `mountVNode()`가 실제 DOM을 한 번에 붙입니다.

![초기화 첫 마운트 전체 흐름](docs/init-mount-overview.svg)

### 초기화 2. 첫 렌더에서 hooks 슬롯이 채워지는 방식

첫 렌더에서 hook 호출 순서가 `hooks[]` 슬롯 구조를 만들고, 이후 Re-Render도 같은 순서를 기준으로 재사용합니다.

![초기화 hooks 슬롯 구조](docs/init-hooks-slots.svg)

### Re-Render 1. 사용자 이벤트에서 update 예약까지

Re-Render의 시작점은 DOM 변경이 아니라 `setState()`이며, setter는 값을 queue에 넣고 실제 렌더는 microtask 하나로 예약합니다.

![Re-Render update 예약 흐름](docs/rerender-schedule.svg)

### Re-Render 2. microtask flush 이후 commit까지

Re-Render에서는 `useState` queue를 반영해 새 `nextTree`를 만들고, `patchDom()`이 이전 트리와 비교해서 필요한 DOM만 갱신합니다.

![Re-Render commit 흐름](docs/rerender-commit.svg)

짧게 정리하면:

- 초기화에서는 `mountVNode()`가 전체 트리를 처음 붙입니다.
- Re-Render에서는 `setState()`가 queue와 microtask batching을 만들고, `patchDom()`이 바뀐 DOM만 갱신합니다.
- `useEffect()`는 두 경우 모두 commit 이후 실행되며, Re-Render에서는 필요하면 cleanup이 먼저 실행됩니다.

## 2. 데모 구성

- 경로: `/`
- 내용: Tic-Tac-Toe 게임 + Runtime Inspector
- 목적: 상태 변경, 렌더링, Hook 저장 구조를 한 화면에서 설명

## 3. 프로젝트 구조

```text
src/
  demo/
    main.js                # 메인 데모 진입점
    runtime-inspector.js   # Hook 상태 시각화
    styles.css             # 데모 UI 스타일
  lib/
    runtime.js             # FunctionComponent, Hooks, 스케줄링
    vdom.js                # VDOM 생성, diff, patch
  tic-tac-toe/
    model.js               # 게임 상태 전이/승패 계산
tests/
  runtime.test.js
  vdom.test.js
  tic-tac-toe-model.test.js
docs/
  init-mount-overview.svg  # 초기 마운트 흐름
  init-hooks-slots.svg     # hooks 슬롯 구조
  rerender-schedule.svg    # Re-Render 예약 흐름
  rerender-commit.svg      # Re-Render commit 흐름
  sequence diagram.svg     # 시퀀스 다이어그램
```

## 4. 테스트 범위

현재 테스트는 아래 항목을 검증합니다.

- 루트 상태 저장 및 DOM 반영
- 같은 이벤트 내 다중 `setState` batching
- `useMemo` 재계산 조건
- `useEffect` 실행 및 cleanup 순서
- 자식 컴포넌트에서 Hook 사용 금지
- Inspector snapshot 발행 여부
- Virtual DOM diff / patch 동작
- key 기반 자식 이동 처리
- Tic-Tac-Toe 상태 전이와 점수 유지

## 5. 실행 방법

```bash
npm install
npm run dev
```

추가 명령어:

```bash
npm run build
npm run test
```
