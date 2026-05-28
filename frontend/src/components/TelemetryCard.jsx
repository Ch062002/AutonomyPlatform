function TelemetryCard({ telemetry }) {
  return (
    <div style={{
      marginTop: "2rem",
      padding: "1rem",
      border: "1px solid #334155",
      borderRadius: "10px"
    }}>
      <h2>Live Telemetry</h2>

      <p>Altitude: {telemetry.altitude} m</p>
      <p>Velocity: {telemetry.velocity} m/s</p>
      <p>Battery: {telemetry.battery} %</p>
      <p>Flight Mode: {telemetry.flight_mode}</p>
    </div>
  );
}

export default TelemetryCard;