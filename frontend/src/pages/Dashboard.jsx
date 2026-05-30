import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import StatusCard from "../components/StatusCard";
import TelemetryCard from "../components/TelemetryCard";
import TelemetryCharts from "../components/TelemetryCharts";
import MissionPanel from "../components/MissionPanel";
import CommandPanel from "../components/CommandPanel";
import CommandLog from "../components/CommandLog";
import VehicleHealthPanel from "../components/VehicleHealthPanel";
import MapPanel from "../components/MapPanel";
import MissionStatusPanel from "../components/MissionStatusPanel";
import { uploadMission } from "../services/api";

import {
  getBackendStatus,
  getRos2Status,
  getPx4Status,
  getGazeboStatus,
  getMissionUploadStatus
} from "../services/api";

function Dashboard() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [ros2Status, setRos2Status] = useState("Checking...");
  const [px4Status, setPx4Status] = useState("Checking...");
  const [gazeboStatus, setGazeboStatus] = useState("Checking...");
  const [uploadStatus, setUploadStatus] = useState(null);

  const [telemetry, setTelemetry] = useState({
    altitude: "--",
    velocity: "--",
    battery: "--",
    flight_mode: "--",
    arming_state: "--",
    failsafe: false,
    latitude: 47.3977,
    longitude: 8.5456,
    global_altitude: "--"
  });

  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [streamStatus, setStreamStatus] = useState("Connecting...");
  const [commandLogs, setCommandLogs] = useState([]);

  const [mission, setMission] = useState({
    name: "None",
    state: "Idle",
    activeWaypoint: 0,
    waypoints: []
  });

  const addCommandLog = (message) => {
    setCommandLogs((prev) => [
      { time: new Date().toLocaleTimeString(), message },
      ...prev.slice(0, 9)
    ]);
  };

  const createDemoMission = () => {
    const lat = Number(telemetry.latitude) || 47.3977;
    const lon = Number(telemetry.longitude) || 8.5456;

    setMission({
      name: "Demo Surveillance Mission",
      state: "Created",
      activeWaypoint: 0,
      waypoints: [
        { lat: lat + 0.0005, lon: lon + 0.0005, alt: 20 },
        { lat: lat + 0.001, lon: lon - 0.0004, alt: 25 },
        { lat: lat + 0.0002, lon: lon - 0.001, alt: 20 }
      ]
    });

    addCommandLog("Demo mission created");
  };

  const resetMission = () => {
    setMission({
      name: "None",
      state: "Idle",
      activeWaypoint: 0,
      waypoints: []
    });

    addCommandLog("Mission reset");
  };

  
  const startMission = async () => {
    if (mission.waypoints.length === 0) {
      addCommandLog("Cannot start mission: no waypoints available");
      return;
    }

    try {
      await uploadMission({
        name: mission.name,
        waypoints: mission.waypoints
      });

      setMission((prev) => ({
        ...prev,
        state: "Running",
        activeWaypoint: 1
      }));

      addCommandLog("Mission uploaded and started");
    } catch {
      addCommandLog("Mission upload failed");
    }
  };

  useEffect(() => {
    const fetchSystemStatus = () => {
      getBackendStatus().then((r) => setBackendStatus(r.data.status)).catch(() => setBackendStatus("Disconnected"));
      getRos2Status().then((r) => setRos2Status(r.data.status)).catch(() => setRos2Status("Disconnected"));
      getPx4Status().then((r) => setPx4Status(r.data.status)).catch(() => setPx4Status("Disconnected"));
      getGazeboStatus().then((r) => setGazeboStatus(r.data.status)).catch(() => setGazeboStatus("Disconnected"));
      getMissionUploadStatus().then((r) => setUploadStatus(r.data)).catch(() => setUploadStatus(null));
    };

    fetchSystemStatus();
    const statusInterval = setInterval(fetchSystemStatus, 3000);

    const telemetrySocket = new WebSocket("ws://localhost:8000/ws/telemetry");

    telemetrySocket.onopen = () => setStreamStatus("Connected");

    telemetrySocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTelemetry((prev) => ({ ...prev, ...data }));

      setTelemetryHistory((prev) => [
        ...prev.slice(-30),
        {
          time: new Date().toLocaleTimeString(),
          altitude: Number(data.altitude),
          velocity: Number(data.velocity),
          battery: Number(data.battery)
        }
      ]);
    };

    telemetrySocket.onerror = () => setStreamStatus("Error");
    telemetrySocket.onclose = () => setStreamStatus("Disconnected");

    return () => {
      clearInterval(statusInterval);
      telemetrySocket.close();
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-area">
        <section className="dashboard-container">
          <header className="dashboard-header">
            <h1>Aerospace Autonomy Platform</h1>
            <p>Mission Intelligence & Autonomous Systems Dashboard</p>

            <div className={`stream-badge ${streamStatus === "Connected" ? "ok" : "bad"}`}>
              Telemetry Stream: {streamStatus}
            </div>
          </header>

          <div style={{ marginBottom: "2rem" }}>
            <StatusCard
              backendStatus={backendStatus}
              ros2Status={ros2Status}
              px4Status={px4Status}
              gazeboStatus={gazeboStatus}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "2rem",
              alignItems: "start"
            }}
          >
            <div>
              <TelemetryCard telemetry={telemetry} />

              <div style={{ marginTop: "2rem" }}>
                <TelemetryCharts history={telemetryHistory} />
              </div>

              <div style={{ marginTop: "2rem" }}>
                <CommandPanel addCommandLog={addCommandLog} />
              </div>
            </div>

            <div>
              <MapPanel telemetry={telemetry} mission={mission} />

              <div style={{ marginTop: "2rem" }}>
                <MissionStatusPanel mission={mission} uploadStatus={uploadStatus} />
              </div>

              <div style={{ marginTop: "2rem" }}>
                <VehicleHealthPanel telemetry={telemetry} />
              </div>

              <div style={{ marginTop: "2rem" }}>
                <CommandLog logs={commandLogs} />
              </div>

              <div style={{ marginTop: "2rem" }}>
                <MissionPanel
                  mission={mission}
                  createDemoMission={createDemoMission}
                  resetMission={resetMission}
                  startMission={startMission}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;