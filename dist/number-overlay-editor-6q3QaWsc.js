import * as ie from "react";
import Q, { useRef as X, useState as xe, useEffect as ve, useMemo as Fe, useLayoutEffect as je } from "react";
import { s as Le } from "./index-ciHcxGZv.js";
const Me = /* @__PURE__ */ Le("div")({
  name: "NumberOverlayEditorStyle",
  class: "gdg-n15fjm3e",
  propsAsIs: !1
});
function ye(e, t) {
  var r = {};
  for (var n in e)
    Object.prototype.hasOwnProperty.call(e, n) && t.indexOf(n) < 0 && (r[n] = e[n]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, n = Object.getOwnPropertySymbols(e); a < n.length; a++)
      t.indexOf(n[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, n[a]) && (r[n[a]] = e[n[a]]);
  return r;
}
var re;
(function(e) {
  e.event = "event", e.props = "prop";
})(re || (re = {}));
function Z() {
}
function ke(e) {
  var t, r = void 0;
  return function() {
    for (var n = [], a = arguments.length; a--; ) n[a] = arguments[a];
    return t && n.length === t.length && n.every(function(i, l) {
      return i === t[l];
    }) || (t = n, r = e.apply(void 0, n)), r;
  };
}
function ae(e) {
  return !!(e || "").match(/\d/);
}
function Y(e) {
  return e == null;
}
function Pe(e) {
  return typeof e == "number" && isNaN(e);
}
function be(e) {
  return Y(e) || Pe(e) || typeof e == "number" && !isFinite(e);
}
function Ve(e) {
  return e.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
}
function Ke(e) {
  switch (e) {
    case "lakh":
      return /(\d+?)(?=(\d\d)+(\d)(?!\d))(\.\d+)?/g;
    case "wan":
      return /(\d)(?=(\d{4})+(?!\d))/g;
    default:
      return /(\d)(?=(\d{3})+(?!\d))/g;
  }
}
function We(e, t, r) {
  var n = Ke(r), a = e.search(/[1-9]/);
  return a = a === -1 ? e.length : a, e.substring(0, a) + e.substring(a, e.length).replace(n, "$1" + t);
}
function Ue(e) {
  var t = X(e);
  t.current = e;
  var r = X(function() {
    for (var n = [], a = arguments.length; a--; ) n[a] = arguments[a];
    return t.current.apply(t, n);
  });
  return r.current;
}
function de(e, t) {
  t === void 0 && (t = !0);
  var r = e[0] === "-", n = r && t;
  e = e.replace("-", "");
  var a = e.split("."), i = a[0], l = a[1] || "";
  return {
    beforeDecimal: i,
    afterDecimal: l,
    hasNegation: r,
    addNegation: n
  };
}
function $e(e) {
  if (!e)
    return e;
  var t = e[0] === "-";
  t && (e = e.substring(1, e.length));
  var r = e.split("."), n = r[0].replace(/^0+/, "") || "0", a = r[1] || "";
  return (t ? "-" : "") + n + (a ? "." + a : "");
}
function Ne(e, t, r) {
  for (var n = "", a = r ? "0" : "", i = 0; i <= t - 1; i++)
    n += e[i] || a;
  return n;
}
function me(e, t) {
  return Array(t + 1).join(e);
}
function we(e) {
  var t = e + "", r = t[0] === "-" ? "-" : "";
  r && (t = t.substring(1));
  var n = t.split(/[eE]/g), a = n[0], i = n[1];
  if (i = Number(i), !i)
    return r + a;
  a = a.replace(".", "");
  var l = 1 + i, m = a.length;
  return l < 0 ? a = "0." + me("0", Math.abs(l)) + a : l >= m ? a = a + me("0", l - m) : a = (a.substring(0, l) || "0") + "." + a.substring(l), r + a;
}
function he(e, t, r) {
  if (["", "-"].indexOf(e) !== -1)
    return e;
  var n = (e.indexOf(".") !== -1 || r) && t, a = de(e), i = a.beforeDecimal, l = a.afterDecimal, m = a.hasNegation, S = parseFloat("0." + (l || "0")), p = l.length <= t ? "0." + l : S.toFixed(t), h = p.split("."), c = i;
  i && Number(h[0]) && (c = i.split("").reverse().reduce(function(I, C, g) {
    return I.length > g ? (Number(I[0]) + Number(C)).toString() + I.substring(1, I.length) : C + I;
  }, h[0]));
  var x = Ne(h[1] || "", t, r), y = m ? "-" : "", v = n ? "." : "";
  return "" + y + c + v + x;
}
function z(e, t) {
  if (e.value = e.value, e !== null) {
    if (e.createTextRange) {
      var r = e.createTextRange();
      return r.move("character", t), r.select(), !0;
    }
    return e.selectionStart || e.selectionStart === 0 ? (e.focus(), e.setSelectionRange(t, t), !0) : (e.focus(), !1);
  }
}
var De = ke(function(e, t) {
  for (var r = 0, n = 0, a = e.length, i = t.length; e[r] === t[r] && r < a; )
    r++;
  for (; e[a - 1 - n] === t[i - 1 - n] && i - n > r && a - n > r; )
    n++;
  return {
    from: { start: r, end: a - n },
    to: { start: r, end: i - n }
  };
}), Ge = function(e, t) {
  var r = Math.min(e.selectionStart, t);
  return {
    from: { start: r, end: e.selectionEnd },
    to: { start: r, end: t }
  };
};
function Ze(e, t, r) {
  return Math.min(Math.max(e, t), r);
}
function se(e) {
  return Math.max(e.selectionStart, e.selectionEnd);
}
function qe() {
  return typeof navigator < "u" && !(navigator.platform && /iPhone|iPod/.test(navigator.platform));
}
function ze(e) {
  return {
    from: {
      start: 0,
      end: 0
    },
    to: {
      start: 0,
      end: e.length
    },
    lastValue: ""
  };
}
function He(e) {
  var t = e.currentValue, r = e.formattedValue, n = e.currentValueIndex, a = e.formattedValueIndex;
  return t[n] === r[a];
}
function Je(e, t, r, n, a, i, l) {
  l === void 0 && (l = He);
  var m = a.findIndex(function(M) {
    return M;
  }), S = e.slice(0, m);
  !t && !r.startsWith(S) && (t = S, r = S + r, n = n + S.length);
  for (var p = r.length, h = e.length, c = {}, x = new Array(p), y = 0; y < p; y++) {
    x[y] = -1;
    for (var v = 0, I = h; v < I; v++) {
      var C = l({
        currentValue: r,
        lastValue: t,
        formattedValue: e,
        currentValueIndex: y,
        formattedValueIndex: v
      });
      if (C && c[v] !== !0) {
        x[y] = v, c[v] = !0;
        break;
      }
    }
  }
  for (var g = n; g < p && (x[g] === -1 || !i(r[g])); )
    g++;
  var T = g === p || x[g] === -1 ? h : x[g];
  for (g = n - 1; g > 0 && x[g] === -1; )
    g--;
  var B = g === -1 || x[g] === -1 ? 0 : x[g] + 1;
  return B > T ? T : n - B < T - n ? B : T;
}
function Se(e, t, r, n) {
  var a = e.length;
  if (t = Ze(t, 0, a), n === "left") {
    for (; t >= 0 && !r[t]; )
      t--;
    t === -1 && (t = r.indexOf(!0));
  } else {
    for (; t <= a && !r[t]; )
      t++;
    t > a && (t = r.lastIndexOf(!0));
  }
  return t === -1 && (t = a), t;
}
function Qe(e) {
  for (var t = Array.from({ length: e.length + 1 }).map(function() {
    return !0;
  }), r = 0, n = t.length; r < n; r++)
    t[r] = !!(ae(e[r]) || ae(e[r - 1]));
  return t;
}
function Ie(e, t, r, n, a, i) {
  i === void 0 && (i = Z);
  var l = Ue(function(v, I) {
    var C, g;
    return be(v) ? (g = "", C = "") : typeof v == "number" || I ? (g = typeof v == "number" ? we(v) : v, C = n(g)) : (g = a(v, void 0), C = n(g)), { formattedValue: C, numAsString: g };
  }), m = xe(function() {
    return l(Y(e) ? t : e, r);
  }), S = m[0], p = m[1], h = function(v, I) {
    v.formattedValue !== S.formattedValue && p({
      formattedValue: v.formattedValue,
      numAsString: v.value
    }), i(v, I);
  }, c = e, x = r;
  Y(e) && (c = S.numAsString, x = !0);
  var y = l(c, x);
  return Fe(function() {
    p(y);
  }, [y.formattedValue]), [S, h];
}
function Xe(e) {
  return e.replace(/[^0-9]/g, "");
}
function Ye(e) {
  return e;
}
function et(e) {
  var t = e.type;
  t === void 0 && (t = "text");
  var r = e.displayType;
  r === void 0 && (r = "input");
  var n = e.customInput, a = e.renderText, i = e.getInputRef, l = e.format;
  l === void 0 && (l = Ye);
  var m = e.removeFormatting;
  m === void 0 && (m = Xe);
  var S = e.defaultValue, p = e.valueIsNumericString, h = e.onValueChange, c = e.isAllowed, x = e.onChange;
  x === void 0 && (x = Z);
  var y = e.onKeyDown;
  y === void 0 && (y = Z);
  var v = e.onMouseUp;
  v === void 0 && (v = Z);
  var I = e.onFocus;
  I === void 0 && (I = Z);
  var C = e.onBlur;
  C === void 0 && (C = Z);
  var g = e.value, T = e.getCaretBoundary;
  T === void 0 && (T = Qe);
  var B = e.isValidInputCharacter;
  B === void 0 && (B = ae);
  var M = e.isCharacterSame, F = ye(e, ["type", "displayType", "customInput", "renderText", "getInputRef", "format", "removeFormatting", "defaultValue", "valueIsNumericString", "onValueChange", "isAllowed", "onChange", "onKeyDown", "onMouseUp", "onFocus", "onBlur", "value", "getCaretBoundary", "isValidInputCharacter", "isCharacterSame"]), q = Ie(g, S, !!p, l, m, h), k = q[0], V = k.formattedValue, j = k.numAsString, K = q[1], L = X(), W = X({ formattedValue: V, numAsString: j }), U = function(o, u) {
    W.current = { formattedValue: o.formattedValue, numAsString: o.value }, K(o, u);
  }, H = xe(!1), ee = H[0], d = H[1], f = X(null), N = X({
    setCaretTimeout: null,
    focusTimeout: null
  });
  ve(function() {
    return d(!0), function() {
      clearTimeout(N.current.setCaretTimeout), clearTimeout(N.current.focusTimeout);
    };
  }, []);
  var A = l, O = function(o, u) {
    var s = parseFloat(u);
    return {
      formattedValue: o,
      value: u,
      floatValue: isNaN(s) ? void 0 : s
    };
  }, E = function(o, u, s) {
    o.selectionStart === 0 && o.selectionEnd === o.value.length || (z(o, u), N.current.setCaretTimeout = setTimeout(function() {
      o.value === s && o.selectionStart !== u && z(o, u);
    }, 0));
  }, R = function(o, u, s) {
    return Se(o, u, T(o), s);
  }, J = function(o, u, s) {
    var w = T(u), _ = Je(u, V, o, s, w, B, M);
    return _ = Se(u, _, w), _;
  }, ue = function(o) {
    var u = o.formattedValue;
    u === void 0 && (u = "");
    var s = o.input, w = o.source, _ = o.event, D = o.numAsString, b;
    if (s) {
      var P = o.inputValue || s.value, $ = se(s);
      s.value = u, b = J(P, u, $), b !== void 0 && E(s, b, u);
    }
    u !== V && U(O(u, D), { event: _, source: w });
  };
  ve(function() {
    var o = W.current, u = o.formattedValue, s = o.numAsString;
    (V !== u || j !== s) && U(O(V, j), {
      event: void 0,
      source: re.props
    });
  }, [V, j]);
  var te = f.current ? se(f.current) : void 0, ne = typeof window < "u" ? je : ve;
  ne(function() {
    var o = f.current;
    if (V !== W.current.formattedValue && o) {
      var u = J(W.current.formattedValue, V, te);
      o.value = V, E(o, u, V);
    }
  }, [V]);
  var le = function(o, u, s) {
    var w = u.target, _ = L.current ? Ge(L.current, w.selectionEnd) : De(V, o), D = Object.assign(Object.assign({}, _), { lastValue: V }), b = m(o, D), P = A(b);
    if (b = m(P, void 0), c && !c(O(P, b))) {
      var $ = u.target, G = se($), ce = J(o, V, G);
      return $.value = V, E($, ce, V), !1;
    }
    return ue({
      formattedValue: P,
      numAsString: b,
      inputValue: o,
      event: u,
      source: s,
      input: u.target
    }), !0;
  }, fe = function(o, u) {
    u === void 0 && (u = 0);
    var s = o.selectionStart, w = o.selectionEnd;
    L.current = { selectionStart: s, selectionEnd: w + u };
  }, Ee = function(o) {
    var u = o.target, s = u.value, w = le(s, o, re.event);
    w && x(o), L.current = void 0;
  }, Ae = function(o) {
    var u = o.target, s = o.key, w = u.selectionStart, _ = u.selectionEnd, D = u.value;
    D === void 0 && (D = "");
    var b;
    s === "ArrowLeft" || s === "Backspace" ? b = Math.max(w - 1, 0) : s === "ArrowRight" ? b = Math.min(w + 1, D.length) : s === "Delete" && (b = w);
    var P = 0;
    s === "Delete" && w === _ && (P = 1);
    var $ = s === "ArrowLeft" || s === "ArrowRight";
    if (b === void 0 || w !== _ && !$) {
      y(o), fe(u, P);
      return;
    }
    var G = b;
    if ($) {
      var ce = s === "ArrowLeft" ? "left" : "right";
      G = R(D, b, ce), G !== b && o.preventDefault();
    } else s === "Delete" && !B(D[b]) ? G = R(D, b, "right") : s === "Backspace" && !B(D[b]) && (G = R(D, b, "left"));
    G !== b && E(u, G, D), y(o), fe(u, P);
  }, Oe = function(o) {
    var u = o.target, s = function() {
      var w = u.selectionStart, _ = u.selectionEnd, D = u.value;
      if (D === void 0 && (D = ""), w === _) {
        var b = R(D, w);
        b !== w && E(u, b, D);
      }
    };
    s(), requestAnimationFrame(function() {
      s();
    }), v(o), fe(u);
  }, Re = function(o) {
    o.persist && o.persist();
    var u = o.target, s = o.currentTarget;
    f.current = u, N.current.focusTimeout = setTimeout(function() {
      var w = u.selectionStart, _ = u.selectionEnd, D = u.value;
      D === void 0 && (D = "");
      var b = R(D, w);
      b !== w && !(w === 0 && _ === D.length) && E(u, b, D), I(Object.assign(Object.assign({}, o), { currentTarget: s }));
    }, 0);
  }, Te = function(o) {
    f.current = null, clearTimeout(N.current.focusTimeout), clearTimeout(N.current.setCaretTimeout), C(o);
  }, Be = ee && qe() ? "numeric" : void 0, ge = Object.assign({ inputMode: Be }, F, {
    type: t,
    value: V,
    onChange: Ee,
    onKeyDown: Ae,
    onMouseUp: Oe,
    onFocus: Re,
    onBlur: Te
  });
  if (r === "text")
    return a ? Q.createElement(Q.Fragment, null, a(V, F) || null) : Q.createElement("span", Object.assign({}, F, { ref: i }), V);
  if (n) {
    var _e = n;
    return Q.createElement(_e, Object.assign({}, ge, { ref: i }));
  }
  return Q.createElement("input", Object.assign({}, ge, { ref: i }));
}
function pe(e, t) {
  var r = t.decimalScale, n = t.fixedDecimalScale, a = t.prefix;
  a === void 0 && (a = "");
  var i = t.suffix;
  i === void 0 && (i = "");
  var l = t.allowNegative, m = t.thousandsGroupStyle;
  if (m === void 0 && (m = "thousand"), e === "" || e === "-")
    return e;
  var S = oe(t), p = S.thousandSeparator, h = S.decimalSeparator, c = r !== 0 && e.indexOf(".") !== -1 || r && n, x = de(e, l), y = x.beforeDecimal, v = x.afterDecimal, I = x.addNegation;
  return r !== void 0 && (v = Ne(v, r, !!n)), p && (y = We(y, p, m)), a && (y = a + y), i && (v = v + i), I && (y = "-" + y), e = y + (c && h || "") + v, e;
}
function oe(e) {
  var t = e.decimalSeparator;
  t === void 0 && (t = ".");
  var r = e.thousandSeparator, n = e.allowedDecimalSeparators;
  return r === !0 && (r = ","), n || (n = [t, "."]), {
    decimalSeparator: t,
    thousandSeparator: r,
    allowedDecimalSeparators: n
  };
}
function tt(e, t) {
  e === void 0 && (e = "");
  var r = new RegExp("(-)"), n = new RegExp("(-)(.)*(-)"), a = r.test(e), i = n.test(e);
  return e = e.replace(/-/g, ""), a && !i && t && (e = "-" + e), e;
}
function rt(e, t) {
  return new RegExp("(^-)|[0-9]|" + Ve(e), "g");
}
function at(e, t, r) {
  return e === "" ? !0 : !t?.match(/\d/) && !r?.match(/\d/) && typeof e == "string" && !isNaN(Number(e));
}
function nt(e, t, r) {
  var n;
  t === void 0 && (t = ze(e));
  var a = r.allowNegative, i = r.prefix;
  i === void 0 && (i = "");
  var l = r.suffix;
  l === void 0 && (l = "");
  var m = r.decimalScale, S = t.from, p = t.to, h = p.start, c = p.end, x = oe(r), y = x.allowedDecimalSeparators, v = x.decimalSeparator, I = e[c] === v;
  if (ae(e) && (e === i || e === l) && t.lastValue === "")
    return e;
  if (c - h === 1 && y.indexOf(e[h]) !== -1) {
    var C = m === 0 ? "" : v;
    e = e.substring(0, h) + C + e.substring(h + 1, e.length);
  }
  var g = function(f, N, A) {
    var O = !1, E = !1;
    i.startsWith("-") ? O = !1 : f.startsWith("--") ? (O = !1, E = !0) : l.startsWith("-") && f.length === l.length ? O = !1 : f[0] === "-" && (O = !0);
    var R = O ? 1 : 0;
    return E && (R = 2), R && (f = f.substring(R), N -= R, A -= R), { value: f, start: N, end: A, hasNegation: O };
  }, T = g(e, h, c), B = T.hasNegation;
  n = T, e = n.value, h = n.start, c = n.end;
  var M = g(t.lastValue, S.start, S.end), F = M.start, q = M.end, k = M.value, V = e.substring(h, c);
  e.length && k.length && (F > k.length - l.length || q < i.length) && !(V && l.startsWith(V)) && (e = k);
  var j = 0;
  e.startsWith(i) ? j += i.length : h < i.length && (j = h), e = e.substring(j), c -= j;
  var K = e.length, L = e.length - l.length;
  e.endsWith(l) ? K = L : (c > L || c > e.length - l.length) && (K = c), e = e.substring(0, K), e = tt(B ? "-" + e : e, a), e = (e.match(rt(v)) || []).join("");
  var W = e.indexOf(v);
  e = e.replace(new RegExp(Ve(v), "g"), function(f, N) {
    return N === W ? "." : "";
  });
  var U = de(e, a), H = U.beforeDecimal, ee = U.afterDecimal, d = U.addNegation;
  return p.end - p.start < S.end - S.start && H === "" && I && !parseFloat(ee) && (e = d ? "-" : ""), e;
}
function it(e, t) {
  var r = t.prefix;
  r === void 0 && (r = "");
  var n = t.suffix;
  n === void 0 && (n = "");
  var a = Array.from({ length: e.length + 1 }).map(function() {
    return !0;
  }), i = e[0] === "-";
  a.fill(!1, 0, r.length + (i ? 1 : 0));
  var l = e.length;
  return a.fill(!1, l - n.length + 1, l + 1), a;
}
function ot(e) {
  var t = oe(e), r = t.thousandSeparator, n = t.decimalSeparator, a = e.prefix;
  a === void 0 && (a = "");
  var i = e.allowNegative;
  if (i === void 0 && (i = !0), r === n)
    throw new Error(`
        Decimal separator can't be same as thousand separator.
        thousandSeparator: ` + r + ` (thousandSeparator = {true} is same as thousandSeparator = ",")
        decimalSeparator: ` + n + ` (default value for decimalSeparator is .)
     `);
  return a.startsWith("-") && i && (console.error(`
      Prefix can't start with '-' when allowNegative is true.
      prefix: ` + a + `
      allowNegative: ` + i + `
    `), i = !1), Object.assign(Object.assign({}, e), { allowNegative: i });
}
function ut(e) {
  e = ot(e), e.decimalSeparator, e.allowedDecimalSeparators, e.thousandsGroupStyle;
  var t = e.suffix, r = e.allowNegative, n = e.allowLeadingZeros, a = e.onKeyDown;
  a === void 0 && (a = Z);
  var i = e.onBlur;
  i === void 0 && (i = Z);
  var l = e.thousandSeparator, m = e.decimalScale, S = e.fixedDecimalScale, p = e.prefix;
  p === void 0 && (p = "");
  var h = e.defaultValue, c = e.value, x = e.valueIsNumericString, y = e.onValueChange, v = ye(e, ["decimalSeparator", "allowedDecimalSeparators", "thousandsGroupStyle", "suffix", "allowNegative", "allowLeadingZeros", "onKeyDown", "onBlur", "thousandSeparator", "decimalScale", "fixedDecimalScale", "prefix", "defaultValue", "value", "valueIsNumericString", "onValueChange"]), I = oe(e), C = I.decimalSeparator, g = I.allowedDecimalSeparators, T = function(d) {
    return pe(d, e);
  }, B = function(d, f) {
    return nt(d, f, e);
  }, M = Y(c) ? h : c, F = x ?? at(M, p, t);
  Y(c) ? Y(h) || (F = F || typeof h == "number") : F = F || typeof c == "number";
  var q = function(d) {
    return be(d) ? d : (typeof d == "number" && (d = we(d)), F && typeof m == "number" ? he(d, m, !!S) : d);
  }, k = Ie(q(c), q(h), !!F, T, B, y), V = k[0], j = V.numAsString, K = V.formattedValue, L = k[1], W = function(d) {
    var f = d.target, N = d.key, A = f.selectionStart, O = f.selectionEnd, E = f.value;
    if (E === void 0 && (E = ""), (N === "Backspace" || N === "Delete") && O < p.length) {
      d.preventDefault();
      return;
    }
    if (A !== O) {
      a(d);
      return;
    }
    N === "Backspace" && E[0] === "-" && A === p.length + 1 && r && z(f, 1), m && S && (N === "Backspace" && E[A - 1] === C ? (z(f, A - 1), d.preventDefault()) : N === "Delete" && E[A] === C && d.preventDefault()), g?.includes(N) && E[A] === C && z(f, A + 1);
    var R = l === !0 ? "," : l;
    N === "Backspace" && E[A - 1] === R && z(f, A - 1), N === "Delete" && E[A] === R && z(f, A + 1), a(d);
  }, U = function(d) {
    var f = j;
    if (f.match(/\d/g) || (f = ""), n || (f = $e(f)), S && m && (f = he(f, m, S)), f !== j) {
      var N = pe(f, e);
      L({
        formattedValue: N,
        value: f,
        floatValue: parseFloat(f)
      }, {
        event: d,
        source: re.event
      });
    }
    i(d);
  }, H = function(d) {
    return d === C ? !0 : ae(d);
  }, ee = function(d) {
    var f = d.currentValue, N = d.lastValue, A = d.formattedValue, O = d.currentValueIndex, E = d.formattedValueIndex, R = f[O], J = A[E], ue = De(N, f), te = ue.to, ne = function(le) {
      return B(le).indexOf(".") + p.length;
    };
    return c === 0 && S && m && f[te.start] === C && ne(f) < O && ne(A) > E ? !1 : O >= te.start && O < te.end && g && g.includes(R) && J === C ? !0 : R === J;
  };
  return Object.assign(Object.assign({}, v), {
    value: K,
    valueIsNumericString: !1,
    isValidInputCharacter: H,
    isCharacterSame: ee,
    onValueChange: L,
    format: T,
    removeFormatting: B,
    getCaretBoundary: function(d) {
      return it(d, e);
    },
    onKeyDown: W,
    onBlur: U
  });
}
function lt(e) {
  var t = ut(e);
  return Q.createElement(et, Object.assign({}, t));
}
function Ce() {
  return Intl.NumberFormat()?.formatToParts(1.1)?.find((r) => r.type === "decimal")?.value ?? ".";
}
function ft() {
  return Ce() === "." ? "," : ".";
}
const st = (e) => {
  const { value: t, onChange: r, disabled: n, highlight: a, validatedSelection: i, fixedDecimals: l, allowNegative: m, thousandSeparator: S, decimalSeparator: p } = e, h = ie.useRef();
  return ie.useLayoutEffect(() => {
    if (i !== void 0) {
      const c = typeof i == "number" ? [i, null] : i;
      h.current?.setSelectionRange(c[0], c[1]);
    }
  }, [i]), ie.createElement(
    Me,
    null,
    ie.createElement(lt, {
      autoFocus: !0,
      getInputRef: h,
      className: "gdg-input",
      onFocus: (c) => c.target.setSelectionRange(a ? 0 : c.target.value.length, c.target.value.length),
      disabled: n === !0,
      decimalScale: l,
      allowNegative: m,
      thousandSeparator: S ?? ft(),
      decimalSeparator: p ?? Ce(),
      value: Object.is(t, -0) ? "-" : t ?? "",
      // decimalScale={3}
      // prefix={"$"}
      onValueChange: r
    })
  );
};
export {
  st as default
};
