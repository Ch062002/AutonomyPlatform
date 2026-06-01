import { CircleMarker, Polyline } from "react-leaflet";

function GuidanceOverlay({ mission }) {
  if (!mission) return null;

  const current = mission.currentPosition;
  const target = mission.targetPosition;

  if (!current || !target) return null;

  const currentLatLng = [current[0], current[1]];
  const targetLatLng = [target[0], target[1]];

  return (
    <>
      <Polyline
        positions={[currentLatLng, targetLatLng]}
        pathOptions={{
          color: "#38bdf8",
          weight: 3,
          dashArray: "8,8"
        }}
      />

      <CircleMarker
        center={currentLatLng}
        radius={7}
        pathOptions={{
          color: "#22c55e",
          fillColor: "#22c55e",
          fillOpacity: 1
        }}
      />

      <CircleMarker
        center={targetLatLng}
        radius={7}
        pathOptions={{
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 1
        }}
      />
    </>
  );
}

export default GuidanceOverlay;