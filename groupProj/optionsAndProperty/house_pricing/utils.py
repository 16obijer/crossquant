from .models import PostcodeDistrictData

#Return predicted price for a postcode district entered by user
def get_predicted_price(postcode_district: str):
    postcode_district = postcode_district.upper().strip()
    obj = PostcodeDistrictData.objects.filter(
        postcode_district = postcode_district
    ).first()

    if obj is None or obj.price_2024_predicted is None:
        return None
    return round(float(obj.price_2024_predicted),2)

def get_price_trend(postcode_district: str):
    postcode_district = postcode_district.upper().strip()
    obj = PostcodeDistrictData.objects.filter(
        postcode_district = postcode_district
    ).first()
    if not obj:
        return None
    return {
        'postcode_district':postcode_district,
        'prices':{
            '2021': round(obj.price_2021,2),
            '2022': round(obj.price_2022,2),
            '2023': round(obj.price_2023,2),
            '2024_predicted': round(obj.price_2024_predicted,2),

        },
        'changes':{
            '2021_2022': obj.change_2021_2022,
            '2022_2023': obj.change_2022_2023,
            '2023_2024_predicted': obj.change_2023_2024_predicted,

        }
    }

def get_all_postcode_districts():
    return list(
        PostcodeDistrictData.objects.values_list(
            'postcode_district',flat=True
        ).distinct()
    )
