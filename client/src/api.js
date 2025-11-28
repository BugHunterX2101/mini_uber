const API_URL = "http://127.0.0.1:8000";

export async function getQueue() {
  const res = await fetch(`${API_URL}/queue`);
  return res.json();
}

export async function bookRide(userId, start, destination, couponCode = null) {
  const res = await fetch(`${API_URL}/book-ride`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: Number(userId), start, destination, coupon_code: couponCode })
  });
  return res.json();
}

export async function getUserCoupons(userId, location = null) {
  const url = location 
    ? `${API_URL}/user-coupons/${userId}?location=${encodeURIComponent(location)}`
    : `${API_URL}/user-coupons/${userId}`;
  const res = await fetch(url);
  return res.json();
}

export async function validateCoupon(userId, code, fare, location = null) {
  const url = new URL(`${API_URL}/validate-coupon`);
  url.searchParams.append('user_id', userId);
  url.searchParams.append('code', code);
  url.searchParams.append('fare', fare);
  if (location) url.searchParams.append('location', location);
  
  const res = await fetch(url, { method: 'POST' });
  return res.json();
}

export async function nextRide() {
  const res = await fetch(`${API_URL}/next-ride`);
  return res.json();
}
