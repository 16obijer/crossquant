import json
from unittest.mock import patch

import numpy as np
from django.test import TestCase

from .views import black_76


class OptionPricingApiTests(TestCase):
	"""Behavioral tests for the option pricing API endpoint."""

	endpoint = "/api/options/predict-option-price/"

	def valid_payload(self):
		"""Return a canonical valid request body used by most endpoint tests."""

		return {
			"S": 18000,
			"K": 18500,
			"T": 30,
			"sigma": 20,
			"option_type": 1,
		}

	@patch("options_pricing.views.black_76", return_value=124.0849)
	@patch("options_pricing.views.model.predict", return_value=np.array([4.770999]))
	def test_success_response_contains_expected_fields(self, mock_predict, _mock_black_76):
		"""A valid request should succeed and include both pricing outputs."""

		response = self.client.post(
			self.endpoint,
			data=json.dumps(self.valid_payload()),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		body = response.json()

		self.assertTrue(body["success"])
		self.assertIn("ml_price", body)
		self.assertIn("black76_price", body)
		self.assertIn("price", body)
		self.assertIsInstance(body["ml_price"], float)
		self.assertIsInstance(body["black76_price"], float)
		self.assertEqual(body["price"], body["ml_price"])
		self.assertTrue(mock_predict.called)

	def test_invalid_json_returns_400(self):
		"""Malformed JSON should be rejected with a 400 response."""

		response = self.client.post(
			self.endpoint,
			data="{bad json",
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)
		body = response.json()
		self.assertFalse(body["success"])
		self.assertIn("Invalid JSON format", body["error"])

	def test_missing_required_parameter_returns_400(self):
		"""Missing required fields should produce a descriptive validation error."""

		payload = self.valid_payload()
		payload.pop("sigma")

		response = self.client.post(
			self.endpoint,
			data=json.dumps(payload),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)
		body = response.json()
		self.assertFalse(body["success"])
		self.assertIn("Missing required parameters", body["error"])
		self.assertIn("sigma", body["error"])

	def test_non_numeric_parameter_returns_400(self):
		"""Non-numeric values in numeric fields should fail parsing/validation."""

		payload = self.valid_payload()
		payload["S"] = "abc"

		response = self.client.post(
			self.endpoint,
			data=json.dumps(payload),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 400)
		body = response.json()
		self.assertFalse(body["success"])
		self.assertIn("Invalid parameter value", body["error"])

	def test_validation_boundaries_return_400(self):
		"""Domain boundary violations should map to clear 400 errors."""

		test_cases = [
			("S", 0, "Futures Price must be positive"),
			("K", -1, "Strike Price must be positive"),
			("T", 0, "Days to expiration must be positive"),
			("T", 1826, "Days to expiration too large"),
			("sigma", 0, "Volatility must be positive"),
			("sigma", 201, "Volatility too high"),
			("option_type", 2, "Option type must be 0"),
		]

		for field, value, expected_error in test_cases:
			payload = self.valid_payload()
			payload[field] = value

			response = self.client.post(
				self.endpoint,
				data=json.dumps(payload),
				content_type="application/json",
			)

			self.assertEqual(response.status_code, 400)
			body = response.json()
			self.assertFalse(body["success"])
			self.assertIn(expected_error, body["error"])

	@patch("options_pricing.views.black_76", return_value=10.0)
	@patch("options_pricing.views.model.predict", return_value=np.array([4.2]))
	def test_option_type_mapping_in_inputs(self, _mock_predict, _mock_black_76):
		"""Response metadata should translate 1/0 option_type into Call/Put labels."""

		payload = self.valid_payload()
		payload["option_type"] = 1
		call_response = self.client.post(
			self.endpoint,
			data=json.dumps(payload),
			content_type="application/json",
		)
		self.assertEqual(call_response.status_code, 200)
		self.assertEqual(call_response.json()["inputs"]["option_type"], "Call")

		payload["option_type"] = 0
		put_response = self.client.post(
			self.endpoint,
			data=json.dumps(payload),
			content_type="application/json",
		)
		self.assertEqual(put_response.status_code, 200)
		self.assertEqual(put_response.json()["inputs"]["option_type"], "Put")

	@patch("options_pricing.views.black_76", return_value=12.34567)
	@patch("options_pricing.views.model.predict", return_value=np.array([np.log1p(98.76543)]))
	def test_prices_are_rounded_to_two_decimals(self, _mock_predict, _mock_black_76):
		"""API should round returned ML and Black-76 prices to two decimals."""

		response = self.client.post(
			self.endpoint,
			data=json.dumps(self.valid_payload()),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)
		body = response.json()
		self.assertEqual(body["ml_price"], 98.77)
		self.assertEqual(body["black76_price"], 12.35)

	@patch("options_pricing.views.black_76", return_value=11.0)
	@patch("options_pricing.views.model.predict", return_value=np.array([np.log1p(100.0)]))
	def test_preprocessing_sent_to_model(self, mock_predict, _mock_black_76):
		"""Ensure request values are transformed correctly before model inference."""

		payload = {
			"S": 20000,
			"K": 19000,
			"T": 365,
			"sigma": 25,
			"option_type": 0,
		}

		response = self.client.post(
			self.endpoint,
			data=json.dumps(payload),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 200)

		input_df = mock_predict.call_args[0][0]
		self.assertEqual(
			list(input_df.columns),
			["S", "K", "T", "r", "sigma", "is_call", "moneyness"],
		)
		self.assertAlmostEqual(input_df.iloc[0]["S"], 20000.0)
		self.assertAlmostEqual(input_df.iloc[0]["K"], 19000.0)
		self.assertAlmostEqual(input_df.iloc[0]["T"], 1.0)
		self.assertAlmostEqual(input_df.iloc[0]["r"], 0.045)
		self.assertAlmostEqual(input_df.iloc[0]["sigma"], 0.25)
		self.assertEqual(int(input_df.iloc[0]["is_call"]), 0)
		self.assertAlmostEqual(input_df.iloc[0]["moneyness"], 20000.0 / 19000.0)

	@patch("options_pricing.views.model.predict", side_effect=Exception("boom"))
	def test_unexpected_exception_returns_500(self, _mock_predict):
		"""Unexpected model/runtime failures should return a controlled 500 response."""

		response = self.client.post(
			self.endpoint,
			data=json.dumps(self.valid_payload()),
			content_type="application/json",
		)

		self.assertEqual(response.status_code, 500)
		body = response.json()
		self.assertFalse(body["success"])
		self.assertIn("Server error during prediction", body["error"])


class Black76UnitTests(TestCase):
	"""Numerical sanity checks for the Black-76 helper function."""

	def test_black_76_non_negative_prices(self):
		"""Call and put option values should never be negative."""

		call_price = black_76(F=100, K=100, T=1, r=0.05, sigma=0.2, is_call=1)
		put_price = black_76(F=100, K=100, T=1, r=0.05, sigma=0.2, is_call=0)

		self.assertGreaterEqual(call_price, 0)
		self.assertGreaterEqual(put_price, 0)

	def test_black_76_put_call_parity_for_futures(self):
		"""Black-76 prices should satisfy futures put-call parity."""

		F = 105
		K = 100
		T = 0.5
		r = 0.04
		sigma = 0.3

		call_price = black_76(F=F, K=K, T=T, r=r, sigma=sigma, is_call=1)
		put_price = black_76(F=F, K=K, T=T, r=r, sigma=sigma, is_call=0)
		discounted_forward_minus_strike = np.exp(-r * T) * (F - K)

		self.assertAlmostEqual(
			call_price - put_price,
			discounted_forward_minus_strike,
			places=6,
		)
