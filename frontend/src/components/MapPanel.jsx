import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

const droneIcon = L.divIcon({
  html: "🚁",
  className: "drone-marker",
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const waypointIcon = L.divIcon({
  html: "📍",
  className: "waypoint-marker",
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

const homeIcon = L.divIcon({
  html: "🏠",
  className: "home-marker",
  iconSize: [28, 28],
  iconAnchor: [14, 28]
});

function MapPanel({ telemetry }) {
  const homePosition = [47.3977, 8.5456];

  const waypoints = [
    [47.3982, 8.5461],
    [47.3987, 8.5452],
    [47.3979, 8.5444],
    [47.3974, 8.5451]
  ];

  const routePath = [homePosition, ...waypoints, homePosition];

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Live Map & Position</h2>

      <div
        style={{
          height: "320px",
          backgroundColor: "#1e293b",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)",
          overflow: "hidden"
        }}
      >
        <MapContainer
          center={homePosition}
          zoom={16}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline
            positions={routePath}
            pathOptions={{
              color: "#22c55e",
              weight: 4,
              opacity: 0.8
            }}
          />

          <Marker position={homePosition} icon={homeIcon}>
            <Popup>
              <strong>Home / Launch Point</strong>
            </Popup>
          </Marker>

          <Marker position={homePosition} icon={droneIcon}>
            <Popup>
              <strong>PX4 SITL UAV</strong>
              <br />
              Altitude: {telemetry.altitude} m
              <br />
              Velocity: {telemetry.velocity} m/s
              <br />
              Mode: {telemetry.flight_mode}
            </Popup>
          </Marker>

          {waypoints.map((wp, index) => (
            <Marker key={index} position={wp} icon={waypointIcon}>
              <Popup>
                <strong>Waypoint {index + 1}</strong>
                <br />
                Lat: {wp[0]}
                <br />
                Lon: {wp[1]}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default MapPanel;