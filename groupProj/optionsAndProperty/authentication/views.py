from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from rest_framework.authtoken.models import Token
from urllib.parse import quote, unquote
import json
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError
import re

from .models import CustomUser


def validate_email_format(email):
    """
    Helper function to validate email format and block fake domains
    """
    # First check with Django's EmailValidator
    try:
        EmailValidator()(email)
    except ValidationError:
        return False
    
    # Then block fake TLDs
    fake_tlds = ['.bosh', '.test', '.example', '.local', '.invalid', '.localhost']
    for tld in fake_tlds:
        if email.endswith(tld):
            return False
    
    # Check domain has proper format
    if '@' in email:
        domain = email.split('@')[-1]
        if not re.match(r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', domain):
            return False
    
    return True


@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    """
    Register a new user.
    
    Request body:
    - first_name: User's first name
    - email: User's email address
    - password: User's password
    - phone_number: User's phone number (optional)
    """
    try:
        data = json.loads(request.body)
        
        first_name = data.get('first_name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        phone_number = data.get('phone_number', '').strip()  # ADD THIS
        
        # Validation
        if not first_name:
            return JsonResponse({
                'success': False,
                'error': 'First name is required'
            }, status=400)
        
        if not email:
            return JsonResponse({
                'success': False,
                'error': 'Email is required'
            }, status=400)
        
        if not password:
            return JsonResponse({
                'success': False,
                'error': 'Password is required'
            }, status=400)
        
        if len(password) < 8:
            return JsonResponse({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=400)
        
        # Optional phone number validation
        if phone_number:
            # Simple validation - you can adjust this
            if len(phone_number) < 10:
                return JsonResponse({
                    'success': False,
                    'error': 'Please enter a valid phone number'
                }, status=400)
        
        # Validate email format
        if not validate_email_format(email):
            return JsonResponse({
                'success': False,
                'error': 'Enter a valid email address'
            }, status=400)
        
        # Check if user exists
        if CustomUser.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'A user with this email already exists'
            }, status=400)
        
        # Create user
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            phone_number=phone_number  # ADD THIS
        )
        
        # Create token for the user
        token, created = Token.objects.get_or_create(user=user)
        
        return JsonResponse({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'phone_number': user.phone_number  # ADD THIS
            },
            'token': token.key
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON format'
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Registration failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    """
    Login user with email and password.
    
    Request body:
    - email: User's email address
    - password: User's password
    """
    try:
        data = json.loads(request.body)
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return JsonResponse({
                'success': False,
                'error': 'Email and password are required'
            }, status=400)
        
        # Authenticate user
        try:
            user = CustomUser.objects.get(email=email)
            if not user.check_password(password):
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid email or password'
                }, status=401)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Invalid email or password'
            }, status=401)
        
        # Get or create token
        token, created = Token.objects.get_or_create(user=user)
        
        return JsonResponse({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'phone_number': user.phone_number  # ADD THIS
            },
            'token': token.key
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON format'
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Login failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def logout(request):
    """
    Logout user by deleting their auth token.
    
    Headers:
    - Authorization: Token <token_key>
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Token '):
            return JsonResponse({
                'success': False,
                'error': 'Invalid authorization header'
            }, status=401)
        
        token_key = auth_header.split(' ')[1]
        
        try:
            token = Token.objects.get(key=token_key)
            token.delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Logout successful'
            })
        except Token.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Invalid token'
            }, status=401)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Logout failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def password_reset_request(request):
    """
    Request a password reset email.
    
    Request body:
    - email: User's email address
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        
        if not email:
            return JsonResponse({
                'success': False,
                'error': 'Email is required'
            }, status=400)
        
        try:
            user = CustomUser.objects.get(email=email)
            
            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Ensure uid is a string (not bytes)
            if isinstance(uid, bytes):
                uid = uid.decode('utf-8')
            
            # URL-encode the token to prevent special characters from breaking the URL
            encoded_token = quote(token, safe='')
            
            # Create reset link
            reset_link = f"http://localhost:5173/reset-password/{uid}/{encoded_token}"
            
            # Debug logging - print link in a way that won't wrap
            print("\n" + "="*80)
            print(f"PASSWORD RESET REQUESTED FOR: {user.email}")
            print(f"UID: {uid}")
            print(f"Token (original): {token}")
            print(f"Token (URL-encoded): {encoded_token}")
            print("\nCOPY THIS LINK (entire line):")
            print(reset_link)
            print("="*80 + "\n")
            
            # Send email
            subject = 'Password Reset Request'
            text_message = f"""
Hello {user.first_name},

You requested a password reset. Click the link below to reset your password:

{reset_link}

This link will expire in 24 hours.

If you didn't request this, please ignore this email.

Best regards,
Your Team
            """
            
            html_message = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2>Password Reset Request</h2>
                <p>Hello {user.first_name},</p>
                <p>You requested a password reset. Click the button below to reset your password:</p>
                <p style="margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4F46E5;">{reset_link}</p>
                <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                <p>Best regards,<br>Your Team</p>
            </body>
            </html>
            """
            
            from django.core.mail import EmailMultiAlternatives
            
            email = EmailMultiAlternatives(
                subject,
                text_message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email]
            )
            email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)
            
            return JsonResponse({
                'success': True,
                'message': 'Password reset email sent. Please check your inbox.'
            })
            
        except CustomUser.DoesNotExist:
            # Don't reveal whether email exists or not (security)
            return JsonResponse({
                'success': True,
                'message': 'If an account with that email exists, a password reset link has been sent.'
            })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON format'
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Password reset request failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def password_reset_confirm(request):
    """
    Confirm password reset with token.
    
    Request body:
    - uid: User ID (base64 encoded)
    - token: Password reset token
    - new_password: New password
    """
    try:
        data = json.loads(request.body)
        
        uid = data.get('uid', '')
        token = data.get('token', '')
        new_password = data.get('new_password', '')
        
        # URL-decode the token (in case it was encoded)
        token = unquote(token)
        
        # Debug logging
        print(f"Password reset attempt:")
        print(f"  UID received: {uid}")
        print(f"  Token received (after decode): {token}")
        print(f"  Password length: {len(new_password) if new_password else 0}")
        
        if not uid or not token or not new_password:
            return JsonResponse({
                'success': False,
                'error': 'UID, token, and new password are required'
            }, status=400)
        
        if len(new_password) < 8:
            return JsonResponse({
                'success': False,
                'error': 'Password must be at least 8 characters long'
            }, status=400)
        
        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            print(f"  Decoded user_id: {user_id}")
            user = CustomUser.objects.get(pk=user_id)
            print(f"  Found user: {user.email}")
            
            # Verify token
            token_valid = default_token_generator.check_token(user, token)
            print(f"  Token valid: {token_valid}")
            
            if not token_valid:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid or expired reset link'
                }, status=400)
            
            # Set new password
            user.set_password(new_password)
            user.save()
            
            # Delete all existing tokens (force re-login)
            Token.objects.filter(user=user).delete()
            
            return JsonResponse({
                'success': True,
                'message': 'Password reset successful. Please login with your new password.'
            })
            
        except (CustomUser.DoesNotExist, ValueError, TypeError) as e:
            print(f"  Error during decode/lookup: {type(e).__name__}: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': 'Invalid reset link'
            }, status=400)
        
    except json.JSONDecodeError as e:
        print(f"  JSON decode error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON format'
        }, status=400)
    
    except Exception as e:
        print(f"  Unexpected error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': f'Password reset failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET"])
def verify_token(request):
    """
    Verify if a token is valid and return user info.
    
    Headers:
    - Authorization: Token <token_key>
    """
    try:
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Token '):
            return JsonResponse({
                'success': False,
                'error': 'Invalid authorization header'
            }, status=401)
        
        token_key = auth_header.split(' ')[1]
        
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
            
            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'phone_number': user.phone_number  # ADD THIS
                }
            })
        except Token.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Invalid token'
            }, status=401)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Token verification failed: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def user_profile(request):
    """
    Get or update user profile.
    
    GET: Returns current user profile
    PUT: Updates user profile (first_name, email, password, phone_number)
    DELETE: Permanently deletes user account and associated auth tokens
    
    Headers:
    - Authorization: Token <token_key>
    """
    try:
        # Verify authentication
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
        except Token.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Invalid token'
            }, status=401)
        
        # GET: Return user profile
        if request.method == 'GET':
            return JsonResponse({
                'success': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'phone_number': user.phone_number  # ADD THIS
                }
            })
        
        # PUT: Update user profile
        if request.method == 'PUT':
            data = json.loads(request.body)
            
            first_name = data.get('first_name', '').strip()
            email = data.get('email', '').strip().lower()
            current_password = data.get('current_password', '')
            new_password = data.get('new_password', '')
            phone_number = data.get('phone_number', '').strip()  # ADD THIS
            
            # Validate first name
            if first_name and len(first_name) < 1:
                return JsonResponse({
                    'success': False,
                    'error': 'First name cannot be empty'
                }, status=400)
            
            # Update first name if provided
            if first_name:
                user.first_name = first_name
            
            # Update email if provided and different
            if email and email != user.email:
                # Check if email already exists
                if CustomUser.objects.filter(email=email).exclude(pk=user.pk).exists():
                    return JsonResponse({
                        'success': False,
                        'error': 'Email already in use'
                    }, status=400)
                user.email = email
            
            # Update phone number if provided
            if phone_number:
                if len(phone_number) < 10:
                    return JsonResponse({
                        'success': False,
                        'error': 'Please enter a valid phone number'
                    }, status=400)
                user.phone_number = phone_number  # ADD THIS
            
            # Update password if provided
            if new_password:
                # Require current password for password change
                if not current_password:
                    return JsonResponse({
                        'success': False,
                        'error': 'Current password is required to change password'
                    }, status=400)
                
                # Verify current password
                if not user.check_password(current_password):
                    return JsonResponse({
                        'success': False,
                        'error': 'Current password is incorrect'
                    }, status=400)
                
                # Validate new password
                if len(new_password) < 8:
                    return JsonResponse({
                        'success': False,
                        'error': 'New password must be at least 8 characters long'
                    }, status=400)
                
                # Set new password
                user.set_password(new_password)
            
            # Save user
            user.save()
            
            return JsonResponse({
                'success': True,
                'message': 'Profile updated successfully',
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'phone_number': user.phone_number  # ADD THIS
                }
            })

        # DELETE: Delete user account permanently
        if request.method == 'DELETE':
            data = json.loads(request.body) if request.body else {}
            current_password = data.get('current_password', '')

            if not current_password:
                return JsonResponse({
                    'success': False,
                    'error': 'Current password is required to delete account'
                }, status=400)

            if not user.check_password(current_password):
                return JsonResponse({
                    'success': False,
                    'error': 'Current password is incorrect'
                }, status=400)

            Token.objects.filter(user=user).delete()
            user.delete()

            return JsonResponse({
                'success': True,
                'message': 'Account deleted successfully'
            })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON format'
        }, status=400)
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Profile update failed: {str(e)}'
        }, status=500)
    