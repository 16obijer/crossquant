import pandas as pd
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from house_pricing.models import PostcodeDistrictData

class Command(BaseCommand):
    help = "Load postcode district pricing from CSV into SQLlite"

    def handle(self, *args, **kwargs):
        path = os.path.join(
            settings.BASE_DIR,
            'house_pricing',
            'data',
            'district_price_changes.csv'
        )
        df = pd.read_csv(path)

        created_count = 0
        updated_count = 0

        for _, row in df.iterrows():
            obj, created = PostcodeDistrictData.objects.update_or_create(
                postcode_district = row['postcode_district'],
                defaults = {
                    'price_2021': row.get('price_2021'),
                    'price_2022': row.get('price_2022'),
                    'price_2023': row.get('price_2023'),
                    'price_2024_predicted': row.get('price_2024_predicted'),
                    'change_2021_2022': row.get('change_2021_2022'),
                    'change_2022_2023': row.get('change_2022_2023'),
                    'change_2023_2024_predicted': row.get('change_2023_2024'),

                }

            )
            if created: 
                created_count +=1
            else:
                updated_count +=1
        self.stdout.write(self.style.SUCCESS(
            f'Done-{created_count} created, {updated_count} updated'
        ))
