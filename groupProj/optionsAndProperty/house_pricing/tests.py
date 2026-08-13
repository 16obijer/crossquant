from django.test import TestCase
from django.urls import reverse
from .models import PostcodeDistrictData
from .utils import get_predicted_price, get_price_trend
# Create your tests here.
#View tests
class PostcodeDistrictViewTests(TestCase):
    def setUp(self):
        #Create test data
        PostcodeDistrictData.objects.create(
            postcode_district='CT1',
            price_2021=296684.987357775,
            price_2022=283082.195273632,
            price_2023=280616.274509804,
            price_2024_predicted=276382.452416062,
            change_2021_2022=-4.58,
            change_2022_2023=-0.87,
            change_2023_2024_predicted=-1.51,
        )


        self.url_postcode_district_lookup = reverse('postcode_district_lookup')
        self.url_all_postcode_district = reverse('all_postcodes')

    def test_valid_postcodes_returns_predictions(self):
        #Request (call the view)
        response = self.client.get(self.url_postcode_district_lookup, data={'postcode_district':'CT1'})
        #Assertion 
        self.assertEqual(response.status_code,200)

        #convert response to dictionary 
        response_data = response.json()
        #Check if it outputs predicted_price and trend
        self.assertIn('predicted_price',response_data)
        self.assertIn('trend',response_data)
    


    def test_missing_postcode(self):
        #Request (call the view)
        response = self.client.get(self.url_postcode_district_lookup, data={'postcode_district':' '})
        #Assertion 
        self.assertEqual(response.status_code,400)

    
    def test_postcode_with_whiteSpace(self):
        #Request (call the view)
        response = self.client.get(self.url_postcode_district_lookup, data={'postcode_district':' CT1 '})
        #Assertion 
        self.assertEqual(response.status_code,200)

#Utils Tests
class PostCodeDistrictUtilsTest(TestCase):
    def setUp(self):
        #Create test data
        PostcodeDistrictData.objects.create(
            postcode_district='CT1',
            price_2021=296684.987357775,
            price_2022=283082.195273632,
            price_2023=280616.274509804,
            price_2024_predicted=276382.452416062,
            change_2021_2022=-4.58,
            change_2022_2023=-0.87,
            change_2023_2024_predicted=-1.51,
        )
        
    def test_empty_input(self):
        #Request 
        emptyPostcode = get_predicted_price(" ")
        #Assertion 
        self.assertIsNone(emptyPostcode)
    
    def test_valid_input(self):
        postcodeDistrict = get_predicted_price('CT1')
        #Assertion 
        self.assertIsNotNone(postcodeDistrict)
        self.assertIsInstance(postcodeDistrict,float)
        
    def test_invalid_input(self):
        #Request 
        invalidPostcode = get_predicted_price("XYZ")
        invalidPostcode_price_trend = get_price_trend("XYZ")
        #Assertion 
        self.assertIsNone(invalidPostcode)
        self.assertIsNone(invalidPostcode_price_trend)

    def test_white_space(self):
         #Request 
        result = get_price_trend(" CT1 ")
        self.assertIsNotNone(result)
        #Check structure of result
        self.assertIn('postcode_district',result)
        self.assertIn('prices',result)
        self.assertIn('changes',result)
        #Assertion 
        self.assertEqual(result['postcode_district'],"CT1")

    def test_postcode_case_insensitive(self):
         #Request 
        result = get_price_trend("cT1")
        self.assertIsNotNone(result)
        #Assertion 
        self.assertEqual(result['postcode_district'],"CT1")

#Model retrieval tests
class PostcodeDistrictModelTest(TestCase):
    def setUp(self):
         #Create test data
        PostcodeDistrictData.objects.create(
            postcode_district='CT1',
            price_2021=296684.987357775,
            price_2022=283082.195273632,
            price_2023=280616.274509804,
            price_2024_predicted=276382.452416062,
            change_2021_2022=-4.58,
            change_2022_2023=-0.87,
            change_2023_2024_predicted=-1.51,
        )
    def test_object_exists(self):
        #Retrive object from DB
        response = PostcodeDistrictData.objects.get(postcode_district = 'CT1')
        #Check if it retrieved something 
        self.assertIsNotNone(response)
        #Check if it returned some key fields
        self.assertEqual(response.postcode_district, 'CT1')
        self.assertAlmostEqual(response.price_2021,296684.987357775 )
        self.assertAlmostEqual(response.price_2024_predicted,276382.452416062 )
        self.assertEqual(response.change_2021_2022,-4.58)
    
    def test_str(self):
        response = PostcodeDistrictData.objects.get(postcode_district='CT1')
        self.assertEqual(str(response),'CT1')