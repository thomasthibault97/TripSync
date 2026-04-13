#!/usr/bin/env python3
"""
TripSync Phase 4 Backend API Testing Suite
Tests new Phase 4 features: Templates, AI Chatbot, Deal Finder, Calendar Export
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class TripSyncPhase4Tester:
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
                response = requests.get(url, headers=test_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=15)
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
        self.log("🔧 Setting up authentication...")
        success, response = self.run_test(
            "Admin Login", "POST", "auth/login", 200,
            data={"email": "admin@tripsync.com", "password": "admin123"},
            auth_required=False
        )
        if success and "access_token" in response:
            self.access_token = response["access_token"]
            self.log("   Admin token acquired")
        else:
            self.log("❌ Failed to get admin token")
            return False
            
        # Create a test trip
        self.log("🔧 Creating test trip...")
        success, response = self.run_test(
            "Create Test Trip", "POST", "trips", 200,
            data={
                "name": "Thomas Bachelor Weekend",
                "trip_type": "evg",
                "description": "Testing Phase 4 features",
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
        else:
            self.log("❌ Failed to create test trip")
            return False

    def test_trip_templates(self):
        """Test Phase 4: Trip Templates API"""
        self.log("\n🎯 TESTING PHASE 4: TRIP TEMPLATES")
        
        # Test GET /api/templates
        success, response = self.run_test(
            "Get Trip Templates", "GET", "templates", 200, auth_required=False
        )
        
        if success:
            if isinstance(response, list) and len(response) >= 8:
                self.log(f"   ✅ Found {len(response)} templates (expected 8+)")
                
                # Check template structure
                template = response[0]
                required_fields = ["id", "name", "trip_type", "description", "group_size", 
                                 "per_person_budget", "currency", "destination_id", "image", 
                                 "suggested_activities", "tags", "popularity"]
                missing_fields = [f for f in required_fields if f not in template]
                if missing_fields:
                    self.log(f"   ⚠️  Template missing fields: {missing_fields}")
                else:
                    self.log(f"   ✅ Template structure complete")
                    self.log(f"   Sample template: {template['name']} ({template['trip_type']})")
                    
                # Test creating trip from template
                template_id = response[0]["id"]
                success2, response2 = self.run_test(
                    "Create Trip from Template", "POST", f"trips/from-template/{template_id}", 200
                )
                if success2 and "id" in response2:
                    self.log(f"   ✅ Trip created from template: {response2['name']}")
                    # Check if template fields were copied
                    if response2.get("template_id") == template_id:
                        self.log(f"   ✅ Template ID preserved in trip")
                    if response2.get("suggested_destination"):
                        self.log(f"   ✅ Suggested destination: {response2['suggested_destination']}")
                        
            else:
                self.log(f"   ❌ Expected 8+ templates, got {len(response) if isinstance(response, list) else 'invalid response'}")
                
        return success

    def test_ai_chatbot(self):
        """Test Phase 4: AI Chatbot API"""
        self.log("\n🎯 TESTING PHASE 4: AI CHATBOT")
        
        if not self.test_trip_id:
            self.log("❌ AI Chatbot - No trip ID available")
            return False
            
        # Test POST /api/chat
        success, response = self.run_test(
            "AI Chat Response", "POST", "chat", 200,
            data={
                "message": "What's the best destination for a bachelor weekend?",
                "trip_id": self.test_trip_id
            }
        )
        
        if success:
            if "response" in response and response["response"]:
                self.log(f"   ✅ AI response generated: {response['response'][:100]}...")
                if response.get("error"):
                    self.log(f"   ⚠️  AI response has error flag: {response.get('error')}")
                else:
                    self.log(f"   ✅ AI response successful")
            else:
                self.log(f"   ❌ No response content in AI chat")
                
        # Test chat history
        success2, response2 = self.run_test(
            "Get Chat History", "GET", f"chat/history?trip_id={self.test_trip_id}", 200
        )
        
        if success2 and isinstance(response2, list):
            self.log(f"   ✅ Chat history retrieved: {len(response2)} messages")
            if response2:
                msg = response2[-1]
                if "role" in msg and "content" in msg:
                    self.log(f"   ✅ Message structure valid: {msg['role']}")
                    
        return success and success2

    def test_deal_finder(self):
        """Test Phase 4: Deal Finder API"""
        self.log("\n🎯 TESTING PHASE 4: DEAL FINDER")
        
        if not self.test_trip_id:
            self.log("❌ Deal Finder - No trip ID available")
            return False
            
        # Test GET /api/trips/{id}/deals
        success, response = self.run_test(
            "Get Trip Deals", "GET", f"trips/{self.test_trip_id}/deals", 200
        )
        
        if success:
            if "deals" in response and isinstance(response["deals"], list):
                deals = response["deals"]
                self.log(f"   ✅ Found {len(deals)} deals")
                
                if deals:
                    deal = deals[0]
                    required_fields = ["destination", "current_price", "flight_price", 
                                     "hotel_price_night", "savings", "is_deal", "trend", 
                                     "pct_change", "currency", "deep_links"]
                    missing_fields = [f for f in required_fields if f not in deal]
                    if missing_fields:
                        self.log(f"   ⚠️  Deal missing fields: {missing_fields}")
                    else:
                        self.log(f"   ✅ Deal structure complete")
                        self.log(f"   Sample deal: {deal['destination']['name']} - {deal['current_price']} {deal['currency']}")
                        
                        # Check deep links
                        if "deep_links" in deal and all(k in deal["deep_links"] for k in ["flights", "hotels", "airbnb"]):
                            self.log(f"   ✅ Deep links present")
                        
                # Check budget target
                if "budget_target" in response:
                    self.log(f"   ✅ Budget target: {response['budget_target']} {response.get('currency', 'EUR')}")
                    
            else:
                self.log(f"   ❌ Invalid deals response structure")
                
        # Test deal alerts
        success2, response2 = self.run_test(
            "Create Deal Alert", "POST", "deal-alerts", 200,
            data={
                "trip_id": self.test_trip_id,
                "destination_id": "barcelona",
                "max_budget": 400,
                "currency": "EUR"
            }
        )
        
        if success2 and "id" in response2:
            alert_id = response2["id"]
            self.log(f"   ✅ Deal alert created: {alert_id}")
            
            # Test get alerts
            success3, response3 = self.run_test(
                "Get Deal Alerts", "GET", "deal-alerts", 200
            )
            
            if success3 and isinstance(response3, list):
                self.log(f"   ✅ Deal alerts retrieved: {len(response3)} alerts")
                
                # Test delete alert
                success4, response4 = self.run_test(
                    "Delete Deal Alert", "DELETE", f"deal-alerts/{alert_id}", 200
                )
                if success4:
                    self.log(f"   ✅ Deal alert deleted")
                    
        return success and success2

    def test_calendar_export(self):
        """Test Phase 4: Calendar Export API"""
        self.log("\n🎯 TESTING PHASE 4: CALENDAR EXPORT")
        
        if not self.test_trip_id:
            self.log("❌ Calendar Export - No trip ID available")
            return False
            
        # Test GET /api/trips/{id}/calendar-export
        success, response = self.run_test(
            "Get Calendar Export", "GET", f"trips/{self.test_trip_id}/calendar-export", 200
        )
        
        if success:
            required_fields = ["ics_content", "google_calendar_url", "trip_name", "destination"]
            missing_fields = [f for f in required_fields if f not in response]
            
            if missing_fields:
                self.log(f"   ⚠️  Calendar export missing fields: {missing_fields}")
            else:
                self.log(f"   ✅ Calendar export structure complete")
                
                # Check ICS content
                if response["ics_content"] and "BEGIN:VCALENDAR" in response["ics_content"]:
                    self.log(f"   ✅ Valid ICS content generated")
                else:
                    self.log(f"   ❌ Invalid ICS content")
                    
                # Check Google Calendar URL
                if response["google_calendar_url"] and "calendar.google.com" in response["google_calendar_url"]:
                    self.log(f"   ✅ Valid Google Calendar URL generated")
                else:
                    self.log(f"   ❌ Invalid Google Calendar URL")
                    
                self.log(f"   Trip: {response['trip_name']} -> {response['destination']}")
                
        return success

    def run_phase4_tests(self):
        """Run all Phase 4 tests"""
        self.log("🚀 Starting TripSync Phase 4 API Test Suite")
        self.log(f"   Base URL: {self.base_url}")
        
        # Setup
        if not self.setup_auth_and_trip():
            self.log("❌ Setup failed, aborting tests")
            return False
            
        # Run Phase 4 tests
        self.test_trip_templates()
        self.test_ai_chatbot()
        self.test_deal_finder()
        self.test_calendar_export()
        
        # Results summary
        self.log("\n" + "="*60)
        self.log(f"📊 PHASE 4 TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            self.log(f"\n❌ FAILED TESTS ({len(self.failed_tests)}):")
            for failure in self.failed_tests:
                error_msg = failure.get('error', f"Expected {failure.get('expected')}, got {failure.get('actual')}")
                self.log(f"   • {failure['test']}: {error_msg}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"\n🎯 Phase 4 Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = TripSyncPhase4Tester()
    
    try:
        success = tester.run_phase4_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Test suite crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())