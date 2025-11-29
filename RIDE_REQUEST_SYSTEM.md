# Ride Request System - Complete Guide

## 🎯 New Features Implemented

### 1. **Driver Notifications with Accept/Reject**
- Drivers within 1km radius get notified of new ride requests
- Drivers can accept or reject ride requests
- First driver to accept gets the ride
- Other requests automatically expire

### 2. **1km Radius Matching**
- System calculates distance using Haversine formula
- Only drivers within 1km of pickup location are notified
- Drivers sorted by distance (closest first)

### 3. **Accurate Map Routing**
- Shows pickup location marker (📍 orange)
- Shows destination marker (🎯 red)
- Blue dashed line: Route from pickup to destination
- Green solid line: Driver's route to pickup (when assigned)
- Real-time driver location tracking

## 🔄 New Ride Flow

### Old Flow (Automatic Assignment)
```
User books ride → First available driver assigned → Ride starts
```

### New Flow (Driver Choice)
```
User books ride 
  ↓
System finds drivers within 1km
  ↓
Sends notifications to all nearby drivers
  ↓
Drivers see request with Accept/Reject buttons
  ↓
First driver to accept gets the ride
  ↓
Other requests expire automatically
  ↓
Ride starts with assigned driver
```

## 📊 Ride Statuses

| Status | Description |
|--------|-------------|
| `searching` | Looking for nearby drivers |
| `no_drivers` | No drivers within 1km or all rejected |
| `assigned` | Driver accepted, ride in progress |
| `completed` | Ride finished |

## 🗺️ Map Features

### Markers
- **📍 Orange Circle**: User/Pickup location
- **🚗 Green Circle**: Online driver (pulsing animation)
- **🎯 Red Circle**: Destination location

### Routes
- **Blue Dashed Line**: Planned route (pickup → destination)
- **Green Solid Line**: Driver approaching (driver → pickup)

## 🔧 Technical Implementation

### Database Changes

#### New Table: `ride_requests`
```sql
CREATE TABLE ride_requests (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER REFERENCES ride_queue(id),
    driver_id INTEGER REFERENCES drivers(id),
    status VARCHAR (pending/accepted/rejected/expired),
    created_at TIMESTAMP,
    responded_at TIMESTAMP
);
```

#### Updated Table: `ride_queue`
```sql
ALTER TABLE ride_queue ADD COLUMN pickup_lat FLOAT;
ALTER TABLE ride_queue ADD COLUMN pickup_lng FLOAT;
ALTER TABLE ride_queue ADD COLUMN dest_lat FLOAT;
ALTER TABLE ride_queue ADD COLUMN dest_lng FLOAT;
```

### New API Endpoints

#### 1. Get Driver Ride Requests
```http
GET /driver-ride-requests/{driver_id}
```
Returns pending ride requests for a driver.

**Response:**
```json
[
  {
    "request_id": 1,
    "ride_id": 5,
    "user_name": "John Doe",
    "pickup": "123 Main St, New York",
    "destination": "456 Park Ave, New York",
    "pickup_lat": 40.7128,
    "pickup_lng": -74.0060,
    "dest_lat": 40.7614,
    "dest_lng": -73.9776,
    "fare": 95.0,
    "created_at": "2025-11-29T10:30:00"
  }
]
```

#### 2. Accept Ride Request
```http
POST /accept-ride-request/{request_id}?driver_id={driver_id}
```
Driver accepts a ride request.

**Response:**
```json
{
  "message": "Ride accepted",
  "ride_id": 5,
  "ride_port": 7000,
  "ride_url": "http://localhost:7000"
}
```

#### 3. Reject Ride Request
```http
POST /reject-ride-request/{request_id}?driver_id={driver_id}
```
Driver rejects a ride request.

**Response:**
```json
{
  "message": "Ride rejected"
}
```

### Distance Calculation

Uses Haversine formula for accurate distance:
```python
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    # ... Haversine calculation
    return distance_in_km
```

## 🧪 Testing Guide

### Test Scenario 1: Successful Ride Assignment

1. **Setup**:
   - Open 2 driver tabs
   - Open 1 user tab
   - Login both drivers (different locations if possible)

2. **Book Ride**:
   - User types pickup location (e.g., "Times Square, New York")
   - Select from autocomplete (captures coordinates)
   - Type destination (e.g., "Central Park, New York")
   - Select from autocomplete
   - Click "Book Ride Now"

3. **Expected**:
   - Alert shows: "Searching for drivers 🔍 (X drivers notified)"
   - Drivers within 1km see yellow notification box
   - Notification shows: user name, pickup, destination, fare
   - Accept/Reject buttons appear

4. **Driver Accepts**:
   - Driver clicks "✅ Accept"
   - Alert: "Ride accepted! ✅"
   - New tab opens with ride details
   - Other driver's notification disappears
   - Map shows green line from driver to pickup
   - Blue dashed line from pickup to destination

5. **Ride Completes**:
   - After 1 minute, ride auto-completes
   - Driver goes back online
   - Container removed

### Test Scenario 2: All Drivers Reject

1. **Setup**: Same as above

2. **Book Ride**: User books ride

3. **All Reject**:
   - Both drivers click "❌ Reject"
   - Ride status changes to "no_drivers"
   - User sees status: "No drivers available"

### Test Scenario 3: No Nearby Drivers

1. **Setup**:
   - Driver in New York (40.7128, -74.0060)
   - User books ride in Los Angeles (34.0522, -118.2437)

2. **Expected**:
   - Alert: "Searching for drivers 🔍 (0 drivers notified)"
   - No drivers get notification
   - Ride status: "no_drivers"

## 📱 UI Changes

### User Dashboard
- Removed "No drivers available" blocking
- Shows "Searching for drivers..." message
- Displays number of drivers notified
- Map shows pickup and destination markers with route

### Driver Dashboard
- **New Section**: "🔔 New Ride Requests" (yellow box, pulsing)
- Shows all pending requests
- Each request has:
  - User name
  - Pickup address
  - Destination address
  - Fare amount
  - Accept button (green)
  - Reject button (red)
- Requests refresh every 3 seconds
- Accepted rides move to "Assigned Rides" section

### Map Component
- Shows pickup marker (📍 orange)
- Shows destination marker (🎯 red)
- Blue dashed line: pickup → destination route
- Green solid line: driver → pickup (when assigned)
- All markers have popups with details

## ⚙️ Configuration

### Radius Setting
Change the 1km radius in `server/main.py`:
```python
if distance <= 1.0:  # Change to 2.0 for 2km radius
    nearby_drivers.append((driver, distance))
```

### Request Timeout
Requests don't expire automatically. To add timeout:
```python
# In book_ride function
def expire_old_requests():
    time.sleep(60)  # 60 seconds timeout
    # Mark as expired if still pending
```

### Polling Interval
Driver dashboard checks for requests every 3 seconds:
```javascript
// In DriverDashboard.jsx
ridesInterval = setInterval(() => {
  fetchRideRequests();
}, 3000);  // Change to 5000 for 5 seconds
```

## 🐛 Troubleshooting

### Issue: Drivers not getting notifications
**Check**:
1. Driver is online (green status)
2. Driver has location (lat/lng not null)
3. Driver is within 1km of pickup
4. Ride status is "searching"

**Debug**:
```sql
-- Check driver locations
SELECT id, name, latitude, longitude, status FROM drivers WHERE status='online';

-- Check ride requests
SELECT * FROM ride_requests WHERE status='pending';
```

### Issue: Map not showing routes
**Check**:
1. Pickup and destination have coordinates
2. Ride status is "searching" or "assigned"
3. Browser console for errors

**Fix**:
- Make sure to select location from autocomplete dropdown
- Don't manually type full address without selecting

### Issue: Accept button not working
**Check**:
1. Request_id is valid
2. Driver_id matches logged-in driver
3. Ride is still in "searching" status

**Debug**:
```bash
# Check server logs
docker logs mini_uber-server-1 --tail 50
```

## 📈 Performance Considerations

### With 100 Drivers
- Distance calculation: O(n) where n = online drivers
- For 100 drivers: ~100 calculations per ride request
- Each calculation: < 1ms
- Total: < 100ms (acceptable)

### With 1000 Drivers
- Consider spatial indexing (PostGIS)
- Use bounding box pre-filter
- Cache driver locations in Redis

### Optimization Tips
1. **Spatial Index**: Use PostGIS for geo queries
2. **Caching**: Cache driver locations in Redis
3. **Bounding Box**: Pre-filter by lat/lng range before Haversine
4. **Batch Processing**: Process multiple ride requests together

## 🚀 Future Enhancements

1. **Dynamic Pricing**: Surge pricing based on demand
2. **Driver Ratings**: Show driver rating in request
3. **Estimated Time**: Show ETA to pickup
4. **Push Notifications**: Real-time notifications (WebSocket)
5. **Request Expiry**: Auto-expire after 30 seconds
6. **Multiple Accepts**: Handle race conditions better
7. **Driver Preferences**: Filter by car type, rating, etc.
8. **Heat Maps**: Show demand hotspots on map

## 📝 Summary

✅ **Implemented**:
- 1km radius driver matching
- Driver notifications with accept/reject
- Accurate map routing with pickup/destination
- Real-time location tracking
- Distance-based driver sorting

✅ **Benefits**:
- Drivers have choice
- Better driver experience
- More accurate matching
- Visual route planning
- Fair distribution of rides

✅ **Ready for**:
- 100+ concurrent drivers
- Real-world testing
- Production deployment
