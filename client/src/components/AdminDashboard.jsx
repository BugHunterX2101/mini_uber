import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";

function MerchantsManagement() {
  const [merchants, setMerchants] = useState([]);
  const [editingMerchant, setEditingMerchant] = useState(null);

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/all-merchants`);
      setMerchants(response.data);
    } catch (error) {
      console.error("Error fetching merchants:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this merchant?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/delete-merchant/${id}`);
      alert("Merchant deleted");
      fetchMerchants();
    } catch (error) {
      alert("Failed to delete merchant");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/update-merchant/${editingMerchant.id}`, editingMerchant);
      alert("Merchant updated");
      setEditingMerchant(null);
      fetchMerchants();
    } catch (error) {
      alert("Failed to update merchant");
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-6">🏪 Merchants Management</h2>
      
      <div className="grid gap-4">
        {merchants.map((merchant) => (
          <div key={merchant.id} className="bg-white/10 rounded-xl p-4">
            {editingMerchant?.id === merchant.id ? (
              <form onSubmit={handleUpdate} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input value={editingMerchant.name} onChange={(e) => setEditingMerchant({...editingMerchant, name: e.target.value})} className="px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white" />
                  <input value={editingMerchant.email} onChange={(e) => setEditingMerchant({...editingMerchant, email: e.target.value})} className="px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white" />
                  <input value={editingMerchant.phone} onChange={(e) => setEditingMerchant({...editingMerchant, phone: e.target.value})} className="px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white" />
                  <select value={editingMerchant.business_type} onChange={(e) => setEditingMerchant({...editingMerchant, business_type: e.target.value})} className="px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white">
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe</option>
                    <option value="shop">Shop</option>
                    <option value="grocery">Grocery</option>
                    <option value="pharmacy">Pharmacy</option>
                  </select>
                </div>
                <input value={editingMerchant.address} onChange={(e) => setEditingMerchant({...editingMerchant, address: e.target.value})} className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white" />
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Save</button>
                  <button type="button" onClick={() => setEditingMerchant(null)} className="px-4 py-2 bg-gray-600 text-white rounded-lg">Cancel</button>
                </div>
              </form>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">{merchant.name}</h3>
                  <p className="text-gray-300 text-sm">{merchant.email} • {merchant.phone}</p>
                  <p className="text-gray-400 text-sm">{merchant.business_type} • {merchant.address}</p>
                  <p className="text-gray-500 text-xs mt-1">{merchant.is_active ? "✅ Active" : "❌ Inactive"}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingMerchant(merchant)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm">Edit</button>
                  <button onClick={() => handleDelete(merchant.id)} className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm">Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


export default function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [coupons, setCoupons] = useState([]);
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({
    totalRides: 0,
    activeRides: 0,
    totalRevenue: 0,
    totalDiscount: 0,
    onlineDrivers: 0
  });
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    max_discount: "",
    min_fare: "0",
    valid_until: "",
    total_usage_limit: "",
    per_user_limit: "1",
    zone: ""
  });

  const fetchCoupons = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/coupons`);
      setCoupons(response.data);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    }
  };

  const fetchRides = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/queue`);
      setRides(response.data);
      
      const totalRevenue = response.data.reduce((sum, ride) => sum + (ride.final_fare || 0), 0);
      const totalDiscount = response.data.reduce((sum, ride) => sum + (ride.discount || 0), 0);
      const activeRides = response.data.filter(r => r.status === 'assigned' || r.status === 'pending').length;
      
      setStats(prev => ({
        ...prev,
        totalRides: response.data.length,
        activeRides,
        totalRevenue,
        totalDiscount
      }));
    } catch (error) {
      console.error("Error fetching rides:", error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/available-drivers`);
      setDrivers(response.data);
      setStats(prev => ({ ...prev, onlineDrivers: response.data.length }));
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const createCoupon = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        min_fare: parseFloat(formData.min_fare),
        total_usage_limit: formData.total_usage_limit ? parseInt(formData.total_usage_limit) : null,
        per_user_limit: parseInt(formData.per_user_limit),
        zone: formData.zone || null
      };
      
      await axios.post(`${API_BASE_URL}/create-coupon`, payload);
      
      alert("Coupon created successfully!");
      setFormData({
        code: "",
        discount_type: "percentage",
        discount_value: "",
        max_discount: "",
        min_fare: "0",
        valid_until: "",
        total_usage_limit: "",
        per_user_limit: "1",
        zone: ""
      });
      fetchCoupons();
    } catch (error) {
      console.error("Error creating coupon:", error);
      alert("Failed to create coupon");
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchRides();
    fetchDrivers();
    
    const interval = setInterval(() => {
      fetchRides();
      fetchDrivers();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Control Center 👨💼</h1>
              <p className="text-purple-100">Manage your Mini-Uber platform</p>
            </div>
            <button
              onClick={() => {
                onLogout();
                navigate('/');
              }}
              className="px-6 py-3 bg-white text-purple-600 rounded-xl hover:bg-purple-50 font-semibold shadow-lg transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 shadow-lg">
            <div className="text-blue-100 text-sm mb-1">Total Rides</div>
            <div className="text-3xl font-bold text-white">{stats.totalRides}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 shadow-lg">
            <div className="text-green-100 text-sm mb-1">Active Rides</div>
            <div className="text-3xl font-bold text-white">{stats.activeRides}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 shadow-lg">
            <div className="text-purple-100 text-sm mb-1">Revenue</div>
            <div className="text-3xl font-bold text-white">₹{stats.totalRevenue.toFixed(0)}</div>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-4 shadow-lg">
            <div className="text-pink-100 text-sm mb-1">Discounts</div>
            <div className="text-3xl font-bold text-white">₹{stats.totalDiscount.toFixed(0)}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 shadow-lg">
            <div className="text-orange-100 text-sm mb-1">Online Drivers</div>
            <div className="text-3xl font-bold text-white">{stats.onlineDrivers}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-2 mb-6 flex gap-2 overflow-x-auto">
          {['overview', 'rides', 'drivers', 'coupons', 'merchants', 'simulator'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-white text-purple-600 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">📊 Recent Activity</h2>
              <div className="space-y-3">
                {rides.slice(0, 5).map(ride => (
                  <div key={ride.id} className="bg-white/10 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">Ride #{ride.id}</p>
                        <p className="text-gray-300 text-sm">{ride.start} → {ride.destination}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        ride.status === 'completed' ? 'bg-green-500 text-white' :
                        ride.status === 'assigned' ? 'bg-blue-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {ride.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">🚗 Active Drivers</h2>
              <div className="space-y-3">
                {drivers.slice(0, 5).map(driver => (
                  <div key={driver.id} className="bg-white/10 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{driver.name}</p>
                        <p className="text-gray-300 text-sm">{driver.location}</p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rides Tab */}
        {activeTab === 'rides' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-4">🚖 All Rides ({rides.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-white py-3 px-4">ID</th>
                    <th className="text-left text-white py-3 px-4">User</th>
                    <th className="text-left text-white py-3 px-4">Route</th>
                    <th className="text-left text-white py-3 px-4">Fare</th>
                    <th className="text-left text-white py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map(ride => (
                    <tr key={ride.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="text-white py-3 px-4">#{ride.id}</td>
                      <td className="text-white py-3 px-4">User {ride.user_id}</td>
                      <td className="text-gray-300 py-3 px-4 text-sm">{ride.start} → {ride.destination}</td>
                      <td className="text-white py-3 px-4">
                        ₹{ride.final_fare?.toFixed(2) || ride.fare?.toFixed(2) || '0.00'}
                        {ride.discount > 0 && (
                          <span className="text-green-400 text-xs ml-2">(-₹{ride.discount.toFixed(2)})</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          ride.status === 'completed' ? 'bg-green-500 text-white' :
                          ride.status === 'assigned' ? 'bg-blue-500 text-white' :
                          'bg-yellow-500 text-white'
                        }`}>
                          {ride.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-4">🚗 All Drivers ({drivers.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drivers.map(driver => (
                <div key={driver.id} className="bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-bold text-lg">{driver.name}</p>
                      <p className="text-gray-300 text-sm">{driver.email}</p>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-gray-400 text-sm">📍 {driver.location}</p>
                  <p className="text-green-400 text-sm mt-2 font-semibold">Online</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simulator Tab */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">🎮 Scalability Simulator</h2>
                  <p className="text-white/80 mt-2">Test platform scalability by creating multiple users and drivers simultaneously</p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm('⚠️ This will delete ALL simulation test data (users/drivers with @test.com emails). Continue?')) return;
                    try {
                      const response = await axios.post(`${API_BASE_URL}/cleanup-simulation-data`);
                      alert(`✅ Cleanup Complete!\n\n👥 Users deleted: ${response.data.deleted_users}\n🚗 Drivers deleted: ${response.data.deleted_drivers}\n🚖 Rides deleted: ${response.data.deleted_rides}`);
                      fetchRides();
                      fetchDrivers();
                    } catch (error) {
                      alert('❌ Cleanup failed: ' + error.message);
                    }
                  }}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  🗑️ Cleanup Test Data
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">Number of Users</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      defaultValue="10"
                      id="numUsers"
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const num = parseInt(document.getElementById('numUsers').value);
                      const startTime = Date.now();
                      setStats(prev => ({...prev, isSimulating: true}));
                      
                      for (let i = 0; i < num; i++) {
                        await axios.post(`${API_BASE_URL}/register-user`, null, {
                          params: {
                            name: `User${Date.now()}-${i}`,
                            email: `user${Date.now()}-${i}@test.com`
                          }
                        });
                      }
                      
                      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                      alert(`✅ Created ${num} users in ${duration}s\n📈 Rate: ${(num/duration).toFixed(1)} users/sec`);
                      setStats(prev => ({...prev, isSimulating: false}));
                      fetchRides();
                    }}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700"
                  >
                    👥 Create Users
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">Number of Drivers</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      defaultValue="10"
                      id="numDrivers"
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const num = parseInt(document.getElementById('numDrivers').value);
                      const locations = [
                        {name: 'Delhi', lat: 28.6139, lng: 77.2090},
                        {name: 'Mumbai', lat: 19.0760, lng: 72.8777},
                        {name: 'Bangalore', lat: 12.9716, lng: 77.5946},
                        {name: 'Pune', lat: 18.5204, lng: 73.8567},
                        {name: 'Hyderabad', lat: 17.3850, lng: 78.4867}
                      ];
                      const startTime = Date.now();
                      setStats(prev => ({...prev, isSimulating: true}));
                      
                      for (let i = 0; i < num; i++) {
                        const loc = locations[i % locations.length];
                        const response = await axios.post(`${API_BASE_URL}/register-driver`, null, {
                          params: {
                            name: `Driver${Date.now()}-${i}`,
                            email: `driver${Date.now()}-${i}@test.com`,
                            location: loc.name,
                            latitude: loc.lat + (Math.random() - 0.5) * 0.1,
                            longitude: loc.lng + (Math.random() - 0.5) * 0.1
                          }
                        });
                        const driverId = response.data.driver_id;
                        await axios.post(`${API_BASE_URL}/go-online`, null, {
                          params: { driver_id: driverId }
                        });
                      }
                      
                      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                      alert(`✅ Created ${num} drivers in ${duration}s\n📈 Rate: ${(num/duration).toFixed(1)} drivers/sec`);
                      setStats(prev => ({...prev, isSimulating: false}));
                      fetchDrivers();
                    }}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-green-700"
                  >
                    🚗 Create & Online Drivers
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white font-semibold mb-2">Concurrent Rides</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      defaultValue="5"
                      id="numRides"
                      className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const num = parseInt(document.getElementById('numRides').value);
                      const startTime = Date.now();
                      setStats(prev => ({...prev, isSimulating: true}));
                      
                      // Get available drivers first
                      const driversResponse = await axios.get(`${API_BASE_URL}/available-drivers`);
                      const availableDrivers = driversResponse.data;
                      
                      if (availableDrivers.length === 0) {
                        alert('❌ No online drivers available! Create drivers first.');
                        setStats(prev => ({...prev, isSimulating: false}));
                        return;
                      }
                      
                      if (num > availableDrivers.length) {
                        alert(`⚠️ You have ${availableDrivers.length} drivers but want ${num} concurrent rides.\nCreate at least ${num} drivers for best results.`);
                      }
                      
                      try {
                        // Create rides directly with unique drivers (bypasses request/accept flow)
                        const ridePromises = [];
                        for (let i = 0; i < Math.min(num, availableDrivers.length); i++) {
                          const driver = availableDrivers[i];
                          const promise = axios.post(`${API_BASE_URL}/simulate-ride-with-driver`, null, {
                            params: {
                              user_id: 1,
                              driver_id: driver.id
                            }
                          });
                          ridePromises.push(promise);
                          // Small delay between each ride to prevent port conflicts
                          await new Promise(resolve => setTimeout(resolve, 300));
                        }
                        
                        const results = await Promise.all(ridePromises);
                        const successCount = results.filter(r => !r.data.error).length;
                        
                        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                        alert(`✅ Created ${successCount} concurrent rides in ${duration}s\n🐳 Check Docker Desktop for ${successCount} ride containers!\n📊 Containers: ride-1, ride-2, ride-3...\n🌐 Access at: localhost:7000, 7001, 7002...`);
                        setStats(prev => ({...prev, isSimulating: false}));
                        fetchRides();
                      } catch (error) {
                        alert('❌ Simulation failed: ' + error.message);
                        setStats(prev => ({...prev, isSimulating: false}));
                      }
                    }}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-700"
                  >
                    🚀 Simulate Concurrent Rides
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-500/20 border border-blue-400/50 rounded-xl p-4">
                  <h4 className="text-blue-300 font-bold mb-2">👥 User Creation</h4>
                  <p className="text-white/80 text-sm">Creates users with unique emails and timestamps</p>
                </div>
                <div className="bg-green-500/20 border border-green-400/50 rounded-xl p-4">
                  <h4 className="text-green-300 font-bold mb-2">🚗 Driver Deployment</h4>
                  <p className="text-white/80 text-sm">Distributes drivers across 5 cities with GPS coordinates</p>
                </div>
                <div className="bg-purple-500/20 border border-purple-400/50 rounded-xl p-4">
                  <h4 className="text-purple-300 font-bold mb-2">🚀 Load Testing</h4>
                  <p className="text-white/80 text-sm">Tests concurrent ride booking and driver matching</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/50 rounded-xl p-6">
              <h3 className="text-orange-300 font-bold mb-3 text-xl">📈 Scalability Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
                <div>
                  <div className="text-2xl font-bold">{stats.totalRides}</div>
                  <div className="text-sm opacity-80">Total Rides</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.onlineDrivers}</div>
                  <div className="text-sm opacity-80">Online Drivers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.activeRides}</div>
                  <div className="text-sm opacity-80">Active Rides</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(0)}</div>
                  <div className="text-sm opacity-80">Revenue</div>
                </div>
              </div>
              <p className="text-white/70 text-sm mt-4">
                💡 Tip: Create 50+ users and drivers to test real-world scalability. Use the cleanup button to remove test data.
              </p>
            </div>
          </div>
        )}

        {/* Merchants Tab */}
        {activeTab === 'merchants' && (
          <MerchantsManagement />
        )}

        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">🎟️ Create New Coupon</h2>
              <form onSubmit={createCoupon} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300"
                    placeholder="SAVE20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">Discount Type</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="flat">Flat Amount</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">Discount Value</label>
                    <input
                      type="number"
                      required
                      value={formData.discount_value}
                      onChange={(e) => setFormData({...formData, discount_value: e.target.value})}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300"
                      placeholder={formData.discount_type === "percentage" ? "20" : "50"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">Max Discount (₹)</label>
                    <input
                      type="number"
                      value={formData.max_discount}
                      onChange={(e) => setFormData({...formData, max_discount: e.target.value})}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">Min Fare (₹)</label>
                    <input
                      type="number"
                      required
                      value={formData.min_fare}
                      onChange={(e) => setFormData({...formData, min_fare: e.target.value})}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Valid Until</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.valid_until}
                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">Total Usage Limit</label>
                    <input
                      type="number"
                      value={formData.total_usage_limit}
                      onChange={(e) => setFormData({...formData, total_usage_limit: e.target.value})}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1 text-white">Per User Limit</label>
                    <input
                      type="number"
                      required
                      value={formData.per_user_limit}
                      onChange={(e) => setFormData({...formData, per_user_limit: e.target.value})}
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-white">Zone (Optional)</label>
                  <input
                    type="text"
                    value={formData.zone}
                    onChange={(e) => setFormData({...formData, zone: e.target.value})}
                    className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300"
                    placeholder="Delhi, Mumbai, etc."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 font-bold shadow-lg transition-all"
                >
                  Create Coupon
                </button>
              </form>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold text-white mb-4">📋 Active Coupons ({coupons.length})</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-lg text-green-400">{coupon.code}</p>
                        <p className="text-sm text-gray-300">
                          {coupon.discount_type === 'percentage' 
                            ? `${coupon.discount_value}% off` 
                            : `₹${coupon.discount_value} off`}
                          {coupon.max_discount && ` (max ₹${coupon.max_discount})`}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-bold">
                        Active
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p className="text-white">Min Fare: ₹{coupon.min_fare}</p>
                      <p className="text-white">Used: {coupon.usage_count} / {coupon.total_usage_limit || '∞'}</p>
                      <p className="text-white">Per User: {coupon.per_user_limit} times</p>
                      {coupon.zone && <p className="text-white">Zone: {coupon.zone}</p>}
                      <p className="text-white">Expires: {new Date(coupon.valid_until).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

