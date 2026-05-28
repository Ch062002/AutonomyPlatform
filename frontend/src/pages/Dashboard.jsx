import { useEffect, useState } from "react";

import StatusCard from "../components/StatusCard";
import TelemetryCard from "../components/TelemetryCard";
import MissionPanel from "../components/MissionPanel";

import {
  getBackendStatus,
  getRos2Status,
  getPx4Status,
  getGazeboStatus,
  getTelemetry
} from "../services/api";

function Dashboard() {
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
    const fetchSystemStatus = () => {
      getBackendStatus()
        .then((response) => setBackendStatus(response.data.status))
        .catch(() => setBackendStatus("Disconnected"));

      getRos2Status()
        .then((response) => setRos2Status(response.data.status))
        .catch(() => setRos2Status("Disconnected"));

      getPx4Status()
        .then((response) => setPx4Status(response.data.status))
        .catch(() => setPx4Status("Disconnected"));

      getGazeboStatus()
        .then((response) => setGazeboStatus(response.data.status))
        .catch(() => setGazeboStatus("Disconnected"));
    };

    const fetchTelemetry = () => {
      getTelemetry()
        .then((response) => setTelemetry(response.data))
        .catch(() => {
          setTelemetry({
            altitude: "--",
            velocity: "--",
            battery: "--",
            flight_mode: "--"
          });
        });
    };

    fetchSystemStatus();
    fetchTelemetry();

    const statusInterval = setInterval(fetchSystemStatus, 3000);
    const telemetryInterval = setInterval(fetchTelemetry, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(telemetryInterval);
    };
  }, []);

  return (
    <div style={{
      backgroundColor: "#0f172a",
      color: "white",
      minHeight: "100vh",
      padding: "2rem",
      fontFamily: "Arial, sans-serif"
    }}>
      <header style={{
        textAlign: "center",
        marginBottom: "2rem"
      }}>
        <h1>Aerospace Autonomy Platform</h1>
        <p>Mission Intelligence & Autonomous Systems Dashboard</p>
      </header>

      <main style={{
        maxWidth: "1100px",
        margin: "0 auto"
      }}>
        <StatusCard
          backendStatus={backendStatus}
          ros2Status={ros2Status}
          px4Status={px4Status}
          gazeboStatus={gazeboStatus}
        />

        <TelemetryCard telemetry={telemetry} />

        <MissionPanel />
      </main>
    </div>
  );
}

export default Dashboard;