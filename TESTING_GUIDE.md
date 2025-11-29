# Testing Guide - Driver Online Detection & Ride Booking

## Quick Test Steps

### 1. Open Three Tabs
- **Tab 1**: http://localhost:5173 → Admin Dashboard
- **Tab 2**: http://localhost:5173 → Driver Login
- **Tab 3**: http://localhost:5173 → User Login

### 2. Register & Login Driver
1. Go to Tab 2 (Driver)
2. Click "Driver Login"
3. Enter:
   - Name: `Driver1`
   - Email: `driver1@test.com`
4. Click "Login as Driver"
5. **Wait 2-3 seconds** for location to be captured
6. Driver dashboard should show "🟢 Online"

### 3. Verify Driver is Online
1. Go to Tab 1 (Admin)
2. Check "Overview" tab
3. Should show "1 Online Driver"
4. Go to "Drivers" tab
5. Should see Driver1 with status "online"

### 4. Register & Login User
1. Go to Tab 3 (User)
2. Click "User Login"
3. Enter:
   - Name: `User1`
   - Email: `user1@test.com`
4. Click "Login as User"
5. User dashboard should show "Available Drivers: 1"

### 5. Book a Ride
1. In Tab 3 (User Dashboard)
2. Enter pickup location (e.g., "New York")
   - **Autocomplete suggestions should appear**
   - Click a suggestion or type full address
3. Enter destination (e.g., "Boston")
   - **Autocomplete suggestions should appear**
   - Click a suggestion or type full address
4. Click "🚖 Book Ride Now"
5. **New tab opens** with ride details (e.g., http://localhost:7000)

### 6. Verify Ride Assignment
1. Go to Tab 2 (Driver Dashboard)
2. Should see ride in "Your Assigned Rides" section
3. Shows pickup, destination, and container info

### 7. Wait for Ride Completion
1. Ride completes automatically after 1 minute
2. Driver goes back to "online" status
3. Ride moves to "Completed Rides" section
4. Ride container is removed

### 8. Check Admin Dashboard
1. Go to Tab 1 (Admin)
2. "Rides" tab shows all rides (pending, assigned, completed)
3. "Overview" shows total stats

## Troubleshooting

### Driver Not Showing as Online
**Symptoms**: User sees "Available Drivers: 0"

**Solutions**:
1. **Wait 8 seconds** after driver login (heartbeat interval)
2. Refresh user dashboard
3. Check driver dashboard shows "🟢 Online"
4. Check browser console for errors
5. Verify driver location was captured (shows coordinates)

### No Autocomplete Suggestions
**Symptoms**: Typing in pickup/destination doesn't show suggestions

**Solutions**:
1. Type at least **3 characters**
2. Wait 1-2 seconds for API response
3. Check internet connection (uses OpenStreetMap API)
4. Try common locations: "New York", "London", "Paris"

### Ride Not Assigned
**Symptoms**: Ride stays in "pending" status

**Solutions**:
1. Verify driver is online (check user dashboard)
2. Wait 8 seconds for next polling cycle
3. Check driver is not already on a trip
4. Refresh user dashboard

### Container Not Opening
**Symptoms**: Ride URL doesn't open or shows error

**Solutions**:
1. Check Docker is running: `docker ps`
2. Verify container created: `docker ps | findstr ride-`
3. Check port is accessible: http://localhost:7000
4. Look for container creation logs in server

## Performance Monitoring

### Check Request Rate
```bash
# Watch server logs (should be quiet)
docker logs -f mini_uber-server-1

# Count requests in last minute
docker logs mini_uber-server-1 --since 1m | findstr "GET" | find /c "GET"
```

### Expected Request Rates
- **1 driver + 1 user**: ~2-3 requests every 8 seconds
- **10 drivers + 5 users**: ~15-20 requests every 8 seconds
- **100 drivers + 50 users**: ~150-200 requests every 8 seconds

### Database Check
```bash
# Connect to database
docker exec -it mini_uber-postgres-1 psql -U paras -d uberdb

# Check online drivers
SELECT id, name, status, last_seen FROM drivers WHERE status='online';

# Check active rides
SELECT id, user_id, driver_id, status FROM ride_queue WHERE status IN ('pending', 'assigned');

# Exit
\q
```

## Common Issues & Fixes

### Issue: "No drivers available"
**Fix**: 
1. Driver must be logged in and online
2. Wait 8 seconds after driver login
3. Refresh user page

### Issue: Geocoding not working
**Fix**:
1. Type at least 3 characters
2. Check internet connection
3. Try different location names

### Issue: Ride container not created
**Fix**:
1. Check Docker daemon is running
2. Verify ports 7000+ are available
3. Check server logs for errors

### Issue: Driver goes offline automatically
**Fix**:
1. Keep driver tab open
2. Don't minimize browser
3. Check heartbeat is being sent (Network tab)

## Success Criteria

✅ Driver shows as online within 8 seconds of login
✅ User sees "Available Drivers: 1"
✅ Admin sees driver in online drivers list
✅ Autocomplete shows location suggestions
✅ Ride booking creates container and opens new tab
✅ Driver sees assigned ride
✅ Ride completes after 1 minute
✅ Driver goes back online
✅ No excessive logging in server

## Next Steps

After successful test:
1. Try with multiple drivers (open more tabs)
2. Test with multiple users booking simultaneously
3. Monitor server performance with 10+ drivers
4. Test coupon system (create coupons in admin)
5. Test bulk user/driver creation in admin simulator
