import requests
import sys

def test_sophie_login():
    """Test Sophie's login and notification count"""
    base_url = "https://harmony-travel.preview.emergentagent.com"
    
    print("🔍 Testing Sophie's login...")
    
    # Login as Sophie
    login_data = {"email": "sophie@test.com", "password": "test123456"}
    response = requests.post(f"{base_url}/api/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Sophie login failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return False
    
    print("✅ Sophie login successful")
    
    # Get token
    token = response.json().get('access_token')
    headers = {'Authorization': f'Bearer {token}'}
    
    # Check unread notifications
    notif_response = requests.get(f"{base_url}/api/notifications/unread-count", headers=headers)
    
    if notif_response.status_code != 200:
        print(f"❌ Failed to get Sophie's notifications: {notif_response.status_code}")
        return False
    
    unread_count = notif_response.json().get('count', 0)
    print(f"✅ Sophie has {unread_count} unread notifications")
    
    # Get actual notifications
    all_notifs = requests.get(f"{base_url}/api/notifications", headers=headers)
    if all_notifs.status_code == 200:
        notifications = all_notifs.json()
        print(f"   Total notifications: {len(notifications)}")
        for notif in notifications[:3]:
            print(f"     - {notif.get('title')}: {notif.get('message')[:50]}...")
    
    return unread_count > 0

if __name__ == "__main__":
    success = test_sophie_login()
    if success:
        print("🎉 Sophie can login and has notifications!")
        sys.exit(0)
    else:
        print("❌ Sophie test failed")
        sys.exit(1)