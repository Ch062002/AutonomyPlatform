function TelemetryCard({ telemetry }) {
  const getBatteryColor = (battery) => {
    if (battery === "--") return "#facc15";
    if (battery >= 70) return "#22c55e";
    if (battery >= 40) return "#facc15";
    return "#ef4444";
  };

  const itemStyle = {
    backgroundColor: "#1e293b",
    padding: "1rem",
    borderRadius: "10px",
    border: "1px solid #334155"
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Live PX4 Telemetry</h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "1rem",
        marginTop: "1rem"
      }}>
        <div style={itemStyle}>
          <h3>Altitude</h3>
          <p>{telemetry.altitude} m</p>
        </div>

        <div style={itemStyle}>
          <h3>Velocity</h3>
          <p>{telemetry.velocity} m/s</p>
        </div>

        <div style={itemStyle}>
          <h3>Battery</h3>
          <p style={{ color: getBatteryColor(telemetry.battery) }}>
            {telemetry.battery} %
          </p>
        </div>

        <div style={itemStyle}>
          <h3>Nav State</h3>
          <p>{telemetry.flight_mode}</p>
        </div>

        <div style={itemStyle}>
          <h3>Arming State</h3>
          <p>{telemetry.arming_state}</p>
        </div>

        <div style={itemStyle}>
          <h3>Failsafe</h3>
          <p style={{ color: telemetry.failsafe ? "#ef4444" : "#22c55e" }}>
            {telemetry.failsafe ? "ACTIVE" : "Normal"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default TelemetryCard;