import { CircleMarker, Polyline, Popup } from "react-leaflet";

const LOOKAHEAD_GUIDANCE_MODES = new Set([
  "LOS_GUIDANCE",
  "PURE_PURSUIT"
]);

function toLatLng(point) {
  if (!point) return null;

  const lat = Array.isArray(point)
    ? point[0]
    : point.lat ?? point.latitude;
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

function GuidanceOverlay({ mission }) {
  if (!mission) return null;

  const currentLatLng = toLatLng(mission.currentPosition);
  const targetLatLng = toLatLng(mission.targetPosition);
  const lookaheadLatLng = toLatLng(mission.lookaheadPoint);
  const waypointPositions =
    mission.waypoints?.map(toLatLng).filter(Boolean) || [];
  const showLookahead =
    LOOKAHEAD_GUIDANCE_MODES.has(mission.guidanceMode) &&
    Boolean(lookaheadLatLng);

  return (
    <>
      {waypointPositions.length > 1 && (
        <Polyline
          positions={waypointPositions}
          pathOptions={{
            color: "#facc15",
            weight: 3,
            opacity: 0.85
          }}
        />
      )}

      {currentLatLng && targetLatLng && (
        <Polyline
          positions={[currentLatLng, targetLatLng]}
          pathOptions={{
            color: "#38bdf8",
            weight: 3,
            dashArray: "8,8"
          }}
        />
      )}

      {currentLatLng && (
        <CircleMarker
          center={currentLatLng}
          radius={7}
          pathOptions={{
            color: "#052e16",
            weight: 2,
            fillColor: "#22c55e",
            fillOpacity: 1
          }}
        >
          <Popup>Current UAV Position</Popup>
        </CircleMarker>
      )}

      {targetLatLng && (
        <CircleMarker
          center={targetLatLng}
          radius={8}
          pathOptions={{
            color: "#7f1d1d",
            weight: 2,
            fillColor: "#ef4444",
            fillOpacity: 1
          }}
        >
          <Popup>Active Target</Popup>
        </CircleMarker>
      )}

      {showLookahead && (
        <CircleMarker
          center={lookaheadLatLng}
          radius={6}
          pathOptions={{
            color: "#581c87",
            weight: 2,
            fillColor: "#c084fc",
            fillOpacity: 1
          }}
        >
          <Popup>Lookahead Point</Popup>
        </CircleMarker>
      )}
    </>
  );
}

export default GuidanceOverlay;
