function StatusCard({ backendStatus, ros2Status, px4Status, gazeboStatus }) {
  const systems = [
    { name: "Backend", status: backendStatus },
    { name: "ROS2", status: ros2Status },
    { name: "PX4 SITL", status: px4Status },
    { name: "Gazebo", status: gazeboStatus }
  ];

  const getStatusStyle = (status) => {
    if (status === "healthy" || status === "running") {
      return { color: "#22c55e", label: "✅" };
    }

    if (status === "Checking...") {
      return { color: "#facc15", label: "⏳" };
    }

    return { color: "#ef4444", label: "❌" };
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>System Status</h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "1rem",
        marginTop: "1rem"
      }}>
        {systems.map((system) => {
          const style = getStatusStyle(system.status);

          return (
            <div
              key={system.name}
              style={{
                backgroundColor: "#1e293b",
                padding: "1rem",
                borderRadius: "10px",
                border: "1px solid #334155"
              }}
            >
              <h3>{system.name}</h3>
              <p style={{ color: style.color }}>
                {style.label} {system.status}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusCard;