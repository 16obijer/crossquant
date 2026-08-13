import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# --- CONFIGURATION ---
FILE_PATH = 'nasdaq_100_data.csv.gz'

def explore_dataset():
    print(f"Loading {FILE_PATH}...")
    # 'compression'='gzip' handles the .gz file automatically
    df = pd.read_csv(FILE_PATH, compression='gzip')
    
    print(f"\n--- DATASET SHAPE ---")
    print(f"Rows: {df.shape[0]:,}")
    print(f"Columns: {df.shape[1]}")
    
    print(f"\n--- COLUMNS ---")
    print(list(df.columns))
    
    print(f"\n--- SAMPLE DATA ---")
    print(df.head())
    
    print(f"\n--- STATISTICS ---")
    # We describe only the numerical columns we care about
    print(df[['marketPrice', 'S', 'K', 'T', 'moneyness']].describe().round(2))

    # --- VISUALIZATION ---
    print("\nGenerating Graphs... (Sampling 10k points for speed)")
    
    # We sample 10,000 rows randomly so the plots render instantly
    plot_df = df.sample(10000, random_state=42)
    
    sns.set_style("whitegrid")
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    
    # 1. Moneyness Distribution
    # Shows if your filters worked (Should be 0.7 to 1.3)
    sns.histplot(plot_df['moneyness'], bins=50, ax=axes[0, 0], color='skyblue')
    axes[0, 0].set_title('Distribution of Moneyness (S/K)')
    axes[0, 0].set_xlabel('Moneyness')
    axes[0, 0].axvline(1.0, color='red', linestyle='--') # ATM Line
    
    # 2. Price vs. Moneyness
    # This is the "Hockey Stick" curve. Calls increase with Moneyness, Puts decrease.
    sns.scatterplot(data=plot_df, x='moneyness', y='marketPrice', hue='optionType', 
                    alpha=0.3, ax=axes[0, 1])
    axes[0, 1].set_title('Option Price vs. Moneyness')
    
    # 3. Time to Expiration Distribution
    # Shows the maturity of options in your dataset
    sns.histplot(plot_df['T'], bins=50, ax=axes[1, 0], color='orange')
    axes[1, 0].set_title('Time to Expiration (Years)')
    
    # 4. Underlying Price History (The "Market Regime")
    # Shows the crash of 2022 and rally of 2023/24
    # We need to sort by date for the line plot
    price_history = df.sort_values('date').drop_duplicates('date')
    sns.lineplot(data=price_history, x='date', y='S', ax=axes[1, 1], color='green')
    axes[1, 1].set_title('Nasdaq 100 Futures Price History (2022-2024)')
    plt.setp(axes[1, 1].get_xticklabels(), rotation=45)

    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    explore_dataset()