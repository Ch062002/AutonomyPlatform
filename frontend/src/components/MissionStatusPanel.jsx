function MissionStatusPanel({ mission, uploadStatus }) {
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
        <p><strong>Mission Mode:</strong> {mission.state}</p>
        <p><strong>Active Waypoint:</strong> {mission.activeWaypoint} / {totalWaypoints}</p>
        <p><strong>Mission Progress:</strong> {progress}%</p>

        <div
          style={{
            height: "10px",
            backgroundColor: "#0f172a",
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid #334155",
            marginBottom: "1rem"
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

        <hr style={{ borderColor: "#334155" }} />

        <p><strong>Upload Status:</strong> {uploadStatus?.status || "idle"}</p>
        <p><strong>Message:</strong> {uploadStatus?.message || "No mission uploaded yet"}</p>
        <p><strong>Uploaded Mission:</strong> {uploadStatus?.mission_name || "--"}</p>
        <p><strong>Uploaded WPs:</strong> {uploadStatus?.waypoint_count || 0}</p>
        <p><strong>Last Updated:</strong> {uploadStatus?.last_updated || "--"}</p>
      </div>
    </div>
  );
}

export default MissionStatusPanel;