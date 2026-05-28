function TelemetryCard({ telemetry }) {
  const itemStyle = {
    backgroundColor: "#1e293b",
    padding: "1rem",
    borderRadius: "10px",
    border: "1px solid #334155"
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Live Telemetry</h2>

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
          <p>{telemetry.battery} %</p>
        </div>

        <div style={itemStyle}>
          <h3>Flight Mode</h3>
          <p>{telemetry.flight_mode}</p>
        </div>
      </div>
    </div>
  );
}

export default TelemetryCard;