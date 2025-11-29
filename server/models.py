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
    pickup_lat = Column(Float, nullable=True)
    pickup_lng = Column(Float, nullable=True)
    dest_lat = Column(Float, nullable=True)
    dest_lng = Column(Float, nullable=True)
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
    ride_requests = relationship("RideRequest", back_populates="ride")

class RideRequest(Base):
    __tablename__ = "ride_requests"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey("ride_queue.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    status = Column(String, default="pending")  # pending, accepted, rejected, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)

    ride = relationship("RideQueue", back_populates="ride_requests")
    driver = relationship("Driver")

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    location = Column(String)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
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

class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    business_type = Column(String)  # restaurant, cafe, shop, grocery, etc.
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    phone = Column(String, nullable=True)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    merchant_coupons = relationship("MerchantCoupon", back_populates="merchant")

class MerchantCoupon(Base):
    __tablename__ = "merchant_coupons"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"))
    code = Column(String, unique=True, index=True)
    title = Column(String)
    description = Column(String)
    discount_type = Column(String)  # percentage, flat
    discount_value = Column(Float)
    min_purchase = Column(Float, default=0.0)
    max_discount = Column(Float, nullable=True)
    valid_from = Column(DateTime, default=datetime.utcnow)
    valid_until = Column(DateTime)
    usage_limit = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0)
    min_rides_required = Column(Integer, default=0)  # User must have taken X rides
    min_fare_spent = Column(Float, default=0.0)  # User must have spent X on rides
    radius_km = Column(Float, default=0.5)  # Show coupon within X km of merchant
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    merchant = relationship("Merchant", back_populates="merchant_coupons")
    redemptions = relationship("CouponRedemption", back_populates="merchant_coupon")

class CouponRedemption(Base):
    __tablename__ = "coupon_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    merchant_coupon_id = Column(Integer, ForeignKey("merchant_coupons.id"))
    ride_id = Column(Integer, ForeignKey("ride_queue.id"))
    redeemed_at = Column(DateTime, default=datetime.utcnow)

    merchant_coupon = relationship("MerchantCoupon", back_populates="redemptions")
