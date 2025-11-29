# Test Merchant Setup Guide

## 🏪 Merchant Details

**Email:** `pizza@paradise.com`  
**Name:** Pizza Paradise  
**Type:** Restaurant  
**Location:** Connaught Place, New Delhi  
**Coordinates:** 28.6315, 77.2167  
**Phone:** +91 9876543210

## 🎟️ 5 Coupons Created

1. **WELCOME20** - 20% Off on First Order
   - Discount: 20% (max ₹200)
   - Min Purchase: ₹300
   - Radius: 5 km
   - Requirements: 0 rides, ₹0 spent
   - Usage Limit: 100

2. **FLAT100** - Flat ₹100 Off
   - Discount: ₹100 flat
   - Min Purchase: ₹500
   - Radius: 5 km
   - Requirements: 1 ride, ₹100 spent
   - Usage Limit: 50

3. **VIP30** - 30% Off for Premium Customers
   - Discount: 30% (max ₹300)
   - Min Purchase: ₹400
   - Radius: 5 km
   - Requirements: 5 rides, ₹500 spent
   - Usage Limit: 30

4. **WEEKEND50** - Weekend Special
   - Discount: ₹50 flat
   - Min Purchase: ₹250
   - Radius: 5 km
   - Requirements: 0 rides, ₹0 spent
   - Usage Limit: 200

5. **MEGA25** - 25% Off Mega Deal
   - Discount: 25% (max ₹250)
   - Min Purchase: ₹600
   - Radius: 5 km
   - Requirements: 2 rides, ₹200 spent
   - Usage Limit: 75

## 🚀 Setup Instructions

### Option 1: Using Python Script (Recommended)
```bash
cd c:\mini_uber
python setup_test_data.py
```

### Option 2: Manual Setup via Admin Dashboard
1. Login as Admin (password: admin123)
2. Go to "Merchants" tab
3. Register merchant with above details
4. Create 5 coupons using the forms

## 🧪 Testing Flow

### 1. Login as Merchant
- Email: `pizza@paradise.com`
- You'll see the merchant dashboard with 5 coupons

### 2. Book a Test Ride (as User)
- **Pickup:** Any location in Delhi
- **Destination:** Connaught Place, New Delhi (or nearby)
- **Important:** Destination must be within 5km of merchant location

### 3. Wait for Ride Completion
- Ride duration: 1 minute (60 seconds)
- After completion, you'll see a modal with merchant coupons

### 4. Save Coupon
- Click "Save Coupon" button
- This records redemption in database

### 5. Check Merchant Dashboard
- Go back to merchant dashboard
- **Overview Tab:** See total redemptions increase
- **Redemptions Tab:** See your redemption with timestamp
- **Analytics:** See updated metrics

## 📊 Simulator Features

### What the Simulator Does:

1. **Create Users** (1-100)
   - Generates unique users with timestamps
   - Email format: `user{timestamp}-{index}@test.com`
   - Measures creation rate (users/sec)

2. **Create Drivers** (1-100)
   - Distributes across 5 cities: Delhi, Mumbai, Bangalore, Pune, Hyderabad
   - Assigns GPS coordinates with random offset
   - Brings them online automatically
   - Measures deployment rate (drivers/sec)

3. **Simulate Concurrent Rides** (1-50)
   - Books multiple rides simultaneously
   - Tests driver matching algorithm
   - Measures throughput (rides/sec)
   - Shows scalability under load

### Scalability Metrics Shown:
- Total Rides
- Online Drivers
- Active Rides
- Total Revenue
- Creation/Booking rates

### How It Shows Scalability:
1. **Concurrent Processing:** Multiple rides booked at once
2. **Distributed Drivers:** Spread across multiple cities
3. **Real-time Matching:** Instant driver assignment
4. **Performance Metrics:** Shows requests/second
5. **Load Handling:** Can handle 50+ concurrent operations

## 🎯 Expected Results

After booking a ride to Connaught Place:
- ✅ Ride completes in 1 minute
- ✅ Modal shows 1-5 coupons (based on your ride history)
- ✅ WELCOME20 and WEEKEND50 always visible (no requirements)
- ✅ Other coupons visible if you meet requirements
- ✅ Merchant dashboard updates in real-time

## 🔧 Troubleshooting

**No coupons showing?**
- Check destination is within 5km of Connaught Place (28.6315, 77.2167)
- Ensure ride status is "completed"
- Refresh the page

**Merchant login not working?**
- Run setup script first: `python setup_test_data.py`
- Check merchant was created successfully

**Simulator not working?**
- Ensure backend is running on port 8000
- Check browser console for errors
- Try with smaller numbers first (5-10)
