import requests
import sys
from datetime import datetime

class TripSyncAPITester:
    def __init__(self, base_url="https://harmony-travel.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.trip_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_trips(self):
        """Get user's trips"""
        success, response = self.run_test(
            "Get User Trips",
            "GET",
            "trips",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            # Find the Thomas Bachelor Weekend trip
            for trip in response:
                if 'Thomas' in trip.get('name', '') or 'Bachelor' in trip.get('name', ''):
                    self.trip_id = trip.get('id')
                    print(f"   Found trip: {trip.get('name')} (ID: {self.trip_id})")
                    return True, trip
            # If no Thomas trip found, use the first trip
            self.trip_id = response[0].get('id')
            print(f"   Using first trip: {response[0].get('name')} (ID: {self.trip_id})")
            return True, response[0]
        return False, {}

    def test_get_trip_details(self):
        """Get specific trip details"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Trip Details",
            "GET",
            f"trips/{self.trip_id}",
            200
        )
        if success:
            participants = response.get('participants', [])
            print(f"   Trip: {response.get('name')}")
            print(f"   Participants: {len(participants)}")
            for p in participants:
                print(f"     - {p.get('name')} (prefs: {p.get('preferences_submitted', False)})")
        return success, response

    def test_get_polls(self):
        """Test getting polls for a trip"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Trip Polls",
            "GET",
            f"trips/{self.trip_id}/polls",
            200
        )
        if success:
            print(f"   Found {len(response)} polls")
            for poll in response:
                print(f"     - {poll.get('question')} (status: {poll.get('status')}, votes: {poll.get('total_votes', 0)})")
                for i, opt in enumerate(poll.get('options', [])):
                    print(f"       {i+1}. {opt.get('text')} ({len(opt.get('votes', []))} votes)")
        
        return success, response

    def test_create_poll(self):
        """Test creating a new poll"""
        if not self.trip_id:
            return False, {}
        
        poll_data = {
            "question": "Test Poll - Beach or Mountains?",
            "options": ["Beach", "Mountains", "Both"],
            "allow_multiple": False,
            "expires_in_hours": 24
        }
        
        success, response = self.run_test(
            "Create Poll",
            "POST",
            f"trips/{self.trip_id}/polls",
            200,
            data=poll_data
        )
        if success:
            poll_id = response.get('id')
            print(f"   Created poll: {response.get('question')} (ID: {poll_id})")
            print(f"   Options: {[opt.get('text') for opt in response.get('options', [])]}")
            return success, poll_id
        
        return success, None

    def test_vote_on_poll(self, poll_id):
        """Test voting on a poll"""
        if not self.trip_id or not poll_id:
            return False, {}
        
        vote_data = {
            "option_indices": [0]  # Vote for first option
        }
        
        success, response = self.run_test(
            "Vote on Poll",
            "POST",
            f"trips/{self.trip_id}/polls/{poll_id}/vote",
            200,
            data=vote_data
        )
        if success:
            print(f"   Vote submitted successfully")
            print(f"   Total votes now: {response.get('total_votes', 0)}")
        
        return success, response

    def test_close_poll(self, poll_id):
        """Test closing a poll"""
        if not self.trip_id or not poll_id:
            return False, {}
        
        success, response = self.run_test(
            "Close Poll",
            "POST",
            f"trips/{self.trip_id}/polls/{poll_id}/close",
            200
        )
        if success:
            print(f"   Poll closed successfully")
            print(f"   Winner: {response.get('winner', 'N/A')}")
        
        return success, response

    def test_notifications(self):
        """Test getting notifications"""
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "notifications",
            200
        )
        if success:
            print(f"   Found {len(response)} notifications")
            for notif in response[:3]:  # Show first 3
                print(f"     - {notif.get('title')}: {notif.get('message')[:50]}...")
        
        return success, response

    def test_unread_count(self):
        """Test getting unread notification count"""
        success, response = self.run_test(
            "Get Unread Count",
            "GET",
            "notifications/unread-count",
            200
        )
        if success:
            print(f"   Unread notifications: {response.get('count', 0)}")
        
        return success, response

    def test_get_preferences(self):
        """Get trip preferences"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Trip Preferences",
            "GET",
            f"trips/{self.trip_id}/preferences",
            200
        )
        if success:
            print(f"   Preferences submitted: {len(response)}")
            for pref in response:
                user_name = pref.get('user_name', 'Unknown')
                available_dates = pref.get('available_dates', [])
                print(f"     {user_name}: {len(available_dates)} available dates")
                if available_dates:
                    print(f"       Sample dates: {available_dates[:5]}")
        
        return success, response

def main():
    print("🚀 Starting TripSync Group Polling API Tests")
    print("=" * 60)
    
    # Setup
    tester = TripSyncAPITester()
    
    # Test login
    if not tester.test_login("admin@tripsync.com", "admin123"):
        print("❌ Login failed, stopping tests")
        return 1

    # Test get trips
    success, trip_data = tester.test_get_trips()
    if not success:
        print("❌ Failed to get trips, stopping tests")
        return 1

    # Test trip details
    success, trip_details = tester.test_get_trip_details()
    if not success:
        print("❌ Failed to get trip details")

    # Test existing polls
    success, polls_data = tester.test_get_polls()
    if not success:
        print("❌ Failed to get polls")

    # Test creating a new poll
    success, poll_id = tester.test_create_poll()
    if not success:
        print("❌ Failed to create poll")
        poll_id = None

    # Test voting on poll (if we created one)
    if poll_id:
        success, vote_data = tester.test_vote_on_poll(poll_id)
        if not success:
            print("❌ Failed to vote on poll")

        # Test closing poll
        success, close_data = tester.test_close_poll(poll_id)
        if not success:
            print("❌ Failed to close poll")

    # Test notifications
    success, notif_data = tester.test_notifications()
    if not success:
        print("❌ Failed to get notifications")

    # Test unread count
    success, unread_data = tester.test_unread_count()
    if not success:
        print("❌ Failed to get unread count")

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("⚠️  Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())