function StatusCard({ backendStatus, ros2Status, px4Status, gazeboStatus }) {
  return (
    <div style={{
      marginTop: "2rem",
      padding: "1rem",
      border: "1px solid #334155",
      borderRadius: "10px"
    }}>
      <h2>System Status</h2>
      <p>Backend: {backendStatus}</p>
      <p>ROS2: {ros2Status}</p>
      <p>PX4 SITL: {px4Status}</p>
      <p>Gazebo: {gazeboStatus}</p>
    </div>
  );
}

export default StatusCard;