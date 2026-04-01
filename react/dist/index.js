import { createRootVNode as g, mountVNode as $, patchDom as k } from "./vdom.js";
import { applyPatchOperations as W, cloneVNode as Y, countVNodeStats as Z, diffTrees as _, domNodeToVNode as v, domNodeToVNodeTree as ee, getVNodeKey as te, parseHtmlToVNode as ne, removeDomAttribute as re, renderVNode as ie, serializeVNodeToHtml as oe, setDomAttribute as se } from "./vdom.js";
let o = null;
class H {
  constructor(t, n = {}) {
    if (typeof t != "function")
      throw new TypeError("FunctionComponent must receive a function component.");
    this.renderFn = t, this.props = n, this.hooks = [], this.hookIndex = 0, this.container = null, this.currentTree = g([]), this.pendingEffects = [], this.updateScheduled = !1, this.isMounted = !1, this.isRendering = !1, this.childRenderDepth = 0, this.renderCount = 0, this.inspector = null, this.debugFlow = [], this.lastPatchOperations = [], this.debugSnapshot = h(this);
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
    ), L(() => {
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
    const t = o;
    let n;
    try {
      o = this;
      const r = this.renderFn(this.props);
      n = C(r);
    } finally {
      o = t, this.isRendering = !1;
    }
    if (!this.isMounted)
      $(this.container, n), this.isMounted = !0, this.lastPatchOperations = [], this.recordDebugStep(
        "patch",
        "initial mount",
        "First render mounted the Virtual DOM tree into the real DOM."
      );
    else {
      const r = k(this.container, this.currentTree, n);
      this.lastPatchOperations = r, this.recordDebugStep(
        "diff",
        "diff",
        `Compared previous and next Virtual DOM trees and found ${r.length} patch operations.`
      ), this.recordDebugStep(
        "patch",
        "patch",
        w(r)
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
      const i = n.callback();
      r.cleanup = typeof i == "function" ? i : null, this.publishDebugSnapshot();
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
    this.debugSnapshot = h(this), (t = this.inspector) != null && t.publish && this.inspector.publish(this.debugSnapshot);
  }
  getComponentLabel() {
    return this.renderFn.name || "App";
  }
}
function B(e, t = {}, ...n) {
  const r = A(n), i = {
    ...t || {},
    children: r
  };
  if (typeof e == "function") {
    const D = o ? o.renderChildComponent(e, i) : e(i);
    return E(D);
  }
  const s = x(t);
  return {
    type: "element",
    tag: e,
    attrs: Object.keys(s).length ? s : void 0,
    children: r
  };
}
function K(e) {
  const t = a("useState"), n = d(t, "useState", "state", () => ({
    kind: "state",
    queue: [],
    value: R(e)
  }));
  F(n);
  const r = (i) => {
    if (t.isRendering)
      throw new Error("setState must be called from an event or effect, not during render.");
    t.updateScheduled || t.resetDebugFlow(), n.queue.push(i), t.recordDebugStep(
      "state",
      `useState slot ${t.hooks.indexOf(n)}`,
      `Queued the latest root state update. Pending queue length: ${n.queue.length}.`
    ), t.scheduleUpdate();
  };
  return [n.value, r];
}
function Q(e, t) {
  const n = a("useEffect"), r = n.hookIndex, i = d(n, "useEffect", "effect", () => ({
    kind: "effect",
    cleanup: null,
    deps: void 0
  }));
  b(i.deps, t) && (n.recordDebugStep(
    "effect",
    `useEffect slot ${r}`,
    "Dependencies changed, so the effect callback was queued for after commit."
  ), n.pendingEffects.push({
    index: r,
    callback: e
  }), i.deps = y(t));
}
function U(e, t) {
  const n = a("useMemo"), r = d(n, "useMemo", "memo", () => ({
    kind: "memo",
    deps: void 0,
    value: void 0
  }));
  return b(r.deps, t) && (r.value = e(), r.deps = y(t), n.recordDebugStep(
    "memo",
    `useMemo slot ${n.hooks.indexOf(r)}`,
    `Recomputed the memoized value: ${u(r.value)}.`
  )), r.value;
}
function a(e) {
  if (!o || !o.isRendering)
    throw new Error(`${e} can only be used while FunctionComponent is rendering.`);
  if (o.childRenderDepth > 0)
    throw new Error(`${e} can only be used in the root component of this runtime.`);
  return o;
}
function O(e, t, n) {
  if (e.kind !== t)
    throw new Error(`${n} was called in a different order. Hooks must keep a stable call order.`);
}
function d(e, t, n, r) {
  const i = e.hookIndex++;
  let s = e.hooks[i];
  return s || (s = r(), e.hooks[i] = s), O(s, n, t), s;
}
function x(e = {}) {
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
function C(e) {
  return g(f(e));
}
function E(e) {
  const t = f(e);
  return t.length === 1 ? t[0] : t;
}
function A(e) {
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
  if (M(e))
    return e.type === "root" ? e.children || [] : [e];
  throw new TypeError("Components may only return Virtual DOM nodes, strings, numbers, or arrays.");
}
function M(e) {
  return !!e && typeof e == "object" && typeof e.type == "string";
}
function b(e, t) {
  return t === void 0 || e === void 0 || e.length !== t.length ? !0 : t.some((n, r) => !Object.is(n, e[r]));
}
function y(e) {
  return Array.isArray(e) ? [...e] : void 0;
}
function R(e) {
  return typeof e == "function" ? e() : e;
}
function F(e) {
  if (!e.queue.length)
    return;
  let t = e.value;
  for (const n of e.queue)
    t = typeof n == "function" ? n(t) : n;
  e.queue = [], e.value = t;
}
function h(e) {
  return {
    renderCount: e.renderCount,
    hooks: e.hooks.map((t, n) => N(t, n)),
    flow: T(e.debugFlow),
    patchSummary: w(e.lastPatchOperations)
  };
}
function N(e, t) {
  if (e.kind === "state") {
    const n = P(e.value);
    return {
      slot: t,
      hook: "useState",
      summary: n,
      detail: `latest: ${n}, queue: ${e.queue.length}`,
      fields: V(e.value)
    };
  }
  if (e.kind === "memo") {
    const n = c(e.value);
    return {
      slot: t,
      hook: "useMemo",
      summary: n,
      detail: `deps: ${I(e.deps)}, result: ${n}`,
      fields: z(e.value)
    };
  }
  return {
    slot: t,
    hook: "useEffect",
    summary: m(e.deps),
    detail: `deps: ${m(e.deps)}, cleanup: ${e.cleanup ? "yes" : "no"}`,
    fields: j(e.deps, e.cleanup)
  };
}
function V(e) {
  return S(e) ? [
    { label: "현재 수", value: String(e.stepIndex) },
    { label: "다음 턴", value: e.xIsNext ? "X" : "O" },
    { label: "X", value: String(e.score.x) },
    { label: "O", value: String(e.score.o) },
    { label: "무승부", value: String(e.score.draws) }
  ] : [{ label: "값", value: u(e) }];
}
function z(e) {
  return l(e) ? [
    { label: "승자", value: e.winner || "없음" },
    { label: "무승부", value: e.isDraw ? "예" : "아니오" },
    { label: "라인", value: e.winningLine.length ? e.winningLine.join("-") : "없음" }
  ] : typeof e == "string" ? [{ label: "문구", value: q(e) }] : typeof e == "number" ? [{ label: "값", value: String(e) }] : Array.isArray(e) ? [{ label: "배열", value: c(e) }] : [{ label: "값", value: u(e) }];
}
function j(e, t) {
  return !Array.isArray(e) || !e.length ? [
    { label: "의존성", value: "없음" },
    ...t ? [{ label: "cleanup", value: "있음" }] : []
  ] : [
    {
      label: "의존성 1",
      value: p(e[0], 0)
    },
    {
      label: "의존성 2",
      value: p(e[1], 1)
    },
    ...t ? [{ label: "cleanup", value: "있음" }] : []
  ].filter((n) => n.value !== void 0);
}
function p(e, t) {
  return t === 0 && typeof e == "boolean" ? e ? "X 다음 턴" : "O 다음 턴" : t === 1 && l(e) ? e.winner ? `${e.winner} 승리` : e.isDraw ? "무승부" : "진행 중" : c(e);
}
function q(e) {
  return e.includes("X") && e.includes("차례") ? "X 차례" : e.includes("O") && e.includes("차례") ? "O 차례" : e.includes("X") && e.includes("승리") ? "X 승리" : e.includes("O") && e.includes("승리") ? "O 승리" : e.includes("무승부") ? "무승부" : e;
}
function w(e = []) {
  if (!e.length)
    return "no patch operations";
  const t = e.reduce((n, r) => (n[r.type] = (n[r.type] || 0) + 1, n), {});
  return Object.entries(t).map(([n, r]) => `${n} ${r}`).join(", ");
}
function T(e) {
  return e.length ? ["state", "scheduler", "render", "memo", "diff", "patch", "effect"].map((n) => e.filter((r) => r.kind === n).at(-1)).filter(Boolean) : [];
}
function I(e) {
  return Array.isArray(e) ? e.map((t) => u(t)).join(", ") : "none";
}
function u(e) {
  return typeof e == "string" ? e : typeof e == "number" || typeof e == "boolean" || e == null ? String(e) : JSON.stringify(e);
}
function c(e) {
  return l(e) ? e.winner ? `winner ${e.winner} / line ${e.winningLine.join("-")}` : e.isDraw ? "draw" : "winner none / draw no" : Array.isArray(e) ? e.length <= 9 && e.every((t) => typeof t == "string") ? e.map((t) => t || "-").join(" ") : `array(${e.length})` : u(e);
}
function m(e) {
  return !Array.isArray(e) || !e.length ? "effect idle" : e.map((t) => c(t)).join(" / ");
}
function P(e) {
  return S(e) ? `step ${e.stepIndex} / next ${e.xIsNext ? "X" : "O"} / X:${e.score.x} O:${e.score.o} D:${e.score.draws}` : u(e);
}
function S(e) {
  return !!(e && typeof e == "object" && Array.isArray(e.history) && typeof e.stepIndex == "number" && typeof e.xIsNext == "boolean" && e.score && typeof e.score.x == "number" && typeof e.score.o == "number" && typeof e.score.draws == "number");
}
function l(e) {
  return !!(e && typeof e == "object" && "winner" in e && "winningLine" in e && "isDraw" in e);
}
function L(e) {
  if (typeof queueMicrotask == "function") {
    queueMicrotask(e);
    return;
  }
  Promise.resolve().then(e);
}
export {
  H as FunctionComponent,
  W as applyPatchOperations,
  Y as cloneVNode,
  Z as countVNodeStats,
  g as createRootVNode,
  _ as diffTrees,
  v as domNodeToVNode,
  ee as domNodeToVNodeTree,
  te as getVNodeKey,
  B as h,
  $ as mountVNode,
  ne as parseHtmlToVNode,
  k as patchDom,
  re as removeDomAttribute,
  ie as renderVNode,
  oe as serializeVNodeToHtml,
  se as setDomAttribute,
  Q as useEffect,
  U as useMemo,
  K as useState
};
