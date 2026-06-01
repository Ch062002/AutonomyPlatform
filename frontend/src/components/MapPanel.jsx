import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import GuidanceOverlay from "./GuidanceOverlay";

function MapPanel({ telemetry, mission }) {
  const defaultCenter = [47.3977, 8.5456];

  const currentPosition =
    telemetry?.latitude && telemetry?.longitude
      ? [telemetry.latitude, telemetry.longitude]
      : defaultCenter;

  const missionWaypoints =
    mission?.waypoints?.map((wp) => [wp.lat, wp.lon]) || [];

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>
        Mission Map
      </h2>

      <div
        style={{
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <MapContainer
          center={currentPosition}
          zoom={16}
          style={{
            height: "500px",
            width: "100%"
          }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* UAV Marker */}

          <Marker position={currentPosition}>
            <Popup>
              UAV Current Position
            </Popup>
          </Marker>

          {/* Mission Path */}

          {missionWaypoints.length > 1 && (
            <Polyline
              positions={missionWaypoints}
              pathOptions={{
                color: "#60a5fa",
                weight: 4
              }}
            />
          )}

          {/* Waypoint Markers */}

          {mission?.waypoints?.map((wp, index) => (
            <Marker
              key={index}
              position={[wp.lat, wp.lon]}
            >
              <Popup>
                WP{index + 1}
                <br />
                Altitude: {wp.alt} m
              </Popup>
            </Marker>
          ))}

          {/* Guidance Overlay */}

          <GuidanceOverlay mission={mission} />
        </MapContainer>
      </div>
    </div>
  );
}

export default MapPanel;