from django.urls import path 
from .views import postcode_district_lookup, postcode_district_lookup_bulk, all_postcodes, save_recent_postcodes, get_recent_postcodes

urlpatterns = [
    path("postcode_district_lookup/", postcode_district_lookup, name="postcode_district_lookup"),
    path("postcode_district_lookup_bulk/", postcode_district_lookup_bulk, name="postcode_district_lookup_bulk"),
    path("all_postcodes/", all_postcodes, name="all_postcodes"),
    path("save_recent_postcodes/", save_recent_postcodes, name="save_recent_postcodes"),
    path("get_recent_postcodes/", get_recent_postcodes, name="get_recent_postcodes"),
]