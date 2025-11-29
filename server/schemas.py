from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RideRequest(BaseModel):
    user_id: int
    start: str
    destination: str

class RideResponse(BaseModel):
    id: int
    user_id: int
    start: str
    destination: str
    status: str

    class Config:
        from_attributes = True

class RideCreate(BaseModel):
    user_id: int
    start: str
    destination: str
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dest_lat: Optional[float] = None
    dest_lng: Optional[float] = None
    coupon_code: Optional[str] = None

class CouponCreate(BaseModel):
    code: str
    discount_type: str
    discount_value: float
    max_discount: Optional[float] = None
    min_fare: float = 0.0
    valid_until: datetime
    total_usage_limit: Optional[int] = None
    per_user_limit: int = 1
    target_audience: str = "customer"
    zone: Optional[str] = None

class MerchantCreate(BaseModel):
    name: str
    email: str
    business_type: str
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    description: Optional[str] = None

class MerchantCouponCreate(BaseModel):
    merchant_id: int
    code: str
    title: str
    description: str
    discount_type: str
    discount_value: float
    min_purchase: float = 0.0
    max_discount: Optional[float] = None
    valid_until: datetime
    usage_limit: Optional[int] = None
    min_rides_required: int = 0
    min_fare_spent: float = 0.0
    radius_km: float = 0.5