# Authentication System - Quick Start Guide

## Overview

The authentication system is now fully integrated with email-based login, registration, and password reset functionality.

## What's New

### Backend (Django)
- Custom user model with email as username field
- Token-based authentication
- 6 API endpoints for auth operations
- Email-based password reset (console backend in development)

### Frontend (React)
- Global authentication state with AuthContext
- Login and registration pages
- Password reset flow (request + confirmation)
- Protected routes requiring authentication
- User-aware navigation bar

## Testing the System

### 1. Start Both Servers

**Terminal 1 - Django (Backend):**
```powershell
cd c:\Users\Arnav\Documents\Arnav\Projects\GroupProject\optionsAndProperty
python manage.py runserver
```

**Terminal 2 - React (Frontend):**
```powershell
cd c:\Users\Arnav\Documents\Arnav\Projects\GroupProject\frontend
npm run dev
```

### 2. Test User Registration

1. Open browser to: `http://localhost:5173`
2. Click "Sign Up" in the navigation bar
3. Fill in the form:
   - First Name: `John`
   - Email: `john@test.com`
   - Password: `password123`
   - Confirm Password: `password123`
4. Click "Sign Up"
5. You should be automatically logged in and redirected to home
6. Navigation bar should show "Hi, John" and a "Logout" button

### 3. Test Login

1. Click "Logout" if logged in
2. Click "Login" in navigation bar
3. Enter credentials:
   - Email: `john@test.com`
   - Password: `password123`
4. Click "Login"
5. Should be redirected to home page
6. Navigation bar should show "Hi, John"

### 4. Test Protected Route

1. Make sure you're logged in
2. Click "Options Pricing" in navigation
3. Should see the Options Pricing page (this page requires authentication)
4. Logout and try to access `/options-pricing` directly
5. Should be redirected to login page

### 5. Test Password Reset

1. Logout if logged in
2. Go to login page
3. Click "Forgot your password?"
4. Enter email: `john@test.com`
5. Click "Send Reset Link"
6. Check the Django terminal/console
7. You'll see an email with a reset link like:
   ```
   http://localhost:5173/reset-password/MQ/c5qsfd-1a2b3c4d5e6f7g8h9i0j/
   ```
8. Copy this link and paste it in your browser
9. Enter new password twice
10. Click "Reset Password"
11. Should be redirected to login page
12. Login with the new password

## API Endpoints

All authentication endpoints are under `/api/auth/`:

### Register
```bash
POST http://localhost:8000/api/auth/register/
Content-Type: application/json

{
  "first_name": "John",
  "email": "john@test.com",
  "password": "password123"
}
```

### Login
```bash
POST http://localhost:8000/api/auth/login/
Content-Type: application/json

{
  "email": "john@test.com",
  "password": "password123"
}
```

### Verify Token
```bash
GET http://localhost:8000/api/auth/verify-token/
Authorization: Token YOUR_TOKEN_HERE
```

### Logout
```bash
POST http://localhost:8000/api/auth/logout/
Authorization: Token YOUR_TOKEN_HERE
```

### Password Reset Request
```bash
POST http://localhost:8000/api/auth/password-reset/
Content-Type: application/json

{
  "email": "john@test.com"
}
```

### Password Reset Confirm
```bash
POST http://localhost:8000/api/auth/password-reset-confirm/
Content-Type: application/json

{
  "uid": "MQ",
  "token": "c5qsfd-1a2b3c4d5e6f",
  "new_password": "newpassword456"
}
```

## File Structure

### Backend Files
```
optionsAndProperty/
├── authentication/           # New authentication app
│   ├── models.py            # CustomUser and CustomUserManager
│   ├── views.py             # 6 API endpoints
│   └── urls.py              # Auth URL routes
├── optionsAndProperty/
│   ├── settings.py          # Updated with auth config
│   └── urls.py              # Includes auth URLs
└── db.sqlite3               # Database with custom user model
```

### Frontend Files
```
frontend/src/
├── context/
│   └── AuthContext.jsx      # Global auth state management
├── components/
│   ├── Navbar.jsx           # Updated with auth UI
│   └── ProtectedRoute.jsx   # Route protection wrapper
├── pages/
│   ├── Login.jsx            # Login page
│   ├── Register.jsx         # Registration page
│   ├── ForgotPassword.jsx   # Password reset request
│   └── ResetPassword.jsx    # Password reset confirmation
└── App.jsx                  # Updated with auth routes
```

## Key Features

### Email-Based Authentication
- No username required
- Email is used for login
- First name is required for registration
- Minimum 8 character password

### Token Storage
- Tokens stored in localStorage
- Automatically included in protected API calls
- Verified on app load
- Cleared on logout

### Protected Routes
- Wrap any route with `<ProtectedRoute>` to require auth
- Redirects to `/login` if not authenticated
- Shows loading spinner during verification

### User-Aware Navigation
- Shows user's first name when logged in
- Login/Sign Up buttons when not logged in
- Logout button visible when authenticated
- Works in both desktop and mobile views

## Security Notes

### Development
- Email backend prints to console (check Django terminal)
- Tokens stored in localStorage (not secure for production)
- CSRF disabled for API endpoints (cross-origin support)

### Production Considerations
- Configure SMTP email backend in settings.py
- Consider HttpOnly cookies instead of localStorage
- Add rate limiting for auth endpoints
- Enable HTTPS for all authentication traffic
- Add email verification for new accounts
- Implement password strength requirements
- Add account lockout after failed attempts

## Common Issues

### "Invalid token" Error
- Token expired or doesn't exist
- Clear localStorage and login again
- Check Authorization header format: `Token <token>`

### Password Reset Email Not Showing
- Check Django terminal/console output
- Email is printed to console in development mode
- For production, configure SMTP in settings.py

### Protected Route Not Working
- Ensure page is wrapped in `<ProtectedRoute>`
- Check if `<AuthProvider>` wraps `<App>` in App.jsx
- Verify token exists in localStorage
- Check browser console for errors

### User Not Staying Logged In
- Token not being saved to localStorage
- Token verification failing on app load
- Check AuthContext.jsx for token storage logic
- Verify `/api/auth/verify-token/` endpoint works

## Next Steps

To add authentication to other pages:
1. Wrap the route with `<ProtectedRoute>` in App.jsx
2. Get user data from `useAuth()` hook if needed
3. Include token in API calls as shown in TEAM_GUIDE_API_CREATION.md

To add more authentication features:
- Email verification for new accounts
- "Remember Me" functionality
- Social authentication (Google, GitHub, etc.)
- Two-factor authentication (2FA)
- Account deletion
- Profile editing

## Questions?

Check the following documentation:
- [CHANGELOG.md](./CHANGELOG.md) - Full implementation details
- [TEAM_GUIDE_API_CREATION.md](./TEAM_GUIDE_API_CREATION.md) - Authentication API usage guide
- Django authentication code: `optionsAndProperty/authentication/`
- React authentication code: `frontend/src/context/AuthContext.jsx`
