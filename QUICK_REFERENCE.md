# Quick Reference Card

## 🚀 Start Application
```bash
docker-compose up -d --build
```

## 🌐 Access URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Database**: localhost:5436
- **Ride Containers**: http://localhost:7000+ (dynamic)

## 👥 Test Flow (3 Tabs)

### Tab 1: Driver
1. Go to http://localhost:5173
2. Click "Driver Login"
3. Enter: `driver1@test.com` / `Driver1`
4. **Wait 3 seconds** for location
5. Should show "🟢 Online"

### Tab 2: User
1. Go to http://localhost:5173
2. Click "User Login"
3. Enter: `user1@test.com` / `User1`
4. Should show "Available Drivers: 1"
5. Type pickup (e.g., "New York") → See suggestions
6. Type destination (e.g., "Boston") → See suggestions
7. Click "Book Ride Now"
8. New tab opens with ride details

### Tab 3: Admin
1. Go to http://localhost:5173
2. Click "Admin Dashboard"
3. Check "Overview" → See 1 online driver
4. Check "Rides" → See active ride
5. Check "Drivers" → See driver status

## ⚡ Key Timings
- **Driver online detection**: 2-3 seconds
- **Heartbeat interval**: 8 seconds
- **Polling interval**: 8 seconds
- **Timeout check**: 20 seconds
- **Ride duration**: 1 minute (auto-complete)
- **Location cache**: 30 seconds

## 🔧 Troubleshooting

### Driver Not Online?
```bash
# Check driver status in database
docker exec -it mini_uber-postgres-1 psql -U paras -d uberdb -c "SELECT id, name, status, last_seen FROM drivers;"
```

### No Autocomplete?
- Type at least **3 characters**
- Check internet connection
- Try: "New York", "London", "Paris"

### Server Logs Spamming?
```bash
# Should be quiet now (no spam)
docker logs -f mini_uber-server-1
```

### Check Request Rate
```bash
# Count requests in last minute
docker logs mini_uber-server-1 --since 1m | findstr "GET" | find /c "GET"
```

## 📊 Performance Targets

| Drivers | Requests/min | Status |
|---------|--------------|--------|
| 10      | 100          | ✅ Easy |
| 50      | 500          | ✅ Good |
| 100     | 1,000        | ✅ OK   |
| 500     | 5,000        | ⚠️ Monitor |
| 1000    | 10,000       | ❌ Need optimization |

## 🛑 Stop Application
```bash
docker-compose down
```

## 🗑️ Clean Everything
```bash
docker-compose down
docker volume rm mini_uber_postgres_data
docker-compose up -d --build
```

## 📝 Important Files
- `docker-compose.yml` - Service orchestration
- `server/main.py` - Backend API
- `server/models.py` - Database models
- `client/src/components/DriverDashboard.jsx` - Driver UI
- `client/src/components/UserDashboard.jsx` - User UI
- `client/src/components/AdminDashboard.jsx` - Admin UI

## 🐛 Debug Commands
```bash
# Server logs
docker logs -f mini_uber-server-1

# Database shell
docker exec -it mini_uber-postgres-1 psql -U paras -d uberdb

# Check online drivers
SELECT * FROM drivers WHERE status='online';

# Check active rides
SELECT * FROM ride_queue WHERE status IN ('pending', 'assigned');

# Exit database
\q

# Restart services
docker-compose restart

# Rebuild everything
docker-compose up -d --build
```

## ✅ Success Indicators
- ✅ Driver shows "🟢 Online"
- ✅ User sees "Available Drivers: 1"
- ✅ Admin shows driver in list
- ✅ Autocomplete shows suggestions
- ✅ Ride booking opens new tab
- ✅ Driver sees assigned ride
- ✅ Ride completes after 1 minute
- ✅ Server logs are quiet

## 🎯 Next Steps
1. Test with multiple drivers (10+)
2. Test concurrent ride bookings
3. Create coupons in admin
4. Use bulk simulator in admin
5. Monitor server performance
6. Check database size growth
7. Test with real GPS locations

## 📚 Documentation
- `README.md` - Project overview
- `TESTING_GUIDE.md` - Detailed testing steps
- `SCALABILITY_FIXES.md` - Performance improvements
- `FINAL_FIXES_SUMMARY.md` - Complete fix summary
- `PERFORMANCE_IMPROVEMENTS.md` - Technical details
