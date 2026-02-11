#!/usr/bin/env python3
"""
Convert tab-separated text files to Parquet format for faster loading in hoodini-viz.

This script converts the following files:
- defaultBaselines.txt -> defaultBaselines.parquet
- defaultTreeMetadata.txt -> defaultTreeMetadata.parquet  
- defaultProteinMetadata.txt -> defaultProteinMetadata.parquet
- defaultGFF.gff -> defaultGFF.parquet
- defaultProteinLinks.txt -> defaultProteinLinks.parquet (if not empty)
- defaultNucleotideLinks.txt -> defaultNucleotideLinks.parquet (if not empty)

The Parquet files are saved to src/data/ for inlining into the build.
"""

import polars as pl
from pathlib import Path
import sys

# Paths
DATA_DIR = Path(__file__).parent.parent / "src" / "data"
OUTPUT_DIR = DATA_DIR  # Output to same directory for Vite to inline

def convert_baselines():
    """
    Convert defaultBaselines.txt to Parquet.
    Schema: hood_id (str), seqid (str), start (i64), end (i64), align_gene (str, nullable),
            align_start (i64, nullable), align_end (i64, nullable), align_strand (str, nullable)
    """
    input_path = DATA_DIR / "defaultBaselines.txt"
    output_path = OUTPUT_DIR / "defaultBaselines.parquet"
    
    if not input_path.exists():
        print(f"⚠️  Skipping baselines: {input_path} not found")
        return
    
    schema_overrides = {
        "hood_id": pl.Utf8,
        "seqid": pl.Utf8,
        "start": pl.Int64,
        "end": pl.Int64,
        "align_gene": pl.Utf8,
        "align_start": pl.Int64,
        "align_end": pl.Int64,
        "align_strand": pl.Utf8,
    }
    
    df = pl.read_csv(
        input_path,
        separator="\t",
        has_header=True,
        schema_overrides={k: v for k, v in schema_overrides.items()
                          if k in pl.read_csv(input_path, separator="\t", has_header=True, n_rows=0).columns}
    )
    
    df.write_parquet(output_path, compression="zstd")
    size_txt = input_path.stat().st_size / 1024
    size_pq = output_path.stat().st_size / 1024
    print(f"✅ Baselines: {size_txt:.1f}KB -> {size_pq:.1f}KB ({size_pq/size_txt*100:.1f}%)")
    print(f"   Schema: {df.schema}")


def convert_tree_metadata():
    """
    Convert defaultTreeMetadata.txt to Parquet.
    Schema: leaf_id (i64), og_index (i64), plus taxonomy columns (all str)
    """
    input_path = DATA_DIR / "defaultTreeMetadata.txt"
    output_path = OUTPUT_DIR / "defaultTreeMetadata.parquet"
    
    if not input_path.exists():
        print(f"⚠️  Skipping tree metadata: {input_path} not found")
        return
    
    # Read header first to determine columns
    with open(input_path) as f:
        header = f.readline().strip().split("\t")
    
    # Build schema: numeric cols as Float64 (some have decimals), rest as Utf8
    numeric_cols = {"leaf_id", "og_index", "start_win", "end_win", "start_target", "end_target"}
    schema = {}
    for col in header:
        if col in numeric_cols:
            schema[col] = pl.Float64  # Use Float64 to handle both int and float values
        else:
            schema[col] = pl.Utf8
    
    df = pl.read_csv(
        input_path,
        separator="\t",
        has_header=True,
        schema_overrides=schema,
        null_values=["", "unidentified"],  # Treat empty and 'unidentified' as null
    )
    
    # Convert float columns back to Int64 where possible (cast nulls gracefully)
    for col in ["leaf_id", "og_index"]:
        if col in df.columns:
            df = df.with_columns(pl.col(col).cast(pl.Int64))
    
    df.write_parquet(output_path, compression="zstd")
    size_txt = input_path.stat().st_size / 1024
    size_pq = output_path.stat().st_size / 1024
    print(f"✅ Tree metadata: {size_txt:.1f}KB -> {size_pq:.1f}KB ({size_pq/size_txt*100:.1f}%)")
    print(f"   Schema: {df.schema}")


def convert_protein_metadata():
    """
    Convert defaultProteinMetadata.txt to Parquet.
    Schema: id (str), sequence (str), product (str), target_prot (str), 
            target_nuc (str), unique_id (str/i64), cluster (i64)
    """
    input_path = DATA_DIR / "defaultProteinMetadata.txt"
    output_path = OUTPUT_DIR / "defaultProteinMetadata.parquet"
    
    if not input_path.exists():
        print(f"⚠️  Skipping protein metadata: {input_path} not found")
        return
    
    # Read header first
    with open(input_path) as f:
        header = f.readline().strip().split("\t")
    
    # Build schema based on expected columns
    schema = {}
    for col in header:
        if col in {"unique_id", "cluster"}:
            schema[col] = pl.Int64
        else:
            schema[col] = pl.Utf8
    
    df = pl.read_csv(
        input_path,
        separator="\t",
        has_header=True,
        schema_overrides=schema,
        null_values=[""],
        ignore_errors=True,  # Handle malformed rows gracefully
    )
    
    df.write_parquet(output_path, compression="zstd")
    size_txt = input_path.stat().st_size / (1024 * 1024)
    size_pq = output_path.stat().st_size / (1024 * 1024)
    print(f"✅ Protein metadata: {size_txt:.1f}MB -> {size_pq:.1f}MB ({size_pq/size_txt*100:.1f}%)")
    print(f"   Schema: {df.schema}")


def convert_gff():
    """
    Convert defaultGFF.gff to Parquet.
    GFF3 columns: seqid, source, type, start, end, score, strand, phase, attributes
    
    The app expects objects with: seqid, source, type, start, end, score, strand, phase, attributes (parsed)
    """
    input_path = DATA_DIR / "defaultGFF.gff"
    output_path = OUTPUT_DIR / "defaultGFF.parquet"
    
    if not input_path.exists():
        print(f"⚠️  Skipping GFF: {input_path} not found")
        return
    
    # GFF has no header, manually specify columns
    df = pl.read_csv(
        input_path,
        separator="\t",
        has_header=False,
        new_columns=["seqid", "source", "type", "start", "end", "score", "strand", "phase", "attributes"],
        schema_overrides={
            "seqid": pl.Utf8,
            "source": pl.Utf8,
            "type": pl.Utf8,
            "start": pl.Int64,
            "end": pl.Int64,
            "score": pl.Utf8,  # Can be '.' or a number
            "strand": pl.Utf8,
            "phase": pl.Utf8,
            "attributes": pl.Utf8,
        },
        comment_prefix="#",
    )
    
    # Parse the attributes column into an ID field for easier access
    df = df.with_columns(
        pl.col("attributes")
        .str.extract(r"ID=([^;]+)", 1)
        .alias("ID")
    )
    
    df.write_parquet(output_path, compression="zstd")
    size_txt = input_path.stat().st_size / 1024
    size_pq = output_path.stat().st_size / 1024
    print(f"✅ GFF: {size_txt:.1f}KB -> {size_pq:.1f}KB ({size_pq/size_txt*100:.1f}%)")
    print(f"   Schema: {df.schema}")


def convert_protein_links():
    """
    Convert defaultProteinLinks.txt to Parquet.
    Schema: geneA (str), geneB (str), color (str - comma-separated RGB)
    """
    input_path = DATA_DIR / "defaultProteinLinks.txt"
    output_path = OUTPUT_DIR / "defaultProteinLinks.parquet"
    
    if not input_path.exists() or input_path.stat().st_size == 0:
        print(f"⚠️  Skipping protein links: {input_path} not found or empty")
        # Create empty parquet with correct schema
        df = pl.DataFrame({
            "geneA": pl.Series([], dtype=pl.Utf8),
            "geneB": pl.Series([], dtype=pl.Utf8),
            "color": pl.Series([], dtype=pl.Utf8),
        })
        df.write_parquet(output_path, compression="zstd")
        return
    
    df = pl.read_csv(
        input_path,
        separator="\t",
        has_header=False,
        new_columns=["geneA", "geneB", "color"],
        schema_overrides={
            "geneA": pl.Utf8,
            "geneB": pl.Utf8,
            "color": pl.Utf8,
        }
    )
    
    df.write_parquet(output_path, compression="zstd")
    size_txt = input_path.stat().st_size / 1024
    size_pq = output_path.stat().st_size / 1024
    print(f"✅ Protein links: {size_txt:.1f}KB -> {size_pq:.1f}KB ({size_pq/size_txt*100:.1f}%)")


def convert_nucleotide_links():
    """
    Convert defaultNucleotideLinks.txt to Parquet.
    Schema: geneA (str), geneB (str), color (str - comma-separated RGB)
    """
    input_path = DATA_DIR / "defaultNucleotideLinks.txt"
    output_path = OUTPUT_DIR / "defaultNucleotideLinks.parquet"
    
    if not input_path.exists() or input_path.stat().st_size == 0:
        print(f"⚠️  Skipping nucleotide links: {input_path} not found or empty")
        # Create empty parquet with correct schema
        df = pl.DataFrame({
            "geneA": pl.Series([], dtype=pl.Utf8),
            "geneB": pl.Series([], dtype=pl.Utf8),
            "color": pl.Series([], dtype=pl.Utf8),
        })
        df.write_parquet(output_path, compression="zstd")
        return
    
    df = pl.read_csv(
        input_path,
        separator="\t",
        has_header=False,
        new_columns=["geneA", "geneB", "color"],
        schema_overrides={
            "geneA": pl.Utf8,
            "geneB": pl.Utf8,
            "color": pl.Utf8,
        }
    )
    
    df.write_parquet(output_path, compression="zstd")
    size_txt = input_path.stat().st_size / 1024
    size_pq = output_path.stat().st_size / 1024
    print(f"✅ Nucleotide links: {size_txt:.1f}KB -> {size_pq:.1f}KB ({size_pq/size_txt*100:.1f}%)")


def convert_domains():
    """
    Convert defaultDomains.txt to Parquet (if exists).
    Schema: geneId (str), domainName (str), start (i64), end (i64), source (str), evalue (f64), coverage (f64)
    
    Note: The app uses domains as an object keyed by geneId, but parquet stores as flat rows.
    The app will convert rows back to object after loading.
    """
    input_path = DATA_DIR / "defaultDomains.txt"
    output_path = OUTPUT_DIR / "defaultDomains.parquet"
    
    if not input_path.exists() or input_path.stat().st_size == 0:
        print(f"⚠️  Creating empty domains parquet (no source file)")
        df = pl.DataFrame({
            "geneId": pl.Series([], dtype=pl.Utf8),
            "domainName": pl.Series([], dtype=pl.Utf8),
            "start": pl.Series([], dtype=pl.Int64),
            "end": pl.Series([], dtype=pl.Int64),
            "source": pl.Series([], dtype=pl.Utf8),
            "evalue": pl.Series([], dtype=pl.Float64),
            "coverage": pl.Series([], dtype=pl.Float64),
        })
        df.write_parquet(output_path, compression="zstd")
        return
    
    df = pl.read_csv(
        input_path,
        separator="\t",
        has_header=False,
        new_columns=["geneId", "domainName", "start", "end", "source", "evalue", "coverage"],
        schema_overrides={
            "geneId": pl.Utf8,
            "domainName": pl.Utf8,
            "start": pl.Int64,
            "end": pl.Int64,
            "source": pl.Utf8,
            "evalue": pl.Float64,
            "coverage": pl.Float64,
        }
    )
    
    df.write_parquet(output_path, compression="zstd")
    size_txt = input_path.stat().st_size / 1024
    size_pq = output_path.stat().st_size / 1024
    print(f"✅ Domains: {size_txt:.1f}KB -> {size_pq:.1f}KB ({size_pq/size_txt*100:.1f}%)")


def convert_domains_metadata():
    """
    Convert defaultDomainsMetadata.txt to Parquet (if exists).
    Schema: domain_id (str), plus any additional metadata columns
    """
    input_path = DATA_DIR / "defaultDomainsMetadata.txt"
    output_path = OUTPUT_DIR / "defaultDomainsMetadata.parquet"
    
    if not input_path.exists() or input_path.stat().st_size == 0:
        print(f"⚠️  Creating empty domains metadata parquet (no source file)")
        df = pl.DataFrame({
            "domain_id": pl.Series([], dtype=pl.Utf8),
        })
        df.write_parquet(output_path, compression="zstd")
        return
    
    df = pl.read_csv(
        input_path,
        separator="\t",
        has_header=True,
    )
    
    df.write_parquet(output_path, compression="zstd")
    size_txt = input_path.stat().st_size / 1024
    size_pq = output_path.stat().st_size / 1024
    print(f"✅ Domains metadata: {size_txt:.1f}KB -> {size_pq:.1f}KB ({size_pq/size_txt*100:.1f}%)")


def main():
    print("🔄 Converting text files to Parquet...\n")
    print(f"   Input directory: {DATA_DIR}")
    print(f"   Output directory: {OUTPUT_DIR}\n")
    
    convert_baselines()
    convert_tree_metadata()
    convert_protein_metadata()
    convert_gff()
    convert_protein_links()
    convert_nucleotide_links()
    convert_domains()
    convert_domains_metadata()
    
    print("\n✨ Done! Parquet files created in src/data/")
    print("   Rebuild the app with `npm run build` to use them.")


if __name__ == "__main__":
    main()
