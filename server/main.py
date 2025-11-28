from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import threading, time, subprocess, json

from db import SessionLocal, engine
import models, schemas

# Create tables (don't drop existing data)
models.Base.metadata.create_all(bind=engine)

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
def register_user(name: str, email: str, db: Session = Depends(get_db)):
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
def register_driver(name: str, email: str, location: str, db: Session = Depends(get_db)):
    existing = db.query(models.Driver).filter(models.Driver.email == email).first()
    if existing:
        existing.status = "offline"
        existing.last_seen = datetime.utcnow()
        db.commit()
        return {"message": "Driver already exists", "driver_id": existing.id}
    driver = models.Driver(name=name, email=email, location=location, status="offline", last_seen=datetime.utcnow())
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
def heartbeat(driver_id: int, db: Session = Depends(get_db)):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        return {"error": "Driver not found"}
    driver.last_seen = datetime.utcnow()
    if driver.status == "offline":
        driver.status = "online"
    db.commit()
    return {"message": "Heartbeat received", "status": driver.status}


@app.get("/available-drivers")
def available_drivers(db: Session = Depends(get_db)):
    from datetime import timedelta
    
    timeout = datetime.utcnow() - timedelta(seconds=15)
    inactive_drivers = db.query(models.Driver).filter(
        models.Driver.status == "online",
        models.Driver.last_seen < timeout
    ).all()
    
    for driver in inactive_drivers:
        driver.status = "offline"
    db.commit()
    
    online_drivers = db.query(models.Driver).filter(models.Driver.status == "online").all()
    print(f"🚗 Available drivers: {len(online_drivers)} - {[d.name for d in online_drivers]}")
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

@app.post("/book-ride")
def book_ride(ride: schemas.RideCreate, response: Response, db: Session = Depends(get_db)):
    user_id = ride.user_id
    start = ride.start
    destination = ride.destination
    coupon_code = ride.coupon_code

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
    ride_port = get_next_available_port()
    
    driver = db.query(models.Driver).filter(models.Driver.status == "online").first()
    
    if driver:
        status = "assigned"
        driver.status = "on_trip"
        assigned_driver_id = driver.id
    else:
        status = "pending"
        assigned_driver_id = None

    ride_db = models.RideQueue(
        user_id=user_id,
        start=start,
        destination=destination,
        status=status,
        driver_id=assigned_driver_id,
        port=ride_port,
        fare=base_fare,
        discount=discount,
        final_fare=final_fare,
        coupon_id=coupon_id
    )
    db.add(ride_db)
    db.commit()
    db.refresh(ride_db)
    
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
    
    container_name = f"ride-{ride_db.id}"
    ride_db.container_name = container_name
    db.commit()
    
    container_created = create_ride_container(ride_db.id, ride_port)
    
    if not container_created:
        print(f"⚠️ Warning: Could not create container for ride {ride_db.id}")

    if driver:
        def finish_trip(driver_id, ride_id, ride_port, duration=1):
            time.sleep(duration * 60)
            
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
                    
                    assign_pending_rides(thread_db)
            finally:
                thread_db.close()

        threading.Thread(target=finish_trip, args=(driver.id, ride_db.id, ride_port, 1)).start()

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    return {
        "message": "Ride booked 🚖", 
        "ride_id": ride_db.id,
        "user_id": user_id,
        "start": start,
        "destination": destination,
        "driver": driver.name if driver else None,
        "driver_id": driver.id if driver else None,
        "ride_port": ride_port,
        "ride_url": f"http://localhost:{ride_port}",
        "fare": base_fare,
        "discount": discount,
        "final_fare": final_fare
    }


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
