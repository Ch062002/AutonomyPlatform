function App() {
  return (
    <div style={{
      backgroundColor: "#0f172a",
      color: "white",
      minHeight: "100vh",
      padding: "2rem",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1>Aerospace Autonomy Platform</h1>
      <p>Mission Intelligence & Autonomous Systems Dashboard</p>

      <div style={{
        marginTop: "2rem",
        padding: "1rem",
        border: "1px solid #334155",
        borderRadius: "10px"
      }}>
        <h2>System Status</h2>
        <p>Backend: Pending Connection</p>
        <p>ROS2: Pending</p>
        <p>PX4 SITL: Pending</p>
        <p>Gazebo: Pending</p>
      </div>
    </div>
  );
}

export default App;