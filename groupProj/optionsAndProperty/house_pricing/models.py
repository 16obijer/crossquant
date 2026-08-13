from django.db import models
from django.contrib.auth import get_user_model

# Create your models here.
class PostcodeDistrictData(models.Model):
    postcode_district = models.CharField(max_length=10, unique=True)
    price_2021 = models.FloatField(null=True)
    price_2022 = models.FloatField(null=True)
    price_2023 = models.FloatField(null=True)
    price_2024_predicted = models.FloatField(null=True)
    change_2021_2022 = models.FloatField(null=True)
    change_2022_2023 = models.FloatField(null=True)
    change_2023_2024_predicted = models.FloatField(null=True)

    def __str__(self):
        return self.postcode_district


class UserRecentPostcodes(models.Model):
    """Stores the 3 most recent postcode searches per user"""
    user = models.OneToOneField(get_user_model(), on_delete=models.CASCADE, related_name='recent_postcodes')
    postcode_1 = models.CharField(max_length=10, blank=True, null=True, help_text="Most recent postcode")
    postcode_2 = models.CharField(max_length=10, blank=True, null=True, help_text="Second most recent postcode")
    postcode_3 = models.CharField(max_length=10, blank=True, null=True, help_text="Third most recent postcode")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - Recent postcodes"

    def update_postcodes(self, new_postcodes):
        """
        Update the recent postcodes list with new postcodes (list of up to 5 postcodes).
        Keeps the 3 most recent, avoiding duplicates.
        """
        # Flatten and deduplicate new postcodes, keeping order
        unique_new = []
        seen = set()
        for pc in new_postcodes:
            if pc and pc.upper() not in seen:
                unique_new.append(pc.upper())
                seen.add(pc.upper())

        # Build the new list: unique new postcodes first, then existing ones (avoiding dupes)
        all_postcodes = unique_new.copy()
        for existing in [self.postcode_1, self.postcode_2, self.postcode_3]:
            if existing and existing not in seen:
                all_postcodes.append(existing)
                seen.add(existing)

        # Keep only the 3 most recent
        self.postcode_1 = all_postcodes[0] if len(all_postcodes) > 0 else None
        self.postcode_2 = all_postcodes[1] if len(all_postcodes) > 1 else None
        self.postcode_3 = all_postcodes[2] if len(all_postcodes) > 2 else None
        self.save()
    
    