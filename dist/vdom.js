const $ = /* @__PURE__ */ new Set([
  "embed",
  "head",
  "iframe",
  "link",
  "meta",
  "object",
  "script",
  "style"
]), C = /* @__PURE__ */ new Set([
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
]), M = /* @__PURE__ */ new Set(["code", "pre", "textarea"]), d = Symbol("react2:event-handlers");
function A(t = []) {
  return {
    type: "root",
    children: t
  };
}
function g(t) {
  return t ? t.type === "text" ? {
    type: "text",
    value: t.value
  } : {
    type: t.type,
    tag: t.tag,
    attrs: t.attrs ? { ...t.attrs } : void 0,
    children: t.children ? t.children.map(g) : []
  } : null;
}
function Z(t, e = document) {
  const n = e.createElement("template");
  return n.innerHTML = t, m(n.content);
}
function m(t) {
  return t ? t.nodeType === 11 ? A(
    Array.from(t.childNodes).map((e) => m(e)).filter(Boolean)
  ) : t.nodeType === 1 ? R(t) : t.nodeType === 3 ? H(t) : null : null;
}
function tt(t) {
  return A(
    Array.from(t.childNodes).map((e) => m(e)).filter(Boolean)
  );
}
function H(t) {
  var r, u;
  const e = t.textContent ?? "", n = (u = (r = t.parentElement) == null ? void 0 : r.tagName) == null ? void 0 : u.toLowerCase();
  return !M.has(n) && e.trim() === "" ? null : {
    type: "text",
    value: e
  };
}
function R(t) {
  const e = t.tagName.toLowerCase();
  if ($.has(e))
    return null;
  const n = w(t, e);
  return e === "textarea" ? {
    type: "element",
    tag: e,
    attrs: n,
    children: []
  } : {
    type: "element",
    tag: e,
    attrs: n,
    children: Array.from(t.childNodes).map((r) => m(r)).filter(Boolean)
  };
}
function w(t, e) {
  const n = {};
  for (const r of Array.from(t.attributes))
    n[r.name] = r.value;
  if (e === "input") {
    const r = (t.getAttribute("type") || "").toLowerCase();
    (r === "checkbox" || r === "radio") && (t.checked ? n.checked = "" : delete n.checked), t.value !== void 0 && (n.value = t.value);
  }
  return e === "textarea" && (n.value = t.value ?? ""), e === "option" && (t.selected ? n.selected = "" : delete n.selected), n;
}
function s(t) {
  var e, n;
  return !t || t.type !== "element" ? null : ((e = t.attrs) == null ? void 0 : e["data-key"]) || ((n = t.attrs) == null ? void 0 : n.id) || null;
}
function h(t, e = document) {
  var r;
  if (t.type === "root") {
    const u = e.createDocumentFragment();
    for (const c of t.children)
      u.append(h(c, e));
    return u;
  }
  if (t.type === "text")
    return e.createTextNode(t.value);
  const n = e.createElement(t.tag);
  for (const [u, c] of Object.entries(t.attrs || {}))
    L(n, u, c);
  if (t.tag === "textarea")
    return n.value = ((r = t.attrs) == null ? void 0 : r.value) ?? "", n;
  for (const u of t.children || [])
    n.append(h(u, e));
  return n;
}
function et(t, e) {
  const n = t.ownerDocument || document, r = h(e, n);
  t.replaceChildren(r);
}
function v(t, e) {
  const n = [];
  return x(t, e, [], n), n;
}
function nt(t, e, n) {
  const r = K(v(e, n));
  return P(t, r), r;
}
function P(t, e) {
  for (const n of e)
    G(t, n);
}
function L(t, e, n) {
  if (V(e, n)) {
    const r = e.slice(2).toLowerCase(), u = t[d] || {}, c = u[r];
    c && t.removeEventListener(r, c), t.addEventListener(r, n), u[r] = n, t[d] = u;
    return;
  }
  if (e === "checked") {
    t.checked = !0, t.setAttribute("checked", "");
    return;
  }
  if (e === "value") {
    t.value = n ?? "", t.tagName.toLowerCase() !== "textarea" && t.setAttribute("value", n ?? "");
    return;
  }
  t.setAttribute(e, n ?? "");
}
function B(t, e) {
  var n;
  if (V(e, (n = t[d]) == null ? void 0 : n[e.slice(2).toLowerCase()])) {
    const r = e.slice(2).toLowerCase(), u = t[d], c = u == null ? void 0 : u[r];
    c && (t.removeEventListener(r, c), delete u[r]);
    return;
  }
  e === "checked" && (t.checked = !1), e === "value" && (t.value = ""), t.removeAttribute(e);
}
function x(t, e, n, r) {
  if (!e)
    return;
  if (e.type === "root") {
    N(n, (t == null ? void 0 : t.children) || [], e.children || [], r);
    return;
  }
  if (e.type === "text") {
    (t == null ? void 0 : t.value) !== e.value && r.push({
      type: "UPDATE_TEXT",
      path: n,
      value: e.value
    });
    return;
  }
  const u = J((t == null ? void 0 : t.attrs) || {}, e.attrs || {});
  (u.set || u.remove.length) && r.push({
    type: "UPDATE_PROPS",
    path: n,
    payload: u
  }), N(n, (t == null ? void 0 : t.children) || [], e.children || [], r);
}
function N(t, e, n, r) {
  if (Y(e, n)) {
    j(t, e, n, r);
    return;
  }
  U(t, e, n, r);
}
function U(t, e, n, r) {
  const u = Math.min(e.length, n.length);
  for (let c = 0; c < u; c += 1) {
    const f = e[c], a = n[c], i = t.concat(c);
    if (k(f, a)) {
      x(f, a, i, r);
      continue;
    }
    r.push(E(t, f, c)), r.push(p(t, a, c));
  }
  for (let c = u; c < n.length; c += 1)
    r.push(p(t, n[c], c));
  for (let c = e.length - 1; c >= n.length; c -= 1)
    r.push(E(t, e[c], c));
}
function j(t, e, n, r) {
  const u = new Map(
    e.map((f, a) => [s(f), { child: f, index: a }])
  ), c = /* @__PURE__ */ new Set();
  for (let f = 0; f < n.length; f += 1) {
    const a = n[f], i = s(a), l = u.get(i), I = t.concat(f);
    if (!l) {
      r.push(p(t, a, f, i));
      continue;
    }
    if (c.add(i), !k(l.child, a)) {
      r.push(E(t, l.child, l.index, i)), r.push(p(t, a, f, i));
      continue;
    }
    l.index !== f && r.push({
      type: "MOVE_CHILD",
      path: I,
      parentPath: t,
      fromIndex: l.index,
      toIndex: f,
      key: i
    }), x(l.child, a, I, r);
  }
  for (let f = e.length - 1; f >= 0; f -= 1) {
    const a = e[f], i = s(a);
    c.has(i) || r.push(E(t, a, f, i));
  }
}
function p(t, e, n, r = s(e)) {
  return {
    type: "INSERT_CHILD",
    path: t.concat(n),
    parentPath: t,
    index: n,
    key: r,
    node: g(e)
  };
}
function E(t, e, n, r = s(e)) {
  return {
    type: "REMOVE_CHILD",
    path: t.concat(n),
    parentPath: t,
    index: n,
    key: r,
    node: g(e)
  };
}
function K(t) {
  const e = {
    REMOVE_CHILD: 0,
    INSERT_CHILD: 1,
    MOVE_CHILD: 2,
    UPDATE_PROPS: 3,
    UPDATE_TEXT: 4
  };
  return t.map((n, r) => ({ ...n, order: r })).sort((n, r) => {
    const u = e[n.type] - e[r.type];
    if (u !== 0)
      return u;
    if (n.type === "REMOVE_CHILD" && r.type === "REMOVE_CHILD") {
      const c = r.parentPath.length - n.parentPath.length;
      return c !== 0 ? c : r.index - n.index;
    }
    if (n.type === "MOVE_CHILD" && r.type === "MOVE_CHILD") {
      const c = T(n.parentPath, r.parentPath);
      return c !== 0 ? c : n.toIndex - r.toIndex;
    }
    if (n.type === "INSERT_CHILD" && r.type === "INSERT_CHILD") {
      const c = T(n.parentPath, r.parentPath);
      return c !== 0 ? c : n.index - r.index;
    }
    return T(n.path, r.path) || n.order - r.order;
  });
}
function G(t, e) {
  switch (e.type) {
    case "REMOVE_CHILD":
      X(t, e);
      return;
    case "MOVE_CHILD":
      z(t, e);
      return;
    case "INSERT_CHILD":
      F(t, e);
      return;
    case "UPDATE_PROPS":
      W(t, e);
      return;
    case "UPDATE_TEXT":
      q(t, e);
  }
}
function X(t, e) {
  const n = O(t, e.parentPath);
  if (!n)
    return;
  const r = e.key && b(n, e.key) || n.childNodes[e.index];
  r && n.removeChild(r);
}
function z(t, e) {
  const n = O(t, e.parentPath);
  if (!n)
    return;
  const r = e.key ? b(n, e.key) : n.childNodes[e.fromIndex];
  if (!r)
    return;
  const u = Array.from(n.childNodes), c = u[e.toIndex] || null;
  if (!c) {
    n.appendChild(r);
    return;
  }
  u.indexOf(r) < e.toIndex ? n.insertBefore(r, c.nextSibling) : n.insertBefore(r, c);
}
function F(t, e) {
  const n = O(t, e.parentPath);
  if (!n)
    return;
  const r = n.childNodes[e.index] || null;
  n.insertBefore(
    h(e.node, n.ownerDocument || document),
    r
  );
}
function W(t, e) {
  const n = _(t, e.path);
  if (n instanceof Element) {
    for (const r of e.payload.remove)
      B(n, r);
    for (const [r, u] of Object.entries(e.payload.set || {}))
      L(n, r, u);
  }
}
function q(t, e) {
  const n = _(t, e.path);
  n && (n.textContent = e.value);
}
function O(t, e) {
  return e.length ? _(t, e) : t;
}
function _(t, e) {
  var r;
  let n = t;
  for (const u of e)
    n = ((r = n == null ? void 0 : n.childNodes) == null ? void 0 : r[u]) || null;
  return n;
}
function b(t, e) {
  return Array.from(t.children).find((n) => n.getAttribute("data-key") === e || n.id === e) || null;
}
function T(t, e) {
  const n = Math.min(t.length, e.length);
  for (let r = 0; r < n; r += 1)
    if (t[r] !== e[r])
      return t[r] - e[r];
  return t.length - e.length;
}
function J(t, e) {
  const n = {}, r = [], u = /* @__PURE__ */ new Set([...Object.keys(t), ...Object.keys(e)]);
  for (const c of u) {
    if (!(c in e)) {
      r.push(c);
      continue;
    }
    t[c] !== e[c] && (n[c] = e[c]);
  }
  return {
    set: Object.keys(n).length ? n : null,
    remove: r
  };
}
function rt(t) {
  return t.type === "root" ? t.children.map((e) => D(e, 0)).join(`
`) : D(t, 0);
}
function D(t, e) {
  var c, f;
  if (t.type === "text")
    return `${o(e)}${y(t.value)}`;
  const n = Object.entries(t.attrs || {}).filter(([, a]) => typeof a != "function").map(([a, i]) => i === "" ? a : `${a}="${Q(i)}"`).join(" "), r = n ? `<${t.tag} ${n}>` : `<${t.tag}>`;
  if (t.tag === "textarea")
    return `${o(e)}${r}${y(((c = t.attrs) == null ? void 0 : c.value) ?? "")}</${t.tag}>`;
  if (C.has(t.tag))
    return `${o(e)}${r}`;
  if (!((f = t.children) != null && f.length))
    return `${o(e)}${r}</${t.tag}>`;
  if (t.children.length === 1 && t.children[0].type === "text" && t.children[0].value.length <= 48 && !t.children[0].value.includes(`
`))
    return `${o(e)}${r}${y(t.children[0].value)}</${t.tag}>`;
  const u = t.children.map((a) => D(a, e + 1)).join(`
`);
  return `${o(e)}${r}
${u}
${o(e)}</${t.tag}>`;
}
function o(t) {
  return "  ".repeat(t);
}
function y(t) {
  return String(t).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function Q(t) {
  return y(t).replaceAll('"', "&quot;");
}
function V(t, e) {
  return t.startsWith("on") && typeof e == "function";
}
function k(t, e) {
  return !t || !e || t.type !== e.type ? !1 : t.type === "text" ? !0 : t.tag === e.tag;
}
function Y(t, e) {
  if (!t.length || !e.length)
    return !1;
  const n = t.map((u) => s(u)), r = e.map((u) => s(u));
  return !n.every(Boolean) || !r.every(Boolean) ? !1 : new Set(n).size === n.length && new Set(r).size === r.length;
}
function ct(t) {
  const e = {
    totalNodes: 0,
    elements: 0,
    textNodes: 0,
    keyedElements: 0,
    maxDepth: 0
  };
  return S(t, 0, (n, r) => {
    if (n.type === "root") {
      e.maxDepth = Math.max(e.maxDepth, r);
      return;
    }
    if (e.totalNodes += 1, e.maxDepth = Math.max(e.maxDepth, r), n.type === "text") {
      e.textNodes += 1;
      return;
    }
    e.elements += 1, s(n) && (e.keyedElements += 1);
  }), e;
}
function S(t, e, n) {
  var r;
  if (n(t, e), !!((r = t.children) != null && r.length))
    for (const u of t.children)
      S(u, e + 1, n);
}
export {
  P as applyPatchOperations,
  g as cloneVNode,
  ct as countVNodeStats,
  A as createRootVNode,
  v as diffTrees,
  m as domNodeToVNode,
  tt as domNodeToVNodeTree,
  s as getVNodeKey,
  et as mountVNode,
  Z as parseHtmlToVNode,
  nt as patchDom,
  B as removeDomAttribute,
  h as renderVNode,
  rt as serializeVNodeToHtml,
  L as setDomAttribute
};
