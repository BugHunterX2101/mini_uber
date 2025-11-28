import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
import MapComponent from "./MapComponent";

export default function DriverDashboard({ driver, onLogout }) {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [availableRides, setAvailableRides] = useState([]);
  const [assignedRides, setAssignedRides] = useState([]);
  const [completedRides, setCompletedRides] = useState([]);
  const [onlineDriversCount, setOnlineDriversCount] = useState(0);

  const fetchRides = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/queue`);
      const rides = response.data;
      
      setAvailableRides(rides.filter(ride => ride.status === "pending"));
      setAssignedRides(rides.filter(ride => 
        ride.status === "assigned" && ride.driver_id === driver.id
      ));
      setCompletedRides(rides.filter(ride => 
        ride.status === "completed" && ride.driver_id === driver.id
      ));
    } catch (error) {
      console.error("Error fetching rides:", error);
    }
  };

  const fetchOnlineDrivers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/available-drivers`);
      setOnlineDriversCount(response.data.length);
    } catch (error) {
      console.error("Error fetching online drivers:", error);
    }
  };

  const sendHeartbeat = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/heartbeat`, null, {
        params: { driver_id: driver.id }
      });
      console.log('Heartbeat sent:', response.data);
    } catch (error) {
      console.error("Heartbeat error:", error);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      if (isOnline) {
        await axios.post(`${API_BASE_URL}/go-offline`, null, {
          params: { driver_id: driver.id }
        });
        setIsOnline(false);
      } else {
        await axios.post(`${API_BASE_URL}/go-online`, null, {
          params: { driver_id: driver.id }
        });
        setIsOnline(true);
        await sendHeartbeat();
      }
      await fetchOnlineDrivers();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  useEffect(() => {
    let ridesInterval;
    let heartbeatInterval;
    
    // Set driver online on mount
    const initDriver = async () => {
      try {
        await axios.post(`${API_BASE_URL}/go-online`, null, {
          params: { driver_id: driver.id }
        });
        setIsOnline(true);
        await sendHeartbeat(); // Send heartbeat immediately
      } catch (error) {
        console.error("Error setting driver online:", error);
      }
    };
    
    initDriver();
    fetchRides();
    fetchOnlineDrivers();
    
    ridesInterval = setInterval(() => {
      fetchRides();
      fetchOnlineDrivers();
    }, 3000);
    heartbeatInterval = setInterval(() => {
      sendHeartbeat();
    }, 4000);
    
    // Mark driver offline when tab closes
    const handleBeforeUnload = () => {
      navigator.sendBeacon(`${API_BASE_URL}/go-offline?driver_id=${driver.id}`);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(ridesInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Set driver offline on unmount
      axios.post(`${API_BASE_URL}/go-offline`, null, {
        params: { driver_id: driver.id }
      }).catch(err => console.error("Error going offline:", err));
    };
  }, [isOnline]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-green-50 via-white to-blue-50 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words min-w-0 flex-1 max-w-full overflow-hidden">
              Driver Dashboard - {driver.name} 🚗
            </h1>
            <div className="flex space-x-2 flex-shrink-0">
              <button
                onClick={toggleOnlineStatus}
                className={`px-3 sm:px-4 py-2 rounded-md font-medium whitespace-nowrap text-sm sm:text-base ${
                  isOnline
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-gray-500 text-white hover:bg-gray-600"
                }`}
              >
                {isOnline ? "🟢 Online" : "🔴 Offline"}
              </button>
              <button
                onClick={() => {
                  onLogout();
                  navigate('/');
                }}
                className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors whitespace-nowrap text-sm sm:text-base"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-800">Online Drivers</h3>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-orange-600">{onlineDriversCount}</p>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Available Rides</h3>
              <p className="text-2xl font-bold text-blue-600">{availableRides.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Assigned Rides</h3>
              <p className="text-2xl font-bold text-green-600">{assignedRides.length}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">Completed Today</h3>
              <p className="text-2xl font-bold text-purple-600">{completedRides.length}</p>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            🗺️ Live Map - Nearby Rides & Drivers
          </h2>
          <MapComponent 
            rides={availableRides} 
            drivers={[]} 
            center={{ lat: 28.6139, lng: 77.2090 }} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Rides */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🔍 Available Rides ({availableRides.length})
            </h2>
            {availableRides.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No rides available at the moment
              </p>
            ) : (
              <div className="space-y-3">
                {availableRides.map((ride) => (
                  <div key={ride.id} className="border border-gray-200 rounded-lg p-4 overflow-hidden">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">User #{ride.user_id}</p>
                        <p className="text-sm text-gray-600 break-words">
                          📍 {ride.start} → 🎯 {ride.destination}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Ride #{ride.id}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs whitespace-nowrap flex-shrink-0">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Rides */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              🚗 Your Assigned Rides ({assignedRides.length})
            </h2>
            {assignedRides.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No assigned rides
              </p>
            ) : (
              <div className="space-y-3">
                {assignedRides.map((ride) => (
                  <div key={ride.id} className="border border-green-200 rounded-lg p-4 bg-green-50 overflow-hidden">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">User #{ride.user_id}</p>
                        <p className="text-sm text-gray-600 break-words">
                          📍 {ride.start} → 🎯 {ride.destination}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Ride #{ride.id}
                        </p>
                        <div className="mt-2 p-2 bg-green-100 rounded text-xs overflow-hidden">
                          <p className="font-semibold text-green-800">🐈 Container Info:</p>
                          <p className="text-green-700 break-all">Port: {ride.port || 'N/A'}</p>
                          <p className="text-green-600 break-all">Container: ride-{ride.id}</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs whitespace-nowrap flex-shrink-0">
                        Assigned
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Completed Rides */}
        {completedRides.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              ✅ Completed Rides Today ({completedRides.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {completedRides.slice(0, 6).map((ride) => (
                <div key={ride.id} className="border border-gray-200 rounded-lg p-3 overflow-hidden">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">User #{ride.user_id}</p>
                      <p className="text-xs text-gray-600 break-words">
                        {ride.start} → {ride.destination}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs whitespace-nowrap flex-shrink-0">
                      Completed
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