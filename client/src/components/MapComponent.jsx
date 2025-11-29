import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons
const userIcon = L.divIcon({
  html: `<div style="
    width: 40px; 
    height: 40px; 
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 4px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  ">📍</div>`,
  className: '',
  iconSize: [40, 40]
});

const driverIcon = L.divIcon({
  html: `<div style="
    width: 45px; 
    height: 45px; 
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border: 4px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: pulse 2s infinite;
  ">🚗</div>`,
  className: '',
  iconSize: [45, 45]
});

const rideIcon = L.divIcon({
  html: `<div style="
    width: 40px; 
    height: 40px; 
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border: 4px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  ">👤</div>`,
  className: '',
  iconSize: [40, 40]
});

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 13);
    }
  }, [center, map]);
  return null;
}

const destIcon = L.divIcon({
  html: `<div style="
    width: 40px; 
    height: 40px; 
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    border: 4px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  ">🎯</div>`,
  className: '',
  iconSize: [40, 40]
});

export default function MapComponent({ rides = [], drivers = [], userLocation = null, center = { lat: 28.6139, lng: 77.2090 } }) {
  const mapCenter = userLocation || center;

  return (
    <div className="w-full rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg" style={{ height: '400px' }}>
      <MapContainer 
        center={[mapCenter.lat, mapCenter.lng]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <RecenterMap center={userLocation} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>📍</div>
                <strong style={{ color: '#667eea' }}>You are here</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver Markers */}
        {drivers.map((driver, idx) => {
          const lat = driver.latitude || (center.lat + (Math.random() - 0.5) * 0.05);
          const lng = driver.longitude || (center.lng + (Math.random() - 0.5) * 0.05);
          return (
            <Marker key={`driver-${idx}`} position={[lat, lng]} icon={driverIcon}>
              <Popup>
                <div style={{ textAlign: 'center', padding: '8px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>🚗</div>
                  <strong style={{ color: '#10b981' }}>{driver.name}</strong>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    📍 {driver.location}<br />
                    Status: <span style={{ color: '#10b981', fontWeight: 'bold' }}>{driver.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active Rides with Routes */}
        {rides.filter(r => ['searching', 'assigned'].includes(r.status)).map((ride, idx) => {
          const hasCoords = ride.pickup_lat && ride.pickup_lng && ride.dest_lat && ride.dest_lng;
          
          if (!hasCoords) return null;
          
          const pickupPos = [ride.pickup_lat, ride.pickup_lng];
          const destPos = [ride.dest_lat, ride.dest_lng];
          
          // Find assigned driver
          const assignedDriver = drivers.find(d => d.id === ride.driver_id);
          const driverPos = assignedDriver && assignedDriver.latitude && assignedDriver.longitude 
            ? [assignedDriver.latitude, assignedDriver.longitude]
            : null;
          
          return (
            <div key={`ride-${idx}`}>
              {/* Pickup Marker */}
              <Marker position={pickupPos} icon={rideIcon}>
                <Popup>
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>📍</div>
                    <strong style={{ color: '#f59e0b' }}>Pickup Location</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {ride.start}
                    </div>
                  </div>
                </Popup>
              </Marker>
              
              {/* Destination Marker */}
              <Marker position={destPos} icon={destIcon}>
                <Popup>
                  <div style={{ textAlign: 'center', padding: '8px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎯</div>
                    <strong style={{ color: '#ef4444' }}>Destination</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {ride.destination}
                    </div>
                  </div>
                </Popup>
              </Marker>
              
              {/* Route from pickup to destination */}
              <Polyline 
                positions={[pickupPos, destPos]} 
                color="#3b82f6" 
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
              
              {/* Driver to pickup route (if assigned) */}
              {driverPos && ride.status === 'assigned' && (
                <Polyline 
                  positions={[driverPos, pickupPos]} 
                  color="#10b981" 
                  weight={4}
                  opacity={0.8}
                />
              )}
            </div>
          );
        })}
      </MapContainer>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
