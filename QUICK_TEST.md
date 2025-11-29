# Quick Test - Ride Request System

## 🚀 Start Testing in 3 Minutes

### Step 1: Open 3 Browser Tabs (2 minutes)

**Tab 1 - Driver 1**:
1. Go to http://localhost:5173
2. Click "Driver Login"
3. Enter: `driver1@test.com` / `Driver1`
4. Wait 3 seconds for location
5. Should show "🟢 Online"

**Tab 2 - Driver 2**:
1. Go to http://localhost:5173 (new tab)
2. Click "Driver Login"
3. Enter: `driver2@test.com` / `Driver2`
4. Wait 3 seconds for location
5. Should show "🟢 Online"

**Tab 3 - User**:
1. Go to http://localhost:5173 (new tab)
2. Click "User Login"
3. Enter: `user1@test.com` / `User1`
4. Should show "Available Drivers: 2"

### Step 2: Book a Ride (1 minute)

**In User Tab**:
1. **Pickup**: Type "New York" → Select "New York, United States" from dropdown
2. **Destination**: Type "Boston" → Select "Boston, Massachusetts, United States"
3. Click "🚖 Book Ride Now"
4. Alert shows: "Searching for drivers 🔍 (X drivers notified)"

### Step 3: Accept Ride (30 seconds)

**In Driver Tab (either one)**:
1. Yellow notification box appears (pulsing)
2. Shows: "🔔 New Ride Requests (1)"
3. See user name, pickup, destination, fare
4. Click "✅ Accept"
5. Alert: "Ride accepted! ✅"
6. New tab opens with ride details

**In Other Driver Tab**:
- Notification disappears (request expired)

### Step 4: Watch the Map (30 seconds)

**In User Tab**:
- Map shows:
  - 📍 Orange marker at pickup (New York)
  - 🎯 Red marker at destination (Boston)
  - Blue dashed line connecting them
  - 🚗 Green marker (driver location)
  - Green solid line (driver → pickup)

### Step 5: Ride Completes (1 minute)

- Wait 1 minute
- Ride auto-completes
- Driver goes back online
- Container removed
- Driver can accept new rides

## ✅ Success Checklist

- [ ] Both drivers show as online
- [ ] User sees "Available Drivers: 2"
- [ ] Booking shows "X drivers notified"
- [ ] Drivers see yellow notification box
- [ ] Accept button works
- [ ] Other driver's notification disappears
- [ ] Map shows all markers and routes
- [ ] Ride completes after 1 minute
- [ ] Driver goes back online

## 🧪 Test Scenarios

### Scenario A: Test Rejection
1. Book ride
2. Driver 1 clicks "❌ Reject"
3. Driver 2 still sees notification
4. Driver 2 clicks "✅ Accept"
5. Ride assigned to Driver 2

### Scenario B: All Reject
1. Book ride
2. Both drivers click "❌ Reject"
3. Ride status: "no_drivers"
4. User sees "No drivers available"

### Scenario C: Multiple Rides
1. Book ride 1 → Driver 1 accepts
2. Book ride 2 → Driver 2 accepts
3. Both rides active simultaneously
4. Map shows both routes

### Scenario D: Distance Test
1. Driver in New York (default location)
2. User books ride with pickup in Los Angeles
3. Alert: "0 drivers notified"
4. No notifications sent (> 1km away)

## 🐛 Common Issues

### Issue: "0 drivers notified"
**Cause**: Drivers too far from pickup location
**Fix**: 
- Use nearby locations (e.g., both in New York)
- Or increase radius in code (1km → 5km)

### Issue: No autocomplete suggestions
**Cause**: Typed less than 3 characters
**Fix**: Type at least 3 characters and wait 1 second

### Issue: Map not showing routes
**Cause**: Didn't select from autocomplete dropdown
**Fix**: Must click a suggestion to capture coordinates

### Issue: Driver not getting notification
**Cause**: Driver offline or no location
**Fix**: 
- Check driver shows "🟢 Online"
- Check location coordinates displayed
- Wait 3 seconds after login

## 📊 Expected Results

### Booking Response
```
Alert: "Searching for drivers 🔍 (2 drivers notified)"
```

### Driver Notification
```
🔔 New Ride Requests (1)

👤 User1
📍 Pickup: New York, United States
🎯 Drop: Boston, Massachusetts, United States
💰 Fare: ₹100

[✅ Accept] [❌ Reject]
```

### Map Display
- 📍 Orange: Pickup location
- 🎯 Red: Destination
- 🚗 Green (pulsing): Driver
- Blue dashed line: Route
- Green solid line: Driver approaching

## 🎯 Performance Check

### Request Timing
- Booking → Notification: < 1 second
- Accept → Assignment: < 1 second
- Map update: < 2 seconds

### Polling Intervals
- Driver checks requests: Every 3 seconds
- User checks status: Every 8 seconds
- Driver heartbeat: Every 8 seconds

### Server Load (2 drivers, 1 user)
- Requests per minute: ~40-50
- CPU usage: < 5%
- Memory: < 100MB

## 🚀 Next Steps

After successful test:
1. ✅ Test with 5+ drivers
2. ✅ Test concurrent bookings
3. ✅ Test rejection scenarios
4. ✅ Monitor server logs
5. ✅ Check database records
6. ✅ Test on different locations
7. ✅ Verify map accuracy
8. ✅ Test ride completion

## 📝 Notes

- **Ride duration**: 1 minute (configurable)
- **Notification refresh**: 3 seconds
- **Match radius**: 1km (configurable)
- **Auto-complete**: Requires 3+ characters
- **Coordinates**: Captured from geocoding API

## 🎉 Success!

If all tests pass:
- ✅ Ride request system working
- ✅ Driver notifications functional
- ✅ Accept/reject working
- ✅ Map routing accurate
- ✅ 1km radius matching active
- ✅ Ready for production testing!
