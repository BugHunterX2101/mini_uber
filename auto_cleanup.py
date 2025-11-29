"""
Optional Auto-Cleanup Script for Simulation Data
Deletes test data after 10 minutes of creation

USAGE:
  python auto_cleanup.py

WARNING: This will continuously monitor and delete test data.
Only run this if you want automatic cleanup enabled.
"""

import requests
import time
from datetime import datetime

API_URL = "http://localhost:8000"
CLEANUP_INTERVAL = 600  # 10 minutes in seconds

def cleanup_simulation_data():
    """Call the cleanup endpoint"""
    try:
        response = requests.post(f"{API_URL}/cleanup-simulation-data")
        result = response.json()
        
        if "error" in result:
            print(f"❌ Cleanup failed: {result['error']}")
        else:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"\n{'='*60}")
            print(f"🧹 Cleanup executed at {timestamp}")
            print(f"{'='*60}")
            print(f"👥 Users deleted: {result['deleted_users']}")
            print(f"🚗 Drivers deleted: {result['deleted_drivers']}")
            print(f"🚖 Rides deleted: {result['deleted_rides']}")
            print(f"{'='*60}\n")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")

def main():
    print("🤖 Auto-Cleanup Service Started")
    print(f"⏰ Cleanup interval: {CLEANUP_INTERVAL} seconds ({CLEANUP_INTERVAL//60} minutes)")
    print(f"🎯 Target: Users/Drivers with @test.com emails")
    print(f"⚠️  Press Ctrl+C to stop\n")
    
    try:
        while True:
            time.sleep(CLEANUP_INTERVAL)
            cleanup_simulation_data()
    except KeyboardInterrupt:
        print("\n\n🛑 Auto-Cleanup Service Stopped")

if __name__ == "__main__":
    main()
