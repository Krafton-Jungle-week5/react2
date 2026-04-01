import { createRootVNode as p, mountVNode as w, patchDom as S } from "./vdom.js";
import { applyPatchOperations as Q, cloneVNode as U, countVNodeStats as G, diffTrees as X, domNodeToVNode as J, domNodeToVNodeTree as W, getVNodeKey as Y, parseHtmlToVNode as Z, removeDomAttribute as _, renderVNode as v, serializeVNodeToHtml as ee, setDomAttribute as te } from "./vdom.js";
let i = null;
class T {
  constructor(t, n = {}) {
    if (typeof t != "function")
      throw new TypeError("FunctionComponent must receive a function component.");
    this.renderFn = t, this.props = n, this.hooks = [], this.hookIndex = 0, this.container = null, this.currentTree = p([]), this.pendingEffects = [], this.updateScheduled = !1, this.isMounted = !1, this.isRendering = !1, this.childRenderDepth = 0, this.renderCount = 0, this.inspector = null, this.debugFlow = [], this.lastPatchOperations = [], this.debugSnapshot = d(this);
  }
  attachInspector(t) {
    return this.inspector = t, this.publishDebugSnapshot(), this;
  }
  getDebugSnapshot() {
    return this.debugSnapshot;
  }
  mount(t) {
    if (!t)
      throw new Error("mount() needs a real DOM container.");
    return this.container = t, this.renderAndCommit(), this;
  }
  update(t = this.props) {
    if (!this.container)
      throw new Error("update() can only be called after mount().");
    return this.props = t, this.recordDebugStep(
      "scheduler",
      `${this.getComponentLabel()}.update()`,
      "Reserved microtask is now flushing the pending root update."
    ), this.renderAndCommit(), this;
  }
  scheduleUpdate() {
    this.updateScheduled || !this.container || (this.updateScheduled = !0, this.recordDebugStep(
      "scheduler",
      `${this.getComponentLabel()}.scheduleUpdate()`,
      "setState queued a root update and batched it into one microtask."
    ), q(() => {
      this.updateScheduled = !1, this.update(this.props);
    }));
  }
  renderChildComponent(t, n) {
    this.childRenderDepth += 1;
    try {
      return t(n);
    } finally {
      this.childRenderDepth -= 1;
    }
  }
  renderAndCommit() {
    if (this.isRendering)
      throw new Error("update() cannot run while rendering is in progress.");
    this.hookIndex = 0, this.pendingEffects = [], this.isRendering = !0, this.recordDebugStep(
      "render",
      `${this.getComponentLabel()}.renderAndCommit()`,
      "Root component is rerendering from hook slot 0."
    );
    const t = i;
    let n;
    try {
      i = this;
      const r = this.renderFn(this.props);
      n = $(r);
    } finally {
      i = t, this.isRendering = !1;
    }
    if (!this.isMounted)
      w(this.container, n), this.isMounted = !0, this.lastPatchOperations = [], this.recordDebugStep(
        "patch",
        "initial mount",
        "First render mounted the Virtual DOM tree into the real DOM."
      );
    else {
      const r = S(this.container, this.currentTree, n);
      this.lastPatchOperations = r, this.recordDebugStep(
        "diff",
        "diff",
        `Compared previous and next Virtual DOM trees and found ${r.length} patch operations.`
      ), this.recordDebugStep(
        "patch",
        "patch",
        g(r)
      );
    }
    this.currentTree = n, this.renderCount += 1, this.publishDebugSnapshot(), this.flushEffects();
  }
  flushEffects() {
    const t = this.pendingEffects;
    this.pendingEffects = [], t.length && this.recordDebugStep(
      "effect",
      "flushEffects()",
      `Running ${t.length} useEffect callback(s) after commit.`
    );
    for (const n of t) {
      const r = this.hooks[n.index];
      typeof r.cleanup == "function" && (this.recordDebugStep(
        "effect",
        `useEffect slot ${n.index} cleanup`,
        "Running the previous cleanup before the next effect callback."
      ), r.cleanup()), this.recordDebugStep(
        "effect",
        `useEffect slot ${n.index}`,
        "Running the latest effect callback because dependencies changed."
      );
      const o = n.callback();
      r.cleanup = typeof o == "function" ? o : null, this.publishDebugSnapshot();
    }
  }
  resetDebugFlow() {
    this.debugFlow = [], this.publishDebugSnapshot();
  }
  recordDebugStep(t, n, r) {
    this.debugFlow = [
      ...this.debugFlow,
      {
        id: `flow-${this.renderCount}-${this.debugFlow.length + 1}`,
        kind: t,
        title: n,
        detail: r
      }
    ], this.publishDebugSnapshot();
  }
  publishDebugSnapshot() {
    var t;
    this.debugSnapshot = d(this), (t = this.inspector) != null && t.publish && this.inspector.publish(this.debugSnapshot);
  }
  getComponentLabel() {
    return this.renderFn.name || "App";
  }
}
function I(e, t = {}, ...n) {
  const r = E(n), o = {
    ...t || {},
    children: r
  };
  if (typeof e == "function") {
    const y = i ? i.renderChildComponent(e, o) : e(o);
    return C(y);
  }
  const s = k(t);
  return {
    type: "element",
    tag: e,
    attrs: Object.keys(s).length ? s : void 0,
    children: r
  };
}
function P(e) {
  const t = f("useState"), n = a(t, "useState", "state", () => ({
    kind: "state",
    queue: [],
    value: O(e)
  }));
  A(n);
  const r = (o) => {
    if (t.isRendering)
      throw new Error("setState must be called from an event or effect, not during render.");
    t.updateScheduled || t.resetDebugFlow(), n.queue.push(o), t.recordDebugStep(
      "state",
      `useState slot ${t.hooks.indexOf(n)}`,
      `Queued the latest root state update. Pending queue length: ${n.queue.length}.`
    ), t.scheduleUpdate();
  };
  return [n.value, r];
}
function H(e, t) {
  const n = f("useEffect"), r = n.hookIndex, o = a(n, "useEffect", "effect", () => ({
    kind: "effect",
    cleanup: null,
    deps: void 0
  }));
  l(o.deps, t) && (n.recordDebugStep(
    "effect",
    `useEffect slot ${r}`,
    "Dependencies changed, so the effect callback was queued for after commit."
  ), n.pendingEffects.push({
    index: r,
    callback: e
  }), o.deps = m(t));
}
function L(e, t) {
  const n = f("useMemo"), r = a(n, "useMemo", "memo", () => ({
    kind: "memo",
    deps: void 0,
    value: void 0
  }));
  return l(r.deps, t) && (r.value = e(), r.deps = m(t), n.recordDebugStep(
    "memo",
    `useMemo slot ${n.hooks.indexOf(r)}`,
    `Recomputed the memoized value: ${c(r.value)}.`
  )), r.value;
}
function f(e) {
  if (!i || !i.isRendering)
    throw new Error(`${e} can only be used while FunctionComponent is rendering.`);
  if (i.childRenderDepth > 0)
    throw new Error(`${e} can only be used in the root component of this runtime.`);
  return i;
}
function D(e, t, n) {
  if (e.kind !== t)
    throw new Error(`${n} was called in a different order. Hooks must keep a stable call order.`);
}
function a(e, t, n, r) {
  const o = e.hookIndex++;
  let s = e.hooks[o];
  return s || (s = r(), e.hooks[o] = s), D(s, n, t), s;
}
function k(e = {}) {
  const t = {};
  for (const [n, r] of Object.entries(e || {}))
    if (!(n === "children" || r === !1 || r == null)) {
      if (n === "className") {
        t.class = r;
        continue;
      }
      if (n === "htmlFor") {
        t.for = r;
        continue;
      }
      t[n] = r === !0 ? "" : r;
    }
  return t;
}
function $(e) {
  return p(u(e));
}
function C(e) {
  const t = u(e);
  return t.length === 1 ? t[0] : t;
}
function E(e) {
  return e.flatMap((t) => u(t));
}
function u(e) {
  if (Array.isArray(e))
    return e.flatMap((t) => u(t));
  if (e == null || typeof e == "boolean")
    return [];
  if (typeof e == "string" || typeof e == "number")
    return [
      {
        type: "text",
        value: String(e)
      }
    ];
  if (x(e))
    return e.type === "root" ? e.children || [] : [e];
  throw new TypeError("Components may only return Virtual DOM nodes, strings, numbers, or arrays.");
}
function x(e) {
  return !!e && typeof e == "object" && typeof e.type == "string";
}
function l(e, t) {
  return t === void 0 || e === void 0 || e.length !== t.length ? !0 : t.some((n, r) => !Object.is(n, e[r]));
}
function m(e) {
  return Array.isArray(e) ? [...e] : void 0;
}
function O(e) {
  return typeof e == "function" ? e() : e;
}
function A(e) {
  if (!e.queue.length)
    return;
  let t = e.value;
  for (const n of e.queue)
    t = typeof n == "function" ? n(t) : n;
  e.queue = [], e.value = t;
}
function d(e) {
  return {
    renderCount: e.renderCount,
    hooks: e.hooks.map((t, n) => R(t, n)),
    flow: M(e.debugFlow),
    patchSummary: g(e.lastPatchOperations)
  };
}
function R(e, t) {
  if (e.kind === "state") {
    const n = N(e.value);
    return {
      slot: t,
      hook: "useState",
      summary: n,
      detail: `latest: ${n}, queue: ${e.queue.length}`
    };
  }
  if (e.kind === "memo") {
    const n = b(e.value);
    return {
      slot: t,
      hook: "useMemo",
      summary: n,
      detail: `deps: ${V(e.deps)}, result: ${n}`
    };
  }
  return {
    slot: t,
    hook: "useEffect",
    summary: h(e.deps),
    detail: `deps: ${h(e.deps)}, cleanup: ${e.cleanup ? "yes" : "no"}`
  };
}
function g(e = []) {
  if (!e.length)
    return "no patch operations";
  const t = e.reduce((n, r) => (n[r.type] = (n[r.type] || 0) + 1, n), {});
  return Object.entries(t).map(([n, r]) => `${n} ${r}`).join(", ");
}
function M(e) {
  return e.length ? ["state", "scheduler", "render", "memo", "diff", "patch", "effect"].map((n) => e.filter((r) => r.kind === n).at(-1)).filter(Boolean) : [];
}
function V(e) {
  return Array.isArray(e) ? e.map((t) => c(t)).join(", ") : "none";
}
function c(e) {
  return typeof e == "string" ? e : typeof e == "number" || typeof e == "boolean" || e == null ? String(e) : JSON.stringify(e);
}
function b(e) {
  return z(e) ? e.winner ? `winner ${e.winner} / line ${e.winningLine.join("-")}` : e.isDraw ? "draw" : "winner none / draw no" : Array.isArray(e) ? e.length <= 9 && e.every((t) => typeof t == "string") ? e.map((t) => t || "-").join(" ") : `array(${e.length})` : c(e);
}
function h(e) {
  return !Array.isArray(e) || !e.length ? "effect idle" : e.map((t) => b(t)).join(" / ");
}
function N(e) {
  return F(e) ? `step ${e.stepIndex} / next ${e.xIsNext ? "X" : "O"} / X:${e.score.x} O:${e.score.o} D:${e.score.draws}` : c(e);
}
function F(e) {
  return !!(e && typeof e == "object" && Array.isArray(e.history) && typeof e.stepIndex == "number" && typeof e.xIsNext == "boolean" && e.score && typeof e.score.x == "number" && typeof e.score.o == "number" && typeof e.score.draws == "number");
}
function z(e) {
  return !!(e && typeof e == "object" && "winner" in e && "winningLine" in e && "isDraw" in e);
}
function q(e) {
  if (typeof queueMicrotask == "function") {
    queueMicrotask(e);
    return;
  }
  Promise.resolve().then(e);
}
export {
  T as FunctionComponent,
  Q as applyPatchOperations,
  U as cloneVNode,
  G as countVNodeStats,
  p as createRootVNode,
  X as diffTrees,
  J as domNodeToVNode,
  W as domNodeToVNodeTree,
  Y as getVNodeKey,
  I as h,
  w as mountVNode,
  Z as parseHtmlToVNode,
  S as patchDom,
  _ as removeDomAttribute,
  v as renderVNode,
  ee as serializeVNodeToHtml,
  te as setDomAttribute,
  H as useEffect,
  L as useMemo,
  P as useState
};
