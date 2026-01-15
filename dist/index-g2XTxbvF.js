const ne = [
  "BOOLEAN",
  "INT32",
  "INT64",
  "INT96",
  // deprecated
  "FLOAT",
  "DOUBLE",
  "BYTE_ARRAY",
  "FIXED_LEN_BYTE_ARRAY"
], O = [
  "PLAIN",
  "GROUP_VAR_INT",
  // deprecated
  "PLAIN_DICTIONARY",
  "RLE",
  "BIT_PACKED",
  // deprecated
  "DELTA_BINARY_PACKED",
  "DELTA_LENGTH_BYTE_ARRAY",
  "DELTA_BYTE_ARRAY",
  "RLE_DICTIONARY",
  "BYTE_STREAM_SPLIT"
], Ue = [
  "REQUIRED",
  "OPTIONAL",
  "REPEATED"
], $e = [
  "UTF8",
  "MAP",
  "MAP_KEY_VALUE",
  "LIST",
  "ENUM",
  "DECIMAL",
  "DATE",
  "TIME_MILLIS",
  "TIME_MICROS",
  "TIMESTAMP_MILLIS",
  "TIMESTAMP_MICROS",
  "UINT_8",
  "UINT_16",
  "UINT_32",
  "UINT_64",
  "INT_8",
  "INT_16",
  "INT_32",
  "INT_64",
  "JSON",
  "BSON",
  "INTERVAL"
], Me = [
  "UNCOMPRESSED",
  "SNAPPY",
  "GZIP",
  "LZO",
  "BROTLI",
  "LZ4",
  "ZSTD",
  "LZ4_RAW"
], we = [
  "DATA_PAGE",
  "INDEX_PAGE",
  "DICTIONARY_PAGE",
  "DATA_PAGE_V2"
], Ce = [
  "UNORDERED",
  "ASCENDING",
  "DESCENDING"
], Fe = [
  "SPHERICAL",
  "VINCENTY",
  "THOMAS",
  "ANDOYER",
  "KARNEY"
];
function z(e) {
  const t = M(e);
  if (t.type === 1)
    return { type: "Point", coordinates: H(e, t) };
  if (t.type === 2)
    return { type: "LineString", coordinates: W(e, t) };
  if (t.type === 3)
    return { type: "Polygon", coordinates: ie(e, t) };
  if (t.type === 4) {
    const n = [];
    for (let i = 0; i < t.count; i++)
      n.push(H(e, M(e)));
    return { type: "MultiPoint", coordinates: n };
  } else if (t.type === 5) {
    const n = [];
    for (let i = 0; i < t.count; i++)
      n.push(W(e, M(e)));
    return { type: "MultiLineString", coordinates: n };
  } else if (t.type === 6) {
    const n = [];
    for (let i = 0; i < t.count; i++)
      n.push(ie(e, M(e)));
    return { type: "MultiPolygon", coordinates: n };
  } else if (t.type === 7) {
    const n = [];
    for (let i = 0; i < t.count; i++)
      n.push(z(e));
    return { type: "GeometryCollection", geometries: n };
  } else
    throw new Error(`Unsupported geometry type: ${t.type}`);
}
function M(e) {
  const { view: t } = e, n = t.getUint8(e.offset++) === 1, i = t.getUint32(e.offset, n);
  e.offset += 4;
  const r = i % 1e3, f = Math.floor(i / 1e3);
  let o = 0;
  r > 1 && r <= 7 && (o = t.getUint32(e.offset, n), e.offset += 4);
  let s = 2;
  return f && s++, f === 3 && s++, { littleEndian: n, type: r, dim: s, count: o };
}
function H(e, t) {
  const n = [];
  for (let i = 0; i < t.dim; i++) {
    const r = e.view.getFloat64(e.offset, t.littleEndian);
    e.offset += 8, n.push(r);
  }
  return n;
}
function W(e, t) {
  const n = [];
  for (let i = 0; i < t.count; i++)
    n.push(H(e, t));
  return n;
}
function ie(e, t) {
  const { view: n } = e, i = [];
  for (let r = 0; r < t.count; r++) {
    const f = n.getUint32(e.offset, t.littleEndian);
    e.offset += 4, i.push(W(e, { ...t, count: f }));
  }
  return i;
}
const ge = new TextDecoder(), J = {
  timestampFromMilliseconds(e) {
    return new Date(Number(e));
  },
  timestampFromMicroseconds(e) {
    return new Date(Number(e / 1000n));
  },
  timestampFromNanoseconds(e) {
    return new Date(Number(e / 1000000n));
  },
  dateFromDays(e) {
    return new Date(e * 864e5);
  },
  stringFromBytes(e) {
    return e && ge.decode(e);
  },
  geometryFromBytes(e) {
    return e && z({ view: new DataView(e.buffer, e.byteOffset, e.byteLength), offset: 0 });
  },
  geographyFromBytes(e) {
    return e && z({ view: new DataView(e.buffer, e.byteOffset, e.byteLength), offset: 0 });
  }
};
function re(e, t, n, i) {
  if (t && n.endsWith("_DICTIONARY")) {
    let r = e;
    e instanceof Uint8Array && !(t instanceof Uint8Array) && (r = new t.constructor(e.length));
    for (let f = 0; f < e.length; f++)
      r[f] = t[e[f]];
    return r;
  } else
    return ye(e, i);
}
function ye(e, t) {
  const { element: n, parsers: i, utf8: r = !0 } = t, { type: f, converted_type: o, logical_type: s } = n;
  if (o === "DECIMAL") {
    const c = 10 ** -(n.scale || 0), u = new Array(e.length);
    for (let a = 0; a < u.length; a++)
      e[a] instanceof Uint8Array ? u[a] = me(e[a]) * c : u[a] = Number(e[a]) * c;
    return u;
  }
  if (!o && f === "INT96")
    return Array.from(e).map((l) => i.timestampFromNanoseconds(Ye(l)));
  if (o === "DATE")
    return Array.from(e).map((l) => i.dateFromDays(l));
  if (o === "TIMESTAMP_MILLIS")
    return Array.from(e).map((l) => i.timestampFromMilliseconds(l));
  if (o === "TIMESTAMP_MICROS")
    return Array.from(e).map((l) => i.timestampFromMicroseconds(l));
  if (o === "JSON")
    return e.map((l) => JSON.parse(ge.decode(l)));
  if (o === "BSON")
    throw new Error("parquet bson not supported");
  if (o === "INTERVAL")
    throw new Error("parquet interval not supported");
  if (s?.type === "GEOMETRY")
    return e.map((l) => i.geometryFromBytes(l));
  if (s?.type === "GEOGRAPHY")
    return e.map((l) => i.geographyFromBytes(l));
  if (o === "UTF8" || s?.type === "STRING" || r && f === "BYTE_ARRAY")
    return e.map((l) => i.stringFromBytes(l));
  if (o === "UINT_64" || s?.type === "INTEGER" && s.bitWidth === 64 && !s.isSigned) {
    if (e instanceof BigInt64Array)
      return new BigUint64Array(e.buffer, e.byteOffset, e.length);
    const l = new BigUint64Array(e.length);
    for (let c = 0; c < l.length; c++) l[c] = BigInt(e[c]);
    return l;
  }
  if (o === "UINT_32" || s?.type === "INTEGER" && s.bitWidth === 32 && !s.isSigned) {
    if (e instanceof Int32Array)
      return new Uint32Array(e.buffer, e.byteOffset, e.length);
    const l = new Uint32Array(e.length);
    for (let c = 0; c < l.length; c++) l[c] = e[c];
    return l;
  }
  if (s?.type === "FLOAT16")
    return Array.from(e).map(pe);
  if (s?.type === "TIMESTAMP") {
    const { unit: l } = s;
    let c = i.timestampFromMilliseconds;
    l === "MICROS" && (c = i.timestampFromMicroseconds), l === "NANOS" && (c = i.timestampFromNanoseconds);
    const u = new Array(e.length);
    for (let a = 0; a < u.length; a++)
      u[a] = c(e[a]);
    return u;
  }
  return e;
}
function me(e) {
  if (!e.length) return 0;
  let t = 0n;
  for (const i of e)
    t = t * 256n + BigInt(i);
  const n = e.length * 8;
  return t >= 2n ** BigInt(n - 1) && (t -= 2n ** BigInt(n)), Number(t);
}
function Ye(e) {
  const t = (e >> 64n) - 2440588n, n = e & 0xffffffffffffffffn;
  return t * 86400000000000n + n;
}
function pe(e) {
  if (!e) return;
  const t = e[1] << 8 | e[0], n = t >> 15 ? -1 : 1, i = t >> 10 & 31, r = t & 1023;
  return i === 0 ? n * 2 ** -14 * (r / 1024) : i === 31 ? r ? NaN : n * (1 / 0) : n * 2 ** (i - 15) * (1 + r / 1024);
}
function Ae(e, t, n) {
  const i = e[t], r = [];
  let f = 1;
  if (i.num_children)
    for (; r.length < i.num_children; ) {
      const o = e[t + f], s = Ae(e, t + f, [...n, o.name]);
      f += s.count, r.push(s);
    }
  return { count: f, element: i, children: r, path: n };
}
function Ee(e, t) {
  let n = Ae(e, 0, []);
  const i = [n];
  for (const r of t) {
    const f = n.children.find((o) => o.element.name === r);
    if (!f) throw new Error(`parquet schema element not found: ${t}`);
    i.push(f), n = f;
  }
  return i;
}
function ke(e) {
  const t = [];
  function n(i) {
    if (i.children.length)
      for (const r of i.children)
        n(r);
    else
      t.push(i.path.join("."));
  }
  return n(e), t;
}
function Ie(e) {
  let t = 0;
  for (const { element: n } of e)
    n.repetition_type === "REPEATED" && t++;
  return t;
}
function X(e) {
  let t = 0;
  for (const { element: n } of e.slice(1))
    n.repetition_type !== "REQUIRED" && t++;
  return t;
}
function qe(e) {
  if (!e || e.element.converted_type !== "LIST" || e.children.length > 1) return !1;
  const t = e.children[0];
  return !(t.children.length > 1 || t.element.repetition_type !== "REPEATED");
}
function Ge(e) {
  if (!e || e.element.converted_type !== "MAP" || e.children.length > 1) return !1;
  const t = e.children[0];
  return !(t.children.length !== 2 || t.element.repetition_type !== "REPEATED" || t.children.find((r) => r.element.name === "key")?.element.repetition_type === "REPEATED" || t.children.find((r) => r.element.name === "value")?.element.repetition_type === "REPEATED");
}
function ve(e) {
  if (e.length !== 2) return !1;
  const [, t] = e;
  return !(t.element.repetition_type === "REPEATED" || t.children.length);
}
const E = {
  STOP: 0,
  TRUE: 1,
  FALSE: 2,
  BYTE: 3,
  I16: 4,
  I32: 5,
  I64: 6,
  DOUBLE: 7,
  BINARY: 8,
  LIST: 9,
  STRUCT: 12
};
function q(e) {
  let t = 0;
  const n = {};
  for (; e.offset < e.view.byteLength; ) {
    const [i, r, f] = Te(e, t);
    if (t = f, i === E.STOP)
      break;
    n[`field_${r}`] = C(e, i);
  }
  return n;
}
function C(e, t) {
  switch (t) {
    case E.TRUE:
      return !0;
    case E.FALSE:
      return !1;
    case E.BYTE:
      return e.view.getInt8(e.offset++);
    case E.I16:
    case E.I32:
      return be(e);
    case E.I64:
      return K(e);
    case E.DOUBLE: {
      const n = e.view.getFloat64(e.offset, !0);
      return e.offset += 8, n;
    }
    case E.BINARY: {
      const n = S(e), i = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, n);
      return e.offset += n, i;
    }
    case E.LIST: {
      const n = e.view.getUint8(e.offset++), i = n & 15;
      let r = n >> 4;
      r === 15 && (r = S(e));
      const f = i === E.TRUE || i === E.FALSE, o = new Array(r);
      for (let s = 0; s < r; s++)
        o[s] = f ? C(e, E.BYTE) === 1 : C(e, i);
      return o;
    }
    case E.STRUCT: {
      const n = {};
      let i = 0;
      for (; ; ) {
        const [r, f, o] = Te(e, i);
        if (i = o, r === E.STOP)
          break;
        n[`field_${f}`] = C(e, r);
      }
      return n;
    }
    // TODO: MAP, SET, UUID
    default:
      throw new Error(`thrift unhandled type: ${t}`);
  }
}
function S(e) {
  let t = 0, n = 0;
  for (; ; ) {
    const i = e.view.getUint8(e.offset++);
    if (t |= (i & 127) << n, !(i & 128))
      return t;
    n += 7;
  }
}
function Ve(e) {
  let t = 0n, n = 0n;
  for (; ; ) {
    const i = e.view.getUint8(e.offset++);
    if (t |= BigInt(i & 127) << n, !(i & 128))
      return t;
    n += 7n;
  }
}
function be(e) {
  const t = S(e);
  return t >>> 1 ^ -(t & 1);
}
function K(e) {
  const t = Ve(e);
  return t >> 1n ^ -(t & 1n);
}
function Te(e, t) {
  const n = e.view.getUint8(e.offset++), i = n & 15;
  if (i === E.STOP)
    return [0, 0, t];
  const r = n >> 4, f = r ? t + r : be(e);
  return [i, f, f];
}
function je(e, t) {
  const n = /* @__PURE__ */ new Map(), i = t?.find(({ key: f }) => f === "geo")?.value, r = (i && JSON.parse(i)?.columns) ?? {};
  for (const [f, o] of Object.entries(r)) {
    if (o.encoding !== "WKB")
      continue;
    const s = o.edges === "spherical" ? "GEOGRAPHY" : "GEOMETRY", l = o.crs?.id ?? o.crs?.ids?.[0], c = l ? `${l.authority}:${l.code.toString()}` : void 0;
    n.set(f, { type: s, crs: c });
  }
  for (let f = 1; f < e.length; f++) {
    const o = e[f], { logical_type: s, name: l, num_children: c, repetition_type: u, type: a } = o;
    if (c) {
      f += c;
      continue;
    }
    a === "BYTE_ARRAY" && s === void 0 && u !== "REPEATED" && (o.logical_type = n.get(l));
  }
}
const Le = 1 << 19, ze = new TextDecoder();
function v(e) {
  return e && ze.decode(e);
}
async function G(e, { parsers: t, initialFetchSize: n = Le, geoparquet: i = !0 } = {}) {
  if (!e || !(e.byteLength >= 0)) throw new Error("parquet expected AsyncBuffer");
  const r = Math.max(0, e.byteLength - n), f = await e.slice(r, e.byteLength), o = new DataView(f);
  if (o.getUint32(f.byteLength - 4, !0) !== 827474256)
    throw new Error("parquet file invalid (footer != PAR1)");
  const s = o.getUint32(f.byteLength - 8, !0);
  if (s > e.byteLength - 8)
    throw new Error(`parquet metadata length ${s} exceeds available buffer ${e.byteLength - 8}`);
  if (s + 8 > n) {
    const l = e.byteLength - s - 8, c = await e.slice(l, r), u = new ArrayBuffer(s + 8), a = new Uint8Array(u);
    return a.set(new Uint8Array(c)), a.set(new Uint8Array(f), r - l), fe(u, { parsers: t, geoparquet: i });
  } else
    return fe(f, { parsers: t, geoparquet: i });
}
function fe(e, { parsers: t, geoparquet: n = !0 } = {}) {
  if (!(e instanceof ArrayBuffer)) throw new Error("parquet expected ArrayBuffer");
  const i = new DataView(e);
  if (t = { ...J, ...t }, i.byteLength < 8)
    throw new Error("parquet file is too short");
  if (i.getUint32(i.byteLength - 4, !0) !== 827474256)
    throw new Error("parquet file invalid (footer != PAR1)");
  const r = i.byteLength - 8, f = i.getUint32(r, !0);
  if (f > i.byteLength - 8)
    throw new Error(`parquet metadata length ${f} exceeds available buffer ${i.byteLength - 8}`);
  const o = r - f, l = q({ view: i, offset: o }), c = l.field_1, u = l.field_2.map((h) => ({
    type: ne[h.field_1],
    type_length: h.field_2,
    repetition_type: Ue[h.field_3],
    name: v(h.field_4),
    num_children: h.field_5,
    converted_type: $e[h.field_6],
    scale: h.field_7,
    precision: h.field_8,
    field_id: h.field_9,
    logical_type: He(h.field_10)
  })), a = u.filter((h) => h.type), _ = l.field_3, w = l.field_4.map((h) => ({
    columns: h.field_1.map((d, m) => ({
      file_path: v(d.field_1),
      file_offset: d.field_2,
      meta_data: d.field_3 && {
        type: ne[d.field_3.field_1],
        encodings: d.field_3.field_2?.map((p) => O[p]),
        path_in_schema: d.field_3.field_3.map(v),
        codec: Me[d.field_3.field_4],
        num_values: d.field_3.field_5,
        total_uncompressed_size: d.field_3.field_6,
        total_compressed_size: d.field_3.field_7,
        key_value_metadata: d.field_3.field_8?.map((p) => ({
          key: v(p.field_1),
          value: v(p.field_2)
        })),
        data_page_offset: d.field_3.field_9,
        index_page_offset: d.field_3.field_10,
        dictionary_page_offset: d.field_3.field_11,
        statistics: We(d.field_3.field_12, a[m], t),
        encoding_stats: d.field_3.field_13?.map((p) => ({
          page_type: we[p.field_1],
          encoding: O[p.field_2],
          count: p.field_3
        })),
        bloom_filter_offset: d.field_3.field_14,
        bloom_filter_length: d.field_3.field_15,
        size_statistics: d.field_3.field_16 && {
          unencoded_byte_array_data_bytes: d.field_3.field_16.field_1,
          repetition_level_histogram: d.field_3.field_16.field_2,
          definition_level_histogram: d.field_3.field_16.field_3
        },
        geospatial_statistics: d.field_3.field_17 && {
          bbox: d.field_3.field_17.field_1 && {
            xmin: d.field_3.field_17.field_1.field_1,
            xmax: d.field_3.field_17.field_1.field_2,
            ymin: d.field_3.field_17.field_1.field_3,
            ymax: d.field_3.field_17.field_1.field_4,
            zmin: d.field_3.field_17.field_1.field_5,
            zmax: d.field_3.field_17.field_1.field_6,
            mmin: d.field_3.field_17.field_1.field_7,
            mmax: d.field_3.field_17.field_1.field_8
          },
          geospatial_types: d.field_3.field_17.field_2
        }
      },
      offset_index_offset: d.field_4,
      offset_index_length: d.field_5,
      column_index_offset: d.field_6,
      column_index_length: d.field_7,
      crypto_metadata: d.field_8,
      encrypted_column_metadata: d.field_9
    })),
    total_byte_size: h.field_2,
    num_rows: h.field_3,
    sorting_columns: h.field_4?.map((d) => ({
      column_idx: d.field_1,
      descending: d.field_2,
      nulls_first: d.field_3
    })),
    file_offset: h.field_5,
    total_compressed_size: h.field_6,
    ordinal: h.field_7
  })), g = l.field_5?.map((h) => ({
    key: v(h.field_1),
    value: v(h.field_2)
  })), y = v(l.field_6);
  return n && je(u, g), {
    version: c,
    schema: u,
    num_rows: _,
    row_groups: w,
    key_value_metadata: g,
    created_by: y,
    metadata_length: f
  };
}
function U({ schema: e }) {
  return Ee(e, [])[0];
}
function He(e) {
  return e?.field_1 ? { type: "STRING" } : e?.field_2 ? { type: "MAP" } : e?.field_3 ? { type: "LIST" } : e?.field_4 ? { type: "ENUM" } : e?.field_5 ? {
    type: "DECIMAL",
    scale: e.field_5.field_1,
    precision: e.field_5.field_2
  } : e?.field_6 ? { type: "DATE" } : e?.field_7 ? {
    type: "TIME",
    isAdjustedToUTC: e.field_7.field_1,
    unit: oe(e.field_7.field_2)
  } : e?.field_8 ? {
    type: "TIMESTAMP",
    isAdjustedToUTC: e.field_8.field_1,
    unit: oe(e.field_8.field_2)
  } : e?.field_10 ? {
    type: "INTEGER",
    bitWidth: e.field_10.field_1,
    isSigned: e.field_10.field_2
  } : e?.field_11 ? { type: "NULL" } : e?.field_12 ? { type: "JSON" } : e?.field_13 ? { type: "BSON" } : e?.field_14 ? { type: "UUID" } : e?.field_15 ? { type: "FLOAT16" } : e?.field_16 ? {
    type: "VARIANT",
    specification_version: e.field_16.field_1
  } : e?.field_17 ? {
    type: "GEOMETRY",
    crs: v(e.field_17.field_1)
  } : e?.field_18 ? {
    type: "GEOGRAPHY",
    crs: v(e.field_18.field_1),
    algorithm: Fe[e.field_18.field_2]
  } : e;
}
function oe(e) {
  if (e.field_1) return "MILLIS";
  if (e.field_2) return "MICROS";
  if (e.field_3) return "NANOS";
  throw new Error("parquet time unit required");
}
function We(e, t, n) {
  return e && {
    max: D(e.field_1, t, n),
    min: D(e.field_2, t, n),
    null_count: e.field_3,
    distinct_count: e.field_4,
    max_value: D(e.field_5, t, n),
    min_value: D(e.field_6, t, n),
    is_max_value_exact: e.field_7,
    is_min_value_exact: e.field_8
  };
}
function D(e, t, n) {
  const { type: i, converted_type: r, logical_type: f } = t;
  if (e === void 0) return e;
  if (i === "BOOLEAN") return e[0] === 1;
  if (i === "BYTE_ARRAY") return n.stringFromBytes(e);
  const o = new DataView(e.buffer, e.byteOffset, e.byteLength);
  return i === "FLOAT" && o.byteLength === 4 ? o.getFloat32(0, !0) : i === "DOUBLE" && o.byteLength === 8 ? o.getFloat64(0, !0) : i === "INT32" && r === "DATE" ? n.dateFromDays(o.getInt32(0, !0)) : i === "INT64" && r === "TIMESTAMP_MILLIS" ? n.timestampFromMilliseconds(o.getBigInt64(0, !0)) : i === "INT64" && r === "TIMESTAMP_MICROS" ? n.timestampFromMicroseconds(o.getBigInt64(0, !0)) : i === "INT64" && f?.type === "TIMESTAMP" && f?.unit === "NANOS" ? n.timestampFromNanoseconds(o.getBigInt64(0, !0)) : i === "INT64" && f?.type === "TIMESTAMP" && f?.unit === "MICROS" ? n.timestampFromMicroseconds(o.getBigInt64(0, !0)) : i === "INT64" && f?.type === "TIMESTAMP" ? n.timestampFromMilliseconds(o.getBigInt64(0, !0)) : i === "INT32" && o.byteLength === 4 ? o.getInt32(0, !0) : i === "INT64" && o.byteLength === 8 ? o.getBigInt64(0, !0) : r === "DECIMAL" ? me(e) * 10 ** -(t.scale || 0) : f?.type === "FLOAT16" ? pe(e) : e;
}
function Nt(e, t, n = void 0) {
  n = { ...J, ...n };
  const i = q(e);
  return {
    null_pages: i.field_1,
    min_values: i.field_2.map((r) => D(r, t, n)),
    max_values: i.field_3.map((r) => D(r, t, n)),
    boundary_order: Ce[i.field_4],
    null_counts: i.field_5,
    repetition_level_histograms: i.field_6,
    definition_level_histograms: i.field_7
  };
}
function Ke(e) {
  const t = q(e);
  return {
    page_locations: t.field_1.map(Qe),
    unencoded_byte_array_data_bytes: t.field_2
  };
}
function Qe(e) {
  return {
    offset: e.field_1,
    compressed_page_size: e.field_2,
    first_row_index: e.field_3
  };
}
function se(e) {
  if (e === void 0) return null;
  if (typeof e == "bigint") return Number(e);
  if (Array.isArray(e)) return e.map(se);
  if (e instanceof Uint8Array) return Array.from(e);
  if (e instanceof Date) return e.toISOString();
  if (e instanceof Object) {
    const t = {};
    for (const n of Object.keys(e))
      e[n] !== void 0 && (t[n] = se(e[n]));
    return t;
  }
  return e;
}
function Ne(e, t) {
  for (let i = 0; i < t.length; i += 1e4)
    e.push(...t.slice(i, i + 1e4));
}
function b(e, t, n = !0) {
  if (n ? e === t : e == t) return !0;
  if (e instanceof Uint8Array && t instanceof Uint8Array) return b(Array.from(e), Array.from(t), n);
  if (!e || !t || typeof e != typeof t) return !1;
  if (Array.isArray(e) && Array.isArray(t)) {
    if (e.length !== t.length) return !1;
    for (let r = 0; r < e.length; r++)
      if (!b(e[r], t[r], n)) return !1;
    return !0;
  }
  if (typeof e != "object") return !1;
  const i = Object.keys(e);
  if (i.length !== Object.keys(t).length) return !1;
  for (const r of i)
    if (!b(e[r], t[r], n)) return !1;
  return !0;
}
async function le(e, t = {}, n = globalThis.fetch) {
  const i = new AbortController(), r = new Headers(t.headers);
  r.set("Range", "bytes=0-0");
  const f = await n(e, {
    ...t,
    headers: r,
    signal: i.signal
  });
  if (!f.ok) throw new Error(`fetch with range failed ${f.status}`);
  if (f.status === 206) {
    const o = f.headers.get("Content-Range");
    if (!o) throw new Error("missing content-range header");
    const s = o.match(/bytes \d+-\d+\/(\d+)/);
    if (!s) throw new Error(`invalid content-range header: ${o}`);
    return parseInt(s[1]);
  }
  if (f.status === 200) {
    const o = f.headers.get("Content-Length");
    if (i.abort(), o) return parseInt(o);
  }
  throw new Error("server does not support range requests and missing content-length");
}
async function Ze(e, t, n) {
  const i = n ?? globalThis.fetch, r = await i(e, { ...t, method: "HEAD" });
  if (r.status === 403)
    return le(e, t, i);
  if (!r.ok) throw new Error(`fetch head failed ${r.status}`);
  const f = r.headers.get("Content-Length");
  return f ? parseInt(f) : le(e, t, i);
}
async function Rt({ url: e, byteLength: t, requestInit: n, fetch: i }) {
  if (!e) throw new Error("missing url");
  const r = i ?? globalThis.fetch;
  t ??= await Ze(e, n, r);
  let f;
  const o = n || {};
  return {
    byteLength: t,
    async slice(s, l) {
      if (f)
        return f.then((_) => _.slice(s, l));
      const c = new Headers(o.headers), u = l === void 0 ? "" : l - 1;
      c.set("Range", `bytes=${s}-${u}`);
      const a = await r(e, { ...o, headers: c });
      if (!a.ok || !a.body) throw new Error(`fetch failed ${a.status}`);
      if (a.status === 200)
        return f = a.arrayBuffer(), f.then((_) => _.slice(s, l));
      if (a.status === 206)
        return a.arrayBuffer();
      throw new Error(`fetch received unexpected status code ${a.status}`);
    }
  };
}
function Ot({ byteLength: e, slice: t }, { minSize: n = Le } = {}) {
  if (e < n) {
    const r = t(0, e);
    return {
      byteLength: e,
      async slice(f, o) {
        return (await r).slice(f, o);
      }
    };
  }
  const i = /* @__PURE__ */ new Map();
  return {
    byteLength: e,
    /**
     * @param {number} start
     * @param {number} [end]
     * @returns {Awaitable<ArrayBuffer>}
     */
    slice(r, f) {
      const o = Je(r, f, e), s = i.get(o);
      if (s) return s;
      const l = t(r, f);
      return i.set(o, l), l;
    }
  };
}
function Je(e, t, n) {
  if (e < 0) {
    if (t !== void 0) throw new Error(`invalid suffix range [${e}, ${t}]`);
    return n === void 0 ? `${e},` : `${n + e},${n}`;
  } else if (t !== void 0) {
    if (e > t) throw new Error(`invalid empty range [${e}, ${t}]`);
    return `${e},${t}`;
  } else return n === void 0 ? `${e},` : `${e},${n}`;
}
function k(e) {
  if (!e) return [];
  if (e.length === 1) return e[0];
  const t = [];
  for (const n of e)
    Ne(t, n);
  return t;
}
function F(e) {
  if (!e) return [];
  const t = [];
  return "$and" in e && Array.isArray(e.$and) ? t.push(...e.$and.flatMap(F)) : "$or" in e && Array.isArray(e.$or) ? t.push(...e.$or.flatMap(F)) : "$nor" in e && Array.isArray(e.$nor) ? t.push(...e.$nor.flatMap(F)) : t.push(...Object.keys(e)), t;
}
function B(e, t, n = !0) {
  return "$and" in t && Array.isArray(t.$and) ? t.$and.every((i) => B(e, i, n)) : "$or" in t && Array.isArray(t.$or) ? t.$or.some((i) => B(e, i, n)) : "$nor" in t && Array.isArray(t.$nor) ? !t.$nor.some((i) => B(e, i, n)) : Object.entries(t).every(([i, r]) => {
    const f = e[i];
    return typeof r != "object" || r === null || Array.isArray(r) ? b(f, r, n) : Object.entries(r || {}).every(([o, s]) => o === "$gt" ? f > s : o === "$gte" ? f >= s : o === "$lt" ? f < s : o === "$lte" ? f <= s : o === "$eq" ? b(f, s, n) : o === "$ne" ? !b(f, s, n) : o === "$in" ? Array.isArray(s) && s.includes(f) : o === "$nin" ? Array.isArray(s) && !s.includes(f) : o === "$not" ? !B({ [i]: f }, { [i]: s }, n) : !0);
  });
}
function Q({ rowGroup: e, physicalColumns: t, filter: n, strict: i = !0 }) {
  if (!n) return !1;
  if ("$and" in n && Array.isArray(n.$and))
    return n.$and.some((r) => Q({ rowGroup: e, physicalColumns: t, filter: r, strict: i }));
  if ("$or" in n && Array.isArray(n.$or))
    return n.$or.every((r) => Q({ rowGroup: e, physicalColumns: t, filter: r, strict: i }));
  if ("$nor" in n && Array.isArray(n.$nor))
    return !1;
  for (const [r, f] of Object.entries(n)) {
    const o = t.indexOf(r);
    if (o === -1) continue;
    const s = e.columns[o].meta_data?.statistics;
    if (!s) continue;
    const { min: l, max: c, min_value: u, max_value: a } = s, _ = u !== void 0 ? u : l, w = a !== void 0 ? a : c;
    if (!(_ === void 0 || w === void 0)) {
      for (const [g, y] of Object.entries(f || {}))
        if (g === "$gt" && w <= y || g === "$gte" && w < y || g === "$lt" && _ >= y || g === "$lte" && _ > y || g === "$eq" && (y < _ || y > w) || g === "$ne" && b(_, w, i) && b(_, y, i) || g === "$in" && Array.isArray(y) && y.every((h) => h < _ || h > w) || g === "$nin" && Array.isArray(y) && b(_, w, i) && y.includes(_)) return !0;
    }
  }
  return !1;
}
const Xe = 1 << 21;
function et({ metadata: e, rowStart: t = 0, rowEnd: n = 1 / 0, columns: i, filter: r, filterStrict: f = !0, useOffsetIndex: o = !1 }) {
  if (!e) throw new Error("parquetPlan requires metadata");
  const s = [], l = [], c = [], u = ke(U(e));
  let a = 0;
  for (const _ of e.row_groups) {
    const w = Number(_.num_rows), g = a + w;
    if (w > 0 && g > t && a < n && !Q({ rowGroup: _, physicalColumns: u, filter: r, strict: f })) {
      const y = [];
      for (const p of _.columns) {
        const A = p.meta_data;
        if (p.file_path) throw new Error("parquet file_path not supported");
        if (!A) throw new Error("parquet column metadata is undefined");
        if (!i || i.includes(A.path_in_schema[0])) {
          const I = A.dictionary_page_offset || A.data_page_offset, N = Number(I), T = Number(I + A.total_compressed_size);
          if (o && p.offset_index_offset && p.offset_index_length) {
            const R = Number(p.offset_index_offset);
            y.push({
              columnMetadata: A,
              offsetIndex: {
                startByte: R,
                endByte: R + p.offset_index_length
              },
              bounds: { startByte: N, endByte: T }
            });
          } else
            y.push({
              columnMetadata: A,
              range: { startByte: N, endByte: T }
            });
        }
      }
      const h = Math.max(t - a, 0), d = Math.min(n - a, w);
      s.push({ chunks: y, rowGroup: _, groupStart: a, groupRows: w, selectStart: h, selectEnd: d });
      let m;
      for (const p of y)
        if ("offsetIndex" in p)
          c.push(p.offsetIndex);
        else {
          const { range: A } = p;
          i ? l.push(A) : m && A.endByte - m.startByte <= Xe ? m.endByte = A.endByte : (m && l.push(m), m = { ...A });
        }
      m && l.push(m);
    }
    a = g;
  }
  return isFinite(n) || (n = a), l.push(...c), { metadata: e, rowStart: t, rowEnd: n, columns: i, fetches: l, groups: s };
}
function tt(e, { fetches: t }) {
  const n = t.map(({ startByte: i, endByte: r }) => e.slice(i, r));
  return {
    byteLength: e.byteLength,
    slice(i, r = e.byteLength) {
      const f = t.findIndex(({ startByte: o, endByte: s }) => o <= i && r <= s);
      if (f < 0)
        return e.slice(i, r);
      if (t[f].startByte !== i || t[f].endByte !== r) {
        const o = i - t[f].startByte, s = r - t[f].startByte;
        return n[f] instanceof Promise ? n[f].then((l) => l.slice(o, s)) : n[f].slice(o, s);
      } else
        return n[f];
    }
  };
}
function ae(e, t, n, i, r) {
  const f = t?.length || n.length;
  if (!f) return i;
  const o = X(r), s = r.map(({ element: g }) => g.repetition_type);
  let l = 0;
  const c = [e];
  let u = e, a = 0, _ = 0, w = 0;
  if (n[0])
    for (; a < s.length - 2 && w < n[0]; )
      a++, s[a] !== "REQUIRED" && (u = u.at(-1), c.push(u), _++), s[a] === "REPEATED" && w++;
  for (let g = 0; g < f; g++) {
    const y = t?.length ? t[g] : o, h = n[g];
    for (; a && (h < w || s[a] !== "REPEATED"); )
      s[a] !== "REQUIRED" && (c.pop(), _--), s[a] === "REPEATED" && w--, a--;
    for (u = c.at(-1); (a < s.length - 2 || s[a + 1] === "REPEATED") && (_ < y || s[a + 1] === "REQUIRED"); ) {
      if (a++, s[a] !== "REQUIRED") {
        const d = [];
        u.push(d), u = d, c.push(d), _++;
      }
      s[a] === "REPEATED" && w++;
    }
    y === o ? u.push(i[l++]) : a === s.length - 2 ? u.push(null) : u.push([]);
  }
  if (!e.length)
    for (let g = 0; g < o; g++) {
      const y = [];
      u.push(y), u = y;
    }
  return e;
}
function P(e, t, n = 0) {
  const i = t.path.join("."), r = t.element.repetition_type === "OPTIONAL", f = r ? n + 1 : n;
  if (qe(t)) {
    let o = t.children[0], s = f;
    o.children.length === 1 && (o = o.children[0], s++), P(e, o, s);
    const l = o.path.join("."), c = e.get(l);
    if (!c) throw new Error("parquet list column missing values");
    r && Y(c, n), e.set(i, c), e.delete(l);
    return;
  }
  if (Ge(t)) {
    const o = t.children[0].element.name;
    P(e, t.children[0].children[0], f + 1), P(e, t.children[0].children[1], f + 1);
    const s = e.get(`${i}.${o}.key`), l = e.get(`${i}.${o}.value`);
    if (!s) throw new Error("parquet map column missing keys");
    if (!l) throw new Error("parquet map column missing values");
    if (s.length !== l.length)
      throw new Error("parquet map column key/value length mismatch");
    const c = Re(s, l, f);
    r && Y(c, n), e.delete(`${i}.${o}.key`), e.delete(`${i}.${o}.value`), e.set(i, c);
    return;
  }
  if (t.children.length) {
    const o = t.element.repetition_type === "REQUIRED" ? n : n + 1, s = {};
    for (const c of t.children) {
      P(e, c, o);
      const u = e.get(c.path.join("."));
      if (!u) throw new Error("parquet struct missing child data");
      s[c.element.name] = u;
    }
    for (const c of t.children)
      e.delete(c.path.join("."));
    const l = Oe(s, o);
    r && Y(l, n), e.set(i, l);
  }
}
function Y(e, t) {
  for (let n = 0; n < e.length; n++)
    t ? Y(e[n], t - 1) : e[n] = e[n][0];
}
function Re(e, t, n) {
  const i = [];
  for (let r = 0; r < e.length; r++)
    if (n)
      i.push(Re(e[r], t[r], n - 1));
    else if (e[r]) {
      const f = {};
      for (let o = 0; o < e[r].length; o++) {
        const s = t[r][o];
        f[e[r][o]] = s === void 0 ? null : s;
      }
      i.push(f);
    } else
      i.push(void 0);
  return i;
}
function Oe(e, t) {
  const n = Object.keys(e), i = e[n[0]]?.length, r = [];
  for (let f = 0; f < i; f++) {
    const o = {};
    for (const s of n) {
      if (e[s].length !== i) throw new Error("parquet struct parsing error");
      o[s] = e[s][f];
    }
    t ? r.push(Oe(o, t - 1)) : r.push(o);
  }
  return r;
}
function $(e, t, n) {
  const i = n instanceof Int32Array, r = S(e), f = S(e);
  S(e);
  let o = K(e), s = 0;
  n[s++] = i ? Number(o) : o;
  const l = r / f;
  for (; s < t; ) {
    const c = K(e), u = new Uint8Array(f);
    for (let a = 0; a < f; a++)
      u[a] = e.view.getUint8(e.offset++);
    for (let a = 0; a < f && s < t; a++) {
      const _ = BigInt(u[a]);
      if (_) {
        let w = 0n, g = l;
        const y = (1n << _) - 1n;
        for (; g && s < t; ) {
          let h = BigInt(e.view.getUint8(e.offset)) >> w & y;
          for (w += _; w >= 8; )
            w -= 8n, e.offset++, w && (h |= BigInt(e.view.getUint8(e.offset)) << _ - w & y);
          const d = c + h;
          o += d, n[s++] = i ? Number(o) : o, g--;
        }
        g && (e.offset += Math.ceil((g * Number(_) + Number(w)) / 8));
      } else
        for (let w = 0; w < l && s < t; w++)
          o += c, n[s++] = i ? Number(o) : o;
    }
  }
}
function Se(e, t, n) {
  const i = new Int32Array(t);
  $(e, t, i);
  for (let r = 0; r < t; r++)
    n[r] = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, i[r]), e.offset += i[r];
}
function nt(e, t, n) {
  const i = new Int32Array(t);
  $(e, t, i);
  const r = new Int32Array(t);
  $(e, t, r);
  for (let f = 0; f < t; f++) {
    const o = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, r[f]);
    i[f] ? (n[f] = new Uint8Array(i[f] + r[f]), n[f].set(n[f - 1].subarray(0, i[f])), n[f].set(o, i[f])) : n[f] = o, e.offset += r[f];
  }
}
function V(e) {
  return 32 - Math.clz32(e);
}
function L(e, t, n, i) {
  i === void 0 && (i = e.view.getUint32(e.offset, !0), e.offset += 4);
  const r = e.offset;
  let f = 0;
  for (; f < n.length; ) {
    const o = S(e);
    if (o & 1)
      f = rt(e, o, t, n, f);
    else {
      const s = o >>> 1;
      it(e, s, t, n, f), f += s;
    }
  }
  e.offset = r + i;
}
function it(e, t, n, i, r) {
  const f = n + 7 >> 3;
  let o = 0;
  for (let s = 0; s < f; s++)
    o |= e.view.getUint8(e.offset++) << (s << 3);
  for (let s = 0; s < t; s++)
    i[r + s] = o;
}
function rt(e, t, n, i, r) {
  let f = t >> 1 << 3;
  const o = (1 << n) - 1;
  let s = 0;
  if (e.offset < e.view.byteLength)
    s = e.view.getUint8(e.offset++);
  else if (o)
    throw new Error(`parquet bitpack offset ${e.offset} out of range`);
  let l = 8, c = 0;
  for (; f; )
    c > 8 ? (c -= 8, l -= 8, s >>>= 8) : l - c < n ? (s |= e.view.getUint8(e.offset) << l, e.offset++, l += 8) : (r < i.length && (i[r++] = s >> c & o), f--, c += n);
  return r;
}
function De(e, t, n, i) {
  const r = ft(n, i), f = new Uint8Array(t * r);
  for (let o = 0; o < r; o++)
    for (let s = 0; s < t; s++)
      f[s * r + o] = e.view.getUint8(e.offset++);
  if (n === "FLOAT") return new Float32Array(f.buffer);
  if (n === "DOUBLE") return new Float64Array(f.buffer);
  if (n === "INT32") return new Int32Array(f.buffer);
  if (n === "INT64") return new BigInt64Array(f.buffer);
  if (n === "FIXED_LEN_BYTE_ARRAY") {
    const o = new Array(t);
    for (let s = 0; s < t; s++)
      o[s] = f.subarray(s * r, (s + 1) * r);
    return o;
  }
  throw new Error(`parquet byte_stream_split unsupported type: ${n}`);
}
function ft(e, t) {
  switch (e) {
    case "INT32":
    case "FLOAT":
      return 4;
    case "INT64":
    case "DOUBLE":
      return 8;
    case "FIXED_LEN_BYTE_ARRAY":
      if (!t) throw new Error("parquet byteWidth missing type_length");
      return t;
    default:
      throw new Error(`parquet unsupported type: ${e}`);
  }
}
function ee(e, t, n, i) {
  if (n === 0) return [];
  if (t === "BOOLEAN")
    return ot(e, n);
  if (t === "INT32")
    return st(e, n);
  if (t === "INT64")
    return lt(e, n);
  if (t === "INT96")
    return at(e, n);
  if (t === "FLOAT")
    return ct(e, n);
  if (t === "DOUBLE")
    return ut(e, n);
  if (t === "BYTE_ARRAY")
    return dt(e, n);
  if (t === "FIXED_LEN_BYTE_ARRAY") {
    if (!i) throw new Error("parquet missing fixed length");
    return _t(e, n, i);
  } else
    throw new Error(`parquet unhandled type: ${t}`);
}
function ot(e, t) {
  const n = new Array(t);
  for (let i = 0; i < t; i++) {
    const r = e.offset + (i / 8 | 0), f = i % 8, o = e.view.getUint8(r);
    n[i] = (o & 1 << f) !== 0;
  }
  return e.offset += Math.ceil(t / 8), n;
}
function st(e, t) {
  const n = (e.view.byteOffset + e.offset) % 4 ? new Int32Array(j(e.view.buffer, e.view.byteOffset + e.offset, t * 4)) : new Int32Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t * 4, n;
}
function lt(e, t) {
  const n = (e.view.byteOffset + e.offset) % 8 ? new BigInt64Array(j(e.view.buffer, e.view.byteOffset + e.offset, t * 8)) : new BigInt64Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t * 8, n;
}
function at(e, t) {
  const n = new Array(t);
  for (let i = 0; i < t; i++) {
    const r = e.view.getBigInt64(e.offset + i * 12, !0), f = e.view.getInt32(e.offset + i * 12 + 8, !0);
    n[i] = BigInt(f) << 64n | r;
  }
  return e.offset += t * 12, n;
}
function ct(e, t) {
  const n = (e.view.byteOffset + e.offset) % 4 ? new Float32Array(j(e.view.buffer, e.view.byteOffset + e.offset, t * 4)) : new Float32Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t * 4, n;
}
function ut(e, t) {
  const n = (e.view.byteOffset + e.offset) % 8 ? new Float64Array(j(e.view.buffer, e.view.byteOffset + e.offset, t * 8)) : new Float64Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t * 8, n;
}
function dt(e, t) {
  const n = new Array(t);
  for (let i = 0; i < t; i++) {
    const r = e.view.getUint32(e.offset, !0);
    e.offset += 4, n[i] = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, r), e.offset += r;
  }
  return n;
}
function _t(e, t, n) {
  const i = new Array(t);
  for (let r = 0; r < t; r++)
    i[r] = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, n), e.offset += n;
  return i;
}
function j(e, t, n) {
  const i = new ArrayBuffer(n);
  return new Uint8Array(i).set(new Uint8Array(e, t, n)), i;
}
const ht = [0, 255, 65535, 16777215, 4294967295];
function ce(e, t, n, i, r) {
  for (let f = 0; f < r; f++)
    n[i + f] = e[t + f];
}
function wt(e, t) {
  const n = e.byteLength, i = t.byteLength;
  let r = 0, f = 0;
  for (; r < n; ) {
    const o = e[r];
    if (r++, o < 128)
      break;
  }
  if (i && r >= n)
    throw new Error("invalid snappy length header");
  for (; r < n; ) {
    const o = e[r];
    let s = 0;
    if (r++, r >= n)
      throw new Error("missing eof marker");
    if ((o & 3) === 0) {
      let l = (o >>> 2) + 1;
      if (l > 60) {
        if (r + 3 >= n)
          throw new Error("snappy error literal pos + 3 >= inputLength");
        const c = l - 60;
        l = e[r] + (e[r + 1] << 8) + (e[r + 2] << 16) + (e[r + 3] << 24), l = (l & ht[c]) + 1, r += c;
      }
      if (r + l > n)
        throw new Error("snappy error literal exceeds input length");
      ce(e, r, t, f, l), r += l, f += l;
    } else {
      let l = 0;
      switch (o & 3) {
        case 1:
          s = (o >>> 2 & 7) + 4, l = e[r] + (o >>> 5 << 8), r++;
          break;
        case 2:
          if (n <= r + 1)
            throw new Error("snappy error end of input");
          s = (o >>> 2) + 1, l = e[r] + (e[r + 1] << 8), r += 2;
          break;
        case 3:
          if (n <= r + 3)
            throw new Error("snappy error end of input");
          s = (o >>> 2) + 1, l = e[r] + (e[r + 1] << 8) + (e[r + 2] << 16) + (e[r + 3] << 24), r += 4;
          break;
      }
      if (l === 0 || isNaN(l))
        throw new Error(`invalid offset ${l} pos ${r} inputLength ${n}`);
      if (l > f)
        throw new Error("cannot copy from before start of buffer");
      ce(t, f - l, t, f, s), f += s;
    }
  }
  if (f !== i) throw new Error("premature end of input");
}
function gt(e, t, { type: n, element: i, schemaPath: r }) {
  const f = new DataView(e.buffer, e.byteOffset, e.byteLength), o = { view: f, offset: 0 };
  let s;
  const l = yt(o, t, r), { definitionLevels: c, numNulls: u } = mt(o, t, r), a = t.num_values - u;
  if (t.encoding === "PLAIN")
    s = ee(o, n, a, i.type_length);
  else if (t.encoding === "PLAIN_DICTIONARY" || t.encoding === "RLE_DICTIONARY" || t.encoding === "RLE") {
    const _ = n === "BOOLEAN" ? 1 : f.getUint8(o.offset++);
    _ ? (s = new Array(a), n === "BOOLEAN" ? (L(o, _, s), s = s.map((w) => !!w)) : L(o, _, s, f.byteLength - o.offset)) : s = new Uint8Array(a);
  } else if (t.encoding === "BYTE_STREAM_SPLIT")
    s = De(o, a, n, i.type_length);
  else if (t.encoding === "DELTA_BINARY_PACKED")
    s = n === "INT32" ? new Int32Array(a) : new BigInt64Array(a), $(o, a, s);
  else if (t.encoding === "DELTA_LENGTH_BYTE_ARRAY")
    s = new Array(a), Se(o, a, s);
  else
    throw new Error(`parquet unsupported encoding: ${t.encoding}`);
  return { definitionLevels: c, repetitionLevels: l, dataPage: s };
}
function yt(e, t, n) {
  if (n.length > 1) {
    const i = Ie(n);
    if (i) {
      const r = new Array(t.num_values);
      return L(e, V(i), r), r;
    }
  }
  return [];
}
function mt(e, t, n) {
  const i = X(n);
  if (!i) return { definitionLevels: [], numNulls: 0 };
  const r = new Array(t.num_values);
  L(e, V(i), r);
  let f = t.num_values;
  for (const o of r)
    o === i && f--;
  return f === 0 && (r.length = 0), { definitionLevels: r, numNulls: f };
}
function Z(e, t, n, i) {
  let r;
  const f = i?.[n];
  if (n === "UNCOMPRESSED")
    r = e;
  else if (f)
    r = f(e, t);
  else if (n === "SNAPPY")
    r = new Uint8Array(t), wt(e, r);
  else
    throw new Error(`parquet unsupported compression codec: ${n}`);
  if (r?.length !== t)
    throw new Error(`parquet decompressed page length ${r?.length} does not match header ${t}`);
  return r;
}
function pt(e, t, n) {
  const r = { view: new DataView(e.buffer, e.byteOffset, e.byteLength), offset: 0 }, { type: f, element: o, schemaPath: s, codec: l, compressors: c } = n, u = t.data_page_header_v2;
  if (!u) throw new Error("parquet data page header v2 is undefined");
  const a = At(r, u, s);
  r.offset = u.repetition_levels_byte_length;
  const _ = Et(r, u, s), w = t.uncompressed_page_size - u.definition_levels_byte_length - u.repetition_levels_byte_length;
  let g = e.subarray(r.offset);
  u.is_compressed !== !1 && (g = Z(g, w, l, c));
  const y = new DataView(g.buffer, g.byteOffset, g.byteLength), h = { view: y, offset: 0 };
  let d;
  const m = u.num_values - u.num_nulls;
  if (u.encoding === "PLAIN")
    d = ee(h, f, m, o.type_length);
  else if (u.encoding === "RLE")
    d = new Array(m), L(h, 1, d), d = d.map((p) => !!p);
  else if (u.encoding === "PLAIN_DICTIONARY" || u.encoding === "RLE_DICTIONARY") {
    const p = y.getUint8(h.offset++);
    d = new Array(m), L(h, p, d, w - 1);
  } else if (u.encoding === "DELTA_BINARY_PACKED")
    d = f === "INT32" ? new Int32Array(m) : new BigInt64Array(m), $(h, m, d);
  else if (u.encoding === "DELTA_LENGTH_BYTE_ARRAY")
    d = new Array(m), Se(h, m, d);
  else if (u.encoding === "DELTA_BYTE_ARRAY")
    d = new Array(m), nt(h, m, d);
  else if (u.encoding === "BYTE_STREAM_SPLIT")
    d = De(h, m, f, o.type_length);
  else
    throw new Error(`parquet unsupported encoding: ${u.encoding}`);
  return { definitionLevels: _, repetitionLevels: a, dataPage: d };
}
function At(e, t, n) {
  const i = Ie(n);
  if (!i) return [];
  const r = new Array(t.num_values);
  return L(e, V(i), r, t.repetition_levels_byte_length), r;
}
function Et(e, t, n) {
  const i = X(n);
  if (i) {
    const r = new Array(t.num_values);
    return L(e, V(i), r, t.definition_levels_byte_length), r;
  }
}
function ue(e, { groupStart: t, selectStart: n, selectEnd: i }, r, f) {
  const { pathInSchema: o, schemaPath: s } = r, l = ve(s), c = [];
  let u, a, _ = 0;
  const w = f && (() => {
    a && f({
      pathInSchema: o,
      columnData: a,
      rowStart: t + _ - a.length,
      rowEnd: t + _
    });
  });
  for (; (l ? _ < i : e.offset < e.view.byteLength - 1) && !(e.offset >= e.view.byteLength - 1); ) {
    const g = It(e);
    if (g.type === "DICTIONARY_PAGE")
      u = de(e, g, r, u, void 0, 0), u = ye(u, r);
    else {
      const y = a?.length || 0, h = de(e, g, r, u, a, n - _);
      a === h ? _ += h.length - y : (w?.(), c.push(h), _ += h.length, a = h);
    }
  }
  return w?.(), c;
}
function de(e, t, n, i, r, f) {
  const { type: o, element: s, schemaPath: l, codec: c, compressors: u } = n, a = new Uint8Array(
    e.view.buffer,
    e.view.byteOffset + e.offset,
    t.compressed_page_size
  );
  if (e.offset += t.compressed_page_size, t.type === "DATA_PAGE") {
    const _ = t.data_page_header;
    if (!_) throw new Error("parquet data page header is undefined");
    if (f > _.num_values && ve(l))
      return new Array(_.num_values);
    const w = Z(a, Number(t.uncompressed_page_size), c, u), { definitionLevels: g, repetitionLevels: y, dataPage: h } = gt(w, _, n);
    let d = re(h, i, _.encoding, n);
    if (y.length || g?.length) {
      const m = Array.isArray(r) ? r : [];
      return ae(m, g, y, d, l);
    } else {
      for (let m = 2; m < l.length; m++)
        l[m].element.repetition_type !== "REQUIRED" && (d = Array.from(d, (p) => [p]));
      return d;
    }
  } else if (t.type === "DATA_PAGE_V2") {
    const _ = t.data_page_header_v2;
    if (!_) throw new Error("parquet data page header v2 is undefined");
    if (f > _.num_rows)
      return new Array(_.num_values);
    const { definitionLevels: w, repetitionLevels: g, dataPage: y } = pt(a, t, n), h = re(y, i, _.encoding, n), d = Array.isArray(r) ? r : [];
    return ae(d, w, g, h, l);
  } else if (t.type === "DICTIONARY_PAGE") {
    const _ = t.dictionary_page_header;
    if (!_) throw new Error("parquet dictionary page header is undefined");
    const w = Z(
      a,
      Number(t.uncompressed_page_size),
      c,
      u
    ), g = { view: new DataView(w.buffer, w.byteOffset, w.byteLength), offset: 0 };
    return ee(g, o, _.num_values, s.type_length);
  } else
    throw new Error(`parquet unsupported page type: ${t.type}`);
}
function It(e) {
  const t = q(e), n = we[t.field_1], i = t.field_2, r = t.field_3, f = t.field_4, o = t.field_5 && {
    num_values: t.field_5.field_1,
    encoding: O[t.field_5.field_2],
    definition_level_encoding: O[t.field_5.field_3],
    repetition_level_encoding: O[t.field_5.field_4],
    statistics: t.field_5.field_5 && {
      max: t.field_5.field_5.field_1,
      min: t.field_5.field_5.field_2,
      null_count: t.field_5.field_5.field_3,
      distinct_count: t.field_5.field_5.field_4,
      max_value: t.field_5.field_5.field_5,
      min_value: t.field_5.field_5.field_6
    }
  }, s = t.field_6, l = t.field_7 && {
    num_values: t.field_7.field_1,
    encoding: O[t.field_7.field_2],
    is_sorted: t.field_7.field_3
  }, c = t.field_8 && {
    num_values: t.field_8.field_1,
    num_nulls: t.field_8.field_2,
    num_rows: t.field_8.field_3,
    encoding: O[t.field_8.field_4],
    definition_levels_byte_length: t.field_8.field_5,
    repetition_levels_byte_length: t.field_8.field_6,
    is_compressed: t.field_8.field_7 === void 0 ? !0 : t.field_8.field_7,
    // default true
    statistics: t.field_8.field_8
  };
  return {
    type: n,
    uncompressed_page_size: i,
    compressed_page_size: r,
    crc: f,
    data_page_header: o,
    index_page_header: s,
    dictionary_page_header: l,
    data_page_header_v2: c
  };
}
function vt(e, { metadata: t }, n) {
  const { file: i, compressors: r, utf8: f } = e, o = [], s = { ...J, ...e.parsers };
  for (const l of n.chunks) {
    const { columnMetadata: c } = l, u = Ee(t.schema, c.path_in_schema), a = {
      pathInSchema: c.path_in_schema,
      type: c.type,
      element: u[u.length - 1].element,
      schemaPath: u,
      codec: c.codec,
      parsers: s,
      compressors: r,
      utf8: f
    };
    if (!("offsetIndex" in l)) {
      o.push({
        pathInSchema: c.path_in_schema,
        data: Promise.resolve(i.slice(l.range.startByte, l.range.endByte)).then((_) => {
          const w = { view: new DataView(_), offset: 0 };
          return {
            pageSkip: 0,
            data: ue(w, n, a, e.onPage)
          };
        })
      });
      continue;
    }
    o.push({
      pathInSchema: c.path_in_schema,
      // fetch offset index
      data: Promise.resolve(i.slice(l.offsetIndex.startByte, l.offsetIndex.endByte)).then(async (_) => {
        const w = Ke({ view: new DataView(_), offset: 0 }), { selectStart: g, selectEnd: y } = n, h = w.page_locations;
        let d = NaN, m = NaN, p = 0;
        for (let T = 0; T < h.length; T++) {
          const R = h[T], te = Number(R.first_row_index), xe = T + 1 < h.length ? Number(h[T + 1].first_row_index) : n.groupRows;
          te < y && xe > g && (Number.isNaN(d) && (d = Number(R.offset), p = te), m = Number(R.offset) + R.compressed_page_size);
        }
        const A = await i.slice(d, m), I = { view: new DataView(A), offset: 0 }, N = p ? {
          ...n,
          groupStart: n.groupStart + p,
          selectStart: n.selectStart - p,
          selectEnd: n.selectEnd - p
        } : n;
        return {
          data: ue(I, N, a, e.onPage),
          pageSkip: p
        };
      })
    });
  }
  return { groupStart: n.groupStart, groupRows: n.groupRows, asyncColumns: o };
}
async function _e({ asyncColumns: e }, t, n, i, r) {
  const f = await Promise.all(e.map(async ({ data: a }) => {
    const _ = await a;
    return {
      ..._,
      data: k(_.data)
    };
  })), o = e.map((a) => a.pathInSchema[0]).filter((a) => !i || i.includes(a)), s = i ?? o, l = s.map((a) => e.findIndex((_) => _.pathInSchema[0] === a)), c = n - t;
  if (r === "object") {
    const a = Array(c);
    for (let _ = 0; _ < c; _++) {
      const w = t + _, g = {};
      for (let y = 0; y < e.length; y++) {
        const { data: h, pageSkip: d } = f[y];
        g[e[y].pathInSchema[0]] = h[w - d];
      }
      a[_] = g;
    }
    return a;
  }
  const u = Array(c);
  for (let a = 0; a < c; a++) {
    const _ = t + a, w = Array(e.length);
    for (let g = 0; g < s.length; g++) {
      const y = l[g];
      if (y >= 0) {
        const { data: h, pageSkip: d } = f[y];
        w[g] = h[_ - d];
      }
    }
    u[a] = w;
  }
  return u;
}
function Be(e, t) {
  const { asyncColumns: n } = e, i = [];
  for (const r of t.children)
    if (r.children.length) {
      const f = n.filter((l) => l.pathInSchema[0] === r.element.name);
      if (!f.length) continue;
      const o = /* @__PURE__ */ new Map(), s = Promise.all(f.map((l) => l.data.then(({ data: c }) => {
        o.set(l.pathInSchema.join("."), k(c));
      }))).then(() => {
        P(o, r);
        const l = o.get(r.path.join("."));
        if (!l) throw new Error("parquet column data not assembled");
        return { data: [l], pageSkip: 0 };
      });
      i.push({ pathInSchema: r.path, data: s });
    } else {
      const f = n.find((o) => o.pathInSchema[0] === r.element.name);
      f && i.push(f);
    }
  return { ...e, asyncColumns: i };
}
async function bt(e) {
  e.metadata ??= await G(e.file, e);
  const { rowStart: t = 0, rowEnd: n, columns: i, onChunk: r, onComplete: f, rowFormat: o, filter: s, filterStrict: l = !0 } = e;
  if (s && o !== "object")
    throw new Error('parquet filter requires rowFormat: "object"');
  const c = F(s);
  if (c.length) {
    const h = U(e.metadata).children.map((m) => m.element.name), d = c.filter((m) => !h.includes(m));
    if (d.length)
      throw new Error(`parquet filter columns not found: ${d.join(", ")}`);
  }
  let u = i, a = !1;
  if (i && s) {
    const h = c.filter((d) => !i.includes(d));
    h.length && (u = [...i, ...h], a = !0);
  }
  const _ = u !== i ? { ...e, columns: u } : e, w = Pe(_);
  if (!f && !r) {
    for (const { asyncColumns: h } of w)
      for (const { data: d } of h) await d;
    return;
  }
  const g = U(e.metadata), y = w.map((h) => Be(h, g));
  if (r)
    for (const h of y)
      for (const d of h.asyncColumns)
        d.data.then(({ data: m, pageSkip: p }) => {
          let A = h.groupStart + p;
          for (const I of m)
            r({
              columnName: d.pathInSchema[0],
              columnData: I,
              rowStart: A,
              rowEnd: A + I.length
            }), A += I.length;
        });
  if (f) {
    const h = [];
    for (const d of y) {
      const m = Math.max(t - d.groupStart, 0), p = Math.min((n ?? 1 / 0) - d.groupStart, d.groupRows), A = o === "object" ? await _e(d, m, p, u, "object") : await _e(d, m, p, i, "array");
      if (s) {
        for (
          const I of
          /** @type {Record<string, any>[]} */
          A
        )
          if (B(I, s, l)) {
            if (a && i)
              for (const N of c)
                i.includes(N) || delete I[N];
            h.push(I);
          }
      } else
        Ne(h, A);
    }
    f(h);
  } else
    for (const { asyncColumns: h } of y)
      for (const { data: d } of h) await d;
}
function Pe(e) {
  if (!e.metadata) throw new Error("parquet requires metadata");
  const t = et(e);
  return e.file = tt(e.file, t), t.groups.map((n) => vt(e, t, n));
}
async function Tt(e) {
  if (e.columns?.length !== 1)
    throw new Error("parquetReadColumn expected columns: [columnName]");
  e.metadata ??= await G(e.file, e);
  const t = Pe(e), n = U(e.metadata), i = t.map((f) => Be(f, n)), r = [];
  for (const f of i)
    r.push(k((await f.asyncColumns[0].data).data));
  return k(r);
}
function x(e) {
  return new Promise((t, n) => {
    bt({
      ...e,
      rowFormat: "object",
      // force object output
      onComplete: t
    }).catch(n);
  });
}
async function St(e) {
  if (!e.file || !(e.file.byteLength >= 0))
    throw new Error("parquet expected AsyncBuffer");
  e.metadata ??= await G(e.file, e);
  const { metadata: t, rowStart: n = 0, columns: i, orderBy: r, filter: f } = e;
  if (n < 0) throw new Error("parquet rowStart must be positive");
  const o = e.rowEnd ?? Number(t.num_rows);
  if (r && !U(e.metadata).children.map((l) => l.element.name).includes(r))
    throw new Error(`parquet orderBy column not found: ${r}`);
  if (f && !r && o < t.num_rows) {
    const s = [];
    let l = 0;
    for (const c of t.row_groups) {
      const u = l + Number(c.num_rows), a = await x({
        ...e,
        rowStart: l,
        rowEnd: u
      });
      if (s.push(...a), s.length >= o) break;
      l = u;
    }
    return s.slice(n, o);
  } else if (f && r) {
    const s = i && !i.includes(r) ? [...i, r] : i, l = await x({
      ...e,
      rowStart: void 0,
      rowEnd: void 0,
      columns: s
    });
    if (l.sort((c, u) => he(c[r], u[r])), s !== i)
      for (const c of l)
        delete c[r];
    return l.slice(n, o);
  } else {
    if (f)
      return (await x({
        ...e,
        rowStart: void 0,
        rowEnd: void 0
      })).slice(n, o);
    if (typeof r == "string") {
      const s = await Tt({
        ...e,
        rowStart: void 0,
        rowEnd: void 0,
        columns: [r]
      }), l = Array.from(s, (a, _) => _).sort((a, _) => he(s[a], s[_])).slice(n, o), c = await Lt({ ...e, rows: l });
      return l.map((a) => c[a]);
    } else
      return await x(e);
  }
}
async function Lt(e) {
  const { file: t, rows: n } = e;
  e.metadata ??= await G(t, e);
  const { row_groups: i } = e.metadata, r = Array(i.length).fill(!1);
  let f = 0;
  const o = i.map((u) => f += Number(u.num_rows));
  for (const u of n) {
    const a = o.findIndex((_) => u < _);
    r[a] = !0;
  }
  const s = [];
  let l;
  f = 0;
  for (let u = 0; u < r.length; u++) {
    const a = f + Number(i[u].num_rows);
    r[u] ? l === void 0 && (l = f) : l !== void 0 && (s.push([l, a]), l = void 0), f = a;
  }
  l !== void 0 && s.push([l, f]);
  const c = Array(Number(e.metadata.num_rows));
  for (const [u, a] of s) {
    const _ = await x({ ...e, rowStart: u, rowEnd: a });
    for (let w = u; w < a; w++)
      c[w] = { __index__: w, ..._[w - u] };
  }
  return c;
}
function he(e, t) {
  return e < t ? -1 : e > t ? 1 : 0;
}
export {
  Rt as asyncBufferFromUrl,
  Ze as byteLengthFromUrl,
  Ot as cachedAsyncBuffer,
  k as flatten,
  fe as parquetMetadata,
  G as parquetMetadataAsync,
  St as parquetQuery,
  bt as parquetRead,
  x as parquetReadObjects,
  U as parquetSchema,
  Nt as readColumnIndex,
  Ke as readOffsetIndex,
  wt as snappyUncompress,
  se as toJson
};
