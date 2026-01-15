function Za(g, D) {
  for (var P = 0; P < D.length; P++) {
    const v = D[P];
    if (typeof v != "string" && !Array.isArray(v)) {
      for (const F in v)
        if (F !== "default" && !(F in g)) {
          const c = Object.getOwnPropertyDescriptor(v, F);
          c && Object.defineProperty(g, F, c.get ? c : {
            enumerable: !0,
            get: () => v[F]
          });
        }
    }
  }
  return Object.freeze(Object.defineProperty(g, Symbol.toStringTag, { value: "Module" }));
}
var Je = {}, oa;
function He() {
  return oa || (oa = 1, (function(g) {
    var D = typeof Uint8Array < "u" && typeof Uint16Array < "u" && typeof Int32Array < "u";
    function P(c, s) {
      return Object.prototype.hasOwnProperty.call(c, s);
    }
    g.assign = function(c) {
      for (var s = Array.prototype.slice.call(arguments, 1); s.length; ) {
        var w = s.shift();
        if (w) {
          if (typeof w != "object")
            throw new TypeError(w + "must be non-object");
          for (var _ in w)
            P(w, _) && (c[_] = w[_]);
        }
      }
      return c;
    }, g.shrinkBuf = function(c, s) {
      return c.length === s ? c : c.subarray ? c.subarray(0, s) : (c.length = s, c);
    };
    var v = {
      arraySet: function(c, s, w, _, Z) {
        if (s.subarray && c.subarray) {
          c.set(s.subarray(w, w + _), Z);
          return;
        }
        for (var E = 0; E < _; E++)
          c[Z + E] = s[w + E];
      },
      // Join array of chunks to single array.
      flattenChunks: function(c) {
        var s, w, _, Z, E, z;
        for (_ = 0, s = 0, w = c.length; s < w; s++)
          _ += c[s].length;
        for (z = new Uint8Array(_), Z = 0, s = 0, w = c.length; s < w; s++)
          E = c[s], z.set(E, Z), Z += E.length;
        return z;
      }
    }, F = {
      arraySet: function(c, s, w, _, Z) {
        for (var E = 0; E < _; E++)
          c[Z + E] = s[w + E];
      },
      // Join array of chunks to single array.
      flattenChunks: function(c) {
        return [].concat.apply([], c);
      }
    };
    g.setTyped = function(c) {
      c ? (g.Buf8 = Uint8Array, g.Buf16 = Uint16Array, g.Buf32 = Int32Array, g.assign(g, v)) : (g.Buf8 = Array, g.Buf16 = Array, g.Buf32 = Array, g.assign(g, F));
    }, g.setTyped(D);
  })(Je)), Je;
}
var je = {}, Ie = {}, Pe = {}, da;
function Ia() {
  if (da) return Pe;
  da = 1;
  var g = He(), D = 4, P = 0, v = 1, F = 2;
  function c(i) {
    for (var d = i.length; --d >= 0; )
      i[d] = 0;
  }
  var s = 0, w = 1, _ = 2, Z = 3, E = 258, z = 29, p = 256, k = p + 1 + z, N = 30, ae = 19, O = 2 * k + 1, R = 15, U = 16, T = 7, B = 256, H = 16, I = 17, x = 18, K = (
    /* extra bits for each length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
  ), j = (
    /* extra bits for each distance code */
    [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
  ), q = (
    /* extra bits for each bit length code */
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]
  ), W = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], ee = 512, C = new Array((k + 2) * 2);
  c(C);
  var V = new Array(N * 2);
  c(V);
  var le = new Array(ee);
  c(le);
  var ce = new Array(E - Z + 1);
  c(ce);
  var M = new Array(z);
  c(M);
  var he = new Array(N);
  c(he);
  function te(i, d, b, m, n) {
    this.static_tree = i, this.extra_bits = d, this.extra_base = b, this.elems = m, this.max_length = n, this.has_stree = i && i.length;
  }
  var Se, ke, ue;
  function re(i, d) {
    this.dyn_tree = i, this.max_code = 0, this.stat_desc = d;
  }
  function we(i) {
    return i < 256 ? le[i] : le[256 + (i >>> 7)];
  }
  function de(i, d) {
    i.pending_buf[i.pending++] = d & 255, i.pending_buf[i.pending++] = d >>> 8 & 255;
  }
  function J(i, d, b) {
    i.bi_valid > U - b ? (i.bi_buf |= d << i.bi_valid & 65535, de(i, i.bi_buf), i.bi_buf = d >> U - i.bi_valid, i.bi_valid += b - U) : (i.bi_buf |= d << i.bi_valid & 65535, i.bi_valid += b);
  }
  function ne(i, d, b) {
    J(
      i,
      b[d * 2],
      b[d * 2 + 1]
      /*.Len*/
    );
  }
  function $(i, d) {
    var b = 0;
    do
      b |= i & 1, i >>>= 1, b <<= 1;
    while (--d > 0);
    return b >>> 1;
  }
  function se(i) {
    i.bi_valid === 16 ? (de(i, i.bi_buf), i.bi_buf = 0, i.bi_valid = 0) : i.bi_valid >= 8 && (i.pending_buf[i.pending++] = i.bi_buf & 255, i.bi_buf >>= 8, i.bi_valid -= 8);
  }
  function ye(i, d) {
    var b = d.dyn_tree, m = d.max_code, n = d.stat_desc.static_tree, o = d.stat_desc.has_stree, a = d.stat_desc.extra_bits, u = d.stat_desc.extra_base, L = d.stat_desc.max_length, e, l, h, t, r, f, A = 0;
    for (t = 0; t <= R; t++)
      i.bl_count[t] = 0;
    for (b[i.heap[i.heap_max] * 2 + 1] = 0, e = i.heap_max + 1; e < O; e++)
      l = i.heap[e], t = b[b[l * 2 + 1] * 2 + 1] + 1, t > L && (t = L, A++), b[l * 2 + 1] = t, !(l > m) && (i.bl_count[t]++, r = 0, l >= u && (r = a[l - u]), f = b[l * 2], i.opt_len += f * (t + r), o && (i.static_len += f * (n[l * 2 + 1] + r)));
    if (A !== 0) {
      do {
        for (t = L - 1; i.bl_count[t] === 0; )
          t--;
        i.bl_count[t]--, i.bl_count[t + 1] += 2, i.bl_count[L]--, A -= 2;
      } while (A > 0);
      for (t = L; t !== 0; t--)
        for (l = i.bl_count[t]; l !== 0; )
          h = i.heap[--e], !(h > m) && (b[h * 2 + 1] !== t && (i.opt_len += (t - b[h * 2 + 1]) * b[h * 2], b[h * 2 + 1] = t), l--);
    }
  }
  function ze(i, d, b) {
    var m = new Array(R + 1), n = 0, o, a;
    for (o = 1; o <= R; o++)
      m[o] = n = n + b[o - 1] << 1;
    for (a = 0; a <= d; a++) {
      var u = i[a * 2 + 1];
      u !== 0 && (i[a * 2] = $(m[u]++, u));
    }
  }
  function Q() {
    var i, d, b, m, n, o = new Array(R + 1);
    for (b = 0, m = 0; m < z - 1; m++)
      for (M[m] = b, i = 0; i < 1 << K[m]; i++)
        ce[b++] = m;
    for (ce[b - 1] = m, n = 0, m = 0; m < 16; m++)
      for (he[m] = n, i = 0; i < 1 << j[m]; i++)
        le[n++] = m;
    for (n >>= 7; m < N; m++)
      for (he[m] = n << 7, i = 0; i < 1 << j[m] - 7; i++)
        le[256 + n++] = m;
    for (d = 0; d <= R; d++)
      o[d] = 0;
    for (i = 0; i <= 143; )
      C[i * 2 + 1] = 8, i++, o[8]++;
    for (; i <= 255; )
      C[i * 2 + 1] = 9, i++, o[9]++;
    for (; i <= 279; )
      C[i * 2 + 1] = 7, i++, o[7]++;
    for (; i <= 287; )
      C[i * 2 + 1] = 8, i++, o[8]++;
    for (ze(C, k + 1, o), i = 0; i < N; i++)
      V[i * 2 + 1] = 5, V[i * 2] = $(i, 5);
    Se = new te(C, K, p + 1, k, R), ke = new te(V, j, 0, N, R), ue = new te(new Array(0), q, 0, ae, T);
  }
  function pe(i) {
    var d;
    for (d = 0; d < k; d++)
      i.dyn_ltree[d * 2] = 0;
    for (d = 0; d < N; d++)
      i.dyn_dtree[d * 2] = 0;
    for (d = 0; d < ae; d++)
      i.bl_tree[d * 2] = 0;
    i.dyn_ltree[B * 2] = 1, i.opt_len = i.static_len = 0, i.last_lit = i.matches = 0;
  }
  function Ue(i) {
    i.bi_valid > 8 ? de(i, i.bi_buf) : i.bi_valid > 0 && (i.pending_buf[i.pending++] = i.bi_buf), i.bi_buf = 0, i.bi_valid = 0;
  }
  function me(i, d, b, m) {
    Ue(i), de(i, b), de(i, ~b), g.arraySet(i.pending_buf, i.window, d, b, i.pending), i.pending += b;
  }
  function Ee(i, d, b, m) {
    var n = d * 2, o = b * 2;
    return i[n] < i[o] || i[n] === i[o] && m[d] <= m[b];
  }
  function ie(i, d, b) {
    for (var m = i.heap[b], n = b << 1; n <= i.heap_len && (n < i.heap_len && Ee(d, i.heap[n + 1], i.heap[n], i.depth) && n++, !Ee(d, m, i.heap[n], i.depth)); )
      i.heap[b] = i.heap[n], b = n, n <<= 1;
    i.heap[b] = m;
  }
  function Y(i, d, b) {
    var m, n, o = 0, a, u;
    if (i.last_lit !== 0)
      do
        m = i.pending_buf[i.d_buf + o * 2] << 8 | i.pending_buf[i.d_buf + o * 2 + 1], n = i.pending_buf[i.l_buf + o], o++, m === 0 ? ne(i, n, d) : (a = ce[n], ne(i, a + p + 1, d), u = K[a], u !== 0 && (n -= M[a], J(i, n, u)), m--, a = we(m), ne(i, a, b), u = j[a], u !== 0 && (m -= he[a], J(i, m, u)));
      while (o < i.last_lit);
    ne(i, B, d);
  }
  function Te(i, d) {
    var b = d.dyn_tree, m = d.stat_desc.static_tree, n = d.stat_desc.has_stree, o = d.stat_desc.elems, a, u, L = -1, e;
    for (i.heap_len = 0, i.heap_max = O, a = 0; a < o; a++)
      b[a * 2] !== 0 ? (i.heap[++i.heap_len] = L = a, i.depth[a] = 0) : b[a * 2 + 1] = 0;
    for (; i.heap_len < 2; )
      e = i.heap[++i.heap_len] = L < 2 ? ++L : 0, b[e * 2] = 1, i.depth[e] = 0, i.opt_len--, n && (i.static_len -= m[e * 2 + 1]);
    for (d.max_code = L, a = i.heap_len >> 1; a >= 1; a--)
      ie(i, b, a);
    e = o;
    do
      a = i.heap[
        1
        /*SMALLEST*/
      ], i.heap[
        1
        /*SMALLEST*/
      ] = i.heap[i.heap_len--], ie(
        i,
        b,
        1
        /*SMALLEST*/
      ), u = i.heap[
        1
        /*SMALLEST*/
      ], i.heap[--i.heap_max] = a, i.heap[--i.heap_max] = u, b[e * 2] = b[a * 2] + b[u * 2], i.depth[e] = (i.depth[a] >= i.depth[u] ? i.depth[a] : i.depth[u]) + 1, b[a * 2 + 1] = b[u * 2 + 1] = e, i.heap[
        1
        /*SMALLEST*/
      ] = e++, ie(
        i,
        b,
        1
        /*SMALLEST*/
      );
    while (i.heap_len >= 2);
    i.heap[--i.heap_max] = i.heap[
      1
      /*SMALLEST*/
    ], ye(i, d), ze(b, L, i.bl_count);
  }
  function qe(i, d, b) {
    var m, n = -1, o, a = d[1], u = 0, L = 7, e = 4;
    for (a === 0 && (L = 138, e = 3), d[(b + 1) * 2 + 1] = 65535, m = 0; m <= b; m++)
      o = a, a = d[(m + 1) * 2 + 1], !(++u < L && o === a) && (u < e ? i.bl_tree[o * 2] += u : o !== 0 ? (o !== n && i.bl_tree[o * 2]++, i.bl_tree[H * 2]++) : u <= 10 ? i.bl_tree[I * 2]++ : i.bl_tree[x * 2]++, u = 0, n = o, a === 0 ? (L = 138, e = 3) : o === a ? (L = 6, e = 3) : (L = 7, e = 4));
  }
  function Le(i, d, b) {
    var m, n = -1, o, a = d[1], u = 0, L = 7, e = 4;
    for (a === 0 && (L = 138, e = 3), m = 0; m <= b; m++)
      if (o = a, a = d[(m + 1) * 2 + 1], !(++u < L && o === a)) {
        if (u < e)
          do
            ne(i, o, i.bl_tree);
          while (--u !== 0);
        else o !== 0 ? (o !== n && (ne(i, o, i.bl_tree), u--), ne(i, H, i.bl_tree), J(i, u - 3, 2)) : u <= 10 ? (ne(i, I, i.bl_tree), J(i, u - 3, 3)) : (ne(i, x, i.bl_tree), J(i, u - 11, 7));
        u = 0, n = o, a === 0 ? (L = 138, e = 3) : o === a ? (L = 6, e = 3) : (L = 7, e = 4);
      }
  }
  function Ae(i) {
    var d;
    for (qe(i, i.dyn_ltree, i.l_desc.max_code), qe(i, i.dyn_dtree, i.d_desc.max_code), Te(i, i.bl_desc), d = ae - 1; d >= 3 && i.bl_tree[W[d] * 2 + 1] === 0; d--)
      ;
    return i.opt_len += 3 * (d + 1) + 5 + 5 + 4, d;
  }
  function Ye(i, d, b, m) {
    var n;
    for (J(i, d - 257, 5), J(i, b - 1, 5), J(i, m - 4, 4), n = 0; n < m; n++)
      J(i, i.bl_tree[W[n] * 2 + 1], 3);
    Le(i, i.dyn_ltree, d - 1), Le(i, i.dyn_dtree, b - 1);
  }
  function Me(i) {
    var d = 4093624447, b;
    for (b = 0; b <= 31; b++, d >>>= 1)
      if (d & 1 && i.dyn_ltree[b * 2] !== 0)
        return P;
    if (i.dyn_ltree[18] !== 0 || i.dyn_ltree[20] !== 0 || i.dyn_ltree[26] !== 0)
      return v;
    for (b = 32; b < p; b++)
      if (i.dyn_ltree[b * 2] !== 0)
        return v;
    return P;
  }
  var Ze = !1;
  function Xe(i) {
    Ze || (Q(), Ze = !0), i.l_desc = new re(i.dyn_ltree, Se), i.d_desc = new re(i.dyn_dtree, ke), i.bl_desc = new re(i.bl_tree, ue), i.bi_buf = 0, i.bi_valid = 0, pe(i);
  }
  function Fe(i, d, b, m) {
    J(i, (s << 1) + (m ? 1 : 0), 3), me(i, d, b);
  }
  function be(i) {
    J(i, w << 1, 3), ne(i, B, C), se(i);
  }
  function Oe(i, d, b, m) {
    var n, o, a = 0;
    i.level > 0 ? (i.strm.data_type === F && (i.strm.data_type = Me(i)), Te(i, i.l_desc), Te(i, i.d_desc), a = Ae(i), n = i.opt_len + 3 + 7 >>> 3, o = i.static_len + 3 + 7 >>> 3, o <= n && (n = o)) : n = o = b + 5, b + 4 <= n && d !== -1 ? Fe(i, d, b, m) : i.strategy === D || o === n ? (J(i, (w << 1) + (m ? 1 : 0), 3), Y(i, C, V)) : (J(i, (_ << 1) + (m ? 1 : 0), 3), Ye(i, i.l_desc.max_code + 1, i.d_desc.max_code + 1, a + 1), Y(i, i.dyn_ltree, i.dyn_dtree)), pe(i), m && Ue(i);
  }
  function Ge(i, d, b) {
    return i.pending_buf[i.d_buf + i.last_lit * 2] = d >>> 8 & 255, i.pending_buf[i.d_buf + i.last_lit * 2 + 1] = d & 255, i.pending_buf[i.l_buf + i.last_lit] = b & 255, i.last_lit++, d === 0 ? i.dyn_ltree[b * 2]++ : (i.matches++, d--, i.dyn_ltree[(ce[b] + p + 1) * 2]++, i.dyn_dtree[we(d) * 2]++), i.last_lit === i.lit_bufsize - 1;
  }
  return Pe._tr_init = Xe, Pe._tr_stored_block = Fe, Pe._tr_flush_block = Oe, Pe._tr_tally = Ge, Pe._tr_align = be, Pe;
}
var Qe, ua;
function ma() {
  if (ua) return Qe;
  ua = 1;
  function g(D, P, v, F) {
    for (var c = D & 65535 | 0, s = D >>> 16 & 65535 | 0, w = 0; v !== 0; ) {
      w = v > 2e3 ? 2e3 : v, v -= w;
      do
        c = c + P[F++] | 0, s = s + c | 0;
      while (--w);
      c %= 65521, s %= 65521;
    }
    return c | s << 16 | 0;
  }
  return Qe = g, Qe;
}
var ea, va;
function Ta() {
  if (va) return ea;
  va = 1;
  function g() {
    for (var v, F = [], c = 0; c < 256; c++) {
      v = c;
      for (var s = 0; s < 8; s++)
        v = v & 1 ? 3988292384 ^ v >>> 1 : v >>> 1;
      F[c] = v;
    }
    return F;
  }
  var D = g();
  function P(v, F, c, s) {
    var w = D, _ = s + c;
    v ^= -1;
    for (var Z = s; Z < _; Z++)
      v = v >>> 8 ^ w[(v ^ F[Z]) & 255];
    return v ^ -1;
  }
  return ea = P, ea;
}
var aa, ca;
function ha() {
  return ca || (ca = 1, aa = {
    2: "need dictionary",
    /* Z_NEED_DICT       2  */
    1: "stream end",
    /* Z_STREAM_END      1  */
    0: "",
    /* Z_OK              0  */
    "-1": "file error",
    /* Z_ERRNO         (-1) */
    "-2": "stream error",
    /* Z_STREAM_ERROR  (-2) */
    "-3": "data error",
    /* Z_DATA_ERROR    (-3) */
    "-4": "insufficient memory",
    /* Z_MEM_ERROR     (-4) */
    "-5": "buffer error",
    /* Z_BUF_ERROR     (-5) */
    "-6": "incompatible version"
    /* Z_VERSION_ERROR (-6) */
  }), aa;
}
var sa;
function Oa() {
  if (sa) return Ie;
  sa = 1;
  var g = He(), D = Ia(), P = ma(), v = Ta(), F = ha(), c = 0, s = 1, w = 3, _ = 4, Z = 5, E = 0, z = 1, p = -2, k = -3, N = -5, ae = -1, O = 1, R = 2, U = 3, T = 4, B = 0, H = 2, I = 8, x = 9, K = 15, j = 8, q = 29, W = 256, ee = W + 1 + q, C = 30, V = 19, le = 2 * ee + 1, ce = 15, M = 3, he = 258, te = he + M + 1, Se = 32, ke = 42, ue = 69, re = 73, we = 91, de = 103, J = 113, ne = 666, $ = 1, se = 2, ye = 3, ze = 4, Q = 3;
  function pe(e, l) {
    return e.msg = F[l], l;
  }
  function Ue(e) {
    return (e << 1) - (e > 4 ? 9 : 0);
  }
  function me(e) {
    for (var l = e.length; --l >= 0; )
      e[l] = 0;
  }
  function Ee(e) {
    var l = e.state, h = l.pending;
    h > e.avail_out && (h = e.avail_out), h !== 0 && (g.arraySet(e.output, l.pending_buf, l.pending_out, h, e.next_out), e.next_out += h, l.pending_out += h, e.total_out += h, e.avail_out -= h, l.pending -= h, l.pending === 0 && (l.pending_out = 0));
  }
  function ie(e, l) {
    D._tr_flush_block(e, e.block_start >= 0 ? e.block_start : -1, e.strstart - e.block_start, l), e.block_start = e.strstart, Ee(e.strm);
  }
  function Y(e, l) {
    e.pending_buf[e.pending++] = l;
  }
  function Te(e, l) {
    e.pending_buf[e.pending++] = l >>> 8 & 255, e.pending_buf[e.pending++] = l & 255;
  }
  function qe(e, l, h, t) {
    var r = e.avail_in;
    return r > t && (r = t), r === 0 ? 0 : (e.avail_in -= r, g.arraySet(l, e.input, e.next_in, r, h), e.state.wrap === 1 ? e.adler = P(e.adler, l, r, h) : e.state.wrap === 2 && (e.adler = v(e.adler, l, r, h)), e.next_in += r, e.total_in += r, r);
  }
  function Le(e, l) {
    var h = e.max_chain_length, t = e.strstart, r, f, A = e.prev_length, S = e.nice_match, y = e.strstart > e.w_size - te ? e.strstart - (e.w_size - te) : 0, X = e.window, Be = e.w_mask, fe = e.prev, G = e.strstart + he, oe = X[t + A - 1], ge = X[t + A];
    e.prev_length >= e.good_match && (h >>= 2), S > e.lookahead && (S = e.lookahead);
    do
      if (r = l, !(X[r + A] !== ge || X[r + A - 1] !== oe || X[r] !== X[t] || X[++r] !== X[t + 1])) {
        t += 2, r++;
        do
          ;
        while (X[++t] === X[++r] && X[++t] === X[++r] && X[++t] === X[++r] && X[++t] === X[++r] && X[++t] === X[++r] && X[++t] === X[++r] && X[++t] === X[++r] && X[++t] === X[++r] && t < G);
        if (f = he - (G - t), t = G - he, f > A) {
          if (e.match_start = l, A = f, f >= S)
            break;
          oe = X[t + A - 1], ge = X[t + A];
        }
      }
    while ((l = fe[l & Be]) > y && --h !== 0);
    return A <= e.lookahead ? A : e.lookahead;
  }
  function Ae(e) {
    var l = e.w_size, h, t, r, f, A;
    do {
      if (f = e.window_size - e.lookahead - e.strstart, e.strstart >= l + (l - te)) {
        g.arraySet(e.window, e.window, l, l, 0), e.match_start -= l, e.strstart -= l, e.block_start -= l, t = e.hash_size, h = t;
        do
          r = e.head[--h], e.head[h] = r >= l ? r - l : 0;
        while (--t);
        t = l, h = t;
        do
          r = e.prev[--h], e.prev[h] = r >= l ? r - l : 0;
        while (--t);
        f += l;
      }
      if (e.strm.avail_in === 0)
        break;
      if (t = qe(e.strm, e.window, e.strstart + e.lookahead, f), e.lookahead += t, e.lookahead + e.insert >= M)
        for (A = e.strstart - e.insert, e.ins_h = e.window[A], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[A + 1]) & e.hash_mask; e.insert && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[A + M - 1]) & e.hash_mask, e.prev[A & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = A, A++, e.insert--, !(e.lookahead + e.insert < M)); )
          ;
    } while (e.lookahead < te && e.strm.avail_in !== 0);
  }
  function Ye(e, l) {
    var h = 65535;
    for (h > e.pending_buf_size - 5 && (h = e.pending_buf_size - 5); ; ) {
      if (e.lookahead <= 1) {
        if (Ae(e), e.lookahead === 0 && l === c)
          return $;
        if (e.lookahead === 0)
          break;
      }
      e.strstart += e.lookahead, e.lookahead = 0;
      var t = e.block_start + h;
      if ((e.strstart === 0 || e.strstart >= t) && (e.lookahead = e.strstart - t, e.strstart = t, ie(e, !1), e.strm.avail_out === 0) || e.strstart - e.block_start >= e.w_size - te && (ie(e, !1), e.strm.avail_out === 0))
        return $;
    }
    return e.insert = 0, l === _ ? (ie(e, !0), e.strm.avail_out === 0 ? ye : ze) : (e.strstart > e.block_start && (ie(e, !1), e.strm.avail_out === 0), $);
  }
  function Me(e, l) {
    for (var h, t; ; ) {
      if (e.lookahead < te) {
        if (Ae(e), e.lookahead < te && l === c)
          return $;
        if (e.lookahead === 0)
          break;
      }
      if (h = 0, e.lookahead >= M && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + M - 1]) & e.hash_mask, h = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), h !== 0 && e.strstart - h <= e.w_size - te && (e.match_length = Le(e, h)), e.match_length >= M)
        if (t = D._tr_tally(e, e.strstart - e.match_start, e.match_length - M), e.lookahead -= e.match_length, e.match_length <= e.max_lazy_match && e.lookahead >= M) {
          e.match_length--;
          do
            e.strstart++, e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + M - 1]) & e.hash_mask, h = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart;
          while (--e.match_length !== 0);
          e.strstart++;
        } else
          e.strstart += e.match_length, e.match_length = 0, e.ins_h = e.window[e.strstart], e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + 1]) & e.hash_mask;
      else
        t = D._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++;
      if (t && (ie(e, !1), e.strm.avail_out === 0))
        return $;
    }
    return e.insert = e.strstart < M - 1 ? e.strstart : M - 1, l === _ ? (ie(e, !0), e.strm.avail_out === 0 ? ye : ze) : e.last_lit && (ie(e, !1), e.strm.avail_out === 0) ? $ : se;
  }
  function Ze(e, l) {
    for (var h, t, r; ; ) {
      if (e.lookahead < te) {
        if (Ae(e), e.lookahead < te && l === c)
          return $;
        if (e.lookahead === 0)
          break;
      }
      if (h = 0, e.lookahead >= M && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + M - 1]) & e.hash_mask, h = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart), e.prev_length = e.match_length, e.prev_match = e.match_start, e.match_length = M - 1, h !== 0 && e.prev_length < e.max_lazy_match && e.strstart - h <= e.w_size - te && (e.match_length = Le(e, h), e.match_length <= 5 && (e.strategy === O || e.match_length === M && e.strstart - e.match_start > 4096) && (e.match_length = M - 1)), e.prev_length >= M && e.match_length <= e.prev_length) {
        r = e.strstart + e.lookahead - M, t = D._tr_tally(e, e.strstart - 1 - e.prev_match, e.prev_length - M), e.lookahead -= e.prev_length - 1, e.prev_length -= 2;
        do
          ++e.strstart <= r && (e.ins_h = (e.ins_h << e.hash_shift ^ e.window[e.strstart + M - 1]) & e.hash_mask, h = e.prev[e.strstart & e.w_mask] = e.head[e.ins_h], e.head[e.ins_h] = e.strstart);
        while (--e.prev_length !== 0);
        if (e.match_available = 0, e.match_length = M - 1, e.strstart++, t && (ie(e, !1), e.strm.avail_out === 0))
          return $;
      } else if (e.match_available) {
        if (t = D._tr_tally(e, 0, e.window[e.strstart - 1]), t && ie(e, !1), e.strstart++, e.lookahead--, e.strm.avail_out === 0)
          return $;
      } else
        e.match_available = 1, e.strstart++, e.lookahead--;
    }
    return e.match_available && (t = D._tr_tally(e, 0, e.window[e.strstart - 1]), e.match_available = 0), e.insert = e.strstart < M - 1 ? e.strstart : M - 1, l === _ ? (ie(e, !0), e.strm.avail_out === 0 ? ye : ze) : e.last_lit && (ie(e, !1), e.strm.avail_out === 0) ? $ : se;
  }
  function Xe(e, l) {
    for (var h, t, r, f, A = e.window; ; ) {
      if (e.lookahead <= he) {
        if (Ae(e), e.lookahead <= he && l === c)
          return $;
        if (e.lookahead === 0)
          break;
      }
      if (e.match_length = 0, e.lookahead >= M && e.strstart > 0 && (r = e.strstart - 1, t = A[r], t === A[++r] && t === A[++r] && t === A[++r])) {
        f = e.strstart + he;
        do
          ;
        while (t === A[++r] && t === A[++r] && t === A[++r] && t === A[++r] && t === A[++r] && t === A[++r] && t === A[++r] && t === A[++r] && r < f);
        e.match_length = he - (f - r), e.match_length > e.lookahead && (e.match_length = e.lookahead);
      }
      if (e.match_length >= M ? (h = D._tr_tally(e, 1, e.match_length - M), e.lookahead -= e.match_length, e.strstart += e.match_length, e.match_length = 0) : (h = D._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++), h && (ie(e, !1), e.strm.avail_out === 0))
        return $;
    }
    return e.insert = 0, l === _ ? (ie(e, !0), e.strm.avail_out === 0 ? ye : ze) : e.last_lit && (ie(e, !1), e.strm.avail_out === 0) ? $ : se;
  }
  function Fe(e, l) {
    for (var h; ; ) {
      if (e.lookahead === 0 && (Ae(e), e.lookahead === 0)) {
        if (l === c)
          return $;
        break;
      }
      if (e.match_length = 0, h = D._tr_tally(e, 0, e.window[e.strstart]), e.lookahead--, e.strstart++, h && (ie(e, !1), e.strm.avail_out === 0))
        return $;
    }
    return e.insert = 0, l === _ ? (ie(e, !0), e.strm.avail_out === 0 ? ye : ze) : e.last_lit && (ie(e, !1), e.strm.avail_out === 0) ? $ : se;
  }
  function be(e, l, h, t, r) {
    this.good_length = e, this.max_lazy = l, this.nice_length = h, this.max_chain = t, this.func = r;
  }
  var Oe;
  Oe = [
    /*      good lazy nice chain */
    new be(0, 0, 0, 0, Ye),
    /* 0 store only */
    new be(4, 4, 8, 4, Me),
    /* 1 max speed, no lazy matches */
    new be(4, 5, 16, 8, Me),
    /* 2 */
    new be(4, 6, 32, 32, Me),
    /* 3 */
    new be(4, 4, 16, 16, Ze),
    /* 4 lazy matches */
    new be(8, 16, 32, 32, Ze),
    /* 5 */
    new be(8, 16, 128, 128, Ze),
    /* 6 */
    new be(8, 32, 128, 256, Ze),
    /* 7 */
    new be(32, 128, 258, 1024, Ze),
    /* 8 */
    new be(32, 258, 258, 4096, Ze)
    /* 9 max compression */
  ];
  function Ge(e) {
    e.window_size = 2 * e.w_size, me(e.head), e.max_lazy_match = Oe[e.level].max_lazy, e.good_match = Oe[e.level].good_length, e.nice_match = Oe[e.level].nice_length, e.max_chain_length = Oe[e.level].max_chain, e.strstart = 0, e.block_start = 0, e.lookahead = 0, e.insert = 0, e.match_length = e.prev_length = M - 1, e.match_available = 0, e.ins_h = 0;
  }
  function i() {
    this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = I, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new g.Buf16(le * 2), this.dyn_dtree = new g.Buf16((2 * C + 1) * 2), this.bl_tree = new g.Buf16((2 * V + 1) * 2), me(this.dyn_ltree), me(this.dyn_dtree), me(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new g.Buf16(ce + 1), this.heap = new g.Buf16(2 * ee + 1), me(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new g.Buf16(2 * ee + 1), me(this.depth), this.l_buf = 0, this.lit_bufsize = 0, this.last_lit = 0, this.d_buf = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0;
  }
  function d(e) {
    var l;
    return !e || !e.state ? pe(e, p) : (e.total_in = e.total_out = 0, e.data_type = H, l = e.state, l.pending = 0, l.pending_out = 0, l.wrap < 0 && (l.wrap = -l.wrap), l.status = l.wrap ? ke : J, e.adler = l.wrap === 2 ? 0 : 1, l.last_flush = c, D._tr_init(l), E);
  }
  function b(e) {
    var l = d(e);
    return l === E && Ge(e.state), l;
  }
  function m(e, l) {
    return !e || !e.state || e.state.wrap !== 2 ? p : (e.state.gzhead = l, E);
  }
  function n(e, l, h, t, r, f) {
    if (!e)
      return p;
    var A = 1;
    if (l === ae && (l = 6), t < 0 ? (A = 0, t = -t) : t > 15 && (A = 2, t -= 16), r < 1 || r > x || h !== I || t < 8 || t > 15 || l < 0 || l > 9 || f < 0 || f > T)
      return pe(e, p);
    t === 8 && (t = 9);
    var S = new i();
    return e.state = S, S.strm = e, S.wrap = A, S.gzhead = null, S.w_bits = t, S.w_size = 1 << S.w_bits, S.w_mask = S.w_size - 1, S.hash_bits = r + 7, S.hash_size = 1 << S.hash_bits, S.hash_mask = S.hash_size - 1, S.hash_shift = ~~((S.hash_bits + M - 1) / M), S.window = new g.Buf8(S.w_size * 2), S.head = new g.Buf16(S.hash_size), S.prev = new g.Buf16(S.w_size), S.lit_bufsize = 1 << r + 6, S.pending_buf_size = S.lit_bufsize * 4, S.pending_buf = new g.Buf8(S.pending_buf_size), S.d_buf = 1 * S.lit_bufsize, S.l_buf = 3 * S.lit_bufsize, S.level = l, S.strategy = f, S.method = h, b(e);
  }
  function o(e, l) {
    return n(e, l, I, K, j, B);
  }
  function a(e, l) {
    var h, t, r, f;
    if (!e || !e.state || l > Z || l < 0)
      return e ? pe(e, p) : p;
    if (t = e.state, !e.output || !e.input && e.avail_in !== 0 || t.status === ne && l !== _)
      return pe(e, e.avail_out === 0 ? N : p);
    if (t.strm = e, h = t.last_flush, t.last_flush = l, t.status === ke)
      if (t.wrap === 2)
        e.adler = 0, Y(t, 31), Y(t, 139), Y(t, 8), t.gzhead ? (Y(
          t,
          (t.gzhead.text ? 1 : 0) + (t.gzhead.hcrc ? 2 : 0) + (t.gzhead.extra ? 4 : 0) + (t.gzhead.name ? 8 : 0) + (t.gzhead.comment ? 16 : 0)
        ), Y(t, t.gzhead.time & 255), Y(t, t.gzhead.time >> 8 & 255), Y(t, t.gzhead.time >> 16 & 255), Y(t, t.gzhead.time >> 24 & 255), Y(t, t.level === 9 ? 2 : t.strategy >= R || t.level < 2 ? 4 : 0), Y(t, t.gzhead.os & 255), t.gzhead.extra && t.gzhead.extra.length && (Y(t, t.gzhead.extra.length & 255), Y(t, t.gzhead.extra.length >> 8 & 255)), t.gzhead.hcrc && (e.adler = v(e.adler, t.pending_buf, t.pending, 0)), t.gzindex = 0, t.status = ue) : (Y(t, 0), Y(t, 0), Y(t, 0), Y(t, 0), Y(t, 0), Y(t, t.level === 9 ? 2 : t.strategy >= R || t.level < 2 ? 4 : 0), Y(t, Q), t.status = J);
      else {
        var A = I + (t.w_bits - 8 << 4) << 8, S = -1;
        t.strategy >= R || t.level < 2 ? S = 0 : t.level < 6 ? S = 1 : t.level === 6 ? S = 2 : S = 3, A |= S << 6, t.strstart !== 0 && (A |= Se), A += 31 - A % 31, t.status = J, Te(t, A), t.strstart !== 0 && (Te(t, e.adler >>> 16), Te(t, e.adler & 65535)), e.adler = 1;
      }
    if (t.status === ue)
      if (t.gzhead.extra) {
        for (r = t.pending; t.gzindex < (t.gzhead.extra.length & 65535) && !(t.pending === t.pending_buf_size && (t.gzhead.hcrc && t.pending > r && (e.adler = v(e.adler, t.pending_buf, t.pending - r, r)), Ee(e), r = t.pending, t.pending === t.pending_buf_size)); )
          Y(t, t.gzhead.extra[t.gzindex] & 255), t.gzindex++;
        t.gzhead.hcrc && t.pending > r && (e.adler = v(e.adler, t.pending_buf, t.pending - r, r)), t.gzindex === t.gzhead.extra.length && (t.gzindex = 0, t.status = re);
      } else
        t.status = re;
    if (t.status === re)
      if (t.gzhead.name) {
        r = t.pending;
        do {
          if (t.pending === t.pending_buf_size && (t.gzhead.hcrc && t.pending > r && (e.adler = v(e.adler, t.pending_buf, t.pending - r, r)), Ee(e), r = t.pending, t.pending === t.pending_buf_size)) {
            f = 1;
            break;
          }
          t.gzindex < t.gzhead.name.length ? f = t.gzhead.name.charCodeAt(t.gzindex++) & 255 : f = 0, Y(t, f);
        } while (f !== 0);
        t.gzhead.hcrc && t.pending > r && (e.adler = v(e.adler, t.pending_buf, t.pending - r, r)), f === 0 && (t.gzindex = 0, t.status = we);
      } else
        t.status = we;
    if (t.status === we)
      if (t.gzhead.comment) {
        r = t.pending;
        do {
          if (t.pending === t.pending_buf_size && (t.gzhead.hcrc && t.pending > r && (e.adler = v(e.adler, t.pending_buf, t.pending - r, r)), Ee(e), r = t.pending, t.pending === t.pending_buf_size)) {
            f = 1;
            break;
          }
          t.gzindex < t.gzhead.comment.length ? f = t.gzhead.comment.charCodeAt(t.gzindex++) & 255 : f = 0, Y(t, f);
        } while (f !== 0);
        t.gzhead.hcrc && t.pending > r && (e.adler = v(e.adler, t.pending_buf, t.pending - r, r)), f === 0 && (t.status = de);
      } else
        t.status = de;
    if (t.status === de && (t.gzhead.hcrc ? (t.pending + 2 > t.pending_buf_size && Ee(e), t.pending + 2 <= t.pending_buf_size && (Y(t, e.adler & 255), Y(t, e.adler >> 8 & 255), e.adler = 0, t.status = J)) : t.status = J), t.pending !== 0) {
      if (Ee(e), e.avail_out === 0)
        return t.last_flush = -1, E;
    } else if (e.avail_in === 0 && Ue(l) <= Ue(h) && l !== _)
      return pe(e, N);
    if (t.status === ne && e.avail_in !== 0)
      return pe(e, N);
    if (e.avail_in !== 0 || t.lookahead !== 0 || l !== c && t.status !== ne) {
      var y = t.strategy === R ? Fe(t, l) : t.strategy === U ? Xe(t, l) : Oe[t.level].func(t, l);
      if ((y === ye || y === ze) && (t.status = ne), y === $ || y === ye)
        return e.avail_out === 0 && (t.last_flush = -1), E;
      if (y === se && (l === s ? D._tr_align(t) : l !== Z && (D._tr_stored_block(t, 0, 0, !1), l === w && (me(t.head), t.lookahead === 0 && (t.strstart = 0, t.block_start = 0, t.insert = 0))), Ee(e), e.avail_out === 0))
        return t.last_flush = -1, E;
    }
    return l !== _ ? E : t.wrap <= 0 ? z : (t.wrap === 2 ? (Y(t, e.adler & 255), Y(t, e.adler >> 8 & 255), Y(t, e.adler >> 16 & 255), Y(t, e.adler >> 24 & 255), Y(t, e.total_in & 255), Y(t, e.total_in >> 8 & 255), Y(t, e.total_in >> 16 & 255), Y(t, e.total_in >> 24 & 255)) : (Te(t, e.adler >>> 16), Te(t, e.adler & 65535)), Ee(e), t.wrap > 0 && (t.wrap = -t.wrap), t.pending !== 0 ? E : z);
  }
  function u(e) {
    var l;
    return !e || !e.state ? p : (l = e.state.status, l !== ke && l !== ue && l !== re && l !== we && l !== de && l !== J && l !== ne ? pe(e, p) : (e.state = null, l === J ? pe(e, k) : E));
  }
  function L(e, l) {
    var h = l.length, t, r, f, A, S, y, X, Be;
    if (!e || !e.state || (t = e.state, A = t.wrap, A === 2 || A === 1 && t.status !== ke || t.lookahead))
      return p;
    for (A === 1 && (e.adler = P(e.adler, l, h, 0)), t.wrap = 0, h >= t.w_size && (A === 0 && (me(t.head), t.strstart = 0, t.block_start = 0, t.insert = 0), Be = new g.Buf8(t.w_size), g.arraySet(Be, l, h - t.w_size, t.w_size, 0), l = Be, h = t.w_size), S = e.avail_in, y = e.next_in, X = e.input, e.avail_in = h, e.next_in = 0, e.input = l, Ae(t); t.lookahead >= M; ) {
      r = t.strstart, f = t.lookahead - (M - 1);
      do
        t.ins_h = (t.ins_h << t.hash_shift ^ t.window[r + M - 1]) & t.hash_mask, t.prev[r & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = r, r++;
      while (--f);
      t.strstart = r, t.lookahead = M - 1, Ae(t);
    }
    return t.strstart += t.lookahead, t.block_start = t.strstart, t.insert = t.lookahead, t.lookahead = 0, t.match_length = t.prev_length = M - 1, t.match_available = 0, e.next_in = y, e.input = X, e.avail_in = S, t.wrap = A, E;
  }
  return Ie.deflateInit = o, Ie.deflateInit2 = n, Ie.deflateReset = b, Ie.deflateResetKeep = d, Ie.deflateSetHeader = m, Ie.deflate = a, Ie.deflateEnd = u, Ie.deflateSetDictionary = L, Ie.deflateInfo = "pako deflate (from Nodeca project)", Ie;
}
var Ke = {}, ba;
function Aa() {
  if (ba) return Ke;
  ba = 1;
  var g = He(), D = !0, P = !0;
  try {
    String.fromCharCode.apply(null, [0]);
  } catch {
    D = !1;
  }
  try {
    String.fromCharCode.apply(null, new Uint8Array(1));
  } catch {
    P = !1;
  }
  for (var v = new g.Buf8(256), F = 0; F < 256; F++)
    v[F] = F >= 252 ? 6 : F >= 248 ? 5 : F >= 240 ? 4 : F >= 224 ? 3 : F >= 192 ? 2 : 1;
  v[254] = v[254] = 1, Ke.string2buf = function(s) {
    var w, _, Z, E, z, p = s.length, k = 0;
    for (E = 0; E < p; E++)
      _ = s.charCodeAt(E), (_ & 64512) === 55296 && E + 1 < p && (Z = s.charCodeAt(E + 1), (Z & 64512) === 56320 && (_ = 65536 + (_ - 55296 << 10) + (Z - 56320), E++)), k += _ < 128 ? 1 : _ < 2048 ? 2 : _ < 65536 ? 3 : 4;
    for (w = new g.Buf8(k), z = 0, E = 0; z < k; E++)
      _ = s.charCodeAt(E), (_ & 64512) === 55296 && E + 1 < p && (Z = s.charCodeAt(E + 1), (Z & 64512) === 56320 && (_ = 65536 + (_ - 55296 << 10) + (Z - 56320), E++)), _ < 128 ? w[z++] = _ : _ < 2048 ? (w[z++] = 192 | _ >>> 6, w[z++] = 128 | _ & 63) : _ < 65536 ? (w[z++] = 224 | _ >>> 12, w[z++] = 128 | _ >>> 6 & 63, w[z++] = 128 | _ & 63) : (w[z++] = 240 | _ >>> 18, w[z++] = 128 | _ >>> 12 & 63, w[z++] = 128 | _ >>> 6 & 63, w[z++] = 128 | _ & 63);
    return w;
  };
  function c(s, w) {
    if (w < 65534 && (s.subarray && P || !s.subarray && D))
      return String.fromCharCode.apply(null, g.shrinkBuf(s, w));
    for (var _ = "", Z = 0; Z < w; Z++)
      _ += String.fromCharCode(s[Z]);
    return _;
  }
  return Ke.buf2binstring = function(s) {
    return c(s, s.length);
  }, Ke.binstring2buf = function(s) {
    for (var w = new g.Buf8(s.length), _ = 0, Z = w.length; _ < Z; _++)
      w[_] = s.charCodeAt(_);
    return w;
  }, Ke.buf2string = function(s, w) {
    var _, Z, E, z, p = w || s.length, k = new Array(p * 2);
    for (Z = 0, _ = 0; _ < p; ) {
      if (E = s[_++], E < 128) {
        k[Z++] = E;
        continue;
      }
      if (z = v[E], z > 4) {
        k[Z++] = 65533, _ += z - 1;
        continue;
      }
      for (E &= z === 2 ? 31 : z === 3 ? 15 : 7; z > 1 && _ < p; )
        E = E << 6 | s[_++] & 63, z--;
      if (z > 1) {
        k[Z++] = 65533;
        continue;
      }
      E < 65536 ? k[Z++] = E : (E -= 65536, k[Z++] = 55296 | E >> 10 & 1023, k[Z++] = 56320 | E & 1023);
    }
    return c(k, Z);
  }, Ke.utf8border = function(s, w) {
    var _;
    for (w = w || s.length, w > s.length && (w = s.length), _ = w - 1; _ >= 0 && (s[_] & 192) === 128; )
      _--;
    return _ < 0 || _ === 0 ? w : _ + v[s[_]] > w ? _ : w;
  }, Ke;
}
var ta, ga;
function Ra() {
  if (ga) return ta;
  ga = 1;
  function g() {
    this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0;
  }
  return ta = g, ta;
}
var wa;
function Na() {
  if (wa) return je;
  wa = 1;
  var g = Oa(), D = He(), P = Aa(), v = ha(), F = Ra(), c = Object.prototype.toString, s = 0, w = 4, _ = 0, Z = 1, E = 2, z = -1, p = 0, k = 8;
  function N(U) {
    if (!(this instanceof N)) return new N(U);
    this.options = D.assign({
      level: z,
      method: k,
      chunkSize: 16384,
      windowBits: 15,
      memLevel: 8,
      strategy: p,
      to: ""
    }, U || {});
    var T = this.options;
    T.raw && T.windowBits > 0 ? T.windowBits = -T.windowBits : T.gzip && T.windowBits > 0 && T.windowBits < 16 && (T.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new F(), this.strm.avail_out = 0;
    var B = g.deflateInit2(
      this.strm,
      T.level,
      T.method,
      T.windowBits,
      T.memLevel,
      T.strategy
    );
    if (B !== _)
      throw new Error(v[B]);
    if (T.header && g.deflateSetHeader(this.strm, T.header), T.dictionary) {
      var H;
      if (typeof T.dictionary == "string" ? H = P.string2buf(T.dictionary) : c.call(T.dictionary) === "[object ArrayBuffer]" ? H = new Uint8Array(T.dictionary) : H = T.dictionary, B = g.deflateSetDictionary(this.strm, H), B !== _)
        throw new Error(v[B]);
      this._dict_set = !0;
    }
  }
  N.prototype.push = function(U, T) {
    var B = this.strm, H = this.options.chunkSize, I, x;
    if (this.ended)
      return !1;
    x = T === ~~T ? T : T === !0 ? w : s, typeof U == "string" ? B.input = P.string2buf(U) : c.call(U) === "[object ArrayBuffer]" ? B.input = new Uint8Array(U) : B.input = U, B.next_in = 0, B.avail_in = B.input.length;
    do {
      if (B.avail_out === 0 && (B.output = new D.Buf8(H), B.next_out = 0, B.avail_out = H), I = g.deflate(B, x), I !== Z && I !== _)
        return this.onEnd(I), this.ended = !0, !1;
      (B.avail_out === 0 || B.avail_in === 0 && (x === w || x === E)) && (this.options.to === "string" ? this.onData(P.buf2binstring(D.shrinkBuf(B.output, B.next_out))) : this.onData(D.shrinkBuf(B.output, B.next_out)));
    } while ((B.avail_in > 0 || B.avail_out === 0) && I !== Z);
    return x === w ? (I = g.deflateEnd(this.strm), this.onEnd(I), this.ended = !0, I === _) : (x === E && (this.onEnd(_), B.avail_out = 0), !0);
  }, N.prototype.onData = function(U) {
    this.chunks.push(U);
  }, N.prototype.onEnd = function(U) {
    U === _ && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = D.flattenChunks(this.chunks)), this.chunks = [], this.err = U, this.msg = this.strm.msg;
  };
  function ae(U, T) {
    var B = new N(T);
    if (B.push(U, !0), B.err)
      throw B.msg || v[B.err];
    return B.result;
  }
  function O(U, T) {
    return T = T || {}, T.raw = !0, ae(U, T);
  }
  function R(U, T) {
    return T = T || {}, T.gzip = !0, ae(U, T);
  }
  return je.Deflate = N, je.deflate = ae, je.deflateRaw = O, je.gzip = R, je;
}
var $e = {}, De = {}, ia, pa;
function Ba() {
  if (pa) return ia;
  pa = 1;
  var g = 30, D = 12;
  return ia = function(v, F) {
    var c, s, w, _, Z, E, z, p, k, N, ae, O, R, U, T, B, H, I, x, K, j, q, W, ee, C;
    c = v.state, s = v.next_in, ee = v.input, w = s + (v.avail_in - 5), _ = v.next_out, C = v.output, Z = _ - (F - v.avail_out), E = _ + (v.avail_out - 257), z = c.dmax, p = c.wsize, k = c.whave, N = c.wnext, ae = c.window, O = c.hold, R = c.bits, U = c.lencode, T = c.distcode, B = (1 << c.lenbits) - 1, H = (1 << c.distbits) - 1;
    e:
      do {
        R < 15 && (O += ee[s++] << R, R += 8, O += ee[s++] << R, R += 8), I = U[O & B];
        a:
          for (; ; ) {
            if (x = I >>> 24, O >>>= x, R -= x, x = I >>> 16 & 255, x === 0)
              C[_++] = I & 65535;
            else if (x & 16) {
              K = I & 65535, x &= 15, x && (R < x && (O += ee[s++] << R, R += 8), K += O & (1 << x) - 1, O >>>= x, R -= x), R < 15 && (O += ee[s++] << R, R += 8, O += ee[s++] << R, R += 8), I = T[O & H];
              t:
                for (; ; ) {
                  if (x = I >>> 24, O >>>= x, R -= x, x = I >>> 16 & 255, x & 16) {
                    if (j = I & 65535, x &= 15, R < x && (O += ee[s++] << R, R += 8, R < x && (O += ee[s++] << R, R += 8)), j += O & (1 << x) - 1, j > z) {
                      v.msg = "invalid distance too far back", c.mode = g;
                      break e;
                    }
                    if (O >>>= x, R -= x, x = _ - Z, j > x) {
                      if (x = j - x, x > k && c.sane) {
                        v.msg = "invalid distance too far back", c.mode = g;
                        break e;
                      }
                      if (q = 0, W = ae, N === 0) {
                        if (q += p - x, x < K) {
                          K -= x;
                          do
                            C[_++] = ae[q++];
                          while (--x);
                          q = _ - j, W = C;
                        }
                      } else if (N < x) {
                        if (q += p + N - x, x -= N, x < K) {
                          K -= x;
                          do
                            C[_++] = ae[q++];
                          while (--x);
                          if (q = 0, N < K) {
                            x = N, K -= x;
                            do
                              C[_++] = ae[q++];
                            while (--x);
                            q = _ - j, W = C;
                          }
                        }
                      } else if (q += N - x, x < K) {
                        K -= x;
                        do
                          C[_++] = ae[q++];
                        while (--x);
                        q = _ - j, W = C;
                      }
                      for (; K > 2; )
                        C[_++] = W[q++], C[_++] = W[q++], C[_++] = W[q++], K -= 3;
                      K && (C[_++] = W[q++], K > 1 && (C[_++] = W[q++]));
                    } else {
                      q = _ - j;
                      do
                        C[_++] = C[q++], C[_++] = C[q++], C[_++] = C[q++], K -= 3;
                      while (K > 2);
                      K && (C[_++] = C[q++], K > 1 && (C[_++] = C[q++]));
                    }
                  } else if ((x & 64) === 0) {
                    I = T[(I & 65535) + (O & (1 << x) - 1)];
                    continue t;
                  } else {
                    v.msg = "invalid distance code", c.mode = g;
                    break e;
                  }
                  break;
                }
            } else if ((x & 64) === 0) {
              I = U[(I & 65535) + (O & (1 << x) - 1)];
              continue a;
            } else if (x & 32) {
              c.mode = D;
              break e;
            } else {
              v.msg = "invalid literal/length code", c.mode = g;
              break e;
            }
            break;
          }
      } while (s < w && _ < E);
    K = R >> 3, s -= K, R -= K << 3, O &= (1 << R) - 1, v.next_in = s, v.next_out = _, v.avail_in = s < w ? 5 + (w - s) : 5 - (s - w), v.avail_out = _ < E ? 257 + (E - _) : 257 - (_ - E), c.hold = O, c.bits = R;
  }, ia;
}
var ra, xa;
function Ca() {
  if (xa) return ra;
  xa = 1;
  var g = He(), D = 15, P = 852, v = 592, F = 0, c = 1, s = 2, w = [
    /* Length codes 257..285 base */
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    13,
    15,
    17,
    19,
    23,
    27,
    31,
    35,
    43,
    51,
    59,
    67,
    83,
    99,
    115,
    131,
    163,
    195,
    227,
    258,
    0,
    0
  ], _ = [
    /* Length codes 257..285 extra */
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    17,
    17,
    17,
    17,
    18,
    18,
    18,
    18,
    19,
    19,
    19,
    19,
    20,
    20,
    20,
    20,
    21,
    21,
    21,
    21,
    16,
    72,
    78
  ], Z = [
    /* Distance codes 0..29 base */
    1,
    2,
    3,
    4,
    5,
    7,
    9,
    13,
    17,
    25,
    33,
    49,
    65,
    97,
    129,
    193,
    257,
    385,
    513,
    769,
    1025,
    1537,
    2049,
    3073,
    4097,
    6145,
    8193,
    12289,
    16385,
    24577,
    0,
    0
  ], E = [
    /* Distance codes 0..29 extra */
    16,
    16,
    16,
    16,
    17,
    17,
    18,
    18,
    19,
    19,
    20,
    20,
    21,
    21,
    22,
    22,
    23,
    23,
    24,
    24,
    25,
    25,
    26,
    26,
    27,
    27,
    28,
    28,
    29,
    29,
    64,
    64
  ];
  return ra = function(p, k, N, ae, O, R, U, T) {
    var B = T.bits, H = 0, I = 0, x = 0, K = 0, j = 0, q = 0, W = 0, ee = 0, C = 0, V = 0, le, ce, M, he, te, Se = null, ke = 0, ue, re = new g.Buf16(D + 1), we = new g.Buf16(D + 1), de = null, J = 0, ne, $, se;
    for (H = 0; H <= D; H++)
      re[H] = 0;
    for (I = 0; I < ae; I++)
      re[k[N + I]]++;
    for (j = B, K = D; K >= 1 && re[K] === 0; K--)
      ;
    if (j > K && (j = K), K === 0)
      return O[R++] = 1 << 24 | 64 << 16 | 0, O[R++] = 1 << 24 | 64 << 16 | 0, T.bits = 1, 0;
    for (x = 1; x < K && re[x] === 0; x++)
      ;
    for (j < x && (j = x), ee = 1, H = 1; H <= D; H++)
      if (ee <<= 1, ee -= re[H], ee < 0)
        return -1;
    if (ee > 0 && (p === F || K !== 1))
      return -1;
    for (we[1] = 0, H = 1; H < D; H++)
      we[H + 1] = we[H] + re[H];
    for (I = 0; I < ae; I++)
      k[N + I] !== 0 && (U[we[k[N + I]]++] = I);
    if (p === F ? (Se = de = U, ue = 19) : p === c ? (Se = w, ke -= 257, de = _, J -= 257, ue = 256) : (Se = Z, de = E, ue = -1), V = 0, I = 0, H = x, te = R, q = j, W = 0, M = -1, C = 1 << j, he = C - 1, p === c && C > P || p === s && C > v)
      return 1;
    for (; ; ) {
      ne = H - W, U[I] < ue ? ($ = 0, se = U[I]) : U[I] > ue ? ($ = de[J + U[I]], se = Se[ke + U[I]]) : ($ = 96, se = 0), le = 1 << H - W, ce = 1 << q, x = ce;
      do
        ce -= le, O[te + (V >> W) + ce] = ne << 24 | $ << 16 | se | 0;
      while (ce !== 0);
      for (le = 1 << H - 1; V & le; )
        le >>= 1;
      if (le !== 0 ? (V &= le - 1, V += le) : V = 0, I++, --re[H] === 0) {
        if (H === K)
          break;
        H = k[N + U[I]];
      }
      if (H > j && (V & he) !== M) {
        for (W === 0 && (W = j), te += x, q = H - W, ee = 1 << q; q + W < K && (ee -= re[q + W], !(ee <= 0)); )
          q++, ee <<= 1;
        if (C += 1 << q, p === c && C > P || p === s && C > v)
          return 1;
        M = V & he, O[M] = j << 24 | q << 16 | te - R | 0;
      }
    }
    return V !== 0 && (O[te + V] = H - W << 24 | 64 << 16 | 0), T.bits = j, 0;
  }, ra;
}
var ka;
function La() {
  if (ka) return De;
  ka = 1;
  var g = He(), D = ma(), P = Ta(), v = Ba(), F = Ca(), c = 0, s = 1, w = 2, _ = 4, Z = 5, E = 6, z = 0, p = 1, k = 2, N = -2, ae = -3, O = -4, R = -5, U = 8, T = 1, B = 2, H = 3, I = 4, x = 5, K = 6, j = 7, q = 8, W = 9, ee = 10, C = 11, V = 12, le = 13, ce = 14, M = 15, he = 16, te = 17, Se = 18, ke = 19, ue = 20, re = 21, we = 22, de = 23, J = 24, ne = 25, $ = 26, se = 27, ye = 28, ze = 29, Q = 30, pe = 31, Ue = 32, me = 852, Ee = 592, ie = 15, Y = ie;
  function Te(n) {
    return (n >>> 24 & 255) + (n >>> 8 & 65280) + ((n & 65280) << 8) + ((n & 255) << 24);
  }
  function qe() {
    this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new g.Buf16(320), this.work = new g.Buf16(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0;
  }
  function Le(n) {
    var o;
    return !n || !n.state ? N : (o = n.state, n.total_in = n.total_out = o.total = 0, n.msg = "", o.wrap && (n.adler = o.wrap & 1), o.mode = T, o.last = 0, o.havedict = 0, o.dmax = 32768, o.head = null, o.hold = 0, o.bits = 0, o.lencode = o.lendyn = new g.Buf32(me), o.distcode = o.distdyn = new g.Buf32(Ee), o.sane = 1, o.back = -1, z);
  }
  function Ae(n) {
    var o;
    return !n || !n.state ? N : (o = n.state, o.wsize = 0, o.whave = 0, o.wnext = 0, Le(n));
  }
  function Ye(n, o) {
    var a, u;
    return !n || !n.state || (u = n.state, o < 0 ? (a = 0, o = -o) : (a = (o >> 4) + 1, o < 48 && (o &= 15)), o && (o < 8 || o > 15)) ? N : (u.window !== null && u.wbits !== o && (u.window = null), u.wrap = a, u.wbits = o, Ae(n));
  }
  function Me(n, o) {
    var a, u;
    return n ? (u = new qe(), n.state = u, u.window = null, a = Ye(n, o), a !== z && (n.state = null), a) : N;
  }
  function Ze(n) {
    return Me(n, Y);
  }
  var Xe = !0, Fe, be;
  function Oe(n) {
    if (Xe) {
      var o;
      for (Fe = new g.Buf32(512), be = new g.Buf32(32), o = 0; o < 144; )
        n.lens[o++] = 8;
      for (; o < 256; )
        n.lens[o++] = 9;
      for (; o < 280; )
        n.lens[o++] = 7;
      for (; o < 288; )
        n.lens[o++] = 8;
      for (F(s, n.lens, 0, 288, Fe, 0, n.work, { bits: 9 }), o = 0; o < 32; )
        n.lens[o++] = 5;
      F(w, n.lens, 0, 32, be, 0, n.work, { bits: 5 }), Xe = !1;
    }
    n.lencode = Fe, n.lenbits = 9, n.distcode = be, n.distbits = 5;
  }
  function Ge(n, o, a, u) {
    var L, e = n.state;
    return e.window === null && (e.wsize = 1 << e.wbits, e.wnext = 0, e.whave = 0, e.window = new g.Buf8(e.wsize)), u >= e.wsize ? (g.arraySet(e.window, o, a - e.wsize, e.wsize, 0), e.wnext = 0, e.whave = e.wsize) : (L = e.wsize - e.wnext, L > u && (L = u), g.arraySet(e.window, o, a - u, L, e.wnext), u -= L, u ? (g.arraySet(e.window, o, a - u, u, 0), e.wnext = u, e.whave = e.wsize) : (e.wnext += L, e.wnext === e.wsize && (e.wnext = 0), e.whave < e.wsize && (e.whave += L))), 0;
  }
  function i(n, o) {
    var a, u, L, e, l, h, t, r, f, A, S, y, X, Be, fe = 0, G, oe, ge, xe, We, Ve, _e, Re, ve = new g.Buf8(4), Ce, Ne, _a = (
      /* permutation of code lengths */
      [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
    );
    if (!n || !n.state || !n.output || !n.input && n.avail_in !== 0)
      return N;
    a = n.state, a.mode === V && (a.mode = le), l = n.next_out, L = n.output, t = n.avail_out, e = n.next_in, u = n.input, h = n.avail_in, r = a.hold, f = a.bits, A = h, S = t, Re = z;
    e:
      for (; ; )
        switch (a.mode) {
          case T:
            if (a.wrap === 0) {
              a.mode = le;
              break;
            }
            for (; f < 16; ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            if (a.wrap & 2 && r === 35615) {
              a.check = 0, ve[0] = r & 255, ve[1] = r >>> 8 & 255, a.check = P(a.check, ve, 2, 0), r = 0, f = 0, a.mode = B;
              break;
            }
            if (a.flags = 0, a.head && (a.head.done = !1), !(a.wrap & 1) || /* check if zlib header allowed */
            (((r & 255) << 8) + (r >> 8)) % 31) {
              n.msg = "incorrect header check", a.mode = Q;
              break;
            }
            if ((r & 15) !== U) {
              n.msg = "unknown compression method", a.mode = Q;
              break;
            }
            if (r >>>= 4, f -= 4, _e = (r & 15) + 8, a.wbits === 0)
              a.wbits = _e;
            else if (_e > a.wbits) {
              n.msg = "invalid window size", a.mode = Q;
              break;
            }
            a.dmax = 1 << _e, n.adler = a.check = 1, a.mode = r & 512 ? ee : V, r = 0, f = 0;
            break;
          case B:
            for (; f < 16; ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            if (a.flags = r, (a.flags & 255) !== U) {
              n.msg = "unknown compression method", a.mode = Q;
              break;
            }
            if (a.flags & 57344) {
              n.msg = "unknown header flags set", a.mode = Q;
              break;
            }
            a.head && (a.head.text = r >> 8 & 1), a.flags & 512 && (ve[0] = r & 255, ve[1] = r >>> 8 & 255, a.check = P(a.check, ve, 2, 0)), r = 0, f = 0, a.mode = H;
          /* falls through */
          case H:
            for (; f < 32; ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            a.head && (a.head.time = r), a.flags & 512 && (ve[0] = r & 255, ve[1] = r >>> 8 & 255, ve[2] = r >>> 16 & 255, ve[3] = r >>> 24 & 255, a.check = P(a.check, ve, 4, 0)), r = 0, f = 0, a.mode = I;
          /* falls through */
          case I:
            for (; f < 16; ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            a.head && (a.head.xflags = r & 255, a.head.os = r >> 8), a.flags & 512 && (ve[0] = r & 255, ve[1] = r >>> 8 & 255, a.check = P(a.check, ve, 2, 0)), r = 0, f = 0, a.mode = x;
          /* falls through */
          case x:
            if (a.flags & 1024) {
              for (; f < 16; ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              a.length = r, a.head && (a.head.extra_len = r), a.flags & 512 && (ve[0] = r & 255, ve[1] = r >>> 8 & 255, a.check = P(a.check, ve, 2, 0)), r = 0, f = 0;
            } else a.head && (a.head.extra = null);
            a.mode = K;
          /* falls through */
          case K:
            if (a.flags & 1024 && (y = a.length, y > h && (y = h), y && (a.head && (_e = a.head.extra_len - a.length, a.head.extra || (a.head.extra = new Array(a.head.extra_len)), g.arraySet(
              a.head.extra,
              u,
              e,
              // extra field is limited to 65536 bytes
              // - no need for additional size check
              y,
              /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
              _e
            )), a.flags & 512 && (a.check = P(a.check, u, y, e)), h -= y, e += y, a.length -= y), a.length))
              break e;
            a.length = 0, a.mode = j;
          /* falls through */
          case j:
            if (a.flags & 2048) {
              if (h === 0)
                break e;
              y = 0;
              do
                _e = u[e + y++], a.head && _e && a.length < 65536 && (a.head.name += String.fromCharCode(_e));
              while (_e && y < h);
              if (a.flags & 512 && (a.check = P(a.check, u, y, e)), h -= y, e += y, _e)
                break e;
            } else a.head && (a.head.name = null);
            a.length = 0, a.mode = q;
          /* falls through */
          case q:
            if (a.flags & 4096) {
              if (h === 0)
                break e;
              y = 0;
              do
                _e = u[e + y++], a.head && _e && a.length < 65536 && (a.head.comment += String.fromCharCode(_e));
              while (_e && y < h);
              if (a.flags & 512 && (a.check = P(a.check, u, y, e)), h -= y, e += y, _e)
                break e;
            } else a.head && (a.head.comment = null);
            a.mode = W;
          /* falls through */
          case W:
            if (a.flags & 512) {
              for (; f < 16; ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              if (r !== (a.check & 65535)) {
                n.msg = "header crc mismatch", a.mode = Q;
                break;
              }
              r = 0, f = 0;
            }
            a.head && (a.head.hcrc = a.flags >> 9 & 1, a.head.done = !0), n.adler = a.check = 0, a.mode = V;
            break;
          case ee:
            for (; f < 32; ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            n.adler = a.check = Te(r), r = 0, f = 0, a.mode = C;
          /* falls through */
          case C:
            if (a.havedict === 0)
              return n.next_out = l, n.avail_out = t, n.next_in = e, n.avail_in = h, a.hold = r, a.bits = f, k;
            n.adler = a.check = 1, a.mode = V;
          /* falls through */
          case V:
            if (o === Z || o === E)
              break e;
          /* falls through */
          case le:
            if (a.last) {
              r >>>= f & 7, f -= f & 7, a.mode = se;
              break;
            }
            for (; f < 3; ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            switch (a.last = r & 1, r >>>= 1, f -= 1, r & 3) {
              case 0:
                a.mode = ce;
                break;
              case 1:
                if (Oe(a), a.mode = ue, o === E) {
                  r >>>= 2, f -= 2;
                  break e;
                }
                break;
              case 2:
                a.mode = te;
                break;
              case 3:
                n.msg = "invalid block type", a.mode = Q;
            }
            r >>>= 2, f -= 2;
            break;
          case ce:
            for (r >>>= f & 7, f -= f & 7; f < 32; ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            if ((r & 65535) !== (r >>> 16 ^ 65535)) {
              n.msg = "invalid stored block lengths", a.mode = Q;
              break;
            }
            if (a.length = r & 65535, r = 0, f = 0, a.mode = M, o === E)
              break e;
          /* falls through */
          case M:
            a.mode = he;
          /* falls through */
          case he:
            if (y = a.length, y) {
              if (y > h && (y = h), y > t && (y = t), y === 0)
                break e;
              g.arraySet(L, u, e, y, l), h -= y, e += y, t -= y, l += y, a.length -= y;
              break;
            }
            a.mode = V;
            break;
          case te:
            for (; f < 14; ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            if (a.nlen = (r & 31) + 257, r >>>= 5, f -= 5, a.ndist = (r & 31) + 1, r >>>= 5, f -= 5, a.ncode = (r & 15) + 4, r >>>= 4, f -= 4, a.nlen > 286 || a.ndist > 30) {
              n.msg = "too many length or distance symbols", a.mode = Q;
              break;
            }
            a.have = 0, a.mode = Se;
          /* falls through */
          case Se:
            for (; a.have < a.ncode; ) {
              for (; f < 3; ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              a.lens[_a[a.have++]] = r & 7, r >>>= 3, f -= 3;
            }
            for (; a.have < 19; )
              a.lens[_a[a.have++]] = 0;
            if (a.lencode = a.lendyn, a.lenbits = 7, Ce = { bits: a.lenbits }, Re = F(c, a.lens, 0, 19, a.lencode, 0, a.work, Ce), a.lenbits = Ce.bits, Re) {
              n.msg = "invalid code lengths set", a.mode = Q;
              break;
            }
            a.have = 0, a.mode = ke;
          /* falls through */
          case ke:
            for (; a.have < a.nlen + a.ndist; ) {
              for (; fe = a.lencode[r & (1 << a.lenbits) - 1], G = fe >>> 24, oe = fe >>> 16 & 255, ge = fe & 65535, !(G <= f); ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              if (ge < 16)
                r >>>= G, f -= G, a.lens[a.have++] = ge;
              else {
                if (ge === 16) {
                  for (Ne = G + 2; f < Ne; ) {
                    if (h === 0)
                      break e;
                    h--, r += u[e++] << f, f += 8;
                  }
                  if (r >>>= G, f -= G, a.have === 0) {
                    n.msg = "invalid bit length repeat", a.mode = Q;
                    break;
                  }
                  _e = a.lens[a.have - 1], y = 3 + (r & 3), r >>>= 2, f -= 2;
                } else if (ge === 17) {
                  for (Ne = G + 3; f < Ne; ) {
                    if (h === 0)
                      break e;
                    h--, r += u[e++] << f, f += 8;
                  }
                  r >>>= G, f -= G, _e = 0, y = 3 + (r & 7), r >>>= 3, f -= 3;
                } else {
                  for (Ne = G + 7; f < Ne; ) {
                    if (h === 0)
                      break e;
                    h--, r += u[e++] << f, f += 8;
                  }
                  r >>>= G, f -= G, _e = 0, y = 11 + (r & 127), r >>>= 7, f -= 7;
                }
                if (a.have + y > a.nlen + a.ndist) {
                  n.msg = "invalid bit length repeat", a.mode = Q;
                  break;
                }
                for (; y--; )
                  a.lens[a.have++] = _e;
              }
            }
            if (a.mode === Q)
              break;
            if (a.lens[256] === 0) {
              n.msg = "invalid code -- missing end-of-block", a.mode = Q;
              break;
            }
            if (a.lenbits = 9, Ce = { bits: a.lenbits }, Re = F(s, a.lens, 0, a.nlen, a.lencode, 0, a.work, Ce), a.lenbits = Ce.bits, Re) {
              n.msg = "invalid literal/lengths set", a.mode = Q;
              break;
            }
            if (a.distbits = 6, a.distcode = a.distdyn, Ce = { bits: a.distbits }, Re = F(w, a.lens, a.nlen, a.ndist, a.distcode, 0, a.work, Ce), a.distbits = Ce.bits, Re) {
              n.msg = "invalid distances set", a.mode = Q;
              break;
            }
            if (a.mode = ue, o === E)
              break e;
          /* falls through */
          case ue:
            a.mode = re;
          /* falls through */
          case re:
            if (h >= 6 && t >= 258) {
              n.next_out = l, n.avail_out = t, n.next_in = e, n.avail_in = h, a.hold = r, a.bits = f, v(n, S), l = n.next_out, L = n.output, t = n.avail_out, e = n.next_in, u = n.input, h = n.avail_in, r = a.hold, f = a.bits, a.mode === V && (a.back = -1);
              break;
            }
            for (a.back = 0; fe = a.lencode[r & (1 << a.lenbits) - 1], G = fe >>> 24, oe = fe >>> 16 & 255, ge = fe & 65535, !(G <= f); ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            if (oe && (oe & 240) === 0) {
              for (xe = G, We = oe, Ve = ge; fe = a.lencode[Ve + ((r & (1 << xe + We) - 1) >> xe)], G = fe >>> 24, oe = fe >>> 16 & 255, ge = fe & 65535, !(xe + G <= f); ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              r >>>= xe, f -= xe, a.back += xe;
            }
            if (r >>>= G, f -= G, a.back += G, a.length = ge, oe === 0) {
              a.mode = $;
              break;
            }
            if (oe & 32) {
              a.back = -1, a.mode = V;
              break;
            }
            if (oe & 64) {
              n.msg = "invalid literal/length code", a.mode = Q;
              break;
            }
            a.extra = oe & 15, a.mode = we;
          /* falls through */
          case we:
            if (a.extra) {
              for (Ne = a.extra; f < Ne; ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              a.length += r & (1 << a.extra) - 1, r >>>= a.extra, f -= a.extra, a.back += a.extra;
            }
            a.was = a.length, a.mode = de;
          /* falls through */
          case de:
            for (; fe = a.distcode[r & (1 << a.distbits) - 1], G = fe >>> 24, oe = fe >>> 16 & 255, ge = fe & 65535, !(G <= f); ) {
              if (h === 0)
                break e;
              h--, r += u[e++] << f, f += 8;
            }
            if ((oe & 240) === 0) {
              for (xe = G, We = oe, Ve = ge; fe = a.distcode[Ve + ((r & (1 << xe + We) - 1) >> xe)], G = fe >>> 24, oe = fe >>> 16 & 255, ge = fe & 65535, !(xe + G <= f); ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              r >>>= xe, f -= xe, a.back += xe;
            }
            if (r >>>= G, f -= G, a.back += G, oe & 64) {
              n.msg = "invalid distance code", a.mode = Q;
              break;
            }
            a.offset = ge, a.extra = oe & 15, a.mode = J;
          /* falls through */
          case J:
            if (a.extra) {
              for (Ne = a.extra; f < Ne; ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              a.offset += r & (1 << a.extra) - 1, r >>>= a.extra, f -= a.extra, a.back += a.extra;
            }
            if (a.offset > a.dmax) {
              n.msg = "invalid distance too far back", a.mode = Q;
              break;
            }
            a.mode = ne;
          /* falls through */
          case ne:
            if (t === 0)
              break e;
            if (y = S - t, a.offset > y) {
              if (y = a.offset - y, y > a.whave && a.sane) {
                n.msg = "invalid distance too far back", a.mode = Q;
                break;
              }
              y > a.wnext ? (y -= a.wnext, X = a.wsize - y) : X = a.wnext - y, y > a.length && (y = a.length), Be = a.window;
            } else
              Be = L, X = l - a.offset, y = a.length;
            y > t && (y = t), t -= y, a.length -= y;
            do
              L[l++] = Be[X++];
            while (--y);
            a.length === 0 && (a.mode = re);
            break;
          case $:
            if (t === 0)
              break e;
            L[l++] = a.length, t--, a.mode = re;
            break;
          case se:
            if (a.wrap) {
              for (; f < 32; ) {
                if (h === 0)
                  break e;
                h--, r |= u[e++] << f, f += 8;
              }
              if (S -= t, n.total_out += S, a.total += S, S && (n.adler = a.check = /*UPDATE(state.check, put - _out, _out);*/
              a.flags ? P(a.check, L, S, l - S) : D(a.check, L, S, l - S)), S = t, (a.flags ? r : Te(r)) !== a.check) {
                n.msg = "incorrect data check", a.mode = Q;
                break;
              }
              r = 0, f = 0;
            }
            a.mode = ye;
          /* falls through */
          case ye:
            if (a.wrap && a.flags) {
              for (; f < 32; ) {
                if (h === 0)
                  break e;
                h--, r += u[e++] << f, f += 8;
              }
              if (r !== (a.total & 4294967295)) {
                n.msg = "incorrect length check", a.mode = Q;
                break;
              }
              r = 0, f = 0;
            }
            a.mode = ze;
          /* falls through */
          case ze:
            Re = p;
            break e;
          case Q:
            Re = ae;
            break e;
          case pe:
            return O;
          case Ue:
          /* falls through */
          default:
            return N;
        }
    return n.next_out = l, n.avail_out = t, n.next_in = e, n.avail_in = h, a.hold = r, a.bits = f, (a.wsize || S !== n.avail_out && a.mode < Q && (a.mode < se || o !== _)) && Ge(n, n.output, n.next_out, S - n.avail_out), A -= n.avail_in, S -= n.avail_out, n.total_in += A, n.total_out += S, a.total += S, a.wrap && S && (n.adler = a.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
    a.flags ? P(a.check, L, S, n.next_out - S) : D(a.check, L, S, n.next_out - S)), n.data_type = a.bits + (a.last ? 64 : 0) + (a.mode === V ? 128 : 0) + (a.mode === ue || a.mode === M ? 256 : 0), (A === 0 && S === 0 || o === _) && Re === z && (Re = R), Re;
  }
  function d(n) {
    if (!n || !n.state)
      return N;
    var o = n.state;
    return o.window && (o.window = null), n.state = null, z;
  }
  function b(n, o) {
    var a;
    return !n || !n.state || (a = n.state, (a.wrap & 2) === 0) ? N : (a.head = o, o.done = !1, z);
  }
  function m(n, o) {
    var a = o.length, u, L, e;
    return !n || !n.state || (u = n.state, u.wrap !== 0 && u.mode !== C) ? N : u.mode === C && (L = 1, L = D(L, o, a, 0), L !== u.check) ? ae : (e = Ge(n, o, a, a), e ? (u.mode = pe, O) : (u.havedict = 1, z));
  }
  return De.inflateReset = Ae, De.inflateReset2 = Ye, De.inflateResetKeep = Le, De.inflateInit = Ze, De.inflateInit2 = Me, De.inflate = i, De.inflateEnd = d, De.inflateGetHeader = b, De.inflateSetDictionary = m, De.inflateInfo = "pako inflate (from Nodeca project)", De;
}
var na, Ea;
function Da() {
  return Ea || (Ea = 1, na = {
    /* Allowed flush values; see deflate() and inflate() below for details */
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,
    /* Return codes for the compression/decompression functions. Negative values
    * are errors, positive values are used for special but normal events.
    */
    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,
    //Z_MEM_ERROR:     -4,
    Z_BUF_ERROR: -5,
    //Z_VERSION_ERROR: -6,
    /* compression levels */
    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,
    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,
    /* Possible values of the data_type field (though see inflate()) */
    Z_BINARY: 0,
    Z_TEXT: 1,
    //Z_ASCII:                1, // = Z_TEXT (deprecated)
    Z_UNKNOWN: 2,
    /* The deflate compression method */
    Z_DEFLATED: 8
    //Z_NULL:                 null // Use -1 or null inline, depending on var type
  }), na;
}
var fa, Sa;
function Ma() {
  if (Sa) return fa;
  Sa = 1;
  function g() {
    this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1;
  }
  return fa = g, fa;
}
var ya;
function Fa() {
  if (ya) return $e;
  ya = 1;
  var g = La(), D = He(), P = Aa(), v = Da(), F = ha(), c = Ra(), s = Ma(), w = Object.prototype.toString;
  function _(z) {
    if (!(this instanceof _)) return new _(z);
    this.options = D.assign({
      chunkSize: 16384,
      windowBits: 0,
      to: ""
    }, z || {});
    var p = this.options;
    p.raw && p.windowBits >= 0 && p.windowBits < 16 && (p.windowBits = -p.windowBits, p.windowBits === 0 && (p.windowBits = -15)), p.windowBits >= 0 && p.windowBits < 16 && !(z && z.windowBits) && (p.windowBits += 32), p.windowBits > 15 && p.windowBits < 48 && (p.windowBits & 15) === 0 && (p.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new c(), this.strm.avail_out = 0;
    var k = g.inflateInit2(
      this.strm,
      p.windowBits
    );
    if (k !== v.Z_OK)
      throw new Error(F[k]);
    if (this.header = new s(), g.inflateGetHeader(this.strm, this.header), p.dictionary && (typeof p.dictionary == "string" ? p.dictionary = P.string2buf(p.dictionary) : w.call(p.dictionary) === "[object ArrayBuffer]" && (p.dictionary = new Uint8Array(p.dictionary)), p.raw && (k = g.inflateSetDictionary(this.strm, p.dictionary), k !== v.Z_OK)))
      throw new Error(F[k]);
  }
  _.prototype.push = function(z, p) {
    var k = this.strm, N = this.options.chunkSize, ae = this.options.dictionary, O, R, U, T, B, H = !1;
    if (this.ended)
      return !1;
    R = p === ~~p ? p : p === !0 ? v.Z_FINISH : v.Z_NO_FLUSH, typeof z == "string" ? k.input = P.binstring2buf(z) : w.call(z) === "[object ArrayBuffer]" ? k.input = new Uint8Array(z) : k.input = z, k.next_in = 0, k.avail_in = k.input.length;
    do {
      if (k.avail_out === 0 && (k.output = new D.Buf8(N), k.next_out = 0, k.avail_out = N), O = g.inflate(k, v.Z_NO_FLUSH), O === v.Z_NEED_DICT && ae && (O = g.inflateSetDictionary(this.strm, ae)), O === v.Z_BUF_ERROR && H === !0 && (O = v.Z_OK, H = !1), O !== v.Z_STREAM_END && O !== v.Z_OK)
        return this.onEnd(O), this.ended = !0, !1;
      k.next_out && (k.avail_out === 0 || O === v.Z_STREAM_END || k.avail_in === 0 && (R === v.Z_FINISH || R === v.Z_SYNC_FLUSH)) && (this.options.to === "string" ? (U = P.utf8border(k.output, k.next_out), T = k.next_out - U, B = P.buf2string(k.output, U), k.next_out = T, k.avail_out = N - T, T && D.arraySet(k.output, k.output, U, T, 0), this.onData(B)) : this.onData(D.shrinkBuf(k.output, k.next_out))), k.avail_in === 0 && k.avail_out === 0 && (H = !0);
    } while ((k.avail_in > 0 || k.avail_out === 0) && O !== v.Z_STREAM_END);
    return O === v.Z_STREAM_END && (R = v.Z_FINISH), R === v.Z_FINISH ? (O = g.inflateEnd(this.strm), this.onEnd(O), this.ended = !0, O === v.Z_OK) : (R === v.Z_SYNC_FLUSH && (this.onEnd(v.Z_OK), k.avail_out = 0), !0);
  }, _.prototype.onData = function(z) {
    this.chunks.push(z);
  }, _.prototype.onEnd = function(z) {
    z === v.Z_OK && (this.options.to === "string" ? this.result = this.chunks.join("") : this.result = D.flattenChunks(this.chunks)), this.chunks = [], this.err = z, this.msg = this.strm.msg;
  };
  function Z(z, p) {
    var k = new _(p);
    if (k.push(z, !0), k.err)
      throw k.msg || F[k.err];
    return k.result;
  }
  function E(z, p) {
    return p = p || {}, p.raw = !0, Z(z, p);
  }
  return $e.Inflate = _, $e.inflate = Z, $e.inflateRaw = E, $e.ungzip = Z, $e;
}
var la, za;
function Ha() {
  if (za) return la;
  za = 1;
  var g = He().assign, D = Na(), P = Fa(), v = Da(), F = {};
  return g(F, D, P, v), la = F, la;
}
var Ua = Ha();
const Pa = /* @__PURE__ */ Za({
  __proto__: null
}, [Ua]);
export {
  Pa as i
};
