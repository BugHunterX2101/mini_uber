import requests
import time

# Register a test user
print("1. Registering test user...")
user_response = requests.post("http://localhost:8000/register-user", params={
    "name": "Test User",
    "email": "test@example.com"
})
user_data = user_response.json()
user_id = user_data.get("user_id")
print(f"   User ID: {user_id}")

# Register a test driver
print("\n2. Registering test driver...")
driver_response = requests.post("http://localhost:8000/register-driver", params={
    "name": "Test Driver",
    "email": "driver@example.com",
    "location": "Delhi"
})
driver_data = driver_response.json()
driver_id = driver_data.get("driver_id")
print(f"   Driver ID: {driver_id}")

# Set driver online
print("\n3. Setting driver online...")
requests.post(f"http://localhost:8000/go-online?driver_id={driver_id}")
time.sleep(1)

# Book a ride
print("\n4. Booking ride...")
ride_response = requests.post("http://localhost:8000/book-ride", json={
    "user_id": user_id,
    "start": "Connaught Place",
    "destination": "India Gate"
})
ride_data = ride_response.json()
print(f"   Ride Response: {ride_data}")

ride_port = ride_data.get("ride_port")
print(f"\n5. Ride URL: http://localhost:{ride_port}")

# Test the ride-by-port endpoint
time.sleep(2)
print(f"\n6. Testing ride-by-port endpoint...")
port_response = requests.get(f"http://localhost:8000/ride-by-port/{ride_port}")
print(f"   Response: {port_response.json()}")

# Check if container is running
import subprocess
print(f"\n7. Checking container status...")
result = subprocess.run(["docker", "ps", "--filter", f"name=ride-"], capture_output=True, text=True)
print(result.stdout)

print(f"\n✅ Open http://localhost:{ride_port} in your browser")
