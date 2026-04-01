# react2

브라우저 DOM을 Virtual DOM으로 정규화하고, 이전 트리와 다음 트리를 비교한 뒤 필요한 DOM 연산만 commit 하는 작은 JavaScript 라이브러리입니다.

이번 과제 버전에서는 여기에 루트 전용 `FunctionComponent` 런타임과 `useState`, `useEffect`, `useMemo`를 직접 구현해 학습용 데모 페이지까지 포함했습니다.

## 포함된 모듈

- `vdom`: DOM <-> Virtual DOM 변환, 렌더링, 직렬화
- `fiber`: reconciliation, effect queue 생성, commit 실행

## 설치

```bash
npm install
```

## 스크립트

```bash
npm run dev
npm run build
npm run test
```

## 데모 페이지

```bash
npm install
npm run dev
```

- 브라우저에서 체크리스트를 추가/완료/삭제하면서 상태 변경을 확인할 수 있습니다.
- 상태는 루트 컴포넌트 `App`에서만 관리합니다.
- 자식 컴포넌트는 모두 props만 받는 순수 함수로 구현했습니다.

## 이번 주 과제 구현 포인트

- `FunctionComponent`
  - `hooks` 배열에 hook 상태를 저장합니다.
  - `mount()`는 첫 렌더를 수행합니다.
  - `update()`는 상태 변경 후 다시 렌더링하고, 이전 Virtual DOM과 diff 한 뒤 patch 합니다.
- `useState`
  - hook 인덱스로 이전 상태를 다시 찾아 재사용합니다.
  - `setState`는 상태 큐에 update를 넣고, 마이크로태스크로 rerender 를 예약합니다.
  - 같은 tick 안의 여러 `setState`는 한 번의 update로 배치됩니다.
- `useEffect`
  - commit 이후에만 실행됩니다.
  - dependency 가 바뀌면 이전 cleanup 을 먼저 실행하고 새 effect 를 실행합니다.
- `useMemo`
  - dependency 가 바뀔 때만 계산 결과를 다시 만듭니다.
- Virtual DOM + Diff + Patch
  - 루트 컴포넌트가 생성한 새 Virtual DOM 트리를 기존 트리와 비교합니다.
  - 바뀐 부분만 fiber effect 로 만들고, commit 단계에서 실제 DOM에 반영합니다.

## 실제 React와의 차이

- 이 구현은 과제 제약에 맞춰 `루트 컴포넌트만 hook/state 사용 가능`하도록 단순화했습니다.
- 자식 컴포넌트는 state 를 가지지 않는 stateless function 으로만 사용합니다.
- React처럼 모든 컴포넌트가 독립적인 state 와 lifecycle 을 갖지는 않습니다.
- React의 scheduler, concurrent rendering, priority, synthetic event system 은 구현하지 않았습니다.
- hook 규칙 검사는 매우 단순하며, React처럼 다양한 경고와 개발자 도구를 제공하지 않습니다.
- batching 도 과제용으로 마이크로태스크 단위까지만 지원합니다.

## 사용 예시

```js
import {
  FunctionComponent,
  h,
  mountVNode,
  parseHtmlToVNode,
  reconcileTrees,
  commitRoot,
} from 'react2-vdom';

const container = document.querySelector('#app');

const previousTree = parseHtmlToVNode(`
  <div class="before">
    <p>old text</p>
  </div>
`);

const nextTree = parseHtmlToVNode(`
  <div class="after" data-state="ready">
    <p>new text</p>
    <span>added</span>
  </div>
`);

mountVNode(container, previousTree);

const work = reconcileTrees(previousTree, nextTree);
commitRoot(container, work.rootFiber);

function App() {
  return h('h1', {}, 'Hello Hooks');
}

new FunctionComponent(App).mount(container);
```

## 공개 엔트리

- `react2-vdom`
- `react2-vdom/vdom`
- `react2-vdom/fiber`
