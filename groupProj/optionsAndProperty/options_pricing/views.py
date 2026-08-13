import os
import numpy as np
import pandas as pd
import xgboost as xgb
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from scipy.stats import norm

# --- LOAD MODEL ONCE AT STARTUP ---
# Using UBJSON binary format for much faster loading
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'nasdaq_option_pricer.ubj')
model = xgb.XGBRegressor()
model.load_model(MODEL_PATH)

# --- BLACK-76 FORMULA FOR FUTURES OPTIONS ---
def black_76(F, K, T, r, sigma, is_call):
    """
    Black-76 Formula for Futures Options.
    F: Futures Price (S in our dataset)
    K: Strike Price
    T: Time to Expiration (in years)
    r: Risk-Free Rate (as decimal)
    sigma: Volatility (as decimal)
    is_call: 1 for Call, 0 for Put
    """
    d1 = (np.log(F / K) + (0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    # Discount factor
    disc = np.exp(-r * T)
    
    if is_call:
        price = disc * (F * norm.cdf(d1) - K * norm.cdf(d2))
    else:
        price = disc * (K * norm.cdf(-d2) - F * norm.cdf(-d1))
        
    return price


# ==================== API ENDPOINTS ====================

@csrf_exempt
@require_http_methods(["POST"])
def api_predict_option_price(request):
    """
    API endpoint for option pricing predictions.
    
    Accepts JSON POST request with the following fields:
    - S: Futures price (float)
    - K: Strike price (float)
    - T: Days to expiration (int/float)
    - sigma: Volatility as percentage (float, e.g., 15 for 15%)
    - option_type: 1 for Call, 0 for Put (int)
    
    Note: Risk-free rate is fixed at 4.5% (matching training data)
    
    Returns JSON with:
    - success: boolean
    - ml_price: ML model predicted price (float)
    - black76_price: Black-76 theoretical price (float)
    - price: predicted option price (float)
    - error: error message if any (string)
    """
    try:
        # Parse JSON body
        data = json.loads(request.body)
        
        # Check for missing parameters
        required_params = ['S', 'K', 'T', 'sigma', 'option_type']
        missing_params = [param for param in required_params if param not in data or data.get(param) is None]
        
        if missing_params:
            return JsonResponse({
                'success': False,
                'error': f'Missing required parameters: {", ".join(missing_params)}'
            }, status=400)
        
        # 1. Extract inputs
        S = float(data.get('S'))
        K = float(data.get('K'))
        T_days = float(data.get('T'))
        sigma = float(data.get('sigma'))  # Keep as percentage for validation
        is_call = int(data.get('option_type'))
        
        # Fixed risk-free rate (matches training data)
        r = 0.045
        
        # 2. Detailed validation with specific error messages
        if S <= 0:
            return JsonResponse({
                'success': False,
                'error': f'Futures Price must be positive (got {S})'
            }, status=400)
        
        if K <= 0:
            return JsonResponse({
                'success': False,
                'error': f'Strike Price must be positive (got {K})'
            }, status=400)
        
        if T_days <= 0:
            return JsonResponse({
                'success': False,
                'error': f'Days to expiration must be positive (got {T_days})'
            }, status=400)
        
        if T_days > 365 * 5:  # Max 5 years
            return JsonResponse({
                'success': False,
                'error': f'Days to expiration too large (got {T_days}, max 1825 days)'
            }, status=400)
        
        if sigma <= 0:
            return JsonResponse({
                'success': False,
                'error': f'Volatility must be positive (got {sigma}%)'
            }, status=400)
        
        if sigma > 200:
            return JsonResponse({
                'success': False,
                'error': f'Volatility too high (got {sigma}%, max 200%)'
            }, status=400)
        
        if is_call not in [0, 1]:
            return JsonResponse({
                'success': False,
                'error': f'Option type must be 0 (Put) or 1 (Call), got {is_call}'
            }, status=400)
        
        # Convert percentage to decimal
        sigma = sigma / 100
        
        # 2. Preprocess inputs
        T_years = T_days / 365.0
        moneyness = S / K
        
        # Create DataFrame with exact column order used during training
        # NOTE: ML model was trained with constant r=0.045, so we always use that
        input_df = pd.DataFrame([{
            'S': S,
            'K': K,
            'T': T_years,
            'r': 0.045,  # Fixed rate used in training data
            'sigma': sigma,
            'is_call': is_call,
            'moneyness': moneyness
        }])
        
        # 3. Make ML prediction
        log_pred = model.predict(input_df)[0]
        ml_price = np.expm1(log_pred)  # Reverse log transform
        
        # 4. Calculate Black-76 theoretical price (also uses fixed 4.5% rate)
        black76_price = black_76(S, K, T_years, r, sigma, is_call)
        
        # 5. Return successful response with both prices
        return JsonResponse({
            'success': True,
            'ml_price': round(float(ml_price), 2),
            'black76_price': round(float(black76_price), 2),
            'price': round(float(ml_price), 2),  # Keep for backward compatibility
            'inputs': {
                'futures_price': S,
                'strike_price': K,
                'days_to_expiration': T_days,
                'risk_free_rate': 4.5,  # Fixed rate
                'volatility': data.get('sigma'),
                'option_type': 'Call' if is_call == 1 else 'Put'
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON format. Please check your request body.'
        }, status=400)
    
    except KeyError as e:
        return JsonResponse({
            'success': False,
            'error': f'Missing required parameter: {str(e)}. Expected: S, K, T, sigma, option_type'
        }, status=400)
    
    except (TypeError, ValueError) as e:
        return JsonResponse({
            'success': False,
            'error': f'Invalid parameter value: {str(e)}. All inputs must be numbers.'
        }, status=400)
    
    except Exception as e:
        # Log the full error for debugging
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            'success': False,
            'error': f'Server error during prediction: {str(e)}'
        }, status=500)

