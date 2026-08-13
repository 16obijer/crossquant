import pandas as pd
import yfinance as yf
import os
import sys
import numpy as np
from dateutil.relativedelta import relativedelta, FR

# --- CONFIGURATION ---
PRICES_FILE = 'AR_OWCS.csv'      # Your massive prices file
METADATA_FILE = 'AR_OWCF.csv'    # Your metadata file
OUTPUT_FILE = 'nasdaq_100_data.csv.gz'

# We focus on 'NQ' (E-mini Nasdaq 100) and friends
TARGET_CODES = ['NQ', 'NQC', 'NQP', 'ONQ', 'MNQ'] 

# CME Month Codes
MONTH_CODES = {
    'F': 1, 'G': 2, 'H': 3, 'J': 4, 'K': 5, 'M': 6, 
    'N': 7, 'Q': 8, 'U': 9, 'V': 10, 'X': 11, 'Z': 12
}

def parse_cme_expiry(val):
    """
    Parses CME expiration strings.
    Format 1: '20220101' (Daily) -> Returns Timestamp
    Format 2: 'Z2022' (Monthly) -> Returns 3rd Friday of Dec 2022
    """
    val = str(val).strip()
    
    # CASE 1: Standard YYYYMMDD (8 digits)
    if val.isdigit() and len(val) == 8:
        return pd.Timestamp(val)
    
    # CASE 2: Month Code + Year (e.g., F2015)
    # We check if first char is a valid month code
    if len(val) == 5 and val[0] in MONTH_CODES:
        month = MONTH_CODES[val[0]]
        year = int(val[1:])
        
        # Construct the 1st of that month
        dt = pd.Timestamp(year=year, month=month, day=1)
        
        # Standard CME expiry is 3rd Friday
        # This adds "2 Fridays" to the 1st Friday found
        return dt + relativedelta(day=1, weekday=FR(3))
        
    # Fallback: Return NaT (Not a Time) if we can't parse
    return pd.NaT

def create_dataset():
    # --- STEP 1: LOAD AND FILTER METADATA ---
    print(f"Step 1: Reading {METADATA_FILE} to find valid contracts...")
    if not os.path.exists(METADATA_FILE):
        print(f"Error: {METADATA_FILE} not found.")
        return

    meta = pd.read_csv(METADATA_FILE)
    
    # Filter for the specific clearing codes (NQ)
    nasdaq_meta = meta[meta['clearing_code'].isin(TARGET_CODES)].copy()
    
    # Apply the custom date parser to the metadata 'expiry' column
    print("Parsing CME expiration codes (e.g., 'Z2024')...")
    nasdaq_meta['parsed_expiry'] = nasdaq_meta['expiry'].apply(parse_cme_expiry)
    
    # Drop rows where parsing failed
    nasdaq_meta = nasdaq_meta.dropna(subset=['parsed_expiry'])
    
    # Create the Maps
    # 1. Code -> Parsed Expiration Date (Crucial for T)
    expiry_map = dict(zip(nasdaq_meta['code'], nasdaq_meta['parsed_expiry']))
    
    # 2. A set of valid codes for fast filtering
    valid_codes = set(nasdaq_meta['code'])
    
    print(f"Found {len(valid_codes)} valid Nasdaq option contracts.")
    
    # --- STEP 2: FETCH UNDERLYING PRICE (S) ---
    print("\nStep 2: Fetching Underlying Nasdaq 100 Futures price (NQ=F) from Yahoo...")
    try:
        ticker = yf.Ticker("NQ=F")
        hist = ticker.history(period="5y")
        
        # Create a map: Date -> Close Price
        hist.index = pd.to_datetime(hist.index).date
        price_map = hist['Close'].to_dict()
        
        print(f"Fetched {len(price_map)} days of price history.")
    except Exception as e:
        print(f"Error fetching Yahoo data: {e}")
        return

    # --- STEP 3: PROCESS THE MASSIVE PRICE FILE ---
    print(f"\nStep 3: Processing {PRICES_FILE}...")
    
    chunk_size = 100000
    chunks = []
    rows_found = 0
    
    # Read the big file in chunks
    for i, chunk in enumerate(pd.read_csv(PRICES_FILE, chunksize=chunk_size)):
        
        # Normalize columns
        chunk.columns = [c.lower() for c in chunk.columns]
        
        # Determine code column
        code_col = 'code' if 'code' in chunk.columns else 'symbol'
        
        # Filter: Keep only rows where 'code' is in our valid NQ list
        mask = chunk[code_col].isin(valid_codes)
        filtered = chunk[mask].copy()
        
        if not filtered.empty:
            # JOIN 1: Add Expiration Date from Metadata
            filtered['expiration'] = filtered[code_col].map(expiry_map)
            
            # JOIN 2: Add Underlying Price (S) from Yahoo
            if 'date' in filtered.columns:
                filtered['date_obj'] = pd.to_datetime(filtered['date']).dt.date
                filtered['S'] = filtered['date_obj'].map(price_map)
                
                chunks.append(filtered)
                rows_found += len(filtered)
        
        # Progress indicator
        if i % 10 == 0:
            sys.stdout.write(f"\rScanned {i * chunk_size:,} rows... Found {rows_found:,} Nasdaq options.")
            sys.stdout.flush()

    if not chunks:
        print("\n\nError: No matching prices found in the big file.")
        return

    # --- STEP 4: CLEAN AND SAVE ---
    print(f"\n\nStep 4: Found {rows_found} total rows. Cleaning...")
    df = pd.concat(chunks)
    
    # Date formatting
    df['date'] = pd.to_datetime(df['date'])
    df['expiration'] = pd.to_datetime(df['expiration'])
    
    # Calculate Time to Expiration (T)
    df['T'] = (df['expiration'] - df['date']).dt.days / 365.0
    
    # Calculate Moneyness (S / K)
    # Ensure numeric types
    df['strike'] = pd.to_numeric(df['strike'], errors='coerce')
    df['S'] = pd.to_numeric(df['S'], errors='coerce')
    df['moneyness'] = df['S'] / df['strike']
    
    # Rename columns to standard names
    # Note: 'settlement' might be 'settle' depending on raw file
    settle_col = 'settlement' if 'settlement' in df.columns else 'settle'
    
    df = df.rename(columns={
        settle_col: 'marketPrice',
        'strike': 'K',
        'type': 'optionType'
    })
    
    # Final Filter: Tech Stocks Sanity Check
    print("Applying filters...")
    df = df.dropna(subset=['S', 'marketPrice', 'T']) 
    df = df[(df['moneyness'] >= 0.7) & (df['moneyness'] <= 1.3)]
    df = df[(df['T'] >= 0.02) & (df['T'] <= 1.0)]
    
    print(f"Saving {len(df)} clean rows to {OUTPUT_FILE}...")
    df.to_csv(OUTPUT_FILE, index=False, compression='gzip')
    print("DONE! You can now share this file with your team.")

if __name__ == "__main__":
    create_dataset()