# Team Guide: Creating Django APIs for React Frontend

**Last Updated:** February 20, 2026  
**For Team Members:** Step-by-step guide to create new API endpoints

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Code Templates](#code-templates)
5. [Testing Your API](#testing-your-api)
6. [Common Patterns](#common-patterns)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide shows you how to create Django REST API endpoints that the React frontend can call. We use Django's built-in `JsonResponse` for simplicity (no Django REST Framework needed).

### **Architecture:**
```
React Frontend (localhost:5173)
        ↓ HTTP Request (JSON)
Django Backend (localhost:8000)
        ↓ Process with ML Model
Return JSON Response
        ↓ Display in React
```

---

## Prerequisites

Before creating a new API, ensure:

1. Django server runs without errors (`python manage.py runserver`)
2. React frontend runs without errors (`npm run dev`)
3. CORS is configured in Django settings.py
4. You have your ML model or business logic ready

---

## Step-by-Step Guide

### **Example:** Creating a House Pricing API

Let's create an API endpoint for house price predictions.

---

### **STEP 1: Add Imports to views.py**

Open: `optionsAndProperty/house_pricing/views.py` (or your app's views.py)

Add these imports at the top:

```python
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
```

**Why?**
- `JsonResponse`: Send JSON data back to React
- `csrf_exempt`: Allow cross-origin requests from React
- `require_http_methods`: Restrict endpoint to specific HTTP methods
- `json`: Parse incoming JSON data

---

### **STEP 2: Create the API Function**

Add this function to `views.py`:

```python
@csrf_exempt
@require_http_methods(["POST"])
def api_predict_house_price(request):
    """
    API endpoint for house price predictions.
    
    Accepts JSON POST request with:
    - sqft: Square footage (int)
    - bedrooms: Number of bedrooms (int)
    - bathrooms: Number of bathrooms (float)
    - year_built: Year built (int)
    - location: Location code (string)
    
    Returns JSON with:
    - success: boolean
    - price: predicted price (float)
    - error: error message if any
    """
    try:
        # 1. Parse JSON request body
        data = json.loads(request.body)
        
        # 2. Extract parameters
        sqft = int(data.get('sqft'))
        bedrooms = int(data.get('bedrooms'))
        bathrooms = float(data.get('bathrooms'))
        year_built = int(data.get('year_built'))
        location = data.get('location')
        
        # 3. Validate inputs
        if sqft <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Square footage must be positive'
            }, status=400)
        
        if bedrooms < 0 or bathrooms < 0:
            return JsonResponse({
                'success': False,
                'error': 'Bedrooms and bathrooms cannot be negative'
            }, status=400)
        
        # 4. Your prediction logic here
        # Example: Load model and predict
        # predicted_price = your_model.predict([[sqft, bedrooms, bathrooms, year_built]])
        
        # Placeholder for now
        predicted_price = 450000.00
        
        # 5. Return successful response
        return JsonResponse({
            'success': True,
            'price': round(float(predicted_price), 2),
            'inputs': {
                'sqft': sqft,
                'bedrooms': bedrooms,
                'bathrooms': bathrooms,
                'year_built': year_built,
                'location': location
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON format'
        }, status=400)
    
    except (KeyError, TypeError, ValueError) as e:
        return JsonResponse({
            'success': False,
            'error': f'Missing or invalid parameter: {str(e)}'
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Server error: {str(e)}'
        }, status=500)
```

---

### **STEP 3: Add URL Route**

Open: `optionsAndProperty/house_pricing/urls.py` (or create it)

If file doesn't exist, create it:

```python
from django.urls import path
from . import views

urlpatterns = [
    # Existing routes...
    
    # API Endpoints
    path('api/predict-house-price/', views.api_predict_house_price, name='api_predict_house_price'),
]
```

If you created a new `urls.py`, add it to main `urls.py`:

Open: `optionsAndProperty/optionsAndProperty/urls.py`

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path('', include('options_pricing.urls')),
    path('house/', include('house_pricing.urls')),  # Add this line
]
```

---

### **STEP 4: Create React Component**

Create/update: `frontend/src/pages/HousePricing.jsx`

```javascript
import { useState } from 'react'

export default function HousePricing() {
  const [formData, setFormData] = useState({
    sqft: 2000,
    bedrooms: 3,
    bathrooms: 2.5,
    year_built: 2010,
    location: 'Urban'
  })
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'location' ? value : parseFloat(value) || 0
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setPrediction(null)

    try {
      const response = await fetch('http://localhost:8000/house/api/predict-house-price/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        setPrediction(data.price)
      } else {
        setError(data.error || 'Prediction failed')
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure Django is running.')
      console.error('API Error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">House Price Predictor</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Square Feet</label>
          <input
            type="number"
            name="sqft"
            value={formData.sqft}
            onChange={handleInputChange}
            required
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Bedrooms</label>
            <input
              type="number"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleInputChange}
              required
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Bathrooms</label>
            <input
              type="number"
              step="0.5"
              name="bathrooms"
              value={formData.bathrooms}
              onChange={handleInputChange}
              required
              className="w-full border p-2 rounded"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Calculating...' : 'Predict Price'}
        </button>
      </form>

      {/* Results */}
      {prediction !== null && (
        <div className="mt-6 p-4 bg-green-100 rounded">
          <p className="font-bold text-xl">Predicted Price: ${prediction.toLocaleString()}</p>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="mt-6 p-4 bg-red-100 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
```

---

### **STEP 5: Test Your API**

#### **Test with Django Running:**

1. Start Django server:
   ```powershell
   cd optionsAndProperty
   python manage.py runserver
   ```

2. Test with curl or Postman:
   ```bash
   curl -X POST http://localhost:8000/house/api/predict-house-price/ \
     -H "Content-Type: application/json" \
     -d '{"sqft": 2000, "bedrooms": 3, "bathrooms": 2.5, "year_built": 2010, "location": "Urban"}'
   ```

3. Expected response:
   ```json
   {
     "success": true,
     "price": 450000.00,
     "inputs": {...}
   }
   ```

#### **Test with React:**

1. Start React dev server:
   ```powershell
   cd frontend
   npm run dev
   ```

2. Open browser to `http://localhost:5173`
3. Navigate to your page and test the form

---

## Code Templates

### **Template 1: Simple GET API (No Input)**

```python
@csrf_exempt
@require_http_methods(["GET"])
def api_get_statistics(request):
    """Return some statistics"""
    try:
        stats = {
            'total_predictions': 1500,
            'average_price': 425000,
            'last_updated': '2026-02-20'
        }
        
        return JsonResponse({
            'success': True,
            'data': stats
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
```

**React Fetch:**
```javascript
const response = await fetch('http://localhost:8000/api/get-statistics/')
const data = await response.json()
```

---

### **Template 2: POST API with ML Model**

```python
@csrf_exempt
@require_http_methods(["POST"])
def api_predict_sentiment(request):
    """Predict sentiment from text"""
    try:
        data = json.loads(request.body)
        text = data.get('text', '')
        
        if not text or len(text) < 5:
            return JsonResponse({
                'success': False,
                'error': 'Text must be at least 5 characters'
            }, status=400)
        
        # Your ML model prediction
        # sentiment = your_model.predict([text])[0]
        sentiment = "Positive"  # Placeholder
        confidence = 0.85  # Placeholder
        
        return JsonResponse({
            'success': True,
            'sentiment': sentiment,
            'confidence': confidence,
            'text': text
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
```

---

### **Template 3: GET API with Query Parameters**

```python
@csrf_exempt
@require_http_methods(["GET"])
def api_get_stock_data(request):
    """Get stock data by ticker"""
    try:
        ticker = request.GET.get('ticker', '').upper()
        
        if not ticker:
            return JsonResponse({
                'success': False,
                'error': 'Ticker parameter required'
            }, status=400)
        
        # Fetch data
        # data = fetch_stock_data(ticker)
        data = {'price': 150.50, 'change': 2.5}  # Placeholder
        
        return JsonResponse({
            'success': True,
            'ticker': ticker,
            'data': data
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
```

**React Fetch:**
```javascript
const ticker = 'AAPL'
const response = await fetch(`http://localhost:8000/api/stock-data?ticker=${ticker}`)
```

---

## Common Patterns

### **Pattern 1: Loading ML Model Once**

Load model at module level (outside functions):

```python
import os
import joblib

# Load once when server starts
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'my_model.pkl')
model = joblib.load(MODEL_PATH)

# Now use 'model' in any API function
@csrf_exempt
@require_http_methods(["POST"])
def api_predict(request):
    prediction = model.predict(data)  # Fast!
    return JsonResponse({'prediction': prediction})
```

---

### **Pattern 2: Handling File Uploads**

```python
@csrf_exempt
@require_http_methods(["POST"])
def api_upload_csv(request):
    try:
        uploaded_file = request.FILES.get('file')
        
        if not uploaded_file:
            return JsonResponse({
                'success': False,
                'error': 'No file uploaded'
            }, status=400)
        
        # Process file
        # df = pd.read_csv(uploaded_file)
        
        return JsonResponse({
            'success': True,
            'filename': uploaded_file.name,
            'size': uploaded_file.size
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
```

**React with FormData:**
```javascript
const formData = new FormData()
formData.append('file', fileInput.files[0])

const response = await fetch('http://localhost:8000/api/upload/', {
  method: 'POST',
  body: formData  // Don't set Content-Type header!
})
```

---

### **Pattern 3: Pagination**

```python
@csrf_exempt
@require_http_methods(["GET"])
def api_get_items(request):
    try:
        page = int(request.GET.get('page', 1))
        per_page = int(request.GET.get('per_page', 10))
        
        # Get paginated data
        # items = get_paginated_items(page, per_page)
        
        return JsonResponse({
            'success': True,
            'page': page,
            'per_page': per_page,
            'total': 100,
            'items': []  # Your items here
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
```

---

## Best Practices

### DO:

1. **Always validate inputs** before processing
2. **Use try-except blocks** to catch errors
3. **Return consistent JSON structure** (`success`, `data/error`)
4. **Use appropriate HTTP status codes** (200, 400, 500)
5. **Add docstrings** explaining expected inputs/outputs
6. **Load models once** at module level, not per request
7. **Use descriptive error messages** for debugging
8. **Test with invalid inputs** to verify error handling

### DON'T:

1. **Don't expose sensitive data** in error messages
2. **Don't load models inside API functions** (too slow)
3. **Don't forget error handling** for missing parameters
4. **Don't return HTML** from API endpoints (JSON only)
5. **Don't forget CSRF exempt** for cross-origin requests
6. **Don't hardcode values** that should be parameters
7. **Don't skip input validation** (security risk)

---

## Best Practices for React Side

### **Create API Service File**

`frontend/src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:8000'

export const predictHousePrice = async (data) => {
  const response = await fetch(`${API_BASE_URL}/house/api/predict-house-price/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    throw new Error('API request failed')
  }
  
  return response.json()
}

export const predictOptionPrice = async (data) => {
  const response = await fetch(`${API_BASE_URL}/api/predict-option-price/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  })
  
  return response.json()
}
```

**Use in components:**
```javascript
import { predictHousePrice } from '../services/api'

const data = await predictHousePrice(formData)
```

---

## Testing Your API

### **Method 1: Browser Console**

Open browser console and run:

```javascript
fetch('http://localhost:8000/api/predict-option-price/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    S: 18000, K: 18500, T: 30, 
    sigma: 15, r: 4.5, option_type: 1
  })
})
.then(r => r.json())
.then(data => console.log(data))
```

---

### **Method 2: curl Command**

```bash
curl -X POST http://localhost:8000/api/predict-option-price/ \
  -H "Content-Type: application/json" \
  -d '{"S": 18000, "K": 18500, "T": 30, "sigma": 15, "r": 4.5, "option_type": 1}'
```

---

### **Method 3: Python Requests**

```python
import requests

response = requests.post(
    'http://localhost:8000/api/predict-option-price/',
    json={
        'S': 18000,
        'K': 18500,
        'T': 30,
        'sigma': 15,
        'r': 4.5,
        'option_type': 1
    }
)

print(response.json())
```

---

## Troubleshooting

### **Problem: "Failed to connect to server"**

**Causes:**
- Django not running
- Wrong port number
- Firewall blocking connection

**Solutions:**
```powershell
# Check if Django is running
cd optionsAndProperty
python manage.py runserver

# Check port 8000 is open
netstat -an | findstr 8000
```

---

### **Problem: CORS errors**

**Symptom:** Browser console shows:
```
Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Solution:** Verify in `settings.py`:
```python
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

---

### **Problem: "CSRF verification failed"**

**Solution:** Make sure you added `@csrf_exempt` decorator:
```python
@csrf_exempt
@require_http_methods(["POST"])
def api_my_endpoint(request):
    ...
```

---

### **Problem: "Method Not Allowed (405)"**

**Cause:** Trying to use GET on a POST-only endpoint

**Solution:** Check decorator matches your request:
```python
@require_http_methods(["POST"])  # Only allows POST
@require_http_methods(["GET", "POST"])  # Allows both
```

---

### **Problem: JSON decode error**

**Cause:** Request body is not valid JSON

**Solution:** In React, ensure:
```javascript
headers: {
  'Content-Type': 'application/json',  // Must have this!
},
body: JSON.stringify(data)  // Must stringify!
```

---

## Authentication APIs

The project includes a complete authentication system for user registration, login, logout, and password reset functionality.

### **Available Authentication Endpoints**

All authentication endpoints are under `/api/auth/`:

1. `POST /api/auth/register/` - Register new user
2. `POST /api/auth/login/` - Login user
3. `POST /api/auth/logout/` - Logout user
4. `GET /api/auth/verify-token/` - Verify authentication token
5. `POST /api/auth/password-reset/` - Request password reset email
6. `POST /api/auth/password-reset-confirm/` - Confirm password reset

---

### **1. User Registration**

**Endpoint:** `POST http://localhost:8000/api/auth/register/`

**Request Body:**
```json
{
  "first_name": "John",
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "first_name": "John"
  },
  "token": "a1b2c3d4e5f6..."
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Password must be at least 8 characters long"
}
```

**Validation Rules:**
- Email must be unique and valid format
- Password minimum 8 characters
- First name is required
- All fields are required

---

### **2. User Login**

**Endpoint:** `POST http://localhost:8000/api/auth/login/`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "first_name": "John"
  },
  "token": "a1b2c3d4e5f6..."
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Note:** Uses email instead of username for authentication.

---

### **3. User Logout**

**Endpoint:** `POST http://localhost:8000/api/auth/logout/`

**Headers Required:**
```
Authorization: Token a1b2c3d4e5f6...
```

**No Request Body Needed**

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid token"
}
```

---

### **4. Verify Token**

**Endpoint:** `GET http://localhost:8000/api/auth/verify-token/`

**Headers Required:**
```
Authorization: Token a1b2c3d4e5f6...
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "john@example.com",
    "first_name": "John"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Use Case:** Check if user is still logged in when app loads.

---

### **5. Password Reset Request**

**Endpoint:** `POST http://localhost:8000/api/auth/password-reset/`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent. Please check your inbox."
}
```

**Note:** In development, the email is printed to the Django console. Check terminal for the reset link.

---

### **6. Password Reset Confirm**

**Endpoint:** `POST http://localhost:8000/api/auth/password-reset-confirm/`

**Request Body:**
```json
{
  "uid": "MQ",
  "token": "c5qsfd-1a2b3c4d5e6f",
  "new_password": "newsecurepass456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

**Note:** The `uid` and `token` come from the password reset email link.

---

### **Using Authentication in React**

The frontend includes `AuthContext` for easy authentication state management.

**Import and Use:**

```javascript
import { useAuth } from '../context/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, login, register, logout, loading } = useAuth()

  // Check if user is logged in
  if (isAuthenticated) {
    return <div>Welcome, {user.first_name}!</div>
  }

  return <div>Please log in</div>
}
```

**AuthContext Methods:**

1. `login(email, password)` - Login user
2. `register(firstName, email, password)` - Register new user
3. `logout()` - Logout user
4. `verifyToken()` - Check if token is still valid

**AuthContext State:**

- `user` - Current user object or null
- `isAuthenticated` - Boolean, true if user is logged in
- `loading` - Boolean, true while verifying token

---

### **Protecting Routes**

Use the `ProtectedRoute` component to require authentication:

```javascript
import ProtectedRoute from './components/ProtectedRoute'
import OptionsPricing from './pages/OptionsPricing'

// In your routes:
<Route path="/options-pricing" element={
  <ProtectedRoute>
    <OptionsPricing />
  </ProtectedRoute>
} />
```

If user is not authenticated, they'll be redirected to `/login`.

---

### **Adding Authentication to Your API Calls**

For APIs that require authentication, include the token in headers:

```javascript
const token = localStorage.getItem('token')

const response = await fetch('http://localhost:8000/your-api/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Token ${token}`  // Add this!
  },
  body: JSON.stringify(data)
})
```

**In Django views.py:**

```python
from rest_framework.authtoken.models import Token

@csrf_exempt
@require_http_methods(["POST"])
def your_protected_api(request):
    # Get token from Authorization header
    auth_header = request.headers.get('Authorization', '')
    
    if not auth_header.startswith('Token '):
        return JsonResponse({
            'success': False,
            'error': 'Authentication required'
        }, status=401)
    
    token_key = auth_header.split(' ')[1]
    
    try:
        token = Token.objects.get(key=token_key)
        user = token.user
        
        # Now you can use the user object
        # Your API logic here...
        
        return JsonResponse({
            'success': True,
            'message': f'Hello {user.first_name}!',
            'data': {}
        })
        
    except Token.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Invalid token'
        }, status=401)
```

---

### **Testing Authentication Flow**

1. **Register User:**
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","email":"john@test.com","password":"pass1234"}'
```

2. **Login:**
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"pass1234"}'
```

3. **Use Token (save token from login response):**
```bash
curl -X GET http://localhost:8000/api/auth/verify-token/ \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

4. **Logout:**
```bash
curl -X POST http://localhost:8000/api/auth/logout/ \
  -H "Authorization: Token YOUR_TOKEN_HERE"
```

---

## Quick Reference

### **Django API Checklist**

- [ ] Import `JsonResponse`, `csrf_exempt`, `require_http_methods`, `json`
- [ ] Add `@csrf_exempt` decorator
- [ ] Add `@require_http_methods(["POST"])` decorator
- [ ] Parse JSON with `json.loads(request.body)`
- [ ] Validate all inputs
- [ ] Add try-except error handling
- [ ] Return `JsonResponse` with `success` field
- [ ] Add URL route in `urls.py`
- [ ] Test endpoint with curl or browser

### **React Frontend Checklist**

- [ ] Create state for form data, loading, error, result
- [ ] Add `handleSubmit` function with `e.preventDefault()`
- [ ] Use `fetch()` with correct URL and method
- [ ] Set `Content-Type: application/json` header
- [ ] Use `JSON.stringify()` on body
- [ ] Handle success and error responses
- [ ] Display loading state
- [ ] Show results or errors to user

---

## Additional Resources

- [Django JsonResponse Docs](https://docs.djangoproject.com/en/stable/ref/request-response/#jsonresponse-objects)
- [Fetch API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [React Hooks Guide](https://react.dev/reference/react)

---

## Questions?

If you run into issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Check browser console for errors (F12)
3. Check Django terminal for errors
4. Review the working Options Pricing example
5. Ask team for help!

---

**End of Guide**
