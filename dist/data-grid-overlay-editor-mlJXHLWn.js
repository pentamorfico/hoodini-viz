import * as r from "react";
import { createPortal as L } from "react-dom";
import { s as $, i as D, a as z, b as J, T as Q, C as U, m as Z } from "./index-B3Khzral.js";
const ee = () => (t) => t.targetX, te = () => (t) => t.targetY, re = () => (t) => t.targetWidth, ne = () => (t) => t.targetHeight, ie = () => (t) => t.targetY + 10, se = () => (t) => Math.max(0, (t.targetHeight - 28) / 2), ae = /* @__PURE__ */ $("div")({
  name: "DataGridOverlayEditorStyle",
  class: "gdg-d19meir1",
  propsAsIs: !1,
  vars: {
    "d19meir1-0": [te(), "px"],
    "d19meir1-1": [ee(), "px"],
    "d19meir1-2": [re(), "px"],
    "d19meir1-3": [ne(), "px"],
    "d19meir1-4": [ie(), "px"],
    "d19meir1-5": [se(), "px"]
  }
});
function oe() {
  const [t, s] = r.useState();
  return [t ?? void 0, s];
}
function de() {
  const [t, s] = oe(), [n, p] = r.useState(0), [f, b] = r.useState(!0);
  r.useLayoutEffect(() => {
    if (t === void 0 || !("IntersectionObserver" in window))
      return;
    const a = new IntersectionObserver((o) => {
      o.length !== 0 && b(o[0].isIntersecting);
    }, { threshold: 1 });
    return a.observe(t), () => a.disconnect();
  }, [t]), r.useEffect(() => {
    if (f || t === void 0)
      return;
    let a;
    const o = () => {
      const { right: v } = t.getBoundingClientRect();
      p((g) => Math.min(g + window.innerWidth - v - 10, 0)), a = requestAnimationFrame(o);
    };
    return a = requestAnimationFrame(o), () => {
      a !== void 0 && cancelAnimationFrame(a);
    };
  }, [t, f]);
  const C = r.useMemo(() => ({ transform: `translateX(${n}px)` }), [n]);
  return {
    ref: s,
    style: C
  };
}
const ce = (t) => {
  const { target: s, content: n, onFinishEditing: p, forceEditMode: f, initialValue: b, imageEditorOverride: C, markdownDivCreateNode: a, highlight: o, className: v, theme: g, id: G, cell: O, bloom: I, validateCell: m, getCellRenderer: w, provideEditor: F, isOutsideClick: H } = t, [d, X] = r.useState(f ? n : void 0), x = r.useRef(d ?? n);
  x.current = d ?? n;
  const [y, S] = r.useState(() => m === void 0 ? !0 : !(D(n) && m?.(O, n, x.current) === !1)), u = r.useCallback((e, i) => {
    p(y ? e : void 0, i);
  }, [y, p]), A = r.useCallback((e) => {
    if (m !== void 0 && e !== void 0 && D(e)) {
      const i = m(O, e, x.current);
      i === !1 ? S(!1) : (typeof i == "object" && (e = i), S(!0));
    }
    X(e);
  }, [O, m]), h = r.useRef(!1), c = r.useRef(void 0), K = r.useCallback(() => {
    u(d, [0, 0]), h.current = !0;
  }, [d, u]), W = r.useCallback((e, i) => {
    u(e, i ?? c.current ?? [0, 0]), h.current = !0;
  }, [u]), Y = r.useCallback(async (e) => {
    let i = !1;
    e.key === "Escape" ? (e.stopPropagation(), e.preventDefault(), c.current = [0, 0]) : e.key === "Enter" && !e.shiftKey ? (e.stopPropagation(), e.preventDefault(), c.current = [0, 1], i = !0) : e.key === "Tab" && (e.stopPropagation(), e.preventDefault(), c.current = [e.shiftKey ? -1 : 1, 0], i = !0), window.setTimeout(() => {
      !h.current && c.current !== void 0 && (u(i ? d : void 0, c.current), h.current = !0);
    }, 0);
  }, [u, d]), k = d ?? n, [l, j] = r.useMemo(() => {
    if (z(n))
      return [];
    const e = F?.(n);
    return e !== void 0 ? [e, !1] : [w(n)?.provideEditor?.(n), !1];
  }, [n, w, F]), { ref: q, style: B } = de();
  let P = !0, M, _ = !0, E;
  if (l !== void 0) {
    P = l.disablePadding !== !0, _ = l.disableStyling !== !0;
    const e = J(l);
    e && (E = l.styleOverride);
    const i = e ? l.editor : l;
    M = r.createElement(i, { isHighlighted: o, onChange: A, value: k, initialValue: b, onFinishedEditing: W, validatedSelection: D(k) ? k.selectionRange : void 0, forceEditMode: f, target: s, imageEditorOverride: C, markdownDivCreateNode: a, isValid: y, theme: g });
  }
  E = { ...E, ...B };
  const N = document.getElementById("portal");
  if (N === null)
    return console.error('Cannot open Data Grid overlay editor, because portal not found.  Please add `<div id="portal" />` as the last child of your `<body>`.'), null;
  let R = _ ? "gdg-style" : "gdg-unstyle";
  y || (R += " gdg-invalid"), P && (R += " gdg-pad");
  const T = I?.[0] ?? 1, V = I?.[1] ?? 1;
  return L(r.createElement(
    Q.Provider,
    { value: g },
    r.createElement(
      U,
      { style: Z(g), className: v, onClickOutside: K, isOutsideClick: H },
      r.createElement(
        ae,
        { ref: q, id: G, className: R, style: E, as: j === !0 ? "label" : void 0, targetX: s.x - T, targetY: s.y - V, targetWidth: s.width + T * 2, targetHeight: s.height + V * 2 },
        r.createElement("div", { className: "gdg-clip-region", onKeyDown: Y }, M)
      )
    )
  ), N);
};
export {
  ce as default
};
