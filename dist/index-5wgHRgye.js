const le = [
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
], Ve = [
  "REQUIRED",
  "OPTIONAL",
  "REPEATED"
], je = [
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
], ze = [
  "UNCOMPRESSED",
  "SNAPPY",
  "GZIP",
  "LZO",
  "BROTLI",
  "LZ4",
  "ZSTD",
  "LZ4_RAW"
], ve = [
  "DATA_PAGE",
  "INDEX_PAGE",
  "DICTIONARY_PAGE",
  "DATA_PAGE_V2"
], We = [
  "UNORDERED",
  "ASCENDING",
  "DESCENDING"
], He = [
  "SPHERICAL",
  "VINCENTY",
  "THOMAS",
  "ANDOYER",
  "KARNEY"
];
function J(e) {
  const t = Y(e);
  if (t.type === 1)
    return { type: "Point", coordinates: X(e, t) };
  if (t.type === 2)
    return { type: "LineString", coordinates: ee(e, t) };
  if (t.type === 3)
    return { type: "Polygon", coordinates: ce(e, t) };
  if (t.type === 4) {
    const n = [];
    for (let i = 0; i < t.count; i++)
      n.push(X(e, Y(e)));
    return { type: "MultiPoint", coordinates: n };
  } else if (t.type === 5) {
    const n = [];
    for (let i = 0; i < t.count; i++)
      n.push(ee(e, Y(e)));
    return { type: "MultiLineString", coordinates: n };
  } else if (t.type === 6) {
    const n = [];
    for (let i = 0; i < t.count; i++)
      n.push(ce(e, Y(e)));
    return { type: "MultiPolygon", coordinates: n };
  } else if (t.type === 7) {
    const n = [];
    for (let i = 0; i < t.count; i++)
      n.push(J(e));
    return { type: "GeometryCollection", geometries: n };
  } else
    throw new Error(`Unsupported geometry type: ${t.type}`);
}
function Y(e) {
  const { view: t } = e, n = t.getUint8(e.offset++) === 1, i = t.getUint32(e.offset, n);
  e.offset += 4;
  const f = i % 1e3, r = Math.floor(i / 1e3);
  let s = 0;
  f > 1 && f <= 7 && (s = t.getUint32(e.offset, n), e.offset += 4);
  let o = 2;
  return r && o++, r === 3 && o++, { littleEndian: n, type: f, dim: o, count: s };
}
function X(e, t) {
  const n = [];
  for (let i = 0; i < t.dim; i++) {
    const f = e.view.getFloat64(e.offset, t.littleEndian);
    e.offset += 8, n.push(f);
  }
  return n;
}
function ee(e, t) {
  const n = [];
  for (let i = 0; i < t.count; i++)
    n.push(X(e, t));
  return n;
}
function ce(e, t) {
  const { view: n } = e, i = [];
  for (let f = 0; f < t.count; f++) {
    const r = n.getUint32(e.offset, t.littleEndian);
    e.offset += 4, i.push(ee(e, { ...t, count: r }));
  }
  return i;
}
const be = new TextDecoder(), C = {
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
    return e && be.decode(e);
  },
  geometryFromBytes(e) {
    return e && J({ view: new DataView(e.buffer, e.byteOffset, e.byteLength), offset: 0 });
  },
  geographyFromBytes(e) {
    return e && J({ view: new DataView(e.buffer, e.byteOffset, e.byteLength), offset: 0 });
  }
};
function ue(e, t, n, i) {
  if (t && n.endsWith("_DICTIONARY")) {
    let f = e;
    e instanceof Uint8Array && !(t instanceof Uint8Array) && (f = new t.constructor(e.length));
    for (let r = 0; r < e.length; r++)
      f[r] = t[e[r]];
    return f;
  } else
    return Te(e, i);
}
function Te(e, t) {
  const { element: n, parsers: i, utf8: f = !0, schemaPath: r } = t, { type: s, converted_type: o, logical_type: u } = n;
  if (r?.some((c) => c.element.logical_type?.type === "VARIANT") && s === "BYTE_ARRAY" && o !== "UTF8" && u?.type !== "STRING")
    return e;
  if (o === "DECIMAL") {
    const l = 10 ** -(n.scale || 0), _ = new Array(e.length);
    for (let h = 0; h < _.length; h++)
      e[h] instanceof Uint8Array ? _[h] = Le(e[h]) * l : _[h] = Number(e[h]) * l;
    return _;
  }
  if (!o && s === "INT96")
    return Array.from(e).map((c) => i.timestampFromNanoseconds(Ke(c)));
  if (o === "DATE")
    return Array.from(e).map((c) => i.dateFromDays(c));
  if (o === "TIMESTAMP_MILLIS")
    return Array.from(e).map((c) => i.timestampFromMilliseconds(c));
  if (o === "TIMESTAMP_MICROS")
    return Array.from(e).map((c) => i.timestampFromMicroseconds(c));
  if (o === "JSON")
    return e.map((c) => JSON.parse(be.decode(c)));
  if (o === "BSON")
    throw new Error("parquet bson not supported");
  if (o === "INTERVAL")
    throw new Error("parquet interval not supported");
  if (u?.type === "GEOMETRY")
    return e.map((c) => i.geometryFromBytes(c));
  if (u?.type === "GEOGRAPHY")
    return e.map((c) => i.geographyFromBytes(c));
  if (o === "UTF8" || u?.type === "STRING" || f && s === "BYTE_ARRAY")
    return e.map((c) => i.stringFromBytes(c));
  if (o === "UINT_64" || u?.type === "INTEGER" && u.bitWidth === 64 && !u.isSigned) {
    if (e instanceof BigInt64Array)
      return new BigUint64Array(e.buffer, e.byteOffset, e.length);
    const c = new BigUint64Array(e.length);
    for (let l = 0; l < c.length; l++) c[l] = BigInt(e[l]);
    return c;
  }
  if (o === "UINT_32" || u?.type === "INTEGER" && u.bitWidth === 32 && !u.isSigned) {
    if (e instanceof Int32Array)
      return new Uint32Array(e.buffer, e.byteOffset, e.length);
    const c = new Uint32Array(e.length);
    for (let l = 0; l < c.length; l++) c[l] = e[l];
    return c;
  }
  if (u?.type === "FLOAT16")
    return Array.from(e).map(Ne);
  if (u?.type === "TIMESTAMP") {
    const { unit: c } = u;
    let l = i.timestampFromMilliseconds;
    c === "MICROS" && (l = i.timestampFromMicroseconds), c === "NANOS" && (l = i.timestampFromNanoseconds);
    const _ = new Array(e.length);
    for (let h = 0; h < _.length; h++)
      _[h] = l(e[h]);
    return _;
  }
  return e;
}
function Le(e) {
  if (!e.length) return 0;
  let t = 0n;
  for (const i of e)
    t = t * 256n + BigInt(i);
  const n = e.length * 8;
  return t >= 2n ** BigInt(n - 1) && (t -= 2n ** BigInt(n)), Number(t);
}
function Ke(e) {
  const t = (e >> 64n) - 2440588n, n = e & 0xffffffffffffffffn;
  return t * 86400000000000n + n;
}
function Ne(e) {
  if (!e) return;
  const t = e[1] << 8 | e[0], n = t >> 15 ? -1 : 1, i = t >> 10 & 31, f = t & 1023;
  return i === 0 ? n * 2 ** -14 * (f / 1024) : i === 31 ? f ? NaN : n * (1 / 0) : n * 2 ** (i - 15) * (1 + f / 1024);
}
function Re(e, t, n) {
  const i = e[t], f = [];
  let r = 1;
  if (i.num_children)
    for (; f.length < i.num_children; ) {
      const s = e[t + r], o = Re(e, t + r, [...n, s.name]);
      r += o.count, f.push(o);
    }
  return { count: r, element: i, children: f, path: n };
}
function Oe(e, t) {
  let n = Re(e, 0, []);
  const i = [n];
  for (const f of t) {
    const r = n.children.find((s) => s.element.name === f);
    if (!r) throw new Error(`parquet schema element not found: ${t}`);
    i.push(r), n = r;
  }
  return i;
}
function Ze(e) {
  const t = [];
  function n(i) {
    if (i.children.length)
      for (const f of i.children)
        n(f);
    else
      t.push(i.path.join("."));
  }
  return n(e), t;
}
function Se(e) {
  let t = 0;
  for (const { element: n } of e)
    n.repetition_type === "REPEATED" && t++;
  return t;
}
function fe(e) {
  let t = 0;
  for (const { element: n } of e.slice(1))
    n.repetition_type !== "REQUIRED" && t++;
  return t;
}
function Qe(e) {
  if (!e || e.element.converted_type !== "LIST" || e.children.length > 1) return !1;
  const t = e.children[0];
  return !(t.children.length > 1 || t.element.repetition_type !== "REPEATED");
}
function Je(e) {
  if (!e || e.element.converted_type !== "MAP" || e.children.length > 1) return !1;
  const t = e.children[0];
  return !(t.children.length !== 2 || t.element.repetition_type !== "REPEATED" || t.children.find((f) => f.element.name === "key")?.element.repetition_type === "REPEATED" || t.children.find((f) => f.element.name === "value")?.element.repetition_type === "REPEATED");
}
function Be(e) {
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
function W(e) {
  let t = 0;
  const n = {};
  for (; e.offset < e.view.byteLength; ) {
    const [i, f, r] = Ue(e, t);
    if (t = r, i === E.STOP)
      break;
    n[`field_${f}`] = k(e, i);
  }
  return n;
}
function k(e, t) {
  switch (t) {
    case E.TRUE:
      return !0;
    case E.FALSE:
      return !1;
    case E.BYTE:
      return e.view.getInt8(e.offset++);
    case E.I16:
    case E.I32:
      return De(e);
    case E.I64:
      return te(e);
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
      let f = n >> 4;
      f === 15 && (f = S(e));
      const r = i === E.TRUE || i === E.FALSE, s = new Array(f);
      for (let o = 0; o < f; o++)
        s[o] = r ? k(e, E.BYTE) === 1 : k(e, i);
      return s;
    }
    case E.STRUCT: {
      const n = {};
      let i = 0;
      for (; ; ) {
        const [f, r, s] = Ue(e, i);
        if (i = s, f === E.STOP)
          break;
        n[`field_${r}`] = k(e, f);
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
function Xe(e) {
  let t = 0n, n = 0n;
  for (; ; ) {
    const i = e.view.getUint8(e.offset++);
    if (t |= BigInt(i & 127) << n, !(i & 128))
      return t;
    n += 7n;
  }
}
function De(e) {
  const t = S(e);
  return t >>> 1 ^ -(t & 1);
}
function te(e) {
  const t = Xe(e);
  return t >> 1n ^ -(t & 1n);
}
function Ue(e, t) {
  const n = e.view.getUint8(e.offset++), i = n & 15;
  if (i === E.STOP)
    return [0, 0, t];
  const f = n >> 4, r = f ? t + f : De(e);
  return [i, r, r];
}
function et(e, t) {
  const n = /* @__PURE__ */ new Map(), i = t?.find(({ key: r }) => r === "geo")?.value, f = (i && JSON.parse(i)?.columns) ?? {};
  for (const [r, s] of Object.entries(f)) {
    if (s.encoding !== "WKB")
      continue;
    const o = s.edges === "spherical" ? "GEOGRAPHY" : "GEOMETRY", u = s.crs?.id ?? s.crs?.ids?.[0], a = u ? `${u.authority}:${u.code.toString()}` : void 0;
    n.set(r, { type: o, crs: a });
  }
  for (let r = 1; r < e.length; r++) {
    const s = e[r], { logical_type: o, name: u, num_children: a, repetition_type: c, type: l } = s;
    if (a) {
      r += a;
      continue;
    }
    l === "BYTE_ARRAY" && o === void 0 && c !== "REPEATED" && (s.logical_type = n.get(u));
  }
}
const xe = 1 << 19, tt = new TextDecoder();
function v(e) {
  return e && tt.decode(e);
}
async function H(e, { parsers: t, initialFetchSize: n = xe, geoparquet: i = !0 } = {}) {
  if (!e || !(e.byteLength >= 0)) throw new Error("parquet expected AsyncBuffer");
  const f = Math.max(0, e.byteLength - n), r = await e.slice(f, e.byteLength), s = new DataView(r);
  if (s.getUint32(r.byteLength - 4, !0) !== 827474256)
    throw new Error("parquet file invalid (footer != PAR1)");
  const o = s.getUint32(r.byteLength - 8, !0);
  if (o > e.byteLength - 8)
    throw new Error(`parquet metadata length ${o} exceeds available buffer ${e.byteLength - 8}`);
  if (o + 8 > n) {
    const u = e.byteLength - o - 8, a = await e.slice(u, f), c = new ArrayBuffer(o + 8), l = new Uint8Array(c);
    return l.set(new Uint8Array(a)), l.set(new Uint8Array(r), f - u), ae(c, { parsers: t, geoparquet: i });
  } else
    return ae(r, { parsers: t, geoparquet: i });
}
function ae(e, { parsers: t, geoparquet: n = !0 } = {}) {
  if (!(e instanceof ArrayBuffer)) throw new Error("parquet expected ArrayBuffer");
  const i = new DataView(e);
  if (t = { ...C, ...t }, i.byteLength < 8)
    throw new Error("parquet file is too short");
  if (i.getUint32(i.byteLength - 4, !0) !== 827474256)
    throw new Error("parquet file invalid (footer != PAR1)");
  const f = i.byteLength - 8, r = i.getUint32(f, !0);
  if (r > i.byteLength - 8)
    throw new Error(`parquet metadata length ${r} exceeds available buffer ${i.byteLength - 8}`);
  const s = f - r, u = W({ view: i, offset: s }), a = u.field_1, c = u.field_2.map((w) => ({
    type: le[w.field_1],
    type_length: w.field_2,
    repetition_type: Ve[w.field_3],
    name: v(w.field_4),
    num_children: w.field_5,
    converted_type: je[w.field_6],
    scale: w.field_7,
    precision: w.field_8,
    field_id: w.field_9,
    logical_type: nt(w.field_10)
  })), l = c.filter((w) => w.type), _ = u.field_3, h = u.field_4.map((w) => ({
    columns: w.field_1.map((d, m) => ({
      file_path: v(d.field_1),
      file_offset: d.field_2,
      meta_data: d.field_3 && {
        type: le[d.field_3.field_1],
        encodings: d.field_3.field_2?.map((p) => O[p]),
        path_in_schema: d.field_3.field_3.map(v),
        codec: ze[d.field_3.field_4],
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
        statistics: it(d.field_3.field_12, l[m], t),
        encoding_stats: d.field_3.field_13?.map((p) => ({
          page_type: ve[p.field_1],
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
    total_byte_size: w.field_2,
    num_rows: w.field_3,
    sorting_columns: w.field_4?.map((d) => ({
      column_idx: d.field_1,
      descending: d.field_2,
      nulls_first: d.field_3
    })),
    file_offset: w.field_5,
    total_compressed_size: w.field_6,
    ordinal: w.field_7
  })), g = u.field_5?.map((w) => ({
    key: v(w.field_1),
    value: v(w.field_2)
  })), y = v(u.field_6);
  return n && et(c, g), {
    version: a,
    schema: c,
    num_rows: _,
    row_groups: h,
    key_value_metadata: g,
    created_by: y,
    metadata_length: r
  };
}
function $({ schema: e }) {
  return Oe(e, [])[0];
}
function nt(e) {
  return e?.field_1 ? { type: "STRING" } : e?.field_2 ? { type: "MAP" } : e?.field_3 ? { type: "LIST" } : e?.field_4 ? { type: "ENUM" } : e?.field_5 ? {
    type: "DECIMAL",
    scale: e.field_5.field_1,
    precision: e.field_5.field_2
  } : e?.field_6 ? { type: "DATE" } : e?.field_7 ? {
    type: "TIME",
    isAdjustedToUTC: e.field_7.field_1,
    unit: _e(e.field_7.field_2)
  } : e?.field_8 ? {
    type: "TIMESTAMP",
    isAdjustedToUTC: e.field_8.field_1,
    unit: _e(e.field_8.field_2)
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
    algorithm: He[e.field_18.field_2]
  } : e;
}
function _e(e) {
  if (e.field_1) return "MILLIS";
  if (e.field_2) return "MICROS";
  if (e.field_3) return "NANOS";
  throw new Error("parquet time unit required");
}
function it(e, t, n) {
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
  const { type: i, converted_type: f, logical_type: r } = t;
  if (e === void 0) return e;
  if (i === "BOOLEAN") return e[0] === 1;
  if (i === "BYTE_ARRAY") return n.stringFromBytes(e);
  const s = new DataView(e.buffer, e.byteOffset, e.byteLength);
  return i === "FLOAT" && s.byteLength === 4 ? s.getFloat32(0, !0) : i === "DOUBLE" && s.byteLength === 8 ? s.getFloat64(0, !0) : i === "INT32" && f === "DATE" ? n.dateFromDays(s.getInt32(0, !0)) : i === "INT64" && f === "TIMESTAMP_MILLIS" ? n.timestampFromMilliseconds(s.getBigInt64(0, !0)) : i === "INT64" && f === "TIMESTAMP_MICROS" ? n.timestampFromMicroseconds(s.getBigInt64(0, !0)) : i === "INT64" && r?.type === "TIMESTAMP" && r?.unit === "NANOS" ? n.timestampFromNanoseconds(s.getBigInt64(0, !0)) : i === "INT64" && r?.type === "TIMESTAMP" && r?.unit === "MICROS" ? n.timestampFromMicroseconds(s.getBigInt64(0, !0)) : i === "INT64" && r?.type === "TIMESTAMP" ? n.timestampFromMilliseconds(s.getBigInt64(0, !0)) : i === "INT32" && s.byteLength === 4 ? s.getInt32(0, !0) : i === "INT64" && s.byteLength === 8 ? s.getBigInt64(0, !0) : f === "DECIMAL" ? Le(e) * 10 ** -(t.scale || 0) : r?.type === "FLOAT16" ? Ne(e) : e;
}
function Yt(e, t, n = void 0) {
  n = { ...C, ...n };
  const i = W(e);
  return {
    null_pages: i.field_1,
    min_values: i.field_2.map((f) => D(f, t, n)),
    max_values: i.field_3.map((f) => D(f, t, n)),
    boundary_order: We[i.field_4],
    null_counts: i.field_5,
    repetition_level_histograms: i.field_6,
    definition_level_histograms: i.field_7
  };
}
function ft(e) {
  const t = W(e);
  return {
    page_locations: t.field_1.map(rt),
    unencoded_byte_array_data_bytes: t.field_2
  };
}
function rt(e) {
  return {
    offset: e.field_1,
    compressed_page_size: e.field_2,
    first_row_index: e.field_3
  };
}
function de(e) {
  if (e === void 0) return null;
  if (typeof e == "bigint") return Number(e);
  if (Object.is(e, -0)) return 0;
  if (Array.isArray(e)) return e.map(de);
  if (e instanceof Uint8Array) return Array.from(e);
  if (e instanceof Date) return e.toISOString();
  if (e instanceof Object) {
    const t = {};
    for (const n of Object.keys(e))
      e[n] !== void 0 && (t[n] = de(e[n]));
    return t;
  }
  return e;
}
function Pe(e, t) {
  for (let i = 0; i < t.length; i += 1e4)
    e.push(...t.slice(i, i + 1e4));
}
function b(e, t, n = !0) {
  if (n ? e === t : e == t) return !0;
  if (e instanceof Uint8Array && t instanceof Uint8Array) return b(Array.from(e), Array.from(t), n);
  if (!e || !t || typeof e != typeof t) return !1;
  if (Array.isArray(e) && Array.isArray(t)) {
    if (e.length !== t.length) return !1;
    for (let f = 0; f < e.length; f++)
      if (!b(e[f], t[f], n)) return !1;
    return !0;
  }
  if (typeof e != "object") return !1;
  const i = Object.keys(e);
  if (i.length !== Object.keys(t).length) return !1;
  for (const f of i)
    if (!b(e[f], t[f], n)) return !1;
  return !0;
}
async function he(e, t = {}, n = globalThis.fetch) {
  const i = new AbortController(), f = new Headers(t.headers);
  f.set("Range", "bytes=0-0");
  const r = await n(e, {
    ...t,
    headers: f,
    signal: i.signal
  });
  if (!r.ok) throw new Error(`fetch with range failed ${r.status}`);
  if (r.status === 206) {
    const s = r.headers.get("Content-Range");
    if (!s) throw new Error("missing content-range header");
    const o = s.match(/bytes \d+-\d+\/(\d+)/);
    if (!o) throw new Error(`invalid content-range header: ${s}`);
    return parseInt(o[1]);
  }
  if (r.status === 200) {
    const s = r.headers.get("Content-Length");
    if (i.abort(), s) return parseInt(s);
  }
  throw new Error("server does not support range requests and missing content-length");
}
async function ot(e, t, n) {
  const i = n ?? globalThis.fetch, f = await i(e, { ...t, method: "HEAD" });
  if (f.status === 403)
    return he(e, t, i);
  if (!f.ok) throw new Error(`fetch head failed ${f.status}`);
  const r = f.headers.get("Content-Length");
  return r ? parseInt(r) : he(e, t, i);
}
async function kt({ url: e, byteLength: t, requestInit: n, fetch: i }) {
  if (!e) throw new Error("missing url");
  const f = i ?? globalThis.fetch;
  t ??= await ot(e, n, f);
  let r;
  const s = n || {};
  return {
    byteLength: t,
    async slice(o, u) {
      if (r)
        return r.then((_) => _.slice(o, u));
      const a = new Headers(s.headers), c = u === void 0 ? "" : u - 1;
      a.set("Range", `bytes=${o}-${c}`);
      const l = await f(e, { ...s, headers: a });
      if (!l.ok || !l.body) throw new Error(`fetch failed ${l.status}`);
      if (l.status === 200)
        return r = l.arrayBuffer(), r.then((_) => _.slice(o, u));
      if (l.status === 206)
        return l.arrayBuffer();
      throw new Error(`fetch received unexpected status code ${l.status}`);
    }
  };
}
function qt({ byteLength: e, slice: t }, { minSize: n = xe } = {}) {
  if (e < n) {
    const f = t(0, e);
    return {
      byteLength: e,
      async slice(r, s) {
        return (await f).slice(r, s);
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
    slice(f, r) {
      const s = st(f, r, e), o = i.get(s);
      if (o) return o;
      const u = t(f, r);
      return i.set(s, u), u;
    }
  };
}
function st(e, t, n) {
  if (e < 0) {
    if (t !== void 0) throw new Error(`invalid suffix range [${e}, ${t}]`);
    return n === void 0 ? `${e},` : `${n + e},${n}`;
  } else if (t !== void 0) {
    if (e > t) throw new Error(`invalid empty range [${e}, ${t}]`);
    return `${e},${t}`;
  } else return n === void 0 ? `${e},` : `${e},${n}`;
}
function j(e) {
  if (!e) return [];
  if (e.length === 1) return e[0];
  const t = [];
  for (const n of e)
    Pe(t, n);
  return t;
}
function q(e) {
  if (!e) return [];
  const t = [];
  return "$and" in e && Array.isArray(e.$and) ? t.push(...e.$and.flatMap(q)) : "$or" in e && Array.isArray(e.$or) ? t.push(...e.$or.flatMap(q)) : "$nor" in e && Array.isArray(e.$nor) ? t.push(...e.$nor.flatMap(q)) : t.push(...Object.keys(e)), t;
}
function U(e, t, n = !0) {
  return "$and" in t && Array.isArray(t.$and) ? t.$and.every((i) => U(e, i, n)) : "$or" in t && Array.isArray(t.$or) ? t.$or.some((i) => U(e, i, n)) : "$nor" in t && Array.isArray(t.$nor) ? !t.$nor.some((i) => U(e, i, n)) : Object.entries(t).every(([i, f]) => {
    const r = e[i];
    return typeof f != "object" || f === null || Array.isArray(f) ? b(r, f, n) : Object.entries(f || {}).every(([s, o]) => s === "$gt" ? r > o : s === "$gte" ? r >= o : s === "$lt" ? r < o : s === "$lte" ? r <= o : s === "$eq" ? b(r, o, n) : s === "$ne" ? !b(r, o, n) : s === "$in" ? Array.isArray(o) && o.includes(r) : s === "$nin" ? Array.isArray(o) && !o.includes(r) : s === "$not" ? !U({ [i]: r }, { [i]: o }, n) : !0);
  });
}
function ne({ rowGroup: e, physicalColumns: t, filter: n, strict: i = !0 }) {
  if (!n) return !1;
  if ("$and" in n && Array.isArray(n.$and))
    return n.$and.some((f) => ne({ rowGroup: e, physicalColumns: t, filter: f, strict: i }));
  if ("$or" in n && Array.isArray(n.$or))
    return n.$or.every((f) => ne({ rowGroup: e, physicalColumns: t, filter: f, strict: i }));
  if ("$nor" in n && Array.isArray(n.$nor))
    return !1;
  for (const [f, r] of Object.entries(n)) {
    const s = t.indexOf(f);
    if (s === -1) continue;
    const o = e.columns[s].meta_data?.statistics;
    if (!o) continue;
    const { min: u, max: a, min_value: c, max_value: l } = o, _ = c !== void 0 ? c : u, h = l !== void 0 ? l : a;
    if (!(_ === void 0 || h === void 0)) {
      for (const [g, y] of Object.entries(r || {}))
        if (g === "$gt" && h <= y || g === "$gte" && h < y || g === "$lt" && _ >= y || g === "$lte" && _ > y || g === "$eq" && (y < _ || y > h) || g === "$ne" && b(_, h, i) && b(_, y, i) || g === "$in" && Array.isArray(y) && y.every((w) => w < _ || w > h) || g === "$nin" && Array.isArray(y) && b(_, h, i) && y.includes(_)) return !0;
    }
  }
  return !1;
}
const lt = 1 << 21;
function ct({ metadata: e, rowStart: t = 0, rowEnd: n = 1 / 0, columns: i, filter: f, filterStrict: r = !0, useOffsetIndex: s = !1 }) {
  if (!e) throw new Error("parquetPlan requires metadata");
  const o = [], u = [], a = [], c = Ze($(e));
  let l = 0;
  for (const _ of e.row_groups) {
    const h = Number(_.num_rows), g = l + h;
    if (h > 0 && g > t && l < n && !ne({ rowGroup: _, physicalColumns: c, filter: f, strict: r })) {
      const y = [];
      for (const p of _.columns) {
        const A = p.meta_data;
        if (p.file_path) throw new Error("parquet file_path not supported");
        if (!A) throw new Error("parquet column metadata is undefined");
        if (!i || i.includes(A.path_in_schema[0])) {
          const I = A.dictionary_page_offset || A.data_page_offset, N = Number(I), T = Number(I + A.total_compressed_size);
          if (s && p.offset_index_offset && p.offset_index_length) {
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
      const w = Math.max(t - l, 0), d = Math.min(n - l, h);
      o.push({ chunks: y, rowGroup: _, groupStart: l, groupRows: h, selectStart: w, selectEnd: d });
      let m;
      for (const p of y)
        if ("offsetIndex" in p)
          a.push(p.offsetIndex);
        else {
          const { range: A } = p;
          i ? u.push(A) : m && A.endByte - m.startByte <= lt ? m.endByte = A.endByte : (m && u.push(m), m = { ...A });
        }
      m && u.push(m);
    }
    l = g;
  }
  return isFinite(n) || (n = l), u.push(...a), { metadata: e, rowStart: t, rowEnd: n, columns: i, fetches: u, groups: o };
}
function ut(e, { fetches: t }) {
  const n = t.map(({ startByte: i, endByte: f }) => e.slice(i, f));
  return {
    byteLength: e.byteLength,
    slice(i, f = e.byteLength) {
      const r = t.findIndex(({ startByte: s, endByte: o }) => s <= i && f <= o);
      if (r < 0)
        return e.slice(i, f);
      if (t[r].startByte !== i || t[r].endByte !== f) {
        const s = i - t[r].startByte, o = f - t[r].startByte;
        return n[r] instanceof Promise ? n[r].then((u) => u.slice(s, o)) : n[r].slice(s, o);
      } else
        return n[r];
    }
  };
}
const re = new TextDecoder(), we = /* @__PURE__ */ new WeakMap();
function $e(e, t = C) {
  if (Array.isArray(e))
    return e.map((n) => $e(n, t));
  if (typeof e != "object") return e;
  if ("metadata" in e) {
    const n = at(e.metadata), i = e.typed_value && G(e.typed_value, n, t), f = e.value && M(z(e.value), n, t);
    return i && f ? { ...f, ...i } : i ?? f;
  }
  return e;
}
function G(e, t, n) {
  if (e && typeof e == "object" && !Array.isArray(e) && !(e instanceof Uint8Array)) {
    if ("typed_value" in e)
      return G(e.typed_value, t, n);
    if ("value" in e && e.value instanceof Uint8Array)
      return M(z(e.value), t, n);
    const i = {};
    for (const [f, r] of Object.entries(e))
      i[f] = G(r, t, n);
    return i;
  }
  return e instanceof Uint8Array ? M(z(e), t, n) : Array.isArray(e) ? e.map((i) => G(i, t, n)) : e;
}
function z(e) {
  return { view: new DataView(e.buffer, e.byteOffset, e.byteLength), offset: 0 };
}
function at(e) {
  let t = we.get(e.buffer);
  t || (t = /* @__PURE__ */ new Map(), we.set(e.buffer, t));
  const n = `${e.byteOffset}:${e.byteLength}`, i = t.get(n);
  if (i) return i;
  const f = z(e), r = f.view.getUint8(f.offset++), s = r & 15;
  if (s !== 1) throw new Error(`parquet unsupported variant metadata version: ${s}`);
  const o = (r >> 4 & 1) === 1, u = (r >> 6 & 3) + 1, a = B(f, u), c = new Array(a + 1);
  for (let g = 0; g < c.length; g++)
    c[g] = B(f, u);
  const l = f.offset, _ = new Array(a);
  for (let g = 0; g < a; g++) {
    const y = c[g], w = c[g + 1], d = new Uint8Array(e.buffer, e.byteOffset + l + y, w - y);
    _[g] = re.decode(d);
  }
  const h = { dictionary: _, sorted: o };
  return t.set(n, h), h;
}
function B(e, t) {
  let n = 0;
  for (let i = 0; i < t; i++)
    n |= e.view.getUint8(e.offset + i) << i * 8;
  return e.offset += t, n;
}
function M(e, t, n) {
  const i = e.view.getUint8(e.offset++), f = i & 3, r = i >> 2;
  if (f === 0) return _t(e, r, n);
  if (f === 2) return dt(e, r, t, n);
  if (f === 3) return ht(e, r, t, n);
  const s = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, r);
  return e.offset += r, re.decode(s);
}
function _t(e, t, n) {
  switch (t) {
    case 0:
      return null;
    case 1:
      return !0;
    case 2:
      return !1;
    case 3: {
      const i = e.view.getInt8(e.offset);
      return e.offset += 1, i;
    }
    case 4: {
      const i = e.view.getInt16(e.offset, !0);
      return e.offset += 2, i;
    }
    case 5: {
      const i = e.view.getInt32(e.offset, !0);
      return e.offset += 4, i;
    }
    case 6: {
      const i = e.view.getBigInt64(e.offset, !0);
      return e.offset += 8, i;
    }
    case 7: {
      const i = e.view.getFloat64(e.offset, !0);
      return e.offset += 8, i;
    }
    case 8:
      return Q(e, 4);
    case 9:
      return Q(e, 8);
    case 10:
      return Q(e, 16);
    case 11: {
      const i = e.view.getInt32(e.offset, !0);
      return e.offset += 4, n.dateFromDays(i);
    }
    case 12:
    // timestamp_micros (utc)
    case 13: {
      const i = e.view.getBigInt64(e.offset, !0);
      return e.offset += 8, n.timestampFromMicroseconds(i);
    }
    case 14: {
      const i = e.view.getFloat32(e.offset, !0);
      return e.offset += 4, i;
    }
    case 15:
      return ge(e);
    case 16: {
      const i = ge(e);
      return re.decode(i);
    }
    case 17: {
      const i = e.view.getBigInt64(e.offset, !0);
      return e.offset += 8, i;
    }
    case 18:
    // timestamp_nanos (utc)
    case 19: {
      const i = e.view.getBigInt64(e.offset, !0);
      return e.offset += 8, n.timestampFromNanoseconds(i);
    }
    case 20: {
      const i = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, 16);
      e.offset += 16;
      const f = Array.from(i, (r) => r.toString(16).padStart(2, "0")).join("");
      return `${f.slice(0, 8)}-${f.slice(8, 12)}-${f.slice(12, 16)}-${f.slice(16, 20)}-${f.slice(20)}`;
    }
    default:
      throw new Error(`parquet unsupported variant primitive type: ${t}`);
  }
}
function dt(e, t, n, i) {
  const f = (t & 3) + 1, r = (t >> 2 & 3) + 1, o = t >> 4 & 1 ? B(e, 4) : e.view.getUint8(e.offset++), u = new Array(o);
  for (let l = 0; l < o; l++)
    u[l] = B(e, r);
  const a = new Array(o + 1);
  for (let l = 0; l < a.length; l++)
    a[l] = B(e, f);
  const c = {};
  for (let l = 0; l < o; l++) {
    const _ = n.dictionary[u[l]], h = {
      view: e.view,
      offset: e.offset + a[l]
    };
    c[_] = M(h, n, i);
  }
  return e.offset += a[a.length - 1], c;
}
function ht(e, t, n, i) {
  const f = t & 3, r = t >> 2 & 1, s = f + 1, o = B(e, r ? 4 : 1), u = new Array(o + 1);
  for (let l = 0; l < u.length; l++)
    u[l] = B(e, s);
  const a = e.offset, c = new Array(o);
  for (let l = 0; l < o; l++) {
    const _ = {
      view: e.view,
      offset: a + u[l]
    };
    c[l] = M(_, n, i);
  }
  return e.offset = a + u[u.length - 1], c;
}
function Q(e, t) {
  const n = e.view.getUint8(e.offset);
  e.offset += 1;
  let i;
  if (t === 4)
    i = BigInt(e.view.getInt32(e.offset, !0)), e.offset += 4;
  else if (t === 8)
    i = e.view.getBigInt64(e.offset, !0), e.offset += 8;
  else {
    const f = e.view.getBigUint64(e.offset, !0);
    i = e.view.getBigInt64(e.offset + 8, !0) << 64n | f, e.offset += 16;
  }
  return Number(i) * 10 ** -n;
}
function ge(e) {
  const t = e.view.getUint32(e.offset, !0);
  e.offset += 4;
  const n = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t, n;
}
function ye(e, t, n, i, f) {
  const r = fe(f);
  if (!t?.length && !n.length) {
    if (!r || !i.length) return i;
    t = new Array(i.length).fill(r);
  }
  const s = t?.length || n.length, o = f.map(({ element: g }) => g.repetition_type);
  let u = 0;
  const a = [e];
  let c = e, l = 0, _ = 0, h = 0;
  if (n[0])
    for (; l < o.length - 2 && h < n[0]; )
      l++, o[l] !== "REQUIRED" && (c = c.at(-1), a.push(c), _++), o[l] === "REPEATED" && h++;
  for (let g = 0; g < s; g++) {
    const y = t?.length ? t[g] : r, w = n[g];
    for (; l && (w < h || o[l] !== "REPEATED"); )
      o[l] !== "REQUIRED" && (a.pop(), _--), o[l] === "REPEATED" && h--, l--;
    for (c = a.at(-1); (l < o.length - 2 || o[l + 1] === "REPEATED") && (_ < y || o[l + 1] === "REQUIRED"); ) {
      if (l++, o[l] !== "REQUIRED") {
        const d = [];
        c.push(d), c = d, a.push(d), _++;
      }
      o[l] === "REPEATED" && h++;
    }
    y === r ? c.push(i[u++]) : l === o.length - 2 ? c.push(null) : c.push([]);
  }
  if (!e.length)
    for (let g = 0; g < r; g++) {
      const y = [];
      c.push(y), c = y;
    }
  return e;
}
function x(e, t, n, i = 0) {
  const f = t.path.join("."), r = t.element.repetition_type === "OPTIONAL", s = r ? i + 1 : i;
  if (Qe(t)) {
    let o = t.children[0], u = s;
    o.children.length === 1 && (o = o.children[0], u++), x(e, o, n, u);
    const a = o.path.join("."), c = e.get(a);
    if (!c) throw new Error("parquet list column missing values");
    r && V(c, i), e.set(f, c), e.delete(a);
    return;
  }
  if (Je(t)) {
    const o = t.children[0].element.name;
    x(e, t.children[0].children[0], n, s + 1), x(e, t.children[0].children[1], n, s + 1);
    const u = e.get(`${f}.${o}.key`), a = e.get(`${f}.${o}.value`);
    if (!u) throw new Error("parquet map column missing keys");
    if (!a) throw new Error("parquet map column missing values");
    if (u.length !== a.length)
      throw new Error("parquet map column key/value length mismatch");
    const c = Me(u, a, s);
    r && V(c, i), e.delete(`${f}.${o}.key`), e.delete(`${f}.${o}.value`), e.set(f, c);
    return;
  }
  if (t.children.length) {
    const o = t.element.repetition_type === "REQUIRED" ? i : i + 1, u = {};
    for (const c of t.children) {
      x(e, c, n, o);
      const l = e.get(c.path.join("."));
      if (!l) throw new Error("parquet struct missing child data");
      u[c.element.name] = l;
    }
    for (const c of t.children)
      e.delete(c.path.join("."));
    let a = Fe(u, o);
    t.element.logical_type?.type === "VARIANT" && (a = $e(a, n)), r && V(a, i), e.set(f, a);
  }
}
function V(e, t) {
  for (let n = 0; n < e.length; n++)
    t ? V(e[n], t - 1) : e[n] = e[n][0];
}
function Me(e, t, n) {
  const i = [];
  for (let f = 0; f < e.length; f++)
    if (n)
      i.push(Me(e[f], t[f], n - 1));
    else if (e[f]) {
      const r = {};
      for (let s = 0; s < e[f].length; s++) {
        const o = t[f][s];
        r[e[f][s]] = o === void 0 ? null : o;
      }
      i.push(r);
    } else
      i.push(void 0);
  return i;
}
function Fe(e, t) {
  const n = Object.keys(e), i = e[n[0]]?.length, f = [];
  for (let r = 0; r < i; r++) {
    const s = {};
    for (const o of n) {
      if (e[o].length !== i) throw new Error("parquet struct parsing error");
      s[o] = e[o][r];
    }
    t ? f.push(Fe(s, t - 1)) : f.push(s);
  }
  return f;
}
function F(e, t, n) {
  const i = n instanceof Int32Array, f = S(e), r = S(e);
  S(e);
  let s = te(e), o = 0;
  n[o++] = i ? Number(s) : s;
  const u = f / r;
  for (; o < t; ) {
    const a = te(e), c = new Uint8Array(r);
    for (let l = 0; l < r; l++)
      c[l] = e.view.getUint8(e.offset++);
    for (let l = 0; l < r && o < t; l++) {
      const _ = BigInt(c[l]);
      if (_) {
        let h = 0n, g = u;
        const y = (1n << _) - 1n;
        for (; g && o < t; ) {
          let w = BigInt(e.view.getUint8(e.offset)) >> h & y;
          for (h += _; h >= 8; )
            h -= 8n, e.offset++, h && (w |= BigInt(e.view.getUint8(e.offset)) << _ - h & y);
          const d = a + w;
          s += d, n[o++] = i ? Number(s) : s, g--;
        }
        g && (e.offset += Math.ceil((g * Number(_) + Number(h)) / 8));
      } else
        for (let h = 0; h < u && o < t; h++)
          s += a, n[o++] = i ? Number(s) : s;
    }
  }
}
function Ce(e, t, n) {
  const i = new Int32Array(t);
  F(e, t, i);
  for (let f = 0; f < t; f++)
    n[f] = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, i[f]), e.offset += i[f];
}
function wt(e, t, n) {
  const i = new Int32Array(t);
  F(e, t, i);
  const f = new Int32Array(t);
  F(e, t, f);
  for (let r = 0; r < t; r++) {
    const s = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, f[r]);
    i[r] ? (n[r] = new Uint8Array(i[r] + f[r]), n[r].set(n[r - 1].subarray(0, i[r])), n[r].set(s, i[r])) : n[r] = s, e.offset += f[r];
  }
}
function K(e) {
  return 32 - Math.clz32(e);
}
function L(e, t, n, i) {
  i === void 0 && (i = e.view.getUint32(e.offset, !0), e.offset += 4);
  const f = e.offset;
  let r = 0;
  for (; r < n.length; ) {
    const s = S(e);
    if (s & 1)
      r = yt(e, s, t, n, r);
    else {
      const o = s >>> 1;
      gt(e, o, t, n, r), r += o;
    }
  }
  e.offset = f + i;
}
function gt(e, t, n, i, f) {
  const r = n + 7 >> 3;
  let s = 0;
  for (let o = 0; o < r; o++)
    s |= e.view.getUint8(e.offset++) << (o << 3);
  for (let o = 0; o < t; o++)
    i[f + o] = s;
}
function yt(e, t, n, i, f) {
  let r = t >> 1 << 3;
  const s = (1 << n) - 1;
  let o = 0;
  if (e.offset < e.view.byteLength)
    o = e.view.getUint8(e.offset++);
  else if (s)
    throw new Error(`parquet bitpack offset ${e.offset} out of range`);
  let u = 8, a = 0;
  for (; r; )
    a > 8 ? (a -= 8, u -= 8, o >>>= 8) : u - a < n ? (o |= e.view.getUint8(e.offset) << u, e.offset++, u += 8) : (f < i.length && (i[f++] = o >> a & s), r--, a += n);
  return f;
}
function Ye(e, t, n, i) {
  const f = mt(n, i), r = new Uint8Array(t * f);
  for (let s = 0; s < f; s++)
    for (let o = 0; o < t; o++)
      r[o * f + s] = e.view.getUint8(e.offset++);
  if (n === "FLOAT") return new Float32Array(r.buffer);
  if (n === "DOUBLE") return new Float64Array(r.buffer);
  if (n === "INT32") return new Int32Array(r.buffer);
  if (n === "INT64") return new BigInt64Array(r.buffer);
  if (n === "FIXED_LEN_BYTE_ARRAY") {
    const s = new Array(t);
    for (let o = 0; o < t; o++)
      s[o] = r.subarray(o * f, (o + 1) * f);
    return s;
  }
  throw new Error(`parquet byte_stream_split unsupported type: ${n}`);
}
function mt(e, t) {
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
function oe(e, t, n, i) {
  if (n === 0) return [];
  if (t === "BOOLEAN")
    return pt(e, n);
  if (t === "INT32")
    return At(e, n);
  if (t === "INT64")
    return Et(e, n);
  if (t === "INT96")
    return It(e, n);
  if (t === "FLOAT")
    return vt(e, n);
  if (t === "DOUBLE")
    return bt(e, n);
  if (t === "BYTE_ARRAY")
    return Tt(e, n);
  if (t === "FIXED_LEN_BYTE_ARRAY") {
    if (!i) throw new Error("parquet missing fixed length");
    return Lt(e, n, i);
  } else
    throw new Error(`parquet unhandled type: ${t}`);
}
function pt(e, t) {
  const n = new Array(t);
  for (let i = 0; i < t; i++) {
    const f = e.offset + (i / 8 | 0), r = i % 8, s = e.view.getUint8(f);
    n[i] = (s & 1 << r) !== 0;
  }
  return e.offset += Math.ceil(t / 8), n;
}
function At(e, t) {
  const n = (e.view.byteOffset + e.offset) % 4 ? new Int32Array(Z(e.view.buffer, e.view.byteOffset + e.offset, t * 4)) : new Int32Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t * 4, n;
}
function Et(e, t) {
  const n = (e.view.byteOffset + e.offset) % 8 ? new BigInt64Array(Z(e.view.buffer, e.view.byteOffset + e.offset, t * 8)) : new BigInt64Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t * 8, n;
}
function It(e, t) {
  const n = new Array(t);
  for (let i = 0; i < t; i++) {
    const f = e.view.getBigInt64(e.offset + i * 12, !0), r = e.view.getInt32(e.offset + i * 12 + 8, !0);
    n[i] = BigInt(r) << 64n | f;
  }
  return e.offset += t * 12, n;
}
function vt(e, t) {
  const n = (e.view.byteOffset + e.offset) % 4 ? new Float32Array(Z(e.view.buffer, e.view.byteOffset + e.offset, t * 4)) : new Float32Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t * 4, n;
}
function bt(e, t) {
  const n = (e.view.byteOffset + e.offset) % 8 ? new Float64Array(Z(e.view.buffer, e.view.byteOffset + e.offset, t * 8)) : new Float64Array(e.view.buffer, e.view.byteOffset + e.offset, t);
  return e.offset += t * 8, n;
}
function Tt(e, t) {
  const n = new Array(t);
  for (let i = 0; i < t; i++) {
    const f = e.view.getUint32(e.offset, !0);
    e.offset += 4, n[i] = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, f), e.offset += f;
  }
  return n;
}
function Lt(e, t, n) {
  const i = new Array(t);
  for (let f = 0; f < t; f++)
    i[f] = new Uint8Array(e.view.buffer, e.view.byteOffset + e.offset, n), e.offset += n;
  return i;
}
function Z(e, t, n) {
  const i = new ArrayBuffer(n);
  return new Uint8Array(i).set(new Uint8Array(e, t, n)), i;
}
const Nt = [0, 255, 65535, 16777215, 4294967295];
function me(e, t, n, i, f) {
  for (let r = 0; r < f; r++)
    n[i + r] = e[t + r];
}
function Rt(e, t) {
  const n = e.byteLength, i = t.byteLength;
  let f = 0, r = 0;
  for (; f < n; ) {
    const s = e[f];
    if (f++, s < 128)
      break;
  }
  if (i && f >= n)
    throw new Error("invalid snappy length header");
  for (; f < n; ) {
    const s = e[f];
    let o = 0;
    if (f++, f >= n)
      throw new Error("missing eof marker");
    if ((s & 3) === 0) {
      let u = (s >>> 2) + 1;
      if (u > 60) {
        if (f + 3 >= n)
          throw new Error("snappy error literal pos + 3 >= inputLength");
        const a = u - 60;
        u = e[f] + (e[f + 1] << 8) + (e[f + 2] << 16) + (e[f + 3] << 24), u = (u & Nt[a]) + 1, f += a;
      }
      if (f + u > n)
        throw new Error("snappy error literal exceeds input length");
      me(e, f, t, r, u), f += u, r += u;
    } else {
      let u = 0;
      switch (s & 3) {
        case 1:
          o = (s >>> 2 & 7) + 4, u = e[f] + (s >>> 5 << 8), f++;
          break;
        case 2:
          if (n <= f + 1)
            throw new Error("snappy error end of input");
          o = (s >>> 2) + 1, u = e[f] + (e[f + 1] << 8), f += 2;
          break;
        case 3:
          if (n <= f + 3)
            throw new Error("snappy error end of input");
          o = (s >>> 2) + 1, u = e[f] + (e[f + 1] << 8) + (e[f + 2] << 16) + (e[f + 3] << 24), f += 4;
          break;
      }
      if (u === 0 || isNaN(u))
        throw new Error(`invalid offset ${u} pos ${f} inputLength ${n}`);
      if (u > r)
        throw new Error("cannot copy from before start of buffer");
      me(t, r - u, t, r, o), r += o;
    }
  }
  if (r !== i) throw new Error("premature end of input");
}
function Ot(e, t, { type: n, element: i, schemaPath: f }) {
  const r = new DataView(e.buffer, e.byteOffset, e.byteLength), s = { view: r, offset: 0 };
  let o;
  const u = St(s, t, f), { definitionLevels: a, numNulls: c } = Bt(s, t, f), l = t.num_values - c;
  if (t.encoding === "PLAIN")
    o = oe(s, n, l, i.type_length);
  else if (t.encoding === "PLAIN_DICTIONARY" || t.encoding === "RLE_DICTIONARY" || t.encoding === "RLE") {
    const _ = n === "BOOLEAN" ? 1 : r.getUint8(s.offset++);
    _ ? (o = new Array(l), n === "BOOLEAN" ? (L(s, _, o), o = o.map((h) => !!h)) : L(s, _, o, r.byteLength - s.offset)) : o = new Uint8Array(l);
  } else if (t.encoding === "BYTE_STREAM_SPLIT")
    o = Ye(s, l, n, i.type_length);
  else if (t.encoding === "DELTA_BINARY_PACKED")
    o = n === "INT32" ? new Int32Array(l) : new BigInt64Array(l), F(s, l, o);
  else if (t.encoding === "DELTA_LENGTH_BYTE_ARRAY")
    o = new Array(l), Ce(s, l, o);
  else
    throw new Error(`parquet unsupported encoding: ${t.encoding}`);
  return { definitionLevels: a, repetitionLevels: u, dataPage: o };
}
function St(e, t, n) {
  if (n.length > 1) {
    const i = Se(n);
    if (i) {
      const f = new Array(t.num_values);
      return L(e, K(i), f), f;
    }
  }
  return [];
}
function Bt(e, t, n) {
  const i = fe(n);
  if (!i) return { definitionLevels: [], numNulls: 0 };
  const f = new Array(t.num_values);
  L(e, K(i), f);
  let r = t.num_values;
  for (const s of f)
    s === i && r--;
  return r === 0 && (f.length = 0), { definitionLevels: f, numNulls: r };
}
function ie(e, t, n, i) {
  let f;
  const r = i?.[n];
  if (n === "UNCOMPRESSED")
    f = e;
  else if (r)
    f = r(e, t);
  else if (n === "SNAPPY")
    f = new Uint8Array(t), Rt(e, f);
  else
    throw new Error(`parquet unsupported compression codec: ${n}`);
  if (f?.length !== t)
    throw new Error(`parquet decompressed page length ${f?.length} does not match header ${t}`);
  return f;
}
function Dt(e, t, n) {
  const f = { view: new DataView(e.buffer, e.byteOffset, e.byteLength), offset: 0 }, { type: r, element: s, schemaPath: o, codec: u, compressors: a } = n, c = t.data_page_header_v2;
  if (!c) throw new Error("parquet data page header v2 is undefined");
  const l = Ut(f, c, o);
  f.offset = c.repetition_levels_byte_length;
  const _ = xt(f, c, o), h = t.uncompressed_page_size - c.definition_levels_byte_length - c.repetition_levels_byte_length;
  let g = e.subarray(f.offset);
  c.is_compressed !== !1 && (g = ie(g, h, u, a));
  const y = new DataView(g.buffer, g.byteOffset, g.byteLength), w = { view: y, offset: 0 };
  let d;
  const m = c.num_values - c.num_nulls;
  if (c.encoding === "PLAIN")
    d = oe(w, r, m, s.type_length);
  else if (c.encoding === "RLE")
    d = new Array(m), L(w, 1, d), d = d.map((p) => !!p);
  else if (c.encoding === "PLAIN_DICTIONARY" || c.encoding === "RLE_DICTIONARY") {
    const p = y.getUint8(w.offset++);
    d = new Array(m), L(w, p, d, h - 1);
  } else if (c.encoding === "DELTA_BINARY_PACKED")
    d = r === "INT32" ? new Int32Array(m) : new BigInt64Array(m), F(w, m, d);
  else if (c.encoding === "DELTA_LENGTH_BYTE_ARRAY")
    d = new Array(m), Ce(w, m, d);
  else if (c.encoding === "DELTA_BYTE_ARRAY")
    d = new Array(m), wt(w, m, d);
  else if (c.encoding === "BYTE_STREAM_SPLIT")
    d = Ye(w, m, r, s.type_length);
  else
    throw new Error(`parquet unsupported encoding: ${c.encoding}`);
  return { definitionLevels: _, repetitionLevels: l, dataPage: d };
}
function Ut(e, t, n) {
  const i = Se(n);
  if (!i) return [];
  const f = new Array(t.num_values);
  return L(e, K(i), f, t.repetition_levels_byte_length), f;
}
function xt(e, t, n) {
  const i = fe(n);
  if (i) {
    const f = new Array(t.num_values);
    return L(e, K(i), f, t.definition_levels_byte_length), f;
  }
}
function pe(e, { groupStart: t, selectStart: n, selectEnd: i }, f, r) {
  const { pathInSchema: s, schemaPath: o } = f, u = Be(o), a = [];
  let c, l, _ = 0;
  const h = r && (() => {
    l && r({
      pathInSchema: s,
      columnData: l,
      rowStart: t + _ - l.length,
      rowEnd: t + _
    });
  });
  for (; (u ? _ < i : e.offset < e.view.byteLength - 1) && !(e.offset >= e.view.byteLength - 1); ) {
    const g = Pt(e);
    if (g.type === "DICTIONARY_PAGE")
      c = Ae(e, g, f, c, void 0, 0), c = Te(c, f);
    else {
      const y = l?.length || 0, w = Ae(e, g, f, c, l, n - _);
      l === w ? _ += w.length - y : (h?.(), a.push(w), _ += w.length, l = w);
    }
  }
  return h?.(), a;
}
function Ae(e, t, n, i, f, r) {
  const { type: s, element: o, schemaPath: u, codec: a, compressors: c } = n, l = new Uint8Array(
    e.view.buffer,
    e.view.byteOffset + e.offset,
    t.compressed_page_size
  );
  if (e.offset += t.compressed_page_size, t.type === "DATA_PAGE") {
    const _ = t.data_page_header;
    if (!_) throw new Error("parquet data page header is undefined");
    if (r > _.num_values && Be(u))
      return new Array(_.num_values);
    const h = ie(l, Number(t.uncompressed_page_size), a, c), { definitionLevels: g, repetitionLevels: y, dataPage: w } = Ot(h, _, n), d = ue(w, i, _.encoding, n), m = Array.isArray(f) ? f : [];
    return ye(m, g, y, d, u);
  } else if (t.type === "DATA_PAGE_V2") {
    const _ = t.data_page_header_v2;
    if (!_) throw new Error("parquet data page header v2 is undefined");
    if (r > _.num_rows)
      return new Array(_.num_values);
    const { definitionLevels: h, repetitionLevels: g, dataPage: y } = Dt(l, t, n), w = ue(y, i, _.encoding, n), d = Array.isArray(f) ? f : [];
    return ye(d, h, g, w, u);
  } else if (t.type === "DICTIONARY_PAGE") {
    const _ = t.dictionary_page_header;
    if (!_) throw new Error("parquet dictionary page header is undefined");
    const h = ie(
      l,
      Number(t.uncompressed_page_size),
      a,
      c
    ), g = { view: new DataView(h.buffer, h.byteOffset, h.byteLength), offset: 0 };
    return oe(g, s, _.num_values, o.type_length);
  } else
    throw new Error(`parquet unsupported page type: ${t.type}`);
}
function Pt(e) {
  const t = W(e), n = ve[t.field_1], i = t.field_2, f = t.field_3, r = t.field_4, s = t.field_5 && {
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
  }, o = t.field_6, u = t.field_7 && {
    num_values: t.field_7.field_1,
    encoding: O[t.field_7.field_2],
    is_sorted: t.field_7.field_3
  }, a = t.field_8 && {
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
    compressed_page_size: f,
    crc: r,
    data_page_header: s,
    index_page_header: o,
    dictionary_page_header: u,
    data_page_header_v2: a
  };
}
function $t(e, { metadata: t }, n) {
  const { file: i, compressors: f, utf8: r } = e, s = [], o = { ...C, ...e.parsers };
  for (const u of n.chunks) {
    const { columnMetadata: a } = u, c = Oe(t.schema, a.path_in_schema), l = {
      pathInSchema: a.path_in_schema,
      type: a.type,
      element: c[c.length - 1].element,
      schemaPath: c,
      codec: a.codec,
      parsers: o,
      compressors: f,
      utf8: r
    };
    if (!("offsetIndex" in u)) {
      s.push({
        pathInSchema: a.path_in_schema,
        data: Promise.resolve(i.slice(u.range.startByte, u.range.endByte)).then((_) => {
          const h = { view: new DataView(_), offset: 0 };
          return {
            pageSkip: 0,
            data: pe(h, n, l, e.onPage)
          };
        })
      });
      continue;
    }
    s.push({
      pathInSchema: a.path_in_schema,
      // fetch offset index
      data: Promise.resolve(i.slice(u.offsetIndex.startByte, u.offsetIndex.endByte)).then(async (_) => {
        const h = ft({ view: new DataView(_), offset: 0 }), { selectStart: g, selectEnd: y } = n, w = h.page_locations;
        let d = NaN, m = NaN, p = 0;
        for (let T = 0; T < w.length; T++) {
          const R = w[T], se = Number(R.first_row_index), Ge = T + 1 < w.length ? Number(w[T + 1].first_row_index) : n.groupRows;
          se < y && Ge > g && (Number.isNaN(d) && (d = Number(R.offset), p = se), m = Number(R.offset) + R.compressed_page_size);
        }
        const A = await i.slice(d, m), I = { view: new DataView(A), offset: 0 }, N = p ? {
          ...n,
          groupStart: n.groupStart + p,
          selectStart: n.selectStart - p,
          selectEnd: n.selectEnd - p
        } : n;
        return {
          data: pe(I, N, l, e.onPage),
          pageSkip: p
        };
      })
    });
  }
  return { groupStart: n.groupStart, groupRows: n.groupRows, asyncColumns: s };
}
async function Ee({ asyncColumns: e }, t, n, i, f) {
  const r = await Promise.all(e.map(async ({ data: l }) => {
    const _ = await l;
    return {
      ..._,
      data: j(_.data)
    };
  })), s = e.map((l) => l.pathInSchema[0]).filter((l) => !i || i.includes(l)), o = i ?? s, u = o.map((l) => e.findIndex((_) => _.pathInSchema[0] === l)), a = n - t;
  if (f === "object") {
    const l = Array(a);
    for (let _ = 0; _ < a; _++) {
      const h = t + _, g = {};
      for (let y = 0; y < e.length; y++) {
        const { data: w, pageSkip: d } = r[y];
        g[e[y].pathInSchema[0]] = w[h - d];
      }
      l[_] = g;
    }
    return l;
  }
  const c = Array(a);
  for (let l = 0; l < a; l++) {
    const _ = t + l, h = Array(e.length);
    for (let g = 0; g < o.length; g++) {
      const y = u[g];
      if (y >= 0) {
        const { data: w, pageSkip: d } = r[y];
        h[g] = w[_ - d];
      }
    }
    c[l] = h;
  }
  return c;
}
function ke(e, t, n) {
  const { asyncColumns: i } = e;
  n = { ...C, ...n };
  const f = [];
  for (const r of t.children)
    if (r.children.length) {
      const s = i.filter((a) => a.pathInSchema[0] === r.element.name);
      if (!s.length) continue;
      const o = /* @__PURE__ */ new Map(), u = Promise.all(s.map((a) => a.data.then(({ data: c }) => {
        o.set(a.pathInSchema.join("."), j(c));
      }))).then(() => {
        x(o, r, n);
        const a = o.get(r.path.join("."));
        if (!a) throw new Error("parquet column data not assembled");
        return { data: [a], pageSkip: 0 };
      });
      f.push({ pathInSchema: r.path, data: u });
    } else {
      const s = i.find((o) => o.pathInSchema[0] === r.element.name);
      s && f.push(s);
    }
  return { ...e, asyncColumns: f };
}
async function Mt(e) {
  e.metadata ??= await H(e.file, e);
  const { rowStart: t = 0, rowEnd: n, columns: i, onChunk: f, onComplete: r, rowFormat: s, filter: o, filterStrict: u = !0 } = e;
  if (o && s !== "object")
    throw new Error('parquet filter requires rowFormat: "object"');
  const a = q(o);
  if (a.length) {
    const w = $(e.metadata).children.map((m) => m.element.name), d = a.filter((m) => !w.includes(m));
    if (d.length)
      throw new Error(`parquet filter columns not found: ${d.join(", ")}`);
  }
  let c = i, l = !1;
  if (i && o) {
    const w = a.filter((d) => !i.includes(d));
    w.length && (c = [...i, ...w], l = !0);
  }
  const _ = c !== i ? { ...e, columns: c } : e, h = qe(_);
  if (!r && !f) {
    for (const { asyncColumns: w } of h)
      for (const { data: d } of w) await d;
    return;
  }
  const g = $(e.metadata), y = h.map((w) => ke(w, g, e.parsers));
  if (f)
    for (const w of y)
      for (const d of w.asyncColumns)
        d.data.then(({ data: m, pageSkip: p }) => {
          let A = w.groupStart + p;
          for (const I of m)
            f({
              columnName: d.pathInSchema[0],
              columnData: I,
              rowStart: A,
              rowEnd: A + I.length
            }), A += I.length;
        });
  if (r) {
    const w = [];
    for (const d of y) {
      const m = Math.max(t - d.groupStart, 0), p = Math.min((n ?? 1 / 0) - d.groupStart, d.groupRows), A = s === "object" ? await Ee(d, m, p, c, "object") : await Ee(d, m, p, i, "array");
      if (o) {
        for (
          const I of
          /** @type {Record<string, any>[]} */
          A
        )
          if (U(I, o, u)) {
            if (l && i)
              for (const N of a)
                i.includes(N) || delete I[N];
            w.push(I);
          }
      } else
        Pe(w, A);
    }
    r(w);
  } else
    for (const { asyncColumns: w } of y)
      for (const { data: d } of w) await d;
}
function qe(e) {
  if (!e.metadata) throw new Error("parquet requires metadata");
  const t = ct(e);
  return e.file = ut(e.file, t), t.groups.map((n) => $t(e, t, n));
}
async function Ft(e) {
  if (e.columns?.length !== 1)
    throw new Error("parquetReadColumn expected columns: [columnName]");
  e.metadata ??= await H(e.file, e);
  const t = qe(e), n = $(e.metadata), i = t.map((r) => ke(r, n, e.parsers)), f = [];
  for (const r of i)
    f.push(j((await r.asyncColumns[0].data).data));
  return j(f);
}
function P(e) {
  return new Promise((t, n) => {
    Mt({
      ...e,
      rowFormat: "object",
      // force object output
      onComplete: t
    }).catch(n);
  });
}
async function Gt(e) {
  if (!e.file || !(e.file.byteLength >= 0))
    throw new Error("parquet expected AsyncBuffer");
  e.metadata ??= await H(e.file, e);
  const { metadata: t, rowStart: n = 0, columns: i, orderBy: f, filter: r } = e;
  if (n < 0) throw new Error("parquet rowStart must be positive");
  const s = e.rowEnd ?? Number(t.num_rows);
  if (f && !$(e.metadata).children.map((u) => u.element.name).includes(f))
    throw new Error(`parquet orderBy column not found: ${f}`);
  if (r && !f && s < t.num_rows) {
    const o = [];
    let u = 0;
    for (const a of t.row_groups) {
      const c = u + Number(a.num_rows), l = await P({
        ...e,
        rowStart: u,
        rowEnd: c
      });
      if (o.push(...l), o.length >= s) break;
      u = c;
    }
    return o.slice(n, s);
  } else if (r && f) {
    const o = i && !i.includes(f) ? [...i, f] : i, u = await P({
      ...e,
      rowStart: void 0,
      rowEnd: void 0,
      columns: o
    });
    if (u.sort((a, c) => Ie(a[f], c[f])), o !== i)
      for (const a of u)
        delete a[f];
    return u.slice(n, s);
  } else {
    if (r)
      return (await P({
        ...e,
        rowStart: void 0,
        rowEnd: void 0
      })).slice(n, s);
    if (typeof f == "string") {
      const o = await Ft({
        ...e,
        rowStart: void 0,
        rowEnd: void 0,
        columns: [f]
      }), u = Array.from(o, (l, _) => _).sort((l, _) => Ie(o[l], o[_])).slice(n, s), a = await Ct({ ...e, rows: u });
      return u.map((l) => a[l]);
    } else
      return await P(e);
  }
}
async function Ct(e) {
  const { file: t, rows: n } = e;
  e.metadata ??= await H(t, e);
  const { row_groups: i } = e.metadata, f = Array(i.length).fill(!1);
  let r = 0;
  const s = i.map((c) => r += Number(c.num_rows));
  for (const c of n) {
    const l = s.findIndex((_) => c < _);
    f[l] = !0;
  }
  const o = [];
  let u;
  r = 0;
  for (let c = 0; c < f.length; c++) {
    const l = r + Number(i[c].num_rows);
    f[c] ? u === void 0 && (u = r) : u !== void 0 && (o.push([u, l]), u = void 0), r = l;
  }
  u !== void 0 && o.push([u, r]);
  const a = Array(Number(e.metadata.num_rows));
  for (const [c, l] of o) {
    const _ = await P({ ...e, rowStart: c, rowEnd: l });
    for (let h = c; h < l; h++)
      a[h] = { __index__: h, ..._[h - c] };
  }
  return a;
}
function Ie(e, t) {
  return e < t ? -1 : e > t ? 1 : 0;
}
export {
  kt as asyncBufferFromUrl,
  ot as byteLengthFromUrl,
  qt as cachedAsyncBuffer,
  j as flatten,
  ae as parquetMetadata,
  H as parquetMetadataAsync,
  Gt as parquetQuery,
  Mt as parquetRead,
  P as parquetReadObjects,
  $ as parquetSchema,
  Yt as readColumnIndex,
  ft as readOffsetIndex,
  Rt as snappyUncompress,
  de as toJson
};
