import requests
import sys
import json
from datetime import datetime, timedelta

class DateRangeAPITester:
    def __init__(self, base_url="https://sync-trips.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.trip_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_register_and_login(self):
        """Register a new user and login"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "name": f"DateRange Tester {timestamp}",
            "email": f"daterange{timestamp}@test.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response.get('id')
            print(f"   Registered and logged in: {user_data['email']}")
            return True
        return False

    def test_create_trip(self):
        """Create a test trip"""
        trip_data = {
            "name": "Date Range Test Trip",
            "trip_type": "weekend",
            "description": "Testing date range picker",
            "group_size": 2,
            "per_person_budget": 500,
            "currency": "EUR",
            "flexible_dates": True
        }
        
        success, response = self.run_test(
            "Trip Creation",
            "POST",
            "trips",
            200,
            data=trip_data
        )
        
        if success and 'id' in response:
            self.trip_id = response['id']
            print(f"   Created trip ID: {self.trip_id}")
            return True
        return False

    def test_submit_date_ranges(self):
        """Test submitting preferences with date_ranges field"""
        if not self.trip_id:
            return False
            
        # Create test date ranges
        today = datetime.now()
        range1 = {
            "start": (today + timedelta(days=30)).strftime('%Y-%m-%d'),
            "end": (today + timedelta(days=33)).strftime('%Y-%m-%d')
        }
        range2 = {
            "start": (today + timedelta(days=50)).strftime('%Y-%m-%d'),
            "end": (today + timedelta(days=53)).strftime('%Y-%m-%d')
        }
        
        preferences = {
            "departure_city": "Paris CDG",
            "same_return_city": True,
            "flexible_dates": True,
            "duration_days": 4,
            "max_budget": 600,
            "transport_types": ["plane"],
            "destination_types": ["city"],
            "date_ranges": [range1, range2]
        }
        
        success, response = self.run_test(
            "Submit Date Ranges",
            "POST",
            f"trips/{self.trip_id}/preferences",
            200,
            data=preferences
        )
        
        if success:
            print(f"   Submitted ranges: {range1['start']}→{range1['end']}, {range2['start']}→{range2['end']}")
            return True
        return False

    def test_get_preferences(self):
        """Test retrieving preferences with date ranges"""
        if not self.trip_id:
            return False
            
        success, response = self.run_test(
            "Get My Preferences",
            "GET",
            f"trips/{self.trip_id}/my-preferences",
            200
        )
        
        if success and isinstance(response, dict):
            date_ranges = response.get('date_ranges', [])
            print(f"   Retrieved {len(date_ranges)} date ranges")
            for i, dr in enumerate(date_ranges):
                print(f"   Range {i+1}: {dr.get('start')} → {dr.get('end')}")
            return len(date_ranges) > 0
        return False

    def test_availability_heatmap(self):
        """Test availability heatmap with most_probable_ranges"""
        if not self.trip_id:
            return False
            
        success, response = self.run_test(
            "Availability Heatmap",
            "GET",
            f"trips/{self.trip_id}/availability-heatmap",
            200
        )
        
        if success and isinstance(response, dict):
            # Check for required fields
            required_fields = ['heatmap', 'participant_grid', 'most_probable_ranges']
            missing = [f for f in required_fields if f not in response]
            
            if missing:
                print(f"   ❌ Missing fields: {missing}")
                return False
                
            most_probable = response.get('most_probable_ranges', [])
            participant_grid = response.get('participant_grid', [])
            
            print(f"   Found {len(most_probable)} most probable ranges")
            print(f"   Found {len(participant_grid)} participants")
            
            # Check if participant has ranges
            for p in participant_grid:
                ranges = p.get('ranges', [])
                if ranges:
                    print(f"   Participant '{p.get('name')}' has {len(ranges)} ranges")
            
            return True
        return False

def main():
    print("🚀 Testing TripSync Date Range Picker API")
    print("=" * 50)
    
    tester = DateRangeAPITester()
    
    # Test sequence
    tests = [
        tester.test_register_and_login,
        tester.test_create_trip,
        tester.test_submit_date_ranges,
        tester.test_get_preferences,
        tester.test_availability_heatmap
    ]
    
    for test_func in tests:
        if not test_func():
            print(f"\n❌ Test failed - stopping sequence")
            break
    
    # Results
    print("\n" + "=" * 50)
    print(f"📊 Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All date range API tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())