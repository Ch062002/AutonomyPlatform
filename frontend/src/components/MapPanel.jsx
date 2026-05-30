import "leaflet/dist/leaflet.css";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";

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

function FollowDrone({ position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position, map]);

  return null;
}

function MapPanel({ telemetry, mission }) {
  const lat = Number(telemetry.latitude) || 47.3977;
  const lon = Number(telemetry.longitude) || 8.5456;

  const dronePosition = [lat, lon];
  const [trail, setTrail] = useState([]);

  useEffect(() => {
    setTrail((prev) => {
      const lastPoint = prev[prev.length - 1];

      if (
        lastPoint &&
        Math.abs(lastPoint[0] - lat) < 0.000001 &&
        Math.abs(lastPoint[1] - lon) < 0.000001
      ) {
        return prev;
      }

      return [...prev.slice(-80), dronePosition];
    });
  }, [lat, lon]);

  const waypointPositions = mission.waypoints.map((wp) => [wp.lat, wp.lon]);
  const missionPath = [dronePosition, ...waypointPositions];

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Live Map & Trajectory</h2>

      <div
        style={{
          height: "420px",
          backgroundColor: "#1e293b",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)",
          overflow: "hidden"
        }}
      >
        <MapContainer
          center={dronePosition}
          zoom={17}
          style={{ height: "100%", width: "100%" }}
        >
          <FollowDrone position={dronePosition} />

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {waypointPositions.length > 0 && (
            <Polyline
              positions={missionPath}
              pathOptions={{
                color: "#22c55e",
                weight: 3,
                opacity: 0.7
              }}
            />
          )}

          {trail.length > 1 && (
            <Polyline
              positions={trail}
              pathOptions={{
                color: "#38bdf8",
                weight: 4,
                opacity: 0.9
              }}
            />
          )}

          <Marker position={dronePosition} icon={droneIcon}>
            <Popup>
              <strong>PX4 SITL UAV</strong>
              <br />
              Lat: {lat.toFixed(7)}
              <br />
              Lon: {lon.toFixed(7)}
              <br />
              Altitude: {telemetry.altitude} m
              <br />
              Mode: {telemetry.flight_mode}
            </Popup>
          </Marker>

          {mission.waypoints.map((wp, index) => (
            <Marker key={index} position={[wp.lat, wp.lon]} icon={waypointIcon}>
              <Popup>
                <strong>Waypoint {index + 1}</strong>
                <br />
                Lat: {wp.lat.toFixed(6)}
                <br />
                Lon: {wp.lon.toFixed(6)}
                <br />
                Alt: {wp.alt} m
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div
        style={{
          marginTop: "0.8rem",
          backgroundColor: "#1e293b",
          padding: "0.8rem",
          borderRadius: "10px",
          border: "1px solid #334155",
          textAlign: "center"
        }}
      >
        <strong>Live Position:</strong>
        <p>Lat: {lat.toFixed(7)}</p>
        <p>Lon: {lon.toFixed(7)}</p>
        <p>Global Altitude: {telemetry.global_altitude} m</p>
      </div>
    </div>
  );
}

export default MapPanel;