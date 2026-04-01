import { createRootVNode as a, mountVNode as p, patchDom as m } from "./vdom.js";
import { applyPatchOperations as A, cloneVNode as O, countVNodeStats as q, diffTrees as z, domNodeToVNode as D, domNodeToVNodeTree as H, getVNodeKey as I, parseHtmlToVNode as F, removeDomAttribute as j, renderVNode as P, serializeVNodeToHtml as $, setDomAttribute as K } from "./vdom.js";
let i = null;
class N {
  constructor(t, o = {}) {
    if (typeof t != "function")
      throw new TypeError("FunctionComponent must receive a function component.");
    this.renderFn = t, this.props = o, this.hooks = [], this.hookIndex = 0, this.container = null, this.currentTree = a([]), this.pendingEffects = [], this.updateScheduled = !1, this.isMounted = !1, this.isRendering = !1, this.childRenderDepth = 0, this.renderCount = 0;
  }
  mount(t) {
    if (!t)
      throw new Error("mount() needs a real DOM container.");
    return this.container = t, this.renderAndCommit(), this;
  }
  update(t = this.props) {
    if (!this.container)
      throw new Error("update() can only be called after mount().");
    return this.props = t, this.renderAndCommit(), this;
  }
  scheduleUpdate() {
    this.updateScheduled || !this.container || (this.updateScheduled = !0, b(() => {
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
      throw new Error("update() cannot run while rendering is in progress.");
    this.hookIndex = 0, this.pendingEffects = [], this.isRendering = !0;
    const t = i;
    let o;
    try {
      i = this;
      const n = this.renderFn(this.props);
      o = k(n);
    } finally {
      i = t, this.isRendering = !1;
    }
    this.isMounted ? m(this.container, this.currentTree, o) : (p(this.container, o), this.isMounted = !0), this.currentTree = o, this.renderCount += 1, this.flushEffects();
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
function x(e, t = {}, ...o) {
  const n = w(o), r = {
    ...t || {},
    children: n
  };
  if (typeof e == "function") {
    const u = i ? i.renderChildComponent(e, r) : e(r);
    return g(u);
  }
  const s = y(t);
  return {
    type: "element",
    tag: e,
    attrs: Object.keys(s).length ? s : void 0,
    children: n
  };
}
function M(e) {
  const t = c("useState"), o = t.hookIndex++;
  let n = t.hooks[o];
  if (n || (n = {
    kind: "state",
    queue: [],
    value: E(e)
  }, t.hooks[o] = n), d(n, "state", "useState"), n.queue.length) {
    let s = n.value;
    for (const u of n.queue)
      s = typeof u == "function" ? u(s) : u;
    n.queue = [], n.value = s;
  }
  const r = (s) => {
    if (t.isRendering)
      throw new Error("setState must be called from an event or effect, not during render.");
    n.queue.push(s), t.scheduleUpdate();
  };
  return [n.value, r];
}
function R(e, t) {
  const o = c("useEffect"), n = o.hookIndex++;
  let r = o.hooks[n];
  r || (r = {
    kind: "effect",
    cleanup: null,
    deps: void 0
  }, o.hooks[n] = r), d(r, "effect", "useEffect"), h(r.deps, t) && (o.pendingEffects.push({
    index: n,
    callback: e
  }), r.deps = l(t));
}
function V(e, t) {
  const o = c("useMemo"), n = o.hookIndex++;
  let r = o.hooks[n];
  return r || (r = {
    kind: "memo",
    deps: void 0,
    value: void 0
  }, o.hooks[n] = r), d(r, "memo", "useMemo"), h(r.deps, t) && (r.value = e(), r.deps = l(t)), r.value;
}
function c(e) {
  if (!i || !i.isRendering)
    throw new Error(`${e} can only be used while FunctionComponent is rendering.`);
  if (i.childRenderDepth > 0)
    throw new Error(`${e} can only be used in the root component of this runtime.`);
  return i;
}
function d(e, t, o) {
  if (e.kind !== t)
    throw new Error(`${o} was called in a different order. Hooks must keep a stable call order.`);
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
function k(e) {
  return a(f(e));
}
function g(e) {
  const t = f(e);
  return t.length === 1 ? t[0] : t;
}
function w(e) {
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
  if (C(e))
    return e.type === "root" ? e.children || [] : [e];
  throw new TypeError("Components may only return Virtual DOM nodes, strings, numbers, or arrays.");
}
function C(e) {
  return !!e && typeof e == "object" && typeof e.type == "string";
}
function h(e, t) {
  return t === void 0 || e === void 0 || e.length !== t.length ? !0 : t.some((o, n) => !Object.is(o, e[n]));
}
function l(e) {
  return Array.isArray(e) ? [...e] : void 0;
}
function E(e) {
  return typeof e == "function" ? e() : e;
}
function b(e) {
  if (typeof queueMicrotask == "function") {
    queueMicrotask(e);
    return;
  }
  Promise.resolve().then(e);
}
export {
  N as FunctionComponent,
  A as applyPatchOperations,
  O as cloneVNode,
  q as countVNodeStats,
  a as createRootVNode,
  z as diffTrees,
  D as domNodeToVNode,
  H as domNodeToVNodeTree,
  I as getVNodeKey,
  x as h,
  p as mountVNode,
  F as parseHtmlToVNode,
  m as patchDom,
  j as removeDomAttribute,
  P as renderVNode,
  $ as serializeVNodeToHtml,
  K as setDomAttribute,
  R as useEffect,
  V as useMemo,
  M as useState
};
