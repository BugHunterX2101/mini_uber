# Simulation Data Cleanup Guide

## Overview
The Mini-Uber platform now includes cleanup functionality to remove test data created by the simulator.

## What Gets Deleted?
- **Users** with emails ending in `@test.com`
- **Drivers** with emails ending in `@test.com`
- **Rides** associated with deleted users/drivers
- **Ride Requests** for deleted rides
- **User Coupons** for deleted users
- **Coupon Redemptions** for deleted users

## What's Protected?
- Real users (non-test emails)
- Real drivers (non-test emails)
- Merchants and merchant coupons
- Admin coupons
- Any data not created by the simulator

---

## Method 1: Manual Cleanup (Recommended)

### Via Admin Dashboard
1. Login as admin
2. Go to **Simulator** tab
3. Click **🗑️ Cleanup Test Data** button
4. Confirm the action
5. View cleanup summary

**Advantages:**
- Full control over when cleanup happens
- See immediate results
- No background processes

---

## Method 2: Auto-Cleanup (Optional)

### Run Auto-Cleanup Script
```bash
# Start auto-cleanup service (runs every 10 minutes)
python auto_cleanup.py
```

**Features:**
- Automatically cleans up test data every 10 minutes
- Runs in background
- Shows cleanup summary after each run
- Press `Ctrl+C` to stop

**When to use:**
- Long-running test environments
- Continuous integration testing
- Automated demo environments

**When NOT to use:**
- Production environments
- When you need to inspect test data
- Short testing sessions

---

## API Endpoint

### Direct API Call
```bash
curl -X POST http://localhost:8000/cleanup-simulation-data
```

**Response:**
```json
{
  "message": "Simulation data cleaned up successfully",
  "deleted_users": 50,
  "deleted_drivers": 30,
  "deleted_rides": 75
}
```

---

## Testing the Cleanup

### 1. Create Test Data
```bash
# Create 10 test users
# In Admin Dashboard > Simulator > Create Users (10)

# Create 10 test drivers
# In Admin Dashboard > Simulator > Create Drivers (10)
```

### 2. Verify Data Exists
- Check **Rides** tab: Should see test rides
- Check **Drivers** tab: Should see test drivers

### 3. Run Cleanup
- Click **🗑️ Cleanup Test Data** button
- Confirm deletion

### 4. Verify Data Removed
- Check **Rides** tab: Test rides gone
- Check **Drivers** tab: Test drivers gone
- Real data remains intact

---

## Safety Features

### Confirmation Dialog
- Manual cleanup requires confirmation
- Prevents accidental deletion

### Email Pattern Matching
- Only deletes emails with `@test.com`
- Real user emails are safe

### Transaction Rollback
- If cleanup fails, all changes are rolled back
- Database remains consistent

---

## Troubleshooting

### Cleanup Button Not Working
```bash
# Check if backend is running
curl http://localhost:8000/

# Check logs
docker-compose logs server
```

### Some Data Not Deleted
- Only `@test.com` emails are deleted
- Check email patterns in database
- Manually created test users with different emails won't be deleted

### Auto-Cleanup Not Running
```bash
# Check if script is running
ps aux | grep auto_cleanup

# Check API connectivity
curl http://localhost:8000/cleanup-simulation-data
```

---

## Best Practices

1. **Use Manual Cleanup** for most scenarios
2. **Run cleanup after testing** to keep database clean
3. **Don't run auto-cleanup in production**
4. **Always use @test.com** for simulator-created entities
5. **Backup data** before large-scale cleanup

---

## Example Workflow

```bash
# 1. Start services
make build

# 2. Run simulator tests
# - Create 50 users
# - Create 50 drivers
# - Simulate 20 concurrent rides

# 3. Analyze results
# - Check performance metrics
# - Review scalability

# 4. Clean up
# - Click cleanup button in admin dashboard
# - Verify deletion

# 5. Ready for next test
```

---

## Notes

- Cleanup is **immediate** and **permanent**
- No undo functionality
- Test data is identified by `@test.com` email pattern
- Real merchants and coupons are never deleted
- Cleanup runs in a database transaction for safety
