import { createRootVNode as h, mountVNode as p } from "./vdom.js";
import { cloneVNode as z, countVNodeStats as O, domNodeToVNode as q, domNodeToVNodeTree as D, getVNodeKey as H, parseHtmlToVNode as I, removeDomAttribute as P, renderVNode as j, serializeVNodeToHtml as U, setDomAttribute as $ } from "./vdom.js";
import { reconcileTrees as m, commitRoot as k } from "./fiber.js";
import { ChildDeletion as B, NoFlags as L, Placement as Q, Update as G, formatFiberPath as J, getFlagNames as W, summarizeCommitOperations as X } from "./fiber.js";
let i = null;
class V {
  constructor(t, o = {}) {
    if (typeof t != "function")
      throw new TypeError("FunctionComponent는 함수형 컴포넌트를 받아야 합니다.");
    this.renderFn = t, this.props = o, this.hooks = [], this.hookIndex = 0, this.container = null, this.currentTree = h([]), this.pendingEffects = [], this.updateScheduled = !1, this.isMounted = !1, this.isRendering = !1, this.childRenderDepth = 0, this.renderCount = 0;
  }
  mount(t) {
    if (!t)
      throw new Error("mount()에는 실제 DOM 컨테이너가 필요합니다.");
    return this.container = t, this.renderAndCommit(), this;
  }
  update(t = this.props) {
    if (!this.container)
      throw new Error("mount() 이후에만 update()를 호출할 수 있습니다.");
    return this.props = t, this.renderAndCommit(), this;
  }
  scheduleUpdate() {
    this.updateScheduled || !this.container || (this.updateScheduled = !0, x(() => {
      this.updateScheduled = !1, this.update(this.props);
    }));
  }
  renderChildComponent(t, o) {
    this.childRenderDepth += 1;
    try {
      return t(o);
    } finally {
      this.childRenderDepth -= 1;
    }
  }
  renderAndCommit() {
    if (this.isRendering)
      throw new Error("렌더링 도중에는 update()를 다시 실행할 수 없습니다.");
    this.hookIndex = 0, this.pendingEffects = [], this.isRendering = !0;
    const t = i;
    let o;
    try {
      i = this;
      const n = this.renderFn(this.props);
      o = g(n);
    } finally {
      i = t, this.isRendering = !1;
    }
    if (!this.isMounted)
      p(this.container, o), this.isMounted = !0;
    else {
      const n = m(this.currentTree, o);
      k(this.container, n.rootFiber);
    }
    this.currentTree = o, this.renderCount += 1, this.flushEffects();
  }
  flushEffects() {
    const t = this.pendingEffects;
    this.pendingEffects = [];
    for (const o of t) {
      const n = this.hooks[o.index];
      typeof n.cleanup == "function" && n.cleanup();
      const r = o.callback();
      n.cleanup = typeof r == "function" ? r : null;
    }
  }
}
function v(e, t = {}, ...o) {
  const n = C(o), r = {
    ...t || {},
    children: n
  };
  if (typeof e == "function") {
    const u = i ? i.renderChildComponent(e, r) : e(r);
    return w(u);
  }
  const s = y(t);
  return {
    type: "element",
    tag: e,
    attrs: Object.keys(s).length ? s : void 0,
    children: n
  };
}
function T(e) {
  const t = c("useState"), o = t.hookIndex++;
  let n = t.hooks[o];
  if (n || (n = {
    kind: "state",
    queue: [],
    value: N(e)
  }, t.hooks[o] = n), d(n, "state", "useState"), n.queue.length) {
    let s = n.value;
    for (const u of n.queue)
      s = typeof u == "function" ? u(s) : u;
    n.queue = [], n.value = s;
  }
  const r = (s) => {
    if (t.isRendering)
      throw new Error("setState는 렌더링 중이 아니라 이벤트나 effect 안에서 호출해야 합니다.");
    n.queue.push(s), t.scheduleUpdate();
  };
  return [n.value, r];
}
function S(e, t) {
  const o = c("useEffect"), n = o.hookIndex++;
  let r = o.hooks[n];
  r || (r = {
    kind: "effect",
    cleanup: null,
    deps: void 0
  }, o.hooks[n] = r), d(r, "effect", "useEffect"), a(r.deps, t) && (o.pendingEffects.push({
    index: n,
    callback: e
  }), r.deps = l(t));
}
function b(e, t) {
  const o = c("useMemo"), n = o.hookIndex++;
  let r = o.hooks[n];
  return r || (r = {
    kind: "memo",
    deps: void 0,
    value: void 0
  }, o.hooks[n] = r), d(r, "memo", "useMemo"), a(r.deps, t) && (r.value = e(), r.deps = l(t)), r.value;
}
function c(e) {
  if (!i || !i.isRendering)
    throw new Error(`${e}는 FunctionComponent 렌더링 중에만 사용할 수 있습니다.`);
  if (i.childRenderDepth > 0)
    throw new Error(`${e}는 최상위 루트 컴포넌트에서만 사용할 수 있습니다.`);
  return i;
}
function d(e, t, o) {
  if (e.kind !== t)
    throw new Error(`${o} 호출 순서가 바뀌었습니다. Hook은 항상 같은 순서로 호출되어야 합니다.`);
}
function y(e = {}) {
  const t = {};
  for (const [o, n] of Object.entries(e || {}))
    if (!(o === "children" || n === !1 || n == null)) {
      if (o === "className") {
        t.class = n;
        continue;
      }
      if (o === "htmlFor") {
        t.for = n;
        continue;
      }
      t[o] = n === !0 ? "" : n;
    }
  return t;
}
function g(e) {
  return h(f(e));
}
function w(e) {
  const t = f(e);
  return t.length === 1 ? t[0] : t;
}
function C(e) {
  return e.flatMap((t) => f(t));
}
function f(e) {
  if (Array.isArray(e))
    return e.flatMap((t) => f(t));
  if (e == null || typeof e == "boolean")
    return [];
  if (typeof e == "string" || typeof e == "number")
    return [
      {
        type: "text",
        value: String(e)
      }
    ];
  if (E(e))
    return e.type === "root" ? e.children || [] : [e];
  throw new TypeError("컴포넌트는 Virtual DOM 노드, 문자열, 숫자, 배열만 반환할 수 있습니다.");
}
function E(e) {
  return !!e && typeof e == "object" && typeof e.type == "string";
}
function a(e, t) {
  return t === void 0 || e === void 0 || e.length !== t.length ? !0 : t.some((o, n) => !Object.is(o, e[n]));
}
function l(e) {
  return Array.isArray(e) ? [...e] : void 0;
}
function N(e) {
  return typeof e == "function" ? e() : e;
}
function x(e) {
  if (typeof queueMicrotask == "function") {
    queueMicrotask(e);
    return;
  }
  Promise.resolve().then(e);
}
export {
  B as ChildDeletion,
  V as FunctionComponent,
  L as NoFlags,
  Q as Placement,
  G as Update,
  z as cloneVNode,
  k as commitRoot,
  O as countVNodeStats,
  h as createRootVNode,
  q as domNodeToVNode,
  D as domNodeToVNodeTree,
  J as formatFiberPath,
  W as getFlagNames,
  H as getVNodeKey,
  v as h,
  p as mountVNode,
  I as parseHtmlToVNode,
  m as reconcileTrees,
  P as removeDomAttribute,
  j as renderVNode,
  U as serializeVNodeToHtml,
  $ as setDomAttribute,
  X as summarizeCommitOperations,
  S as useEffect,
  b as useMemo,
  T as useState
};
