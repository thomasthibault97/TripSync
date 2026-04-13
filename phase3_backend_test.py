#!/usr/bin/env python3
"""
TripSync Phase 3 Backend API Testing Suite
Tests Phase 3 specific features: Smart Weekend Finder, Weather API, Notifications, Receipt
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class Phase3APITester:
    def __init__(self, base_url: str = "https://harmony-travel.preview.emergentagent.com"):
        self.base_url = base_url
        self.access_token = None
        self.test_trip_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log(self, message: str):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None, 
                 auth_required: bool = True) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.access_token:
            test_headers['Authorization'] = f'Bearer {self.access_token}'
        if headers:
            test_headers.update(headers)
            
        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "endpoint": endpoint,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })
                try:
                    return False, response.json()
                except:
                    return False, {"error": response.text}
                    
        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "endpoint": endpoint,
                "error": str(e)
            })
            return False, {"error": str(e)}

    def setup_auth_and_trip(self):
        """Setup authentication and create a test trip"""
        # Login as admin
        success, response = self.run_test(
            "Admin Login", "POST", "auth/login", 200,
            data={"email": "admin@tripsync.com", "password": "admin123"},
            auth_required=False
        )
        if success and "access_token" in response:
            self.access_token = response["access_token"]
            self.log("   Admin token acquired")
        else:
            return False
            
        # Create a test trip
        success, response = self.run_test(
            "Create Test Trip", "POST", "trips", 200,
            data={
                "name": "Thomas Bachelor Weekend",
                "trip_type": "evg",
                "description": "Phase 3 testing trip",
                "group_size": 6,
                "per_person_budget": 400,
                "currency": "EUR",
                "flexible_dates": True
            }
        )
        if success and "id" in response:
            self.test_trip_id = response["id"]
            self.log(f"   Test trip created with ID: {self.test_trip_id}")
            return True
        return False

    def test_weather_api_paris_jun(self):
        """Test weather API for Paris in June"""
        success, response = self.run_test(
            "Weather API - Paris June", "GET", "weather/paris/jun", 200, auth_required=False
        )
        if success:
            expected_fields = ["destination", "month", "temp", "rain", "sun", "label"]
            missing_fields = [f for f in expected_fields if f not in response]
            if missing_fields:
                self.log(f"   Warning: Missing fields: {missing_fields}")
            else:
                self.log(f"   Weather data: {response['temp']}°C, {response['label']}, {response['sun']} sun hours")
        return success, response

    def test_smart_weekends_api(self):
        """Test Smart Weekend Finder API"""
        if not self.test_trip_id:
            self.log("❌ Smart Weekends - No trip ID available")
            return False, {}
            
        success, response = self.run_test(
            "Smart Weekend Finder", "GET", f"trips/{self.test_trip_id}/smart-weekends", 200
        )
        if success:
            expected_fields = ["suggestions", "total_weekends", "common_dates_count"]
            missing_fields = [f for f in expected_fields if f not in response]
            if missing_fields:
                self.log(f"   Warning: Missing fields: {missing_fields}")
            else:
                suggestions = response.get("suggestions", [])
                self.log(f"   Found {len(suggestions)} weekend suggestions")
                if suggestions:
                    first_suggestion = suggestions[0]
                    required_suggestion_fields = ["weekend", "destination", "weather", "estimated_budget", "scores"]
                    missing_suggestion_fields = [f for f in required_suggestion_fields if f not in first_suggestion]
                    if missing_suggestion_fields:
                        self.log(f"   Warning: Missing suggestion fields: {missing_suggestion_fields}")
                    else:
                        self.log(f"   First suggestion: {first_suggestion['destination']['name']} - Score: {first_suggestion['scores']['overall']}")
        return success, response

    def test_notifications_unread_count(self):
        """Test notifications unread count API"""
        success, response = self.run_test(
            "Notifications Unread Count", "GET", "notifications/unread-count", 200
        )
        if success and "count" in response:
            self.log(f"   Unread notifications: {response['count']}")
        return success, response

    def test_notifications_list(self):
        """Test notifications list API"""
        success, response = self.run_test(
            "Notifications List", "GET", "notifications", 200
        )
        if success and isinstance(response, list):
            self.log(f"   Found {len(response)} notifications")
        return success, response

    def test_notifications_mark_read(self):
        """Test mark all notifications as read"""
        success, response = self.run_test(
            "Mark Notifications Read", "POST", "notifications/read", 200
        )
        if success and "message" in response:
            self.log(f"   Response: {response['message']}")
        return success, response

    def test_receipt_generation(self):
        """Test receipt generation (requires a payment session)"""
        # First create a payment session
        if not self.test_trip_id:
            self.log("❌ Receipt Generation - No trip ID available")
            return False, {}
            
        success, payment_response = self.run_test(
            "Create Payment for Receipt", "POST", "payments/create-checkout", 200,
            data={
                "trip_id": self.test_trip_id,
                "origin_url": "https://test.example.com"
            }
        )
        
        if not success or "session_id" not in payment_response:
            self.log("❌ Receipt Generation - Could not create payment session")
            return False, {}
            
        session_id = payment_response["session_id"]
        
        # Now try to get the receipt
        success, response = self.run_test(
            "Get Receipt", "GET", f"payments/receipt/{session_id}", 200
        )
        if success:
            expected_fields = ["receipt_id", "trip_name", "payer_name", "amount", "currency", "payment_status", "items"]
            missing_fields = [f for f in expected_fields if f not in response]
            if missing_fields:
                self.log(f"   Warning: Missing receipt fields: {missing_fields}")
            else:
                self.log(f"   Receipt generated: {response['receipt_id']} for {response['amount']} {response['currency']}")
        return success, response

    def test_pwa_manifest(self):
        """Test PWA manifest availability"""
        try:
            # Test manifest.json at root
            manifest_url = f"{self.base_url}/manifest.json"
            response = requests.get(manifest_url, timeout=10)
            
            self.tests_run += 1
            if response.status_code == 200:
                try:
                    manifest_data = response.json()
                    expected_fields = ["name", "short_name", "start_url", "display", "theme_color", "background_color", "icons"]
                    missing_fields = [f for f in expected_fields if f not in manifest_data]
                    
                    if missing_fields:
                        self.log(f"❌ PWA Manifest - Missing fields: {missing_fields}")
                        self.failed_tests.append({
                            "test": "PWA Manifest",
                            "endpoint": "/manifest.json",
                            "error": f"Missing fields: {missing_fields}"
                        })
                        return False, {}
                    else:
                        self.tests_passed += 1
                        self.log(f"✅ PWA Manifest - Valid manifest with name: {manifest_data['name']}")
                        return True, manifest_data
                        
                except json.JSONDecodeError:
                    self.log("❌ PWA Manifest - Invalid JSON format")
                    self.failed_tests.append({
                        "test": "PWA Manifest",
                        "endpoint": "/manifest.json",
                        "error": "Invalid JSON format"
                    })
                    return False, {}
            else:
                self.log(f"❌ PWA Manifest - Status: {response.status_code}")
                self.failed_tests.append({
                    "test": "PWA Manifest",
                    "endpoint": "/manifest.json",
                    "expected": 200,
                    "actual": response.status_code
                })
                return False, {}
                
        except Exception as e:
            self.log(f"❌ PWA Manifest - Error: {str(e)}")
            self.failed_tests.append({
                "test": "PWA Manifest",
                "endpoint": "/manifest.json",
                "error": str(e)
            })
            return False, {}

    def run_phase3_tests(self):
        """Run Phase 3 specific tests"""
        self.log("🚀 Starting TripSync Phase 3 API Test Suite")
        self.log(f"   Base URL: {self.base_url}")
        
        # Setup authentication and test trip
        if not self.setup_auth_and_trip():
            self.log("❌ Failed to setup authentication and test trip")
            return False
        
        # Phase 3 specific tests
        self.test_weather_api_paris_jun()
        self.test_smart_weekends_api()
        self.test_notifications_unread_count()
        self.test_notifications_list()
        self.test_notifications_mark_read()
        self.test_receipt_generation()
        self.test_pwa_manifest()
        
        # Results summary
        self.log("\n" + "="*60)
        self.log(f"📊 PHASE 3 TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            self.log(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for failure in self.failed_tests:
                error_msg = failure.get('error', f"Expected {failure.get('expected')}, got {failure.get('actual')}")
                self.log(f"   • {failure['test']}: {error_msg}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"\n🎯 Phase 3 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = Phase3APITester()
    
    try:
        success = tester.run_phase3_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test suite crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())