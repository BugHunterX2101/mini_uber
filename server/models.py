from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from db import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    rides = relationship("RideQueue", back_populates="user")
    user_coupons = relationship("UserCoupon", back_populates="user")

class RideQueue(Base):
    __tablename__ = "ride_queue"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    start = Column(String)
    destination = Column(String)
    status = Column(String, default="pending")
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    port = Column(Integer, nullable=True)
    container_name = Column(String, nullable=True)
    fare = Column(Float, default=100.0)
    discount = Column(Float, default=0.0)
    final_fare = Column(Float, default=100.0)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="rides")
    driver = relationship("Driver", back_populates="rides")
    coupon = relationship("Coupon")

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    location = Column(String)
    status = Column(String, default="offline")
    last_seen = Column(DateTime, default=datetime.utcnow)

    rides = relationship("RideQueue", back_populates="driver")

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    discount_type = Column(String)
    discount_value = Column(Float)
    max_discount = Column(Float, nullable=True)
    min_fare = Column(Float, default=0.0)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    total_usage_limit = Column(Integer, nullable=True)
    per_user_limit = Column(Integer, default=1)
    usage_count = Column(Integer, default=0)
    target_audience = Column(String, default="customer")
    zone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_coupons = relationship("UserCoupon", back_populates="coupon")

class UserCoupon(Base):
    __tablename__ = "user_coupons"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    coupon_id = Column(Integer, ForeignKey("coupons.id"))
    usage_count = Column(Integer, default=0)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="user_coupons")
    coupon = relationship("Coupon", back_populates="user_coupons")
