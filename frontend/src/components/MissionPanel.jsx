function MissionPanel() {
  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Mission Control</h2>

      <div style={{
        backgroundColor: "#1e293b",
        padding: "1rem",
        borderRadius: "10px",
        border: "1px solid #334155"
      }}>
        <p>Current Mission: Not Assigned</p>
        <p>Mission State: Idle</p>
        <p>Waypoint Count: 0</p>

        <button style={{
          marginTop: "1rem",
          padding: "0.7rem 1.2rem",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer"
        }}>
          Create Mission
        </button>
      </div>
    </div>
  );
}

export default MissionPanel;