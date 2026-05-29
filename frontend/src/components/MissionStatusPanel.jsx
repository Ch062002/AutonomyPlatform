function MissionStatusPanel() {
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
        <p><strong>Mission Mode:</strong> Standby</p>
        <p><strong>Active Waypoint:</strong> 0 / 3</p>
        <p><strong>Mission Progress:</strong> 0%</p>
        <p><strong>Distance Estimate:</strong> --</p>
      </div>
    </div>
  );
}

export default MissionStatusPanel;