import requests
import sys
from datetime import datetime

class TripSyncAPITester:
    def __init__(self, base_url="https://sync-trips.preview.emergentagent.com"):
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

    def test_readiness_score(self):
        """Test NEW readiness score feature in trip details"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Trip Readiness Score",
            "GET",
            f"trips/{self.trip_id}",
            200
        )
        if success:
            readiness = response.get('readiness')
            if not readiness:
                print(f"   ❌ FAILED: No 'readiness' field in response")
                return False, {}
            
            # Check required fields
            required_fields = ['score', 'checks', 'phase', 'next_action']
            missing_fields = [f for f in required_fields if f not in readiness]
            if missing_fields:
                print(f"   ❌ FAILED: Missing required fields: {missing_fields}")
                return False, {}
            
            print(f"   ✅ Readiness score: {readiness.get('score')}%")
            print(f"   ✅ Phase: {readiness.get('phase')}")
            print(f"   ✅ Next action: {readiness.get('next_action')}")
            
            # Check checks object
            checks = readiness.get('checks', {})
            print(f"   ✅ Checks:")
            for check_name, check_value in checks.items():
                print(f"      - {check_name}: {check_value}")
            
            # Check winning_destination (optional, can be null)
            winning_dest = readiness.get('winning_destination')
            if winning_dest:
                print(f"   ✅ Winning destination: {winning_dest.get('name', 'N/A')}")
            else:
                print(f"   ✅ Winning destination: None (no votes yet)")
            
            # Check counts
            print(f"   ✅ Prefs count: {readiness.get('prefs_count', 0)}")
            print(f"   ✅ Votes count: {readiness.get('votes_count', 0)}")
            print(f"   ✅ Budget items count: {readiness.get('budget_items_count', 0)}")
            
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

    def test_submit_preferences(self):
        """Submit preferences with date ranges for testing lock dates feature"""
        if not self.trip_id:
            return False, {}
        
        from datetime import datetime, timedelta
        today = datetime.now()
        start_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = (today + timedelta(days=35)).strftime("%Y-%m-%d")
        
        preferences_data = {
            "departure_city": "London",
            "return_city": "London",
            "same_return_city": True,
            "date_start": start_date,
            "date_end": end_date,
            "flexible_dates": True,
            "duration_days": 5,
            "max_budget": 800,
            "transport_types": ["plane"],
            "destination_types": ["city", "culture"],
            "weather_preference": "warm",
            "accommodation_type": "hotel",
            "travel_pace": "moderate",
            "hard_constraints": [],
            "nice_to_haves": ["good_food"],
            "passport_constraint": "none",
            "long_distance_ok": True,
            "departure_time_preference": "flexible",
            "return_time_preference": "flexible",
            "available_dates": [],
            "date_ranges": [{"start": start_date, "end": end_date}]
        }
        
        success, response = self.run_test(
            "Submit Preferences with Date Ranges",
            "POST",
            f"trips/{self.trip_id}/preferences",
            200,
            data=preferences_data
        )
        if success:
            print(f"   Preferences submitted successfully")
        
        return success, response

    def test_availability_heatmap(self):
        """Test availability heatmap endpoint"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Availability Heatmap",
            "GET",
            f"trips/{self.trip_id}/availability-heatmap",
            200
        )
        if success:
            heatmap = response.get('heatmap', {})
            locked_dates = response.get('locked_dates')
            is_owner = response.get('is_owner', False)
            guest_share_token = response.get('guest_share_token', '')
            
            print(f"   Heatmap dates: {len(heatmap)}")
            print(f"   Is owner: {is_owner}")
            print(f"   Locked dates: {locked_dates}")
            print(f"   Guest share token: {'Yes' if guest_share_token else 'No'}")
            
            # Store for later tests
            self.is_owner = is_owner
            self.guest_share_token = guest_share_token
        
        return success, response

    def test_lock_dates(self):
        """Test locking dates (owner only)"""
        if not self.trip_id:
            return False, {}
        
        from datetime import datetime, timedelta
        today = datetime.now()
        start_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        end_date = (today + timedelta(days=35)).strftime("%Y-%m-%d")
        
        lock_data = {
            "start": start_date,
            "end": end_date
        }
        
        success, response = self.run_test(
            "Lock Dates",
            "POST",
            f"trips/{self.trip_id}/lock-dates",
            200,
            data=lock_data
        )
        if success:
            locked_dates = response.get('locked_dates', {})
            print(f"   Dates locked: {locked_dates.get('start')} to {locked_dates.get('end')}")
            print(f"   Locked by: {locked_dates.get('locked_by')}")
        
        return success, response

    def test_unlock_dates(self):
        """Test unlocking dates (owner only)"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Unlock Dates",
            "POST",
            f"trips/{self.trip_id}/unlock-dates",
            200
        )
        if success:
            print(f"   Dates unlocked successfully")
        
        return success, response

    def test_create_guest_share_link(self):
        """Test creating guest share link"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Create Guest Share Link",
            "POST",
            f"trips/{self.trip_id}/guest-share-link",
            200
        )
        if success:
            token = response.get('token')
            trip_name = response.get('trip_name')
            print(f"   Share token created: {token}")
            print(f"   Trip name: {trip_name}")
            self.guest_token = token
        
        return success, response

    def test_get_guest_trip_info(self):
        """Test getting trip info via guest token (no auth)"""
        if not hasattr(self, 'guest_token') or not self.guest_token:
            return False, {}
        
        # Remove auth token for this test
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Get Guest Trip Info",
            "GET",
            f"trips/guest/{self.guest_token}",
            200
        )
        if success:
            print(f"   Trip name: {response.get('name')}")
            print(f"   Owner: {response.get('owner_name')}")
            print(f"   Participants: {response.get('participant_count')}")
            print(f"   Existing guest submissions: {len(response.get('guest_submissions', []))}")
        
        # Restore auth token
        self.token = temp_token
        return success, response

    def test_submit_guest_availability(self):
        """Test submitting guest availability (no auth)"""
        if not hasattr(self, 'guest_token') or not self.guest_token:
            return False, {}
        
        from datetime import datetime, timedelta
        today = datetime.now()
        start_date = (today + timedelta(days=25)).strftime("%Y-%m-%d")
        end_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")
        
        guest_data = {
            "name": "Test Guest User",
            "email": "guest@example.com",
            "date_ranges": [{"start": start_date, "end": end_date}]
        }
        
        # Remove auth token for this test
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Submit Guest Availability",
            "POST",
            f"trips/guest/{self.guest_token}/submit",
            200,
            data=guest_data
        )
        if success:
            print(f"   Guest availability submitted successfully")
        
        # Restore auth token
        self.token = temp_token
        return success, response

    def test_guest_check_existing(self):
        """Test checking if guest already submitted (for edit capability)"""
        if not hasattr(self, 'guest_token') or not self.guest_token:
            return False, {}
        
        # Remove auth token for this test
        temp_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Check Guest Existing Submission",
            "GET",
            f"trips/guest/{self.guest_token}/check/Test%20Guest%20User",
            200
        )
        if success:
            found = response.get('found', False)
            date_ranges = response.get('date_ranges', [])
            print(f"   Guest found: {found}")
            if found:
                print(f"   Existing date ranges: {len(date_ranges)}")
        
        # Restore auth token
        self.token = temp_token
        return success, response

    def test_slot_prices(self):
        """Test slot price comparison API"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Slot Prices",
            "GET",
            f"trips/{self.trip_id}/slot-prices",
            200
        )
        if success:
            comparisons = response.get('comparisons', [])
            print(f"   Found {len(comparisons)} destination comparisons")
            for comp in comparisons[:2]:  # Show first 2
                dest = comp.get('destination', {})
                slots = comp.get('slots', [])
                print(f"     - {dest.get('name')}: {len(slots)} time slots")
        
        return success, response

    def test_get_budget(self):
        """Test getting trip budget"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Trip Budget",
            "GET",
            f"trips/{self.trip_id}/budget",
            200
        )
        if success:
            summary = response.get('summary', {})
            items = response.get('items', [])
            print(f"   Budget items: {len(items)}")
            print(f"   Total per person: {summary.get('total_per_person')} {summary.get('currency')}")
            print(f"   Target per person: {summary.get('target_per_person')} {summary.get('currency')}")
            print(f"   Percentage used: {summary.get('pct_used')}%")
        
        return success, response

    def test_add_budget_item(self):
        """Test adding a budget item"""
        if not self.trip_id:
            return False, {}
        
        budget_item = {
            "category": "flight",
            "name": "Test flight expense",
            "amount": 150,
            "per_person": True,
            "notes": "Test flight from backend test"
        }
        
        success, response = self.run_test(
            "Add Budget Item",
            "POST",
            f"trips/{self.trip_id}/budget",
            200,
            data=budget_item
        )
        if success:
            print(f"   Budget item added: {response.get('name')}")
            print(f"   Amount: {response.get('amount')} {response.get('currency')}")
            self.test_budget_item_id = response.get('id')
        
        return success, response

    def test_get_budget_suggestions(self):
        """Test getting budget suggestions from destinations"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Budget Suggestions",
            "GET",
            f"trips/{self.trip_id}/budget/suggestions",
            200
        )
        if success:
            suggestions = response.get('suggestions', [])
            print(f"   Found {len(suggestions)} destination suggestions")
            for sugg in suggestions[:2]:  # Show first 2
                dest = sugg.get('destination')
                items = sugg.get('items', [])
                print(f"     - {dest}: {len(items)} suggested items")
        
        return success, response

    def test_delete_budget_item(self):
        """Test deleting a budget item"""
        if not self.trip_id or not hasattr(self, 'test_budget_item_id'):
            return False, {}
        
        success, response = self.run_test(
            "Delete Budget Item",
            "DELETE",
            f"trips/{self.trip_id}/budget/{self.test_budget_item_id}",
            200
        )
        if success:
            print(f"   Budget item deleted successfully")
        
        return success, response

    def test_flight_coordination(self):
        """Test flight coordination API"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Flight Coordination",
            "GET",
            f"trips/{self.trip_id}/flight-coordination",
            200
        )
        if success:
            coordination = response.get('coordination', [])
            message = response.get('message')
            if message:
                print(f"   Message: {message}")
            else:
                print(f"   Found {len(coordination)} destination flight coordinations")
        
        return success, response

    def test_email_log(self):
        """Test email log API (mock emails)"""
        success, response = self.run_test(
            "Get Email Log",
            "GET",
            "email-log",
            200
        )
        if success:
            emails = response.get('emails', [])
            print(f"   Found {len(emails)} mock emails")
            for email in emails[:3]:  # Show first 3
                print(f"     - To: {email.get('to')}, Subject: {email.get('subject')}")
        
        return success, response

    def test_availability_heatmap_with_auto_suggestion(self):
        """Test availability heatmap with auto-suggestion field"""
        if not self.trip_id:
            return False, {}
        
        success, response = self.run_test(
            "Get Availability Heatmap with Auto-suggestion",
            "GET",
            f"trips/{self.trip_id}/availability-heatmap",
            200
        )
        if success:
            auto_lock_suggestion = response.get('auto_lock_suggestion')
            print(f"   Auto-lock suggestion: {'Yes' if auto_lock_suggestion else 'No'}")
            if auto_lock_suggestion:
                print(f"     Message: {auto_lock_suggestion.get('message')}")
                print(f"     Date range: {auto_lock_suggestion.get('start')} to {auto_lock_suggestion.get('end')}")
        
        return success, response

def main():
    print("🚀 Starting TripSync New Features API Tests")
    print("=" * 60)
    
    # Setup
    tester = TripSyncAPITester()
    
    # Test login with alice_range@test.com as specified in review request
    if not tester.test_login("alice_range@test.com", "Test123456"):
        print("❌ Login failed with alice_range@test.com, trying admin login")
        if not tester.test_login("admin@tripsync.com", "admin123"):
            print("❌ Admin login also failed, stopping tests")
            return 1

    # Use the specific trip ID from review request
    tester.trip_id = "69dd58b0c6fe98204ff8ea9b"
    print(f"Using specified trip ID: {tester.trip_id}")

    # Test trip details
    success, trip_details = tester.test_get_trip_details()
    if not success:
        print("❌ Failed to get trip details")

    # Test NEW READINESS SCORE FEATURE
    print("\n🎯 Testing NEW Readiness Score Feature...")
    success, readiness_data = tester.test_readiness_score()
    if not success:
        print("❌ CRITICAL: Readiness score feature test failed")

    # Test NEW FEATURES from review request:

    # 1. Test Budget Tracker APIs
    print("\n📊 Testing Budget Tracker APIs...")
    success, budget_data = tester.test_get_budget()
    if not success:
        print("❌ Failed to get budget")

    success, budget_suggestions = tester.test_get_budget_suggestions()
    if not success:
        print("❌ Failed to get budget suggestions")

    success, budget_item = tester.test_add_budget_item()
    if not success:
        print("❌ Failed to add budget item")

    # Get budget again to verify item was added
    success, budget_after_add = tester.test_get_budget()
    if success:
        items_count = len(budget_after_add.get('items', []))
        print(f"✅ Budget now has {items_count} items")

    # Delete the test budget item
    success, delete_result = tester.test_delete_budget_item()
    if not success:
        print("❌ Failed to delete budget item")

    # 2. Test slot price comparison API
    print("\n💰 Testing Slot Price Comparison API...")
    success, slot_prices = tester.test_slot_prices()
    if not success:
        print("❌ Failed to get slot prices")

    # 3. Test flight coordination API
    print("\n✈️ Testing Flight Coordination API...")
    success, flight_coord = tester.test_flight_coordination()
    if not success:
        print("❌ Failed to get flight coordination")

    # 4. Test email log API (mock emails)
    success, email_log = tester.test_email_log()
    if not success:
        print("❌ Failed to get email log")

    # 3. Test availability heatmap with auto-suggestion
    success, heatmap_data = tester.test_availability_heatmap_with_auto_suggestion()
    if not success:
        print("❌ Failed to get availability heatmap with auto-suggestion")

    # 4. Test lock dates with mock email notification
    success, lock_data = tester.test_lock_dates()
    if not success:
        print("❌ Failed to lock dates")

    # Check if mock email was sent after locking dates
    success, email_log_after_lock = tester.test_email_log()
    if success:
        emails = email_log_after_lock.get('emails', [])
        lock_emails = [e for e in emails if 'lock' in e.get('subject', '').lower() or 'date' in e.get('subject', '').lower()]
        if lock_emails:
            print("✅ Mock email notification sent after locking dates")
        else:
            print("⚠️  No mock email found after locking dates")

    # 5. Test guest functionality with specific token from review request
    tester.guest_token = "1FKCbgUkdiu9cqepJvEF_g"
    
    # Test guest trip info (no auth)
    success, guest_info = tester.test_get_guest_trip_info()
    if not success:
        print("❌ Failed to get guest trip info")

    # Test guest check for edit capability
    success, guest_check = tester.test_guest_check_existing()
    if not success:
        print("❌ Failed to check guest existing submission")

    # Test guest availability submission (no auth)
    success, guest_submit = tester.test_submit_guest_availability()
    if not success:
        print("❌ Failed to submit guest availability")

    # Test heatmap again to see guest data and auto-suggestion
    success, heatmap_final = tester.test_availability_heatmap_with_auto_suggestion()
    if success:
        participant_grid = heatmap_final.get('participant_grid', [])
        guest_count = sum(1 for p in participant_grid if 'guest' in p.get('name', '').lower())
        print(f"✅ Guest data in heatmap: {guest_count} guest participants")

    # Test unlock dates
    success, unlock_data = tester.test_unlock_dates()
    if not success:
        print("❌ Failed to unlock dates")

    # Test notifications
    success, notif_data = tester.test_notifications()
    if not success:
        print("❌ Failed to get notifications")

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