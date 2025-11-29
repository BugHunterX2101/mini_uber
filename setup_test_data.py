import requests
from datetime import datetime, timedelta

API_URL = "http://localhost:8000"

# 1. Create Merchant
print("Creating merchant...")
merchant_data = {
    "name": "Pizza Paradise",
    "email": "pizza@paradise.com",
    "business_type": "restaurant",
    "address": "Connaught Place, New Delhi",
    "latitude": 28.6315,
    "longitude": 77.2167,
    "phone": "+91 9876543210",
    "description": "Best Italian pizza in town with authentic wood-fired oven"
}

response = requests.post(f"{API_URL}/register-merchant", json=merchant_data)
result = response.json()
print(f"✅ Merchant created: {result}")
merchant_id = result.get("merchant_id")

# 2. Create 5 Coupons
coupons = [
    {
        "merchant_id": merchant_id,
        "code": "WELCOME20",
        "title": "20% Off on First Order",
        "description": "Get 20% discount on your first order at Pizza Paradise",
        "discount_type": "percentage",
        "discount_value": 20,
        "max_discount": 200,
        "min_purchase": 300,
        "radius_km": 5.0,
        "min_rides_required": 0,
        "min_fare_spent": 0,
        "usage_limit": 100,
        "valid_until": (datetime.now() + timedelta(days=365)).isoformat()
    },
    {
        "merchant_id": merchant_id,
        "code": "FLAT100",
        "title": "Flat ₹100 Off",
        "description": "Get flat ₹100 off on orders above ₹500",
        "discount_type": "flat",
        "discount_value": 100,
        "max_discount": None,
        "min_purchase": 500,
        "radius_km": 5.0,
        "min_rides_required": 1,
        "min_fare_spent": 100,
        "usage_limit": 50,
        "valid_until": (datetime.now() + timedelta(days=365)).isoformat()
    },
    {
        "merchant_id": merchant_id,
        "code": "VIP30",
        "title": "30% Off for Premium Customers",
        "description": "Exclusive 30% discount for customers with 5+ rides",
        "discount_type": "percentage",
        "discount_value": 30,
        "max_discount": 300,
        "min_purchase": 400,
        "radius_km": 5.0,
        "min_rides_required": 5,
        "min_fare_spent": 500,
        "usage_limit": 30,
        "valid_until": (datetime.now() + timedelta(days=365)).isoformat()
    },
    {
        "merchant_id": merchant_id,
        "code": "WEEKEND50",
        "title": "Weekend Special - ₹50 Off",
        "description": "Flat ₹50 off on weekend orders",
        "discount_type": "flat",
        "discount_value": 50,
        "max_discount": None,
        "min_purchase": 250,
        "radius_km": 5.0,
        "min_rides_required": 0,
        "min_fare_spent": 0,
        "usage_limit": 200,
        "valid_until": (datetime.now() + timedelta(days=365)).isoformat()
    },
    {
        "merchant_id": merchant_id,
        "code": "MEGA25",
        "title": "25% Off Mega Deal",
        "description": "Get 25% off on orders above ₹600",
        "discount_type": "percentage",
        "discount_value": 25,
        "max_discount": 250,
        "min_purchase": 600,
        "radius_km": 5.0,
        "min_rides_required": 2,
        "min_fare_spent": 200,
        "usage_limit": 75,
        "valid_until": (datetime.now() + timedelta(days=365)).isoformat()
    }
]

print("\nCreating 5 coupons...")
for i, coupon in enumerate(coupons, 1):
    response = requests.post(f"{API_URL}/create-merchant-coupon", json=coupon)
    print(f"✅ Coupon {i} created: {coupon['code']}")

print("\n" + "="*60)
print("🎉 SETUP COMPLETE!")
print("="*60)
print(f"\n📧 Merchant Login Email: pizza@paradise.com")
print(f"🏪 Merchant Name: Pizza Paradise")
print(f"🆔 Merchant ID: {merchant_id}")
print(f"📍 Location: Connaught Place, New Delhi (28.6315, 77.2167)")
print(f"\n🎟️ Coupons Created:")
for coupon in coupons:
    print(f"   - {coupon['code']}: {coupon['title']}")
print("\n💡 To test:")
print("   1. Login as merchant with email: pizza@paradise.com")
print("   2. Book a ride with destination near Connaught Place")
print("   3. After ride completes, you'll see merchant coupons!")
print("="*60)
