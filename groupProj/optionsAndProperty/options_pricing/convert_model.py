"""
Standalone script to convert XGBoost JSON model to UBJSON binary format.
This significantly reduces loading time for large models.

Usage:
    python convert_model.py

This script should be placed in the same directory as 'nasdaq_option_pricer.json'
(i.e., the 'pricer' app directory).
"""

import os
import xgboost as xgb

def convert_json_to_ubj():
    """
    Converts the large JSON model file to UBJSON binary format.
    UBJSON is much faster to load and parse than JSON.
    """
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define file paths
    json_path = os.path.join(script_dir, 'nasdaq_option_pricer.json')
    ubj_path = os.path.join(script_dir, 'nasdaq_option_pricer.ubj')
    
    print(f"Loading JSON model from: {json_path}")
    print("This may take a while for large files...")
    
    # Load the model from JSON
    model = xgb.XGBRegressor()
    model.load_model(json_path)
    
    print(f"\nSaving as UBJSON binary to: {ubj_path}")
    
    # Save as UBJSON (binary format)
    model.save_model(ubj_path)
    
    # Get file sizes for comparison
    json_size = os.path.getsize(json_path) / (1024 * 1024)  # MB
    ubj_size = os.path.getsize(ubj_path) / (1024 * 1024)    # MB
    
    print(f"\n✓ Conversion complete!")
    print(f"  JSON size: {json_size:.2f} MB")
    print(f"  UBJSON size: {ubj_size:.2f} MB")
    print(f"  Size reduction: {((json_size - ubj_size) / json_size * 100):.1f}%")
    print(f"\nThe binary model will load much faster during Django startup.")

if __name__ == '__main__':
    convert_json_to_ubj()
