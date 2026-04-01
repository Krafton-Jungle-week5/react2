const y = /* @__PURE__ */ new Set([
  "embed",
  "head",
  "iframe",
  "link",
  "meta",
  "object",
  "script",
  "style"
]), T = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]), v = /* @__PURE__ */ new Set(["code", "pre", "textarea"]), s = Symbol("react2:event-handlers");
function E(t = []) {
  return {
    type: "root",
    children: t
  };
}
function x(t) {
  return t ? t.type === "text" ? {
    type: "text",
    value: t.value
  } : {
    type: t.type,
    tag: t.tag,
    attrs: t.attrs ? { ...t.attrs } : void 0,
    children: t.children ? t.children.map(x) : []
  } : null;
}
function L(t, e = document) {
  const r = e.createElement("template");
  return r.innerHTML = t, l(r.content);
}
function l(t) {
  return t ? t.nodeType === 11 ? E(
    Array.from(t.childNodes).map((e) => l(e)).filter(Boolean)
  ) : t.nodeType === 1 ? A(t) : t.nodeType === 3 ? g(t) : null : null;
}
function V(t) {
  return E(
    Array.from(t.childNodes).map((e) => l(e)).filter(Boolean)
  );
}
function g(t) {
  var n, a;
  const e = t.textContent ?? "", r = (a = (n = t.parentElement) == null ? void 0 : n.tagName) == null ? void 0 : a.toLowerCase();
  return !v.has(r) && e.trim() === "" ? null : {
    type: "text",
    value: e
  };
}
function A(t) {
  const e = t.tagName.toLowerCase();
  if (y.has(e))
    return null;
  const r = $(t, e);
  return e === "textarea" ? {
    type: "element",
    tag: e,
    attrs: r,
    children: []
  } : {
    type: "element",
    tag: e,
    attrs: r,
    children: Array.from(t.childNodes).map((n) => l(n)).filter(Boolean)
  };
}
function $(t, e) {
  const r = {};
  for (const n of Array.from(t.attributes))
    r[n.name] = n.value;
  if (e === "input") {
    const n = (t.getAttribute("type") || "").toLowerCase();
    (n === "checkbox" || n === "radio") && (t.checked ? r.checked = "" : delete r.checked), t.value !== void 0 && (r.value = t.value);
  }
  return e === "textarea" && (r.value = t.value ?? ""), e === "option" && (t.selected ? r.selected = "" : delete r.selected), r;
}
function b(t) {
  var e, r;
  return !t || t.type !== "element" ? null : ((e = t.attrs) == null ? void 0 : e["data-key"]) || ((r = t.attrs) == null ? void 0 : r.id) || null;
}
function f(t, e = document) {
  var n;
  if (t.type === "root") {
    const a = e.createDocumentFragment();
    for (const i of t.children)
      a.append(f(i, e));
    return a;
  }
  if (t.type === "text")
    return e.createTextNode(t.value);
  const r = e.createElement(t.tag);
  for (const [a, i] of Object.entries(t.attrs || {}))
    D(r, a, i);
  if (t.tag === "textarea")
    return r.value = ((n = t.attrs) == null ? void 0 : n.value) ?? "", r;
  for (const a of t.children || [])
    r.append(f(a, e));
  return r;
}
function _(t, e) {
  const r = t.ownerDocument || document, n = f(e, r);
  t.replaceChildren(n);
}
function D(t, e, r) {
  if (m(e, r)) {
    const n = e.slice(2).toLowerCase(), a = t[s] || {}, i = a[n];
    i && t.removeEventListener(n, i), t.addEventListener(n, r), a[n] = r, t[s] = a;
    return;
  }
  if (e === "checked") {
    t.checked = !0, t.setAttribute("checked", "");
    return;
  }
  if (e === "value") {
    t.value = r ?? "", t.tagName.toLowerCase() !== "textarea" && t.setAttribute("value", r ?? "");
    return;
  }
  t.setAttribute(e, r ?? "");
}
function w(t, e) {
  var r;
  if (m(e, (r = t[s]) == null ? void 0 : r[e.slice(2).toLowerCase()])) {
    const n = e.slice(2).toLowerCase(), a = t[s], i = a == null ? void 0 : a[n];
    i && (t.removeEventListener(n, i), delete a[n]);
    return;
  }
  e === "checked" && (t.checked = !1), e === "value" && (t.value = ""), t.removeAttribute(e);
}
function C(t) {
  return t.type === "root" ? t.children.map((e) => p(e, 0)).join(`
`) : p(t, 0);
}
function p(t, e) {
  var i, h;
  if (t.type === "text")
    return `${c(e)}${o(t.value)}`;
  const r = Object.entries(t.attrs || {}).filter(([, u]) => typeof u != "function").map(([u, N]) => N === "" ? u : `${u}="${k(N)}"`).join(" "), n = r ? `<${t.tag} ${r}>` : `<${t.tag}>`;
  if (t.tag === "textarea")
    return `${c(e)}${n}${o(((i = t.attrs) == null ? void 0 : i.value) ?? "")}</${t.tag}>`;
  if (T.has(t.tag))
    return `${c(e)}${n}`;
  if (!((h = t.children) != null && h.length))
    return `${c(e)}${n}</${t.tag}>`;
  if (t.children.length === 1 && t.children[0].type === "text" && t.children[0].value.length <= 48 && !t.children[0].value.includes(`
`))
    return `${c(e)}${n}${o(t.children[0].value)}</${t.tag}>`;
  const a = t.children.map((u) => p(u, e + 1)).join(`
`);
  return `${c(e)}${n}
${a}
${c(e)}</${t.tag}>`;
}
function c(t) {
  return "  ".repeat(t);
}
function o(t) {
  return String(t).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function k(t) {
  return o(t).replaceAll('"', "&quot;");
}
function m(t, e) {
  return t.startsWith("on") && typeof e == "function";
}
function O(t) {
  const e = {
    totalNodes: 0,
    elements: 0,
    textNodes: 0,
    keyedElements: 0,
    maxDepth: 0
  };
  return d(t, 0, (r, n) => {
    if (r.type === "root") {
      e.maxDepth = Math.max(e.maxDepth, n);
      return;
    }
    if (e.totalNodes += 1, e.maxDepth = Math.max(e.maxDepth, n), r.type === "text") {
      e.textNodes += 1;
      return;
    }
    e.elements += 1, b(r) && (e.keyedElements += 1);
  }), e;
}
function d(t, e, r) {
  var n;
  if (r(t, e), !!((n = t.children) != null && n.length))
    for (const a of t.children)
      d(a, e + 1, r);
}
export {
  x as cloneVNode,
  O as countVNodeStats,
  E as createRootVNode,
  l as domNodeToVNode,
  V as domNodeToVNodeTree,
  b as getVNodeKey,
  _ as mountVNode,
  L as parseHtmlToVNode,
  w as removeDomAttribute,
  f as renderVNode,
  C as serializeVNodeToHtml,
  D as setDomAttribute
};
