from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import threading, time, subprocess, json

from db import SessionLocal, engine
import models, schemas

# Wait for database to be ready
import time as time_module
for i in range(30):
    try:
        models.Base.metadata.create_all(bind=engine)
        print("✅ Database connected successfully")
        break
    except Exception as e:
        if i < 29:
            print(f"⏳ Waiting for database... ({i+1}/30)")
            time_module.sleep(1)
        else:
            print(f"❌ Database connection failed: {e}")
            raise

app = FastAPI()

# ✅ CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Port management for ride containers
USED_PORTS = set()
BASE_PORT = 7000

def get_next_available_port():
    """Get the next available port starting from 7000"""
    import socket
    port = BASE_PORT
    while True:
        if port not in USED_PORTS:
            # Check if port is actually free
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('', port))
                USED_PORTS.add(port)
                return port
            except OSError:
                pass  # Port is busy, try next
        port += 1

def release_port(port):
    """Release a port when ride is completed"""
    USED_PORTS.discard(port)

def create_ride_container(ride_id, port):
    """Create a Docker container for a specific ride"""
    try:
        container_name = f"ride-{ride_id}"
        
        subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)
        
        # Create container first
        cmd = [
            "docker", "run", "-d",
            "--name", container_name,
            "--network", "mini_uber_default",
            "-p", f"{port}:80",
            "nginx:alpine"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Failed to create container: {result.stderr}")
            release_port(port)
            return False
        
        # Copy HTML file into container
        import os
        server_dir = os.path.dirname(os.path.abspath(__file__))
        project_dir = os.path.dirname(server_dir)
        html_file = os.path.join(project_dir, "ride-interface", "index.html")
        
        copy_cmd = ["docker", "cp", html_file, f"{container_name}:/usr/share/nginx/html/index.html"]
        copy_result = subprocess.run(copy_cmd, capture_output=True, text=True)
        
        if copy_result.returncode == 0:
            print(f"✅ Created ride container {container_name} on port {port}")
            return True
        else:
            print(f"❌ Failed to copy HTML: {copy_result.stderr}")
            subprocess.run(["docker", "rm", "-f", container_name], capture_output=True)
            release_port(port)
            return False
            
    except Exception as e:
        print(f"❌ Error creating container: {e}")
        release_port(port)
        return False

def remove_ride_container(ride_id, port):
    """Remove Docker container when ride is completed"""
    try:
        container_name = f"ride-{ride_id}"
        
        # Stop and remove container
        subprocess.run(["docker", "stop", container_name], capture_output=True)
        subprocess.run(["docker", "rm", container_name], capture_output=True)
        
        release_port(port)
        print(f"🗑️ Removed ride container {container_name} from port {port}")
        
    except Exception as e:
        print(f"❌ Error removing container: {e}")

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------ USERS ------------------

@app.post("/register-user")
async def register_user(name: str, email: str, response: Response = None, db: Session = Depends(get_db)):
    if response:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        return {"message": "User already exists", "user_id": existing.id}
    user = models.User(name=name, email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "User registered 👤", "user_id": user.id}


# ------------------ DRIVERS ------------------

@app.post("/register-driver")
async def register_driver(name: str, email: str, location: str, latitude: float = None, longitude: float = None, response: Response = None, db: Session = Depends(get_db)):
    if response:
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
    existing = db.query(models.Driver).filter(models.Driver.email == email).first()
    if existing:
        existing.status = "offline"
        existing.last_seen = datetime.utcnow()
        if latitude and longitude:
            existing.latitude = latitude
            existing.longitude = longitude
        db.commit()
        return {"message": "Driver already exists", "driver_id": existing.id}
    driver = models.Driver(
        name=name, 
        email=email, 
        location=location, 
        latitude=latitude,
        longitude=longitude,
        status="offline", 
        last_seen=datetime.utcnow()
    )
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return {"message": "Driver registered 🚖", "driver_id": driver.id}


@app.post("/go-online")
def go_online(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        return {"error": "Driver not found"}
    driver.status = "online"
    driver.last_seen = datetime.utcnow()
    db.commit()
    assign_pending_rides(db)
    return {"message": f"Driver {driver.name} is now online ✅"}


@app.post("/go-offline")
def go_offline(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        return {"error": "Driver not found"}
    driver.status = "offline"
    db.commit()
    return {"message": f"Driver {driver.name} is now offline ❌"}


@app.post("/heartbeat")
def heartbeat(driver_id: int, latitude: float = None, longitude: float = None, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        return {"error": "Driver not found"}
    driver.last_seen = datetime.utcnow()
    if driver.status == "offline":
        driver.status = "online"
    if latitude is not None and longitude is not None:
        driver.latitude = latitude
        driver.longitude = longitude
    db.commit()
    return {"status": "ok"}


@app.get("/available-drivers")
def available_drivers(db: Session = Depends(get_db)):
    from datetime import timedelta
    
    timeout = datetime.utcnow() - timedelta(seconds=60)
    inactive_drivers = db.query(models.Driver).filter(
        models.Driver.status == "online",
        models.Driver.last_seen < timeout
    ).all()
    
    for driver in inactive_drivers:
        driver.status = "offline"
    if inactive_drivers:
        db.commit()
    
    online_drivers = db.query(models.Driver).filter(models.Driver.status == "online").all()
    return online_drivers


# ------------------ RIDES ------------------

@app.get("/")
def home():
    return {"message": "🚖 Welcome to Mini-Uber Backend"}


@app.get("/queue")
def get_queue(db: Session = Depends(get_db)):
    """Returns all rides in queue (pending, assigned, completed)."""
    return db.query(models.RideQueue).order_by(models.RideQueue.id).all()

@app.get("/ride/{ride_id}")
def get_ride(ride_id: int, db: Session = Depends(get_db)):
    """Get ride details by ID"""
    ride = db.query(models.RideQueue).filter(models.RideQueue.id == ride_id).first()
    if not ride:
        return {"error": "Ride not found"}
    
    user = db.query(models.User).filter(models.User.id == ride.user_id).first()
    driver = db.query(models.Driver).filter(models.Driver.id == ride.driver_id).first() if ride.driver_id else None
    
    return {
        "ride_id": ride.id,
        "user_name": user.name if user else "Unknown",
        "driver_name": driver.name if driver else "Not assigned",
        "start": ride.start,
        "destination": ride.destination,
        "status": ride.status
    }

@app.get("/ride-by-port/{port}")
async def get_ride_by_port(port: int, response: Response, db: Session = Depends(get_db)):
    """Get ride details by port number"""
    response.headers["Access-Control-Allow-Origin"] = "*"
    
    # Query for any ride with this port (including completed)
    ride = db.query(models.RideQueue).filter(
        models.RideQueue.port == port
    ).first()
    
    print(f"Looking for ride on port {port}: {ride}")
    
    if not ride:
        return {"error": "Ride not found for this port"}
    
    user = db.query(models.User).filter(models.User.id == ride.user_id).first()
    driver = db.query(models.Driver).filter(models.Driver.id == ride.driver_id).first() if ride.driver_id else None
    
    result = {
        "ride_id": ride.id,
        "container_name": ride.container_name or f"ride-{ride.id}",
        "user_name": user.name if user else "Unknown",
        "driver_name": driver.name if driver else "Not assigned",
        "start": ride.start,
        "destination": ride.destination,
        "status": ride.status
    }
    
    print(f"Returning ride data: {result}")
    return result

@app.get("/ride-containers")
def get_ride_containers():
    """Returns information about active ride containers"""
    try:
        # Get running containers with ride- prefix
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=ride-", "--format", "json"],
            capture_output=True, text=True
        )
        
        if result.returncode == 0:
            containers = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    container_info = json.loads(line)
                    containers.append({
                        "name": container_info["Names"],
                        "ports": container_info["Ports"],
                        "status": container_info["Status"]
                    })
            return {"containers": containers, "used_ports": list(USED_PORTS)}
        else:
            return {"error": "Could not fetch containers", "containers": [], "used_ports": list(USED_PORTS)}
            
    except Exception as e:
        return {"error": str(e), "containers": [], "used_ports": list(USED_PORTS)}


@app.options("/book-ride")
def book_ride_options():
    return {"message": "OK"}

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in km using Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2
    R = 6371  # Earth radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

@app.post("/book-ride")
def book_ride(ride: schemas.RideCreate, response: Response, db: Session = Depends(get_db)):
    user_id = ride.user_id
    start = ride.start
    destination = ride.destination
    coupon_code = ride.coupon_code
    pickup_lat = ride.pickup_lat
    pickup_lng = ride.pickup_lng
    dest_lat = ride.dest_lat
    dest_lng = ride.dest_lng

    # Calculate fare
    base_fare = 100.0
    discount = 0.0
    coupon_id = None

    # Apply coupon if provided
    if coupon_code:
        coupon_result = validate_and_apply_coupon(db, user_id, coupon_code, base_fare, start)
        if coupon_result["valid"]:
            discount = coupon_result["discount"]
            coupon_id = coupon_result["coupon_id"]

    final_fare = base_fare - discount
    
    # Create ride with searching status
    ride_db = models.RideQueue(
        user_id=user_id,
        start=start,
        destination=destination,
        pickup_lat=pickup_lat,
        pickup_lng=pickup_lng,
        dest_lat=dest_lat,
        dest_lng=dest_lng,
        status="searching",
        fare=base_fare,
        discount=discount,
        final_fare=final_fare,
        coupon_id=coupon_id
    )
    db.add(ride_db)
    db.commit()
    db.refresh(ride_db)
    
    # Find drivers within 1km radius
    nearby_drivers = []
    if pickup_lat and pickup_lng:
        online_drivers = db.query(models.Driver).filter(
            models.Driver.status == "online",
            models.Driver.latitude.isnot(None),
            models.Driver.longitude.isnot(None)
        ).all()
        
        print(f"\n🔍 Searching for drivers near ({pickup_lat}, {pickup_lng})")
        print(f"📊 Found {len(online_drivers)} online drivers with location")
        
        for driver in online_drivers:
            distance = calculate_distance(pickup_lat, pickup_lng, driver.latitude, driver.longitude)
            print(f"  🚗 {driver.name}: {distance:.2f}km away at ({driver.latitude}, {driver.longitude})")
            if distance <= 100.0:  # Within 100km (increased for testing)
                nearby_drivers.append((driver, distance))
                print(f"    ✅ Added to nearby drivers")
            else:
                print(f"    ❌ Too far (> 100km)")
        
        # Sort by distance
        nearby_drivers.sort(key=lambda x: x[1])
        print(f"\n✅ Total nearby drivers: {len(nearby_drivers)}\n")
    else:
        print(f"\n⚠️ No pickup coordinates provided: lat={pickup_lat}, lng={pickup_lng}\n")
    
    # Send ride requests to nearby drivers
    if nearby_drivers:
        for driver, distance in nearby_drivers:
            ride_request = models.RideRequest(
                ride_id=ride_db.id,
                driver_id=driver.id,
                status="pending"
            )
            db.add(ride_request)
        db.commit()
    else:
        ride_db.status = "no_drivers"
        db.commit()
    # Update coupon usage
    if coupon_id:
        coupon = db.query(models.Coupon).filter(models.Coupon.id == coupon_id).first()
        if coupon:
            coupon.usage_count += 1
        user_coupon = db.query(models.UserCoupon).filter(
            models.UserCoupon.user_id == user_id,
            models.UserCoupon.coupon_id == coupon_id
        ).first()
        if user_coupon:
            user_coupon.usage_count += 1
        db.commit()

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    return {
        "message": "Searching for drivers 🔍", 
        "ride_id": ride_db.id,
        "user_id": user_id,
        "start": start,
        "destination": destination,
        "status": ride_db.status,
        "nearby_drivers": len(nearby_drivers),
        "fare": base_fare,
        "discount": discount,
        "final_fare": final_fare
    }

@app.get("/driver-ride-requests/{driver_id}")
def get_driver_ride_requests(driver_id: int, db: Session = Depends(get_db)):
    """Get pending ride requests for a driver"""
    requests = db.query(models.RideRequest).filter(
        models.RideRequest.driver_id == driver_id,
        models.RideRequest.status == "pending"
    ).all()
    
    result = []
    for req in requests:
        ride = db.query(models.RideQueue).filter(models.RideQueue.id == req.ride_id).first()
        if ride and ride.status == "searching":
            user = db.query(models.User).filter(models.User.id == ride.user_id).first()
            result.append({
                "request_id": req.id,
                "ride_id": ride.id,
                "user_name": user.name if user else "Unknown",
                "pickup": ride.start,
                "destination": ride.destination,
                "pickup_lat": ride.pickup_lat,
                "pickup_lng": ride.pickup_lng,
                "dest_lat": ride.dest_lat,
                "dest_lng": ride.dest_lng,
                "fare": ride.final_fare,
                "created_at": req.created_at
            })
    return result

@app.post("/accept-ride-request/{request_id}")
def accept_ride_request(request_id: int, driver_id: int, db: Session = Depends(get_db)):
    """Driver accepts a ride request"""
    ride_request = db.query(models.RideRequest).filter(
        models.RideRequest.id == request_id,
        models.RideRequest.driver_id == driver_id
    ).first()
    
    if not ride_request:
        return {"error": "Request not found"}
    
    ride = db.query(models.RideQueue).filter(models.RideQueue.id == ride_request.ride_id).first()
    if not ride or ride.status != "searching":
        return {"error": "Ride no longer available"}
    
    # Accept this request
    ride_request.status = "accepted"
    ride_request.responded_at = datetime.utcnow()
    
    # Reject all other requests for this ride
    other_requests = db.query(models.RideRequest).filter(
        models.RideRequest.ride_id == ride.id,
        models.RideRequest.id != request_id,
        models.RideRequest.status == "pending"
    ).all()
    for req in other_requests:
        req.status = "expired"
        req.responded_at = datetime.utcnow()
    
    # Assign ride to driver
    ride.driver_id = driver_id
    ride.status = "assigned"
    ride.port = get_next_available_port()
    ride.container_name = f"ride-{ride.id}"
    
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if driver:
        driver.status = "on_trip"
    
    db.commit()
    
    # Create container
    create_ride_container(ride.id, ride.port)
    
    # Auto-complete ride after 1 minute
    def finish_trip(driver_id, ride_id, ride_port):
        time.sleep(60)
        thread_db = SessionLocal()
        try:
            driver = thread_db.query(models.Driver).filter(models.Driver.id == driver_id).first()
            ride = thread_db.query(models.RideQueue).filter(models.RideQueue.id == ride_id).first()
            if driver and ride:
                if driver.status == "on_trip":
                    driver.status = "online"
                ride.status = "completed"
                thread_db.commit()
                remove_ride_container(ride_id, ride_port)
        finally:
            thread_db.close()
    
    threading.Thread(target=finish_trip, args=(driver_id, ride.id, ride.port)).start()
    
    return {
        "message": "Ride accepted",
        "ride_id": ride.id,
        "ride_port": ride.port,
        "ride_url": f"http://localhost:{ride.port}"
    }

@app.post("/reject-ride-request/{request_id}")
def reject_ride_request(request_id: int, driver_id: int, db: Session = Depends(get_db)):
    """Driver rejects a ride request"""
    ride_request = db.query(models.RideRequest).filter(
        models.RideRequest.id == request_id,
        models.RideRequest.driver_id == driver_id
    ).first()
    
    if not ride_request:
        return {"error": "Request not found"}
    
    ride_request.status = "rejected"
    ride_request.responded_at = datetime.utcnow()
    db.commit()
    
    # Check if all drivers rejected
    ride = db.query(models.RideQueue).filter(models.RideQueue.id == ride_request.ride_id).first()
    if ride:
        all_requests = db.query(models.RideRequest).filter(
            models.RideRequest.ride_id == ride.id
        ).all()
        if all(req.status in ["rejected", "expired"] for req in all_requests):
            ride.status = "no_drivers"
            db.commit()
    
    return {"message": "Ride rejected"}


# ------------------ COUPONS ------------------

@app.post("/create-coupon")
def create_coupon(coupon: schemas.CouponCreate, db: Session = Depends(get_db)):
    coupon_db = models.Coupon(**coupon.dict())
    db.add(coupon_db)
    db.commit()
    db.refresh(coupon_db)
    return {"message": "Coupon created 🎟️", "coupon_id": coupon_db.id, "code": coupon_db.code}

@app.get("/coupons")
def get_all_coupons(db: Session = Depends(get_db)):
    return db.query(models.Coupon).filter(models.Coupon.is_active == True).all()

@app.get("/user-coupons/{user_id}")
def get_user_coupons(user_id: int, location: str = None, db: Session = Depends(get_db)):
    from datetime import datetime
    
    # Get all active coupons
    query = db.query(models.Coupon).filter(
        models.Coupon.is_active == True,
        models.Coupon.valid_until > datetime.utcnow()
    )
    
    # Filter by location if provided
    if location:
        query = query.filter(
            (models.Coupon.zone == None) | (models.Coupon.zone == location)
        )
    
    coupons = query.all()
    
    # Check usage limits
    available_coupons = []
    for coupon in coupons:
        user_coupon = db.query(models.UserCoupon).filter(
            models.UserCoupon.user_id == user_id,
            models.UserCoupon.coupon_id == coupon.id
        ).first()
        
        if not user_coupon:
            user_coupon = models.UserCoupon(user_id=user_id, coupon_id=coupon.id)
            db.add(user_coupon)
            db.commit()
        
        if user_coupon.usage_count < coupon.per_user_limit:
            if coupon.total_usage_limit is None or coupon.usage_count < coupon.total_usage_limit:
                available_coupons.append({
                    "id": coupon.id,
                    "code": coupon.code,
                    "discount_type": coupon.discount_type,
                    "discount_value": coupon.discount_value,
                    "max_discount": coupon.max_discount,
                    "min_fare": coupon.min_fare,
                    "valid_until": coupon.valid_until,
                    "zone": coupon.zone,
                    "usage_count": user_coupon.usage_count,
                    "usage_limit": coupon.per_user_limit
                })
    
    return available_coupons

@app.post("/validate-coupon")
def validate_coupon(user_id: int, code: str, fare: float, location: str = None, db: Session = Depends(get_db)):
    result = validate_and_apply_coupon(db, user_id, code, fare, location)
    return result

def validate_and_apply_coupon(db: Session, user_id: int, code: str, fare: float, location: str = None):
    from datetime import datetime
    
    coupon = db.query(models.Coupon).filter(
        models.Coupon.code == code,
        models.Coupon.is_active == True
    ).first()
    
    if not coupon:
        return {"valid": False, "message": "Invalid coupon code", "discount": 0}
    
    if coupon.valid_until < datetime.utcnow():
        return {"valid": False, "message": "Coupon expired", "discount": 0}
    
    if fare < coupon.min_fare:
        return {"valid": False, "message": f"Minimum fare ₹{coupon.min_fare} required", "discount": 0}
    
    if coupon.zone and location and coupon.zone.lower() not in location.lower():
        return {"valid": False, "message": f"Coupon valid only in {coupon.zone}", "discount": 0}
    
    if coupon.total_usage_limit and coupon.usage_count >= coupon.total_usage_limit:
        return {"valid": False, "message": "Coupon usage limit reached", "discount": 0}
    
    user_coupon = db.query(models.UserCoupon).filter(
        models.UserCoupon.user_id == user_id,
        models.UserCoupon.coupon_id == coupon.id
    ).first()
    
    if not user_coupon:
        user_coupon = models.UserCoupon(user_id=user_id, coupon_id=coupon.id)
        db.add(user_coupon)
        db.commit()
    
    if user_coupon.usage_count >= coupon.per_user_limit:
        return {"valid": False, "message": "You've already used this coupon", "discount": 0}
    
    # Calculate discount
    if coupon.discount_type == "percentage":
        discount = (fare * coupon.discount_value) / 100
        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
    else:  # flat
        discount = min(coupon.discount_value, fare)
    
    return {
        "valid": True,
        "message": "Coupon applied successfully",
        "discount": discount,
        "coupon_id": coupon.id
    }

# ------------------ MERCHANTS ------------------

@app.post("/register-merchant")
def register_merchant(merchant: schemas.MerchantCreate, response: Response = None, db: Session = Depends(get_db)):
    if response:
        response.headers["Access-Control-Allow-Origin"] = "*"
    existing = db.query(models.Merchant).filter(models.Merchant.email == merchant.email).first()
    if existing:
        return {"message": "Merchant already exists", "merchant_id": existing.id, "name": existing.name, "business_type": existing.business_type}
    
    merchant_db = models.Merchant(**merchant.dict())
    db.add(merchant_db)
    db.commit()
    db.refresh(merchant_db)
    return {"message": "Merchant registered", "merchant_id": merchant_db.id, "name": merchant_db.name, "business_type": merchant_db.business_type}

@app.post("/merchant-login")
def merchant_login(email: str, response: Response = None, db: Session = Depends(get_db)):
    if response:
        response.headers["Access-Control-Allow-Origin"] = "*"
    merchant = db.query(models.Merchant).filter(models.Merchant.email == email).first()
    if not merchant:
        return {"error": "Merchant not found"}
    return {
        "merchant_id": merchant.id,
        "name": merchant.name,
        "email": merchant.email,
        "business_type": merchant.business_type,
        "address": merchant.address
    }

@app.post("/create-merchant-coupon")
def create_merchant_coupon(coupon: schemas.MerchantCouponCreate, db: Session = Depends(get_db)):
    merchant = db.query(models.Merchant).filter(models.Merchant.id == coupon.merchant_id).first()
    if not merchant:
        return {"error": "Merchant not found"}
    
    existing = db.query(models.MerchantCoupon).filter(models.MerchantCoupon.code == coupon.code).first()
    if existing:
        return {"error": "Coupon code already exists"}
    
    coupon_db = models.MerchantCoupon(**coupon.dict())
    db.add(coupon_db)
    db.commit()
    db.refresh(coupon_db)
    return {"message": "Merchant coupon created", "coupon_id": coupon_db.id}

@app.get("/nearby-merchant-coupons")
def get_nearby_merchant_coupons(user_id: int, dest_lat: float, dest_lng: float, db: Session = Depends(get_db)):
    """Get merchant coupons near destination based on user eligibility"""
    
    # Get user stats
    user_rides = db.query(models.RideQueue).filter(
        models.RideQueue.user_id == user_id,
        models.RideQueue.status == "completed"
    ).all()
    
    total_rides = len(user_rides)
    total_spent = sum(ride.final_fare for ride in user_rides)
    
    # Get all active merchant coupons
    all_coupons = db.query(models.MerchantCoupon).filter(
        models.MerchantCoupon.is_active == True,
        models.MerchantCoupon.valid_until > datetime.utcnow()
    ).all()
    
    eligible_coupons = []
    for coupon in all_coupons:
        merchant = db.query(models.Merchant).filter(models.Merchant.id == coupon.merchant_id).first()
        if not merchant or not merchant.is_active:
            continue
        
        # Check distance
        distance = calculate_distance(dest_lat, dest_lng, merchant.latitude, merchant.longitude)
        if distance > coupon.radius_km:
            continue
        
        # Check eligibility
        if total_rides < coupon.min_rides_required:
            continue
        if total_spent < coupon.min_fare_spent:
            continue
        
        # Check usage limit
        if coupon.usage_limit and coupon.usage_count >= coupon.usage_limit:
            continue
        
        # Check if user already redeemed
        already_redeemed = db.query(models.CouponRedemption).filter(
            models.CouponRedemption.user_id == user_id,
            models.CouponRedemption.merchant_coupon_id == coupon.id
        ).first()
        
        if already_redeemed:
            continue
        
        eligible_coupons.append({
            "coupon_id": coupon.id,
            "code": coupon.code,
            "title": coupon.title,
            "description": coupon.description,
            "discount_type": coupon.discount_type,
            "discount_value": coupon.discount_value,
            "max_discount": coupon.max_discount,
            "min_purchase": coupon.min_purchase,
            "merchant_name": merchant.name,
            "merchant_type": merchant.business_type,
            "merchant_address": merchant.address,
            "distance_km": round(distance, 2),
            "valid_until": coupon.valid_until
        })
    
    # Sort by distance
    eligible_coupons.sort(key=lambda x: x["distance_km"])
    return eligible_coupons

@app.post("/redeem-merchant-coupon")
def redeem_merchant_coupon(user_id: int, coupon_id: int, ride_id: int, db: Session = Depends(get_db)):
    """Mark merchant coupon as redeemed"""
    coupon = db.query(models.MerchantCoupon).filter(models.MerchantCoupon.id == coupon_id).first()
    if not coupon:
        return {"error": "Coupon not found"}
    
    redemption = models.CouponRedemption(
        user_id=user_id,
        merchant_coupon_id=coupon_id,
        ride_id=ride_id
    )
    db.add(redemption)
    coupon.usage_count += 1
    db.commit()
    
    return {"message": "Coupon redeemed successfully"}

@app.get("/merchant-coupons/{merchant_id}")
def get_merchant_coupons(merchant_id: int, db: Session = Depends(get_db)):
    """Get all coupons for a merchant"""
    coupons = db.query(models.MerchantCoupon).filter(
        models.MerchantCoupon.merchant_id == merchant_id
    ).order_by(models.MerchantCoupon.created_at.desc()).all()
    return coupons

@app.get("/merchant-analytics/{merchant_id}")
def get_merchant_analytics(merchant_id: int, db: Session = Depends(get_db)):
    """Get analytics for merchant dashboard"""
    coupons = db.query(models.MerchantCoupon).filter(
        models.MerchantCoupon.merchant_id == merchant_id
    ).all()
    
    total_coupons = len(coupons)
    active_coupons = sum(1 for c in coupons if c.is_active)
    
    redemptions = db.query(models.CouponRedemption).join(
        models.MerchantCoupon
    ).filter(models.MerchantCoupon.merchant_id == merchant_id).all()
    
    total_redemptions = len(redemptions)
    unique_customers = len(set(r.user_id for r in redemptions))
    
    # Top performing coupons
    coupon_stats = {}
    for redemption in redemptions:
        coupon_id = redemption.merchant_coupon_id
        if coupon_id not in coupon_stats:
            coupon = next((c for c in coupons if c.id == coupon_id), None)
            if coupon:
                coupon_stats[coupon_id] = {
                    "code": coupon.code,
                    "title": coupon.title,
                    "redemptions": 0
                }
        if coupon_id in coupon_stats:
            coupon_stats[coupon_id]["redemptions"] += 1
    
    top_coupons = sorted(coupon_stats.values(), key=lambda x: x["redemptions"], reverse=True)[:5]
    
    # Recent activity
    recent_redemptions = db.query(models.CouponRedemption).join(
        models.MerchantCoupon
    ).filter(models.MerchantCoupon.merchant_id == merchant_id).order_by(
        models.CouponRedemption.redeemed_at.desc()
    ).limit(10).all()
    
    recent_activity = []
    for redemption in recent_redemptions:
        user = db.query(models.User).filter(models.User.id == redemption.user_id).first()
        coupon = db.query(models.MerchantCoupon).filter(
            models.MerchantCoupon.id == redemption.merchant_coupon_id
        ).first()
        if user and coupon:
            recent_activity.append({
                "user_name": user.name,
                "coupon_code": coupon.code,
                "redeemed_at": redemption.redeemed_at
            })
    
    # Customer stats
    user_redemptions = {}
    for redemption in redemptions:
        user_id = redemption.user_id
        user_redemptions[user_id] = user_redemptions.get(user_id, 0) + 1
    
    repeat_customers = sum(1 for count in user_redemptions.values() if count > 1)
    
    top_customers = []
    for user_id, count in sorted(user_redemptions.items(), key=lambda x: x[1], reverse=True)[:10]:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            top_customers.append({
                "name": user.name,
                "email": user.email,
                "redemption_count": count
            })
    
    return {
        "total_coupons": total_coupons,
        "active_coupons": active_coupons,
        "total_redemptions": total_redemptions,
        "unique_customers": unique_customers,
        "top_coupons": top_coupons,
        "recent_activity": recent_activity,
        "customer_stats": {
            "total_users": unique_customers,
            "total_drivers": 0,
            "repeat_customers": repeat_customers,
            "top_customers": top_customers
        }
    }

@app.get("/merchant-redemptions/{merchant_id}")
def get_merchant_redemptions(merchant_id: int, db: Session = Depends(get_db)):
    """Get all redemptions for merchant coupons"""
    redemptions = db.query(models.CouponRedemption).join(
        models.MerchantCoupon
    ).filter(models.MerchantCoupon.merchant_id == merchant_id).order_by(
        models.CouponRedemption.redeemed_at.desc()
    ).all()
    
    result = []
    for redemption in redemptions:
        user = db.query(models.User).filter(models.User.id == redemption.user_id).first()
        coupon = db.query(models.MerchantCoupon).filter(
            models.MerchantCoupon.id == redemption.merchant_coupon_id
        ).first()
        if user and coupon:
            result.append({
                "customer_name": user.name,
                "customer_type": "user",
                "coupon_code": coupon.code,
                "ride_id": redemption.ride_id,
                "redeemed_at": redemption.redeemed_at
            })
    
    return result

@app.post("/toggle-merchant-coupon/{coupon_id}")
def toggle_merchant_coupon(coupon_id: int, is_active: bool, db: Session = Depends(get_db)):
    """Toggle merchant coupon active status"""
    coupon = db.query(models.MerchantCoupon).filter(models.MerchantCoupon.id == coupon_id).first()
    if not coupon:
        return {"error": "Coupon not found"}
    
    coupon.is_active = is_active
    db.commit()
    return {"message": "Coupon updated"}

@app.delete("/delete-merchant-coupon/{coupon_id}")
def delete_merchant_coupon(coupon_id: int, db: Session = Depends(get_db)):
    """Delete a merchant coupon"""
    coupon = db.query(models.MerchantCoupon).filter(models.MerchantCoupon.id == coupon_id).first()
    if not coupon:
        return {"error": "Coupon not found"}
    
    # Delete associated redemptions first
    db.query(models.CouponRedemption).filter(
        models.CouponRedemption.merchant_coupon_id == coupon_id
    ).delete()
    
    db.delete(coupon)
    db.commit()
    return {"message": "Coupon deleted"}

@app.get("/all-merchants")
def get_all_merchants(db: Session = Depends(get_db)):
    """Get all merchants for admin"""
    merchants = db.query(models.Merchant).all()
    return merchants

@app.put("/update-merchant/{merchant_id}")
def update_merchant(merchant_id: int, merchant: schemas.MerchantCreate, db: Session = Depends(get_db)):
    """Update merchant details"""
    merchant_db = db.query(models.Merchant).filter(models.Merchant.id == merchant_id).first()
    if not merchant_db:
        return {"error": "Merchant not found"}
    
    for key, value in merchant.dict().items():
        setattr(merchant_db, key, value)
    
    db.commit()
    return {"message": "Merchant updated"}

@app.delete("/delete-merchant/{merchant_id}")
def delete_merchant(merchant_id: int, db: Session = Depends(get_db)):
    """Delete a merchant"""
    merchant = db.query(models.Merchant).filter(models.Merchant.id == merchant_id).first()
    if not merchant:
        return {"error": "Merchant not found"}
    
    # Delete associated coupons and redemptions
    coupons = db.query(models.MerchantCoupon).filter(models.MerchantCoupon.merchant_id == merchant_id).all()
    for coupon in coupons:
        db.query(models.CouponRedemption).filter(
            models.CouponRedemption.merchant_coupon_id == coupon.id
        ).delete()
        db.delete(coupon)
    
    db.delete(merchant)
    db.commit()
    return {"message": "Merchant deleted"}

# ------------------ HELPER ------------------

def assign_pending_rides(db: Session):
    """Assign pending rides to available drivers."""
    pending_rides = db.query(models.RideQueue).filter(models.RideQueue.status == "pending").all()
    for ride in pending_rides:
        driver = db.query(models.Driver).filter(models.Driver.status == "online").first()
        if driver:
            ride.driver_id = driver.id
            ride.status = "assigned"
            driver.status = "on_trip"
            
            # Use existing port if already allocated, otherwise get new one
            if not ride.port:
                ride.port = get_next_available_port()
                ride.container_name = f"ride-{ride.id}"
                create_ride_container(ride.id, ride.port)
            
            ride_port = ride.port
            db.commit()

            def finish_trip(driver_id, ride_id, ride_port, duration=1):
                time.sleep(duration * 60)
                
                # Get fresh DB session for the thread
                thread_db = SessionLocal()
                try:
                    driver = thread_db.query(models.Driver).filter(models.Driver.id == driver_id).first()
                    ride = thread_db.query(models.RideQueue).filter(models.RideQueue.id == ride_id).first()
                    
                    if driver and ride:
                        # Only set driver online if they were on_trip, not if they went offline
                        if driver.status == "on_trip":
                            driver.status = "online"
                        ride.status = "completed"
                        thread_db.commit()
                        
                        # Remove the ride container
                        remove_ride_container(ride_id, ride_port)
                        
                        assign_pending_rides(thread_db)
                finally:
                    thread_db.close()

            threading.Thread(target=finish_trip, args=(driver.id, ride.id, ride_port, 1)).start()
