import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
import MapComponent from "./MapComponent";

export default function UserDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [currentRide, setCurrentRide] = useState(null);
  const [rides, setRides] = useState([]);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);

  const fetchRides = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/queue`);
      const userRides = response.data.filter(ride => ride.user_id === user.id);
      setRides(userRides);
      
      const activeRide = userRides.find(ride => 
        ride.status === "searching" || ride.status === "assigned"
      );
      setCurrentRide(activeRide);
      
      // Check for completed rides and fetch merchant coupons
      const justCompleted = userRides.find(ride => 
        ride.status === "completed" && ride.dest_lat && ride.dest_lng
      );
      if (justCompleted && !showMerchantCoupons) {
        fetchMerchantCoupons(justCompleted.dest_lat, justCompleted.dest_lng, justCompleted.id);
      }
    } catch (error) {
      console.error("Error fetching rides:", error);
    }
  };

  const fetchMerchantCoupons = async (destLat, destLng, rideId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/nearby-merchant-coupons`, {
        params: { user_id: user.id, dest_lat: destLat, dest_lng: destLng }
      });
      if (response.data.length > 0) {
        setMerchantCoupons(response.data);
        setShowMerchantCoupons(true);
      }
    } catch (error) {
      console.error("Error fetching merchant coupons:", error);
    }
  };

  const redeemMerchantCoupon = async (couponId, rideId) => {
    try {
      await axios.post(`${API_BASE_URL}/redeem-merchant-coupon`, null, {
        params: { user_id: user.id, coupon_id: couponId, ride_id: rideId }
      });
      alert("Coupon saved! Show this at the merchant to redeem.");
      setMerchantCoupons(prev => prev.filter(c => c.coupon_id !== couponId));
    } catch (error) {
      console.error("Error redeeming coupon:", error);
    }
  };

  const fetchNearbyDrivers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/available-drivers`);
      setNearbyDrivers(response.data);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [showCoupons, setShowCoupons] = useState(false);
  const [fareEstimate, setFareEstimate] = useState(100);
  const [discount, setDiscount] = useState(0);
  const [userLocation, setUserLocation] = useState(user.location || null);
  const [watchId, setWatchId] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [merchantCoupons, setMerchantCoupons] = useState([]);
  const [showMerchantCoupons, setShowMerchantCoupons] = useState(false);

  const searchLocation = async (query, setSuggestions) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/user-coupons/${user.id}`, {
        params: { location: pickup }
      });
      setAvailableCoupons(response.data);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    }
  };

  const applyCoupon = async (code) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/validate-coupon`, null, {
        params: {
          user_id: user.id,
          code: code,
          fare: fareEstimate,
          location: pickup
        }
      });
      
      if (response.data.valid) {
        setDiscount(response.data.discount);
        setSelectedCoupon(code);
        setCouponCode(code);
        setShowCoupons(false);
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error validating coupon:", error);
      alert("Failed to validate coupon");
    }
  };

  const bookRide = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${API_BASE_URL}/book-ride`, {
        user_id: user.id,
        start: pickup,
        destination: destination,
        pickup_lat: pickupCoords?.lat || userLocation?.lat,
        pickup_lng: pickupCoords?.lng || userLocation?.lng,
        dest_lat: destCoords?.lat,
        dest_lng: destCoords?.lng,
        coupon_code: couponCode || null
      });
      
      setPickup("");
      setDestination("");
      setPickupCoords(null);
      setDestCoords(null);
      setCouponCode("");
      setSelectedCoupon(null);
      setDiscount(0);
      fetchRides();
      
      alert(response.data.message + ` (${response.data.nearby_drivers} drivers notified)`);
    } catch (error) {
      console.error("Error booking ride:", error);
      alert("Failed to book ride. Please try again.");
    }
  };

  useEffect(() => {
    fetchRides();
    fetchNearbyDrivers();
    fetchCoupons();
    
    // Start watching user location if not already set
    if (navigator.geolocation) {
      if (!userLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => console.error('Location error:', error),
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 10000 }
        );
      }
      
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: false, maximumAge: 10000 }
      );
      setWatchId(id);
    }
    
    const interval = setInterval(() => {
      fetchRides();
      fetchNearbyDrivers();
    }, 8000);
    
    return () => {
      clearInterval(interval);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (pickup) {
      fetchCoupons();
    }
  }, [pickup]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 overflow-x-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-4 sm:p-6 mb-6 animate-fadeIn overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="min-w-0 flex-1 max-w-full">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 break-words overflow-hidden">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm">Ready for your next journey?</p>
            </div>
            <button
              onClick={() => {
                onLogout();
                navigate('/');
              }}
              className="px-3 sm:px-4 py-2 bg-white text-white-600 rounded-xl hover:bg-blue-50 transition-all duration-300 font-semibold shadow-lg whitespace-nowrap flex-shrink-0 text-sm sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 animate-slideUp">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚗</span>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Available Drivers</p>
                <p className="text-3xl font-bold text-gray-900">{nearbyDrivers.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 animate-slideUp" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📍</span>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Rides</p>
                <p className="text-3xl font-bold text-gray-900">{rides.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form or Current Ride */}
        {!currentRide ? (
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-6 animate-scaleIn">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚖</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Book Your Ride</h2>
            </div>
            <form onSubmit={bookRide} className="space-y-5">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span>📍</span> Pickup Location
                </label>
                <input
                  type="text"
                  required
                  value={pickup}
                  onChange={(e) => {
                    setPickup(e.target.value);
                    searchLocation(e.target.value, setPickupSuggestions);
                    setShowPickupSuggestions(true);
                  }}
                  onFocus={() => setShowPickupSuggestions(true)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-all duration-300 hover:border-blue-300"
                  placeholder="Where are you?"
                />
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {pickupSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setPickup(suggestion.display_name);
                          setPickupCoords({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) });
                          setShowPickupSuggestions(false);
                        }}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm text-gray-900">{suggestion.display_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <span>🎯</span> Destination
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    searchLocation(e.target.value, setDestSuggestions);
                    setShowDestSuggestions(true);
                  }}
                  onFocus={() => setShowDestSuggestions(true)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-all duration-300 hover:border-blue-300"
                  placeholder="Where to?"
                />
                {showDestSuggestions && destSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {destSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setDestination(suggestion.display_name);
                          setDestCoords({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) });
                          setShowDestSuggestions(false);
                        }}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm text-gray-900">{suggestion.display_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setShowCoupons(!showCoupons)}
                  className="w-full mb-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>🎟️</span> {selectedCoupon ? `Coupon: ${selectedCoupon}` : 'Apply Coupon'}
                </button>
                
                {showCoupons && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-xl max-h-60 overflow-y-auto">
                    <h3 className="font-semibold text-gray-800 mb-3">Available Coupons</h3>
                    {availableCoupons.length === 0 ? (
                      <p className="text-gray-500 text-sm">No coupons available</p>
                    ) : (
                      <div className="space-y-2">
                        {availableCoupons.map((coupon) => (
                          <div
                            key={coupon.id}
                            onClick={() => applyCoupon(coupon.code)}
                            className="p-3 bg-white border-2 border-green-200 rounded-lg cursor-pointer hover:border-green-400 transition-all"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-green-600">{coupon.code}</p>
                                <p className="text-sm text-gray-600">
                                  {coupon.discount_type === 'percentage' 
                                    ? `${coupon.discount_value}% off` 
                                    : `₹${coupon.discount_value} off`}
                                  {coupon.max_discount && ` (max ₹${coupon.max_discount})`}
                                </p>
                                {coupon.zone && (
                                  <p className="text-xs text-gray-500">Valid in: {coupon.zone}</p>
                                )}
                              </div>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                {coupon.usage_limit - coupon.usage_count} left
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {discount > 0 && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base Fare:</span>
                      <span className="text-gray-900">₹{fareEstimate}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount:</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-green-600">₹{(fareEstimate - discount).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-lg shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🚖</span> Book Ride Now
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-xl p-6 sm:p-8 mb-6 border-2 border-green-200 animate-scaleIn overflow-hidden">
            <h2 className="text-xl sm:text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
              <span>🚗</span> Current Ride
            </h2>
            <div className="space-y-3">
              <div className="bg-white rounded-xl p-4 overflow-hidden">
                <p className="text-sm text-gray-600">From</p>
                <p className="font-semibold text-gray-900 break-words">{currentRide.start}</p>
              </div>
              <div className="bg-white rounded-xl p-4 overflow-hidden">
                <p className="text-sm text-gray-600">To</p>
                <p className="font-semibold text-gray-900 break-words">{currentRide.destination}</p>
              </div>
              <div className="bg-white rounded-xl p-4 overflow-hidden">
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold text-gray-900 mb-2">{currentRide.status === "pending" ? "🔍 Finding Driver" : "🚗 Driver Assigned"}</p>
                {currentRide.status === "assigned" && currentRide.port && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg overflow-hidden">
                    <p className="text-sm font-semibold text-blue-800 mb-2">🐈 Your Ride Container:</p>
                    <p className="text-sm text-blue-600 mb-3 break-all">Port: <code className="bg-blue-100 px-2 py-1 rounded">{currentRide.port}</code></p>
                    <a 
                      href={`http://localhost:${currentRide.port}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 text-sm"
                    >
                      🌐 View Ride Details
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🗺️</span> Live Location & Nearby Drivers
          </h2>
          {userLocation && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                📍 Your Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            </div>
          )}
          <MapComponent 
            rides={currentRide ? [currentRide] : []} 
            drivers={nearbyDrivers}
            userLocation={userLocation}
            center={userLocation || { lat: 28.6139, lng: 77.2090 }} 
          />
        </div>

        {/* Merchant Coupons Modal */}
        {showMerchantCoupons && merchantCoupons.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">🎉 Special Offers Near You!</h2>
                  <button
                    onClick={() => setShowMerchantCoupons(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm mt-2 opacity-90">Exclusive deals from nearby businesses</p>
              </div>
              
              <div className="p-6 space-y-4">
                {merchantCoupons.map((coupon) => (
                  <div key={coupon.coupon_id} className="border-2 border-purple-200 rounded-xl p-4 hover:shadow-lg transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                        {coupon.merchant_type === 'restaurant' ? '🍴' :
                         coupon.merchant_type === 'cafe' ? '☕' :
                         coupon.merchant_type === 'shop' ? '🛍️' :
                         coupon.merchant_type === 'grocery' ? '🛒' : '🏪'}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">{coupon.merchant_name}</h3>
                        <p className="text-sm text-gray-600">{coupon.merchant_address}</p>
                        <p className="text-xs text-blue-600 mt-1">📍 {coupon.distance_km} km away</p>
                        
                        <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                          <p className="font-bold text-purple-700">{coupon.title}</p>
                          <p className="text-sm text-gray-700 mt-1">{coupon.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                              {coupon.discount_type === 'percentage' 
                                ? `${coupon.discount_value}% OFF` 
                                : `₹${coupon.discount_value} OFF`}
                            </span>
                            {coupon.min_purchase > 0 && (
                              <span className="text-xs text-gray-600">Min: ₹{coupon.min_purchase}</span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => redeemMerchantCoupon(coupon.coupon_id, rides[0]?.id)}
                          className="mt-3 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold"
                        >
                          🎫 Save Coupon
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ride History */}
        {rides.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>📜</span> Ride History
            </h2>
            <div className="space-y-3">
              {rides.map((ride) => (
                <div key={ride.id} className="border-l-4 border-blue-500 bg-gray-50 rounded-r-xl pl-4 py-3 hover:bg-gray-100 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{ride.start} → {ride.destination}</p>
                      <p className="text-sm text-gray-600">Ride #{ride.id}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      ride.status === "completed" ? "bg-green-100 text-green-800" :
                      ride.status === "assigned" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {ride.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
