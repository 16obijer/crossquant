from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
import json
from .utils import get_predicted_price, get_price_trend,get_all_postcode_districts
from .models import UserRecentPostcodes

User = get_user_model()


def authenticate_token(request):
    """Extract and authenticate user from token in Authorization header"""
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Token '):
        return None
    
    token_str = auth_header[6:]  # Remove 'Token ' prefix
    try:
        token = Token.objects.get(key=token_str)
        return token.user
    except Token.DoesNotExist:
        return None

@require_GET
def postcode_district_lookup(request):
    postcode_district = request.GET.get('postcode_district','').strip()

    if not postcode_district:
        return JsonResponse({'error':'postcode district parameter is required'},status=400)
    
    predicted_price = get_predicted_price(postcode_district)
    trend = get_price_trend(postcode_district)

    if predicted_price is None: 
        return JsonResponse({'error':f'No data found for district {postcode_district}'},status=404)
    
    return JsonResponse({
        'predicted_price': predicted_price,
        'trend':trend
    })


@require_POST
@csrf_exempt
def postcode_district_lookup_bulk(request):
    """Lookup multiple postcode districts in one call."""
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    postcode_districts = data.get('postcode_districts', [])
    if not isinstance(postcode_districts, list):
        return JsonResponse({'error': 'postcode_districts must be a list'}, status=400)

    cleaned = [str(code).strip().upper() for code in postcode_districts if str(code).strip()]
    if not cleaned:
        return JsonResponse({'error': 'postcode_districts is required'}, status=400)

    results = []
    errors = []

    for code in cleaned:
        predicted_price = get_predicted_price(code)
        trend = get_price_trend(code)

        if predicted_price is None:
            errors.append({'postcode_district': code, 'error': f'No data found for district {code}'})
            continue

        results.append({
            'postcode_district': code,
            'predicted_price': predicted_price,
            'trend': trend,
        })

    if not results:
        return JsonResponse({'error': 'No data found for provided postcode districts', 'errors': errors}, status=404)

    return JsonResponse({'results': results, 'errors': errors})



@require_GET
def all_postcodes(request):
    return JsonResponse({
        'postcode_district': get_all_postcode_districts(),
    })


@require_POST
@csrf_exempt
def save_recent_postcodes(request):
    """
    Save the most recent postcodes searched by the user.
    Expects JSON payload with 'postcodes' key containing a list of postcode strings.
    Stores the 3 most recent (de-duplicated, new ones first).
    """
    # Authenticate user from token
    user = authenticate_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        postcodes = data.get('postcodes', [])
        
        if not isinstance(postcodes, list):
            return JsonResponse({'error': 'postcodes must be a list'}, status=400)
        
        # Get or create the UserRecentPostcodes record
        user_postcodes, created = UserRecentPostcodes.objects.get_or_create(user=user)
        
        # Update with new postcodes
        user_postcodes.update_postcodes(postcodes)
        
        return JsonResponse({
            'success': True,
            'message': 'Recent postcodes saved',
            'recent_postcodes': {
                'postcode_1': user_postcodes.postcode_1,
                'postcode_2': user_postcodes.postcode_2,
                'postcode_3': user_postcodes.postcode_3,
            }
        })
    
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@require_GET
def get_recent_postcodes(request):
    """
    Retrieve the 3 most recent postcodes searched by the user.
    """
    # Authenticate user from token
    user = authenticate_token(request)
    if not user:
        return JsonResponse({'error': 'Unauthorized'}, status=401)
    
    try:
        user_postcodes, created = UserRecentPostcodes.objects.get_or_create(user=user)
        
        recent_postcodes = []
        for postcode in [user_postcodes.postcode_1, user_postcodes.postcode_2, user_postcodes.postcode_3]:
            if postcode:
                recent_postcodes.append(postcode)
        
        return JsonResponse({
            'success': True,
            'recent_postcodes': recent_postcodes,
            'updated_at': user_postcodes.updated_at.isoformat(),
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)