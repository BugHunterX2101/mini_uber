-- Create Test Merchant
INSERT INTO merchants (name, email, business_type, address, latitude, longitude, phone, description, is_active)
VALUES (
    'Pizza Paradise',
    'pizza@paradise.com',
    'restaurant',
    'Connaught Place, New Delhi',
    28.6315,
    77.2167,
    '+91 9876543210',
    'Best Italian pizza in town with authentic wood-fired oven',
    true
);

-- Get the merchant ID (assuming it's 1, adjust if needed)
-- Create 5 Coupons for this merchant

-- Coupon 1: Welcome Offer
INSERT INTO merchant_coupons (merchant_id, code, title, description, discount_type, discount_value, max_discount, min_purchase, radius_km, min_rides_required, min_fare_spent, usage_limit, valid_until, is_active)
VALUES (
    1,
    'WELCOME20',
    '20% Off on First Order',
    'Get 20% discount on your first order at Pizza Paradise',
    'percentage',
    20,
    200,
    300,
    5.0,
    0,
    0,
    100,
    '2025-12-31 23:59:59',
    true
);

-- Coupon 2: Flat Discount
INSERT INTO merchant_coupons (merchant_id, code, title, description, discount_type, discount_value, max_discount, min_purchase, radius_km, min_rides_required, min_fare_spent, usage_limit, valid_until, is_active)
VALUES (
    1,
    'FLAT100',
    'Flat ₹100 Off',
    'Get flat ₹100 off on orders above ₹500',
    'flat',
    100,
    NULL,
    500,
    5.0,
    1,
    100,
    50,
    '2025-12-31 23:59:59',
    true
);

-- Coupon 3: Premium Customer
INSERT INTO merchant_coupons (merchant_id, code, title, description, discount_type, discount_value, max_discount, min_purchase, radius_km, min_rides_required, min_fare_spent, usage_limit, valid_until, is_active)
VALUES (
    1,
    'VIP30',
    '30% Off for Premium Customers',
    'Exclusive 30% discount for customers with 5+ rides',
    'percentage',
    30,
    300,
    400,
    5.0,
    5,
    500,
    30,
    '2025-12-31 23:59:59',
    true
);

-- Coupon 4: Weekend Special
INSERT INTO merchant_coupons (merchant_id, code, title, description, discount_type, discount_value, max_discount, min_purchase, radius_km, min_rides_required, min_fare_spent, usage_limit, valid_until, is_active)
VALUES (
    1,
    'WEEKEND50',
    'Weekend Special - ₹50 Off',
    'Flat ₹50 off on weekend orders',
    'flat',
    50,
    NULL,
    250,
    5.0,
    0,
    0,
    200,
    '2025-12-31 23:59:59',
    true
);

-- Coupon 5: Mega Deal
INSERT INTO merchant_coupons (merchant_id, code, title, description, discount_type, discount_value, max_discount, min_purchase, radius_km, min_rides_required, min_fare_spent, usage_limit, valid_until, is_active)
VALUES (
    1,
    'MEGA25',
    '25% Off Mega Deal',
    'Get 25% off on orders above ₹600',
    'percentage',
    25,
    250,
    600,
    5.0,
    2,
    200,
    75,
    '2025-12-31 23:59:59',
    true
);
