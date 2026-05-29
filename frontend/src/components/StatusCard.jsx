function StatusCard({
  backendStatus,
  ros2Status,
  px4Status,
  gazeboStatus
}) {
  const getStatusColor = (status) => {
    if (status === "healthy" || status === "running") return "#22c55e";
    return "#ef4444";
  };

  const itemStyle = {
    backgroundColor: "#1e293b",
    padding: "1rem",
    borderRadius: "14px",
    border: "1px solid #334155",
    boxShadow: "0 0 15px rgba(59,130,246,0.15)",
    textAlign: "center"
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>System Status</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginTop: "1rem"
        }}
      >
        <div style={itemStyle}>
          <h3>Backend</h3>
          <p style={{ color: getStatusColor(backendStatus) }}>
            ✅ {backendStatus}
          </p>
        </div>

        <div style={itemStyle}>
          <h3>ROS2</h3>
          <p style={{ color: getStatusColor(ros2Status) }}>
            ✅ {ros2Status}
          </p>
        </div>

        <div style={itemStyle}>
          <h3>PX4 SITL</h3>
          <p style={{ color: getStatusColor(px4Status) }}>
            ✅ {px4Status}
          </p>
        </div>

        <div style={itemStyle}>
          <h3>Gazebo</h3>
          <p style={{ color: getStatusColor(gazeboStatus) }}>
            ✅ {gazeboStatus}
          </p>
        </div>
      </div>
    </div>
  );
}

export default StatusCard;