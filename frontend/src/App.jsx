import { useEffect, useState } from "react";
import axios from "axios";

function App() {

  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [ros2Status, setRos2Status] = useState("Checking...");
  const [px4Status, setPx4Status] = useState("Checking...");
  const [gazeboStatus, setGazeboStatus] = useState("Checking...");

  const [telemetry, setTelemetry] = useState({
    altitude: "--",
    velocity: "--",
    battery: "--",
    flight_mode: "--"
  });

  useEffect(() => {

    axios.get("http://127.0.0.1:8000/health")
      .then((response) => setBackendStatus(response.data.status));

    axios.get("http://127.0.0.1:8000/ros2/status")
      .then((response) => setRos2Status(response.data.status));

    axios.get("http://127.0.0.1:8000/px4/status")
      .then((response) => setPx4Status(response.data.status));

    axios.get("http://127.0.0.1:8000/gazebo/status")
      .then((response) => setGazeboStatus(response.data.status));

    const telemetryInterval = setInterval(() => {

      axios.get("http://127.0.0.1:8000/telemetry")
        .then((response) => {
          setTelemetry(response.data);
        });

    }, 1000);

    return () => clearInterval(telemetryInterval);

  }, []);

  return (
    <div style={{
      backgroundColor: "#0f172a",
      color: "white",
      minHeight: "100vh",
      padding: "2rem",
      fontFamily: "Arial, sans-serif",
      textAlign: "center"
    }}>

      <h1>Aerospace Autonomy Platform</h1>

      <p>
        Mission Intelligence & Autonomous Systems Dashboard
      </p>

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

    </div>
  );
}

export default App;