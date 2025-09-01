#!/usr/bin/env python3
# scripts/convert_to_parquet.py
import os
import sys
import pandas as pd

SRC_DIR = sys.argv[1] if len(sys.argv) > 1 else "src/data"
OUT_DIR = sys.argv[2] if len(sys.argv) > 2 else "public/data"
os.makedirs(OUT_DIR, exist_ok=True)

mappings = {
  "defaultGFF.gff": {"sep": "\t", "header": None, "comment": "#",
                     "names": ["seqid","source","type","start","end","score","strand","phase","attributes"]},
  "defaultProteinMetadata.txt": {"sep":"\t", "header":0},
  "defaultTreeMetadata.txt": {"sep":"\t", "header":0},
  "defaultProteinLinks.txt": {"delim_whitespace": True, "header": None, "names": ["geneA","geneB","score"]},
  "defaultNucleotideLinks.txt": {"delim_whitespace": True, "header": None, "names": ["seqidA","startA","endA","seqidB","startB","endB","similarity"]},
  "defaultDomains.txt": {"delim_whitespace": True, "header": None, "names": ["gene_id","domainName","start","end","evalue"]},
  "defaultBaselines.txt": {"sep":"\t", "header":0},
  "defaultNonCodingMetadata.txt": {"sep":"\t", "header": None, "names": ["id","type","description"]}
}

for fname in os.listdir(SRC_DIR):
    if not fname.startswith("default"): 
        continue
    # Skip Newick tree files - keep them as plain text
    if fname.lower().startswith('defaultnewick'):
        print(f"Skipping Newick file: {fname}")
        continue
    inpath = os.path.join(SRC_DIR, fname)
    outname = os.path.splitext(fname)[0] + ".parquet"
    outpath = os.path.join(OUT_DIR, outname)
    cfg = mappings.get(fname, {})
    try:
        if cfg.get("delim_whitespace"):
            df = pd.read_csv(inpath, delim_whitespace=True, header=cfg.get("header"), names=cfg.get("names"))
        else:
            df = pd.read_csv(inpath, sep=cfg.get("sep", "\t"), header=cfg.get("header"), comment=cfg.get("comment", None), names=cfg.get("names"))
    except Exception as e:
        # fallback: store raw lines as single-column table
        with open(inpath, "r", encoding="utf-8") as fh:
            lines = [l.rstrip("\n") for l in fh]
        df = pd.DataFrame({"raw": lines})
    print(df)

    # Ensure column names are strings (required by parquet writers)
    try:
        df.columns = [str(c) for c in df.columns]
    except Exception:
        # last-resort: give generic string column names
        df.columns = [f"col_{i}" for i in range(len(df.columns))]

    # Write parquet with pyarrow engine; if it fails, write JSON fallback
    try:
        df.to_parquet(outpath, index=False)
        print(f"Wrote {outpath}")
    except Exception as e:
        # Fallback: write a JSON lines file so data isn't lost
        json_out = os.path.splitext(outpath)[0] + '.jsonl'
        try:
            df.to_json(json_out, orient='records', lines=True)
            print(f"Parquet write failed, wrote JSONL fallback to {json_out}: {e}")
        except Exception as e2:
            print(f"Failed to write parquet and JSON fallback for {inpath}: {e} / {e2}")
    print(f"Wrote {outpath}")