import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import GuidanceOverlay from "./GuidanceOverlay";

function toLatLng(point) {
  if (!point) return null;

  const lat = Array.isArray(point) ? point[0] : point.lat ?? point.latitude;
  const lon = Array.isArray(point)
    ? point[1]
    : point.lon ?? point.lng ?? point.longitude;

  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
}

function MapPanel({ telemetry, mission, trajectoryHistory = [] }) {
  const defaultCenter = [47.3977, 8.5456];

  const currentPosition =
    toLatLng(telemetry) || defaultCenter;

  const missionWaypoints =
    mission?.waypoints?.map(toLatLng).filter(Boolean) || [];

  const flownTrajectory =
    trajectoryHistory.map(toLatLng).filter(Boolean);

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

          {/* Actual UAV Trajectory */}

          {flownTrajectory.length > 1 && (
            <Polyline
              positions={flownTrajectory}
              pathOptions={{
                color: "#22d3ee",
                weight: 4,
                opacity: 0.9
              }}
            />
          )}

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

          {mission?.waypoints?.map((wp, index) => {
            const waypointPosition = toLatLng(wp);

            if (!waypointPosition) return null;

            return (
              <Marker
                key={index}
                position={waypointPosition}
              >
                <Popup>
                  WP{index + 1}
                  <br />
                  Altitude: {wp.alt} m
                </Popup>
              </Marker>
            );
          })}

          {/* Guidance Overlay */}

          <GuidanceOverlay mission={mission} />
        </MapContainer>
      </div>
    </div>
  );
}

export default MapPanel;
