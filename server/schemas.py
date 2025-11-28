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