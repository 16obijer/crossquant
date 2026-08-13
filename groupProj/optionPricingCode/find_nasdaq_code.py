import pandas as pd

INPUT_FILE = 'AR_OWCF.csv'

def find_code():
    print(f"Reading {INPUT_FILE}...")
    try:
        df = pd.read_csv(INPUT_FILE)
        
        # Search for "Nasdaq" in the future_name
        print("Searching for 'Nasdaq' contracts...")
        mask = df['future_name'].astype(str).str.contains('Nasdaq', case=False)
        nasdaq = df[mask]
        
        if not nasdaq.empty:
            print(f"\nFound {len(nasdaq)} matches!")
            print(nasdaq[['code', 'future_name', 'clearing_code']].head(10))
            
            # Extract the unique Clearing Codes
            codes = nasdaq['clearing_code'].unique()
            print(f"\n--- CRITICAL INFO ---")
            print(f"The Clearing Codes for Nasdaq are: {codes}")
            print("Write these down! We need them for the next step.")
        else:
            print("No 'Nasdaq' found. Try searching for 'E-mini' or 'NQ'.")

    except FileNotFoundError:
        print(f"Could not find {INPUT_FILE}. Please download it via the browser link first.")

if __name__ == "__main__":
    find_code()