import sys
import os
import pyarrow.parquet as pq

def check_parquet_file(filepath):
    print(f"Checking: {filepath}")
    try:
        table = pq.read_table(filepath)
        print(f"Rows: {table.num_rows}")
        print(f"Columns: {table.num_columns}")
        print(f"Column names: {table.column_names}")
        print(table.to_pandas().head(10))
    except Exception as e:
        print(f"Error reading {filepath}: {e}")

if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else "./src/data"
    for fname in os.listdir(folder):
        if fname.endswith(".parquet"):
            check_parquet_file(os.path.join(folder, fname))
