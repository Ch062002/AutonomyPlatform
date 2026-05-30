function MissionPanel({
  mission,
  createDemoMission,
  resetMission,
  startMission
}) {
  const buttonStyle = {
    marginTop: "1rem",
    marginRight: "0.8rem",
    padding: "0.7rem 1.2rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold"
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Mission Control</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p>Current Mission: {mission.name}</p>
          <p>Mission State: {mission.state}</p>
          <p>Waypoint Count: {mission.waypoints.length}</p>

          <button
            onClick={createDemoMission}
            style={{
              ...buttonStyle,
              backgroundColor: "#38bdf8",
              color: "white"
            }}
          >
            Create Demo Mission
          </button>

          <button
            onClick={startMission}
            style={{
              ...buttonStyle,
              backgroundColor: "#22c55e",
              color: "white"
            }}
          >
            Start Mission
          </button>

          <button
            onClick={resetMission}
            style={{
              ...buttonStyle,
              backgroundColor: "#ef4444",
              color: "white"
            }}
          >
            Reset Mission
          </button>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
          <h3>Waypoints</h3>

          {mission.waypoints.length === 0 ? (
            <p>No waypoints assigned.</p>
          ) : (
            <ul>
              {mission.waypoints.map((wp, index) => (
                <li key={index}>
                  WP{index + 1}: Lat {wp.lat.toFixed(6)}, Lon{" "}
                  {wp.lon.toFixed(6)}, Alt {wp.alt} m
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default MissionPanel;