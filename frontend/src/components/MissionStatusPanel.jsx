function MissionStatusPanel({ mission, uploadStatus }) {
  const activeWaypoint = mission.activeWaypoint || 0;
  const totalWaypoints = mission.totalWaypoints || mission.waypoints?.length || 0;
  const progress = mission.progress || 0;
  const state = mission.state || "Idle";

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
        <p><strong>Mission Mode:</strong> {state}</p>
        <p><strong>Active Waypoint:</strong> {activeWaypoint} / {totalWaypoints}</p>
        <p><strong>Mission Progress:</strong> {progress}%</p>
        <p><strong>Distance to WP:</strong> {mission.distanceToWaypoint ?? "--"} m</p>

        <p>
        <strong>Current Position:</strong>{" "}
        {mission.currentPosition ? `[${mission.currentPosition.join(", ")}]` : "--"}
        </p>

        <p>
        <strong>Target Position:</strong>{" "}
        {mission.targetPosition ? `[${mission.targetPosition.join(", ")}]` : "--"}
        </p>

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
              backgroundColor: "#22c55e",
              transition: "0.4s"
            }}
          />
        </div>

        <h3>Waypoint Timeline</h3>

        {mission.waypoints.length === 0 ? (
          <p>No mission waypoints.</p>
        ) : (
          mission.waypoints.map((wp, index) => {
            const wpNumber = index + 1;

            let status = "Pending";
            let color = "#94a3b8";

            if (wpNumber < activeWaypoint) {
              status = "Completed";
              color = "#22c55e";
            } else if (wpNumber === activeWaypoint && state === "Running") {
              status = "Active";
              color = "#38bdf8";
            } else if (state === "Completed") {
              status = "Completed";
              color = "#22c55e";
            }

            return (
              <div
                key={index}
                style={{
                  marginTop: "0.7rem",
                  padding: "0.7rem",
                  backgroundColor: "#0f172a",
                  borderRadius: "8px",
                  border: `1px solid ${color}`
                }}
              >
                <strong>WP{wpNumber}</strong>
                <p style={{ color }}>{status}</p>
                <small>
                  Lat: {wp.lat.toFixed(6)}, Lon: {wp.lon.toFixed(6)}, Alt: {wp.alt} m
                </small>
              </div>
            );
          })
        )}

        <hr style={{ borderColor: "#334155", marginTop: "1rem" }} />

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