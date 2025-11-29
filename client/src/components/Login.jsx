import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [userType, setUserType] = useState("user");
  const [adminPassword, setAdminPassword] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [driverCoords, setDriverCoords] = useState(null);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 10000
        });
      });

      const { latitude, longitude } = position.coords;
      
      if (userType === 'user') {
        setUserCoords({ lat: latitude, lng: longitude });
      } else if (userType === 'driver') {
        setDriverCoords({ lat: latitude, lng: longitude });
      }
      
      const locationStr = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
      setFormData(prev => ({ ...prev, location: locationStr }));
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Unable to get your location. Please enter it manually.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (userType === "admin") {
        if (adminPassword === "admin123") {
          const userData = {
            type: "admin",
            name: formData.name,
            email: formData.email
          };
          onLogin(userData);
          navigate('/admin');
        } else {
          alert("Invalid admin password");
          setIsLoading(false);
          return;
        }
      } else if (userType === "driver") {
        const params = {
          name: formData.name,
          email: formData.email,
          location: formData.location || 'Unknown'
        };
        
        if (driverCoords) {
          params.latitude = driverCoords.lat;
          params.longitude = driverCoords.lng;
        }
        
        const response = await axios.post(`${API_BASE_URL}/register-driver`, null, { params });
        
        await axios.post(`${API_BASE_URL}/go-online`, null, {
          params: { driver_id: response.data.driver_id }
        });
        
        const userData = {
          type: "driver",
          id: response.data.driver_id,
          name: formData.name,
          email: formData.email,
          location: formData.location
        };
        onLogin(userData);
        navigate('/driver');
      } else if (userType === "merchant") {
        let response = await axios.post(`${API_BASE_URL}/merchant-login`, null, {
          params: { email: formData.email }
        });
        
        if (response.data.error) {
          // Register new merchant
          const coords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve({ lat: 28.6139, lng: 77.2090 })
            );
          });
          
          response = await axios.post(`${API_BASE_URL}/register-merchant`, {
            name: formData.name,
            email: formData.email,
            business_type: merchantForm.business_type,
            address: merchantForm.address,
            latitude: coords.lat,
            longitude: coords.lng,
            phone: merchantForm.phone,
            description: merchantForm.description
          });
        }
        
        const userData = {
          type: "merchant",
          id: response.data.merchant_id,
          name: response.data.name || formData.name,
          email: formData.email,
          business_type: response.data.business_type || merchantForm.business_type,
          address: response.data.address || merchantForm.address
        };
        onLogin(userData);
        navigate('/merchant');
      } else {
        const response = await axios.post(`${API_BASE_URL}/register-user`, null, {
          params: {
            name: formData.name,
            email: formData.email
          }
        });
        
        const userData = {
          type: "user",
          id: response.data.user_id,
          name: formData.name,
          email: formData.email,
          location: userCoords
        };
        onLogin(userData);
        navigate('/user');
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const [merchantForm, setMerchantForm] = useState({
    business_type: "restaurant",
    address: "",
    phone: "",
    description: ""
  });

  const roles = [
    { id: "user", icon: "👤", title: "Passenger", color: "blue" },
    { id: "driver", icon: "🚗", title: "Driver", color: "green" },
    { id: "merchant", icon: "🏪", title: "Merchant", color: "orange" },
    { id: "admin", icon: "⚙️", title: "Admin", color: "purple" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl mb-4">
            <span className="text-3xl">🚖</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Mini-Uber</h1>
          <p className="text-gray-400">Choose your role to continue</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
          {/* Role Selector */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {roles.map((role) => {
              const isSelected = userType === role.id;
              const bgClass = isSelected ? 
                (role.id === 'user' ? 'bg-blue-600 border-blue-400 shadow-blue-500/50' :
                 role.id === 'driver' ? 'bg-green-600 border-green-400 shadow-green-500/50' :
                 role.id === 'merchant' ? 'bg-orange-600 border-orange-400 shadow-orange-500/50' :
                 'bg-purple-600 border-purple-400 shadow-purple-500/50') :
                'bg-white/5 border-white/10';
              
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setUserType(role.id)}
                  className={`relative p-4 rounded-xl transition-all border-2 ${bgClass} ${
                    isSelected ? 'text-white shadow-lg scale-105' : 'text-gray-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="text-2xl mb-1">{role.icon}</div>
                  <div className="text-xs font-semibold">{role.title}</div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <span className="text-xs text-gray-900">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                placeholder="Full Name"
              />
            </div>

            <div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                placeholder="Email"
              />
            </div>

            {userType === "driver" && (
              <div>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all mb-2"
                  placeholder="Current Location"
                />
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {isGettingLocation ? "Getting Location..." : "📍 Use Current Location"}
                </button>
              </div>
            )}

            {userType === "user" && (
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {isGettingLocation ? "Getting Location..." : userCoords ? "✅ Location Captured" : "📍 Get My Location"}
              </button>
            )}

            {userType === "merchant" && (
              <>
                <div>
                  <select
                    value={merchantForm.business_type}
                    onChange={(e) => setMerchantForm({...merchantForm, business_type: e.target.value})}
                    className="w-full px-4 py-3 bg-purple-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 transition-all"
                    style={{ color: 'white' }}
                  >
                    <option value="restaurant" style={{ color: 'white' }}>Restaurant</option>
                    <option value="cafe" style={{ color: 'white' }}>Cafe</option>
                    <option value="shop" style={{ color: 'white' }}>Shop</option>
                    <option value="grocery" style={{ color: 'white' }}>Grocery</option>
                    <option value="pharmacy" style={{ color: 'white' }}>Pharmacy</option>
                    <option value="other" style={{ color: 'white' }}>Other</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    required
                    value={merchantForm.address}
                    onChange={(e) => setMerchantForm({...merchantForm, address: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                    placeholder="e.g., 123 Main Street, New Delhi"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    required
                    value={merchantForm.phone}
                    onChange={(e) => setMerchantForm({...merchantForm, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all"
                    placeholder="e.g., +91 9876543210"
                  />
                </div>
                <div>
                  <textarea
                    value={merchantForm.description}
                    onChange={(e) => setMerchantForm({...merchantForm, description: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-all resize-none"
                    placeholder="e.g., Best Italian restaurant in town with authentic cuisine"
                    rows="2"
                  />
                </div>
              </>
            )}

            {userType === "admin" && (
              <div>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-all"
                  placeholder="Admin Password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 ${
                userType === "user" ? "bg-blue-600 hover:bg-blue-700" :
                userType === "driver" ? "bg-green-600 hover:bg-green-700" :
                userType === "merchant" ? "bg-orange-600 hover:bg-orange-700" :
                "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isLoading ? "Loading..." : "Continue"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Secure • Fast • Reliable
        </p>
      </div>
    </div>
  );
}
