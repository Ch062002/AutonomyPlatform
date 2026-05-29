function VehicleHealthPanel({ telemetry }) {
  const itemStyle = {
    backgroundColor: "#0f172a",
    padding: "0.8rem",
    borderRadius: "10px",
    border: "1px solid #334155",
    marginBottom: "0.8rem"
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2 style={{ textAlign: "center" }}>Vehicle Health</h2>

      <div style={{
        backgroundColor: "#1e293b",
        padding: "1rem",
        borderRadius: "14px",
        border: "1px solid #334155",
        boxShadow: "0 0 15px rgba(59,130,246,0.15)"
      }}>
        <div style={itemStyle}>
          <strong>QGroundControl:</strong>
          <p style={{ color: "#22c55e" }}>Connected</p>
        </div>

        <div style={itemStyle}>
          <strong>PX4 Mode:</strong>
          <p>{telemetry.flight_mode}</p>
        </div>

        <div style={itemStyle}>
          <strong>Arming State:</strong>
          <p>{telemetry.arming_state}</p>
        </div>

        <div style={itemStyle}>
          <strong>Failsafe:</strong>
          <p style={{ color: telemetry.failsafe ? "#ef4444" : "#22c55e" }}>
            {telemetry.failsafe ? "ACTIVE" : "Normal"}
          </p>
        </div>

        <div style={itemStyle}>
          <strong>Battery:</strong>
          <p style={{ color: "#22c55e" }}>{telemetry.battery} %</p>
        </div>
      </div>
    </div>
  );
}

export default VehicleHealthPanel;