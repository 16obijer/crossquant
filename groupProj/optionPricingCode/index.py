import pandas as pd
import os
import sys

# --- CONFIGURATION ---
# 1. Input File Name (The file you just renamed)
INPUT_FILE = 'AR_OWCS.csv' 

# 2. Output File Name (The file for your team)
OUTPUT_FILE = 'nasdaq_100_options_data.csv.gz'

# 3. Target Symbols for Nasdaq 100
# In OptionWorks, these are the codes for E-mini Nasdaq 100
TARGETS = ['NQ', 'ONQ', 'NQC', 'NQP']

def count_file_lines(filepath):
    """
    Scans the file in binary mode to count newlines. 
    Much faster than loading into Pandas.
    """
    print(f"Counting total rows in {filepath} (this takes about 60 seconds)...")
    def _make_gen(reader):
        b = reader(1024 * 1024)
        while b:
            yield b
            b = reader(1024 * 1024)

    with open(filepath, 'rb') as f:
        count = sum(buf.count(b'\n') for buf in _make_gen(f.read))
    return count

def process_file():
    # --- Check if file exists ---
    if not os.path.exists(INPUT_FILE):
        print(f"ERROR: Could not find '{INPUT_FILE}'.")
        print("Did you rename the downloaded file to 'AR_OWCS.csv'?")
        return

    # --- COUNT ROWS ---
    total_file_rows = count_file_lines(INPUT_FILE)
    print(f"Total Rows in File: {total_file_rows:,}")
    print("-" * 50)
    print(f"Scanning for Nasdaq 100 ({TARGETS})...")
    
    chunk_size = 100000
    chunks = []
    total_rows_scanned = 0
    nasdaq_rows_found = 0
    
    # --- Column Mapping ---
    # We map the raw column names to the clean names your model needs
    rename_map = {
        'date': 'date',
        'settle': 'marketPrice',      # Option Price
        'usettle': 'S',               # Underlying Futures Price
        'strike': 'K',                # Strike Price
        'vol': 'sigma',               # Implied Volatility
        'expiry': 'expiration',       # Expiration Date
        'type': 'optionType',         # Call/Put
        'code': 'contract_code'       # Unique ID
    }

    try:
        # Read the file in chunks to save RAM
        for i, chunk in enumerate(pd.read_csv(INPUT_FILE, chunksize=chunk_size, low_memory=False)):
            
            # 1. Normalize columns to lowercase
            chunk.columns = [c.lower() for c in chunk.columns]
            
            # Diagnostic: Check columns on the first chunk
            if i == 0:
                print(f"Columns found: {chunk.columns.tolist()}")
            
            # Identify the 'code' column
            code_col = 'code' if 'code' in chunk.columns else 'symbol'
            
            # 2. FILTER: Keep only Nasdaq 100 rows
            # Check if the code starts with NQ, ONQ, etc.
            mask = chunk[code_col].astype(str).str.upper().apply(lambda x: any(x.startswith(t) for t in TARGETS))
            
            # 3. FILTER: Keep only recent data (2022-2024)
            if 'date' in chunk.columns:
                chunk['date'] = pd.to_datetime(chunk['date'], errors='coerce')
                mask = mask & (chunk['date'].dt.year >= 2022)

            # Keep only the matching rows
            filtered_chunk = chunk[mask].copy()
            
            if not filtered_chunk.empty:
                nasdaq_rows_found += len(filtered_chunk)
                chunks.append(filtered_chunk)
            
            total_rows_scanned += len(chunk)
            
            # Progress Bar Update
            if total_rows_scanned % 500000 == 0:
                percent = (total_rows_scanned / total_file_rows) * 100
                sys.stdout.write(f"\rScanning: {percent:.1f}% ({total_rows_scanned:,} / {total_file_rows:,}) | Found {nasdaq_rows_found:,} rows")
                sys.stdout.flush()

    except Exception as e:
        print(f"\nError processing file: {e}")
        return

    # --- FINAL CLEANUP ---
    print("\n\nScanning complete. Concatenating data...")
    
    if chunks:
        df = pd.concat(chunks)
        
        # 1. Rename columns
        actual_renames = {k: v for k, v in rename_map.items() if k in df.columns}
        df = df.rename(columns=actual_renames)
        
        # 2. Calculate 'Time to Expiration' (T)
        print("Calculating T (Time to Expiration)...")
        if 'expiration' in df.columns and 'date' in df.columns:
            df['expiration'] = pd.to_datetime(df['expiration'])
            df['T'] = (df['expiration'] - df['date']).dt.days / 365.0
        
        # 3. Calculate Moneyness and Filter
        print("Applying filters (Moneyness 0.7-1.3, T 7d-1y)...")
        if 'S' in df.columns and 'K' in df.columns:
            df['S'] = pd.to_numeric(df['S'], errors='coerce')
            df['K'] = pd.to_numeric(df['K'], errors='coerce')
            df['moneyness'] = df['S'] / df['K']
            
            # Filter logic
            df = df[(df['moneyness'] >= 0.7) & (df['moneyness'] <= 1.3)]
            if 'T' in df.columns:
                df = df[(df['T'] >= 0.02) & (df['T'] <= 1.0)]

        # 4. Save
        print(f"Saving {len(df)} clean rows to {OUTPUT_FILE}...")
        df.to_csv(OUTPUT_FILE, index=False, compression='gzip')
        print("SUCCESS! The file is ready to share with your team.")
        
    else:
        print("FAILURE: No Nasdaq data found. Check your 'TARGETS' list.")

if __name__ == "__main__":
    process_file()