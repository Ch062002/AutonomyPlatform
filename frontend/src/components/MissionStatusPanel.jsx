function MissionStatusPanel({ mission }) {
  const totalWaypoints = mission.waypoints.length;
  const progress =
    totalWaypoints === 0
      ? 0
      : Math.round((mission.activeWaypoint / totalWaypoints) * 100);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Mission Status</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <p>
          <strong>Mission Mode:</strong> {mission.state}
        </p>

        <p>
          <strong>Active Waypoint:</strong> {mission.activeWaypoint} /{" "}
          {totalWaypoints}
        </p>

        <p>
          <strong>Mission Progress:</strong> {progress}%
        </p>

        <div
          style={{
            height: "10px",
            backgroundColor: "#0f172a",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid #334155"
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: "#22c55e"
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default MissionStatusPanel;