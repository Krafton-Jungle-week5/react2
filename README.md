# react2

`react2` is a small virtual DOM playground with a root-level hooks runtime.
It renders function components, tracks hook state on the root component, diffs
Virtual DOM trees, and patches the real DOM without a fiber reconciliation layer.

## Included modules

- `vdom`: Virtual DOM parsing, serialization, diffing, and patching
- `runtime`: `FunctionComponent`, `h`, `useState`, `useEffect`, `useMemo`
- `demo`: Browser demos built on the runtime

## Install

```bash
npm install
```

## Scripts

```bash
npm run dev
npm run build
npm run test
```

## Demo pages

```bash
npm run dev
```

- `/` loads the main demo entry under `src/demo/main.js`
- `/nonfiber.html` loads the standalone non-fiber Tic-Tac-Toe demo

## Runtime design

- Hooks are stored on the root `FunctionComponent`
- Child components are props-only and cannot call hooks
- `setState` batches updates in a microtask
- `useMemo` recalculates only when dependencies change
- `useEffect` runs after DOM patching and cleans up before rerunning
- DOM updates flow through `patchDom(previousTree, nextTree)`

## Example

```js
import {
  FunctionComponent,
  h,
  mountVNode,
  parseHtmlToVNode,
  patchDom,
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
patchDom(container, previousTree, nextTree);

function App() {
  return h('h1', {}, 'Hello Hooks');
}

new FunctionComponent(App).mount(container);
```

## Public entry points

- `react2-vdom`
- `react2-vdom/vdom`
