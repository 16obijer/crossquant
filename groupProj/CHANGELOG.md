# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).



## [2026-02-20] - User Authentication System

### Added
- **Django Authentication Backend** - *Arnav*
  - Created `authentication` Django app with custom user model
  - Implemented email-based authentication (no username required)
  - Token-based authentication using Django REST Framework's authtoken
  - Custom user model requiring first name and email
  - Password reset functionality with email token generation
  - Six REST API endpoints for complete auth flow

- **Authentication API Endpoints** - *Arnav*
  - `POST /api/auth/register/` - User registration (first_name, email, password)
  - `POST /api/auth/login/` - User login with email/password
  - `POST /api/auth/logout/` - Token-based logout
  - `POST /api/auth/password-reset/` - Request password reset email
  - `POST /api/auth/password-reset-confirm/` - Confirm password reset with token
  - `GET /api/auth/verify-token/` - Verify authentication token validity

- **React Authentication Frontend** - *Arnav*
  - Created `AuthContext` for global authentication state management
  - Implemented login/register/logout/verify functions with token storage
  - Created `ProtectedRoute` component for route protection
  - Built complete authentication UI with four pages

- **Authentication Pages** - *Arnav*
  - `Login.jsx` - Email/password login with error handling
  - `Register.jsx` - User registration with password confirmation
  - `ForgotPassword.jsx` - Request password reset by email
  - `ResetPassword.jsx` - Password reset confirmation with token validation

- **User Experience Enhancements** - *Arnav*
  - Updated navigation bar with user greeting and logout button
  - Conditional navigation showing login/register when not authenticated
  - Protected Options Pricing page requiring authentication
  - Automatic token verification on app load
  - Loading states during authentication checks
  - Responsive mobile menu with authentication options

### Changed
- **User Model** - *Arnav*
  - Replaced Django's default User model with `CustomUser`
  - Set email as `USERNAME_FIELD` instead of username
  - Made first_name a required field
  - Created `CustomUserManager` for email-based user creation

- **Django Settings** - *Arnav*
  - Added `rest_framework` and `rest_framework.authtoken` to installed apps
  - Configured `AUTH_USER_MODEL = 'authentication.CustomUser'`
  - Set up email backend for password reset (console backend for development)
  - Configured SMTP settings for production use (commented)

### Security Features
- Passwords hashed using Django's default PBKDF2 algorithm
- Minimum password length of 8 characters enforced
- Password confirmation validation on frontend and backend
- Token-based authentication with secure token generation
- Password reset tokens expire after 1 day
- CSRF exemption for API endpoints to support cross-origin requests
- Tokens stored in localStorage with automatic inclusion in API requests

### Technical Details
**Backend Files:**
- `authentication/models.py` - CustomUser model and CustomUserManager
- `authentication/views.py` - Six API endpoints with validation
- `authentication/urls.py` - URL routing for auth endpoints
- `optionsAndProperty/settings.py` - Updated with authentication configuration

**Frontend Files:**
- `frontend/src/context/AuthContext.jsx` - Global auth state management
- `frontend/src/components/ProtectedRoute.jsx` - Protected route wrapper
- `frontend/src/components/Navbar.jsx` - Updated with auth UI
- `frontend/src/pages/Login.jsx` - Login page
- `frontend/src/pages/Register.jsx` - Registration page
- `frontend/src/pages/ForgotPassword.jsx` - Password reset request
- `frontend/src/pages/ResetPassword.jsx` - Password reset confirmation
- `frontend/src/App.jsx` - Updated with auth routes and AuthProvider

**Database Migrations:**
- Created new migrations for custom user model
- Applied authtoken migrations for token storage
- Reset database to apply custom user model from scratch

**Email Configuration:**
- Development: Console email backend (prints to terminal)
- Production: SMTP configuration available in settings (commented)
- Password reset emails include UID and token for secure reset links
- URL encoding applied to tokens to prevent issues with special characters in URLs

---

## [2026-02-20] - User Profile Management

### Added
- **Profile API Endpoint** - *Arnav*
  - `GET /api/auth/profile/` - Retrieve current user's profile information
  - `PUT /api/auth/profile/` - Update user profile (first name, email, password)
  - Requires authentication token
  - Validates current password before allowing password changes
  - Checks for duplicate emails before updating
  - Returns updated user data on success

- **Profile Page** - *Arnav*
  - Created `Profile.jsx` with comprehensive profile editing interface
  - Section for updating profile information (first name, email)
  - Optional password change section with toggle button
  - Current password verification required for password changes
  - Real-time form validation on client side
  - Success and error message displays
  - Clean, organized form layout with clear sections
  - Cancel button to return to home page

- **Navigation Updates** - *Arnav*
  - Added "Profile" link to navigation bar (visible when logged in)
  - Profile link appears in both desktop and mobile navigation
  - Positioned between page links and user greeting for easy access

### Changed
- **Logout Behavior** - *Arnav*
  - Updated logout to redirect to login page instead of home page
  - Provides better user experience after logout

- **Auth Context** - *Arnav*
  - Exported `setUser` function to allow profile updates to reflect in global state
  - Profile changes now immediately update throughout the application

### Validation Rules
- **First Name:** Cannot be empty
- **Email:** Must be unique and valid email format
- **Password Change:**
  - Current password required and must be correct
  - New password must be at least 8 characters
  - Password confirmation must match new password

### Technical Details
**Backend Files:**
- `authentication/views.py` - Added `user_profile()` function with GET/PUT support
- `authentication/urls.py` - Added `/api/auth/profile/` route

**Frontend Files:**
- `frontend/src/pages/Profile.jsx` - Complete profile management page
- `frontend/src/components/Navbar.jsx` - Added Profile link and updated logout redirect
- `frontend/src/context/AuthContext.jsx` - Exported setUser for state updates
- `frontend/src/App.jsx` - Added `/profile` route with ProtectedRoute wrapper

**Features:**
- Protected route requiring authentication
- Separate sections for profile info and password changes
- Toggle button to show/hide password change fields
- Client-side validation before API calls
- Server-side validation with detailed error messages
- Automatic context update on successful profile changes
- Responsive design matching authentication pages

---

## [2026-02-20] - Enhanced Error Handling

### Changed
- **Options Pricing API Error Handling** - *Arnav*
  - Replaced generic error messages with field-specific validation errors
  - Each input field now has individual validation with descriptive messages
  - Error messages now show the actual invalid value received
  - Added upfront check for missing required parameters
  - Improved exception handling with separate catches for JSON, KeyError, TypeError, and ValueError
  - Added server-side error logging with traceback for debugging

### Added
- **Validation Rules** - *Arnav*
  - Maximum days to expiration: 1825 days (5 years)
  - Risk-free rate range: -10% to 50%
  - Volatility range: 0% to 200%
  - Better error messages showing expected ranges

### Technical Details
**File Modified:** `optionsAndProperty/options_pricing/views.py`
- Added missing parameter validation before extraction
- Individual validation checks for each field (S, K, T, r, sigma, option_type)
- Each validation returns specific error message with actual value
- Separated error handling into distinct exception types
- Added traceback logging for server errors

**Example Error Messages:**
- Before: `"S, K, and T must be positive values"`
- After: `"Futures Price must be positive (got -100)"`
- After: `"Days to expiration too large (got 2000, max 1825 days)"`
- After: `"Missing required parameters: S, K"`

---

## [2026-02-20] - React Frontend Integration

### Added
- **React Frontend Application** - *Jake*
  - Created React + Vite application in `frontend/` directory
  - Implemented React Router for navigation
  - Created navigation component with links to all pages
  - Styled with Tailwind CSS via CDN
  - Hot reload development environment

### Frontend Pages Created
*Jake*
- `Home.jsx` - Landing page
- `OptionsPricing.jsx` - Options pricing calculator with API integration
- `HousePricing.jsx` - House pricing estimator placeholder
- `SentimentAnalysis.jsx` - Sentiment analysis placeholder
- `About.jsx` - About page

### Configuration
- Vite 7.3.1 as build tool
- React 19.2.0
- React Router DOM 7.13.0
- ESLint for code quality

**New Files:**
```
frontend/
├── src/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── OptionsPricing.jsx
│   │   ├── HousePricing.jsx
│   │   ├── SentimentAnalysis.jsx
│   │   └── About.jsx
│   ├── components/
│   │   └── Navbar.jsx
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── vite.config.js
└── index.html
```

---

## [2026-02-20] - Options Pricing REST API

### Added
- **Django REST API Endpoint** - *Arnav*
  - Created `/api/predict-option-price/` POST endpoint
  - JSON request/response format
  - CSRF exempt for cross-origin requests
  - Comprehensive input validation
  - Error handling with appropriate HTTP status codes

### Frontend Integration
- **Options Pricing React Component** - *Arnav*
  - Connected form to Django API using fetch()
  - Implemented controlled form inputs with React state
  - Added loading states during API calls
  - Success display in green card with formatted price
  - Error display in red card with specific error messages
  - Disabled submit button during loading to prevent double-submission

### Technical Implementation

**Backend Changes:**
- `optionsAndProperty/options_pricing/views.py`
  - Added `api_predict_option_price()` function
  - Imports: `JsonResponse`, `csrf_exempt`, `require_http_methods`, `json`
  - Input validation for all parameters
  - XGBoost model prediction using existing loaded model
  - Returns JSON with success/error status

- `optionsAndProperty/options_pricing/urls.py`
  - Added route: `path('api/predict-option-price/', views.api_predict_option_price)`

**Frontend Changes:**
- `frontend/src/pages/OptionsPricing.jsx`
  - State management: `formData`, `prediction`, `loading`, `error`
  - `handleInputChange()` - Updates form state
  - `handleSubmit()` - Makes API call and handles response
  - Controlled inputs mapped to state
  - Result and error display components

**API Specification:**
```javascript
POST /api/predict-option-price/
Content-Type: application/json

Request: {
  "S": 18000,        // Futures price
  "K": 18500,        // Strike price
  "T": 30,           // Days to expiration
  "r": 4.5,          // Risk-free rate (%)
  "sigma": 15,       // Volatility (%)
  "option_type": 1   // 1=Call, 0=Put
}

Response: {
  "success": true,
  "price": 285.42,
  "inputs": { ... }
}
```

### Configuration
- CORS configured in `settings.py` to allow `localhost:5173`
- Django CORS Headers middleware enabled

---

## [2026-02-20] - Documentation

### Added
- **CHANGELOG.md** - *Arnav*
  - Project changelog following Keep a Changelog format
  - Detailed change history with dates and team member attributions
  
- **TEAM_GUIDE_API_CREATION.md** - *Arnav*
  - Comprehensive guide for team members to create new API endpoints
  - Step-by-step instructions with code examples
  - Multiple templates for different API patterns
  - Best practices and troubleshooting section
  - Testing methods (curl, browser console, Python requests)

### Documentation Highlights

**TEAM_GUIDE_API_CREATION.md includes:**
- Prerequisites and architecture overview
- Step-by-step guide for creating APIs
- Code templates for GET/POST endpoints with ML models
- Common patterns (model loading, file uploads, pagination)
- Best practices (DOs and DON'Ts)
- React API service file example
- Troubleshooting common issues
- Quick reference checklist

---

## [2026-02-20] - Django Backend Setup

### Added


### Configuration
- **CORS Settings** - *Jake*
  - Installed `django-cors-headers`
  - Configured to allow React frontend (localhost:5173)
  - Added CORS middleware to settings

- **Django Settings Updates**
  - Updated ALLOWED_HOSTS: `['localhost', '127.0.0.1', '0.0.0.0']`
  - CORS_ALLOWED_ORIGINS configured for local development

---

## Earlier - Initial Project Structure

### Existing Components

**Django Backend:** `optionsAndProperty/`
- Options Pricing app with XGBoost model (.ubj format)
- House Pricing app (placeholder)
- Sentiment Analysis app (placeholder)
- Stock Analysis app (placeholder)
- Django templates for each feature
- SQLite database

**LSTM Stock Prediction:** `lstmStockPrediction/` 
- Historical data fetching scripts
- Feature engineering pipeline
- LSTM training notebook
- Data configuration files (YAML)
- Processed data for tech stocks

**Option Pricing Code:** `optionPricingCode/`
- XGBoost training notebooks
- Data exploration and EDA
- Model artifacts (JSON and UBJ formats)
- NASDAQ option pricing dataset

---

## Running the Application

### Backend (Django)
```powershell
cd optionsAndProperty
python manage.py runserver
```
Server runs at: http://localhost:8000

### Frontend (React)
```powershell
cd frontend
npm install  # First time only
npm run dev
```
Dev server runs at: http://localhost:5173

---

## Team Members

- **Arnav** - API Development
- **CJ** - Property Pricing
- **Jake** - React Integration
- **Jeremy** - Portfolio Tracking
- **Luke** - Sentiment Analysis

Check Trello Board for up to date information on tasks assigned to each member

---

## Dependencies

### Backend
- Django 6.0.1
- XGBoost
- NumPy
- Pandas
- django-cors-headers
- yfinance (for stock data)
- PyYAML (for configuration)

### Frontend
- React 19.2.0
- React Router DOM 7.13.0
- Vite 7.3.1
- Tailwind CSS (via CDN)

---

## Notes

- The original Django template-based views still work alongside the new API
- XGBoost model is loaded once at Django startup and kept in memory
- React frontend and Django backend run as separate services
- CSRF protection is disabled for API endpoints to allow cross-origin requests
- For production, consider using environment variables for API URLs
- Consider migrating to Django REST Framework for more robust API features

---

**For detailed API creation instructions, see [TEAM_GUIDE_API_CREATION.md](TEAM_GUIDE_API_CREATION.md)**
