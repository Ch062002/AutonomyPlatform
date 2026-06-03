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
import GuidanceModePanel from "../components/GuidanceModePanel";
import GuidanceLogsPanel from "../components/GuidanceLogsPanel";
import GuidanceAnalyticsPanel from "../components/GuidanceAnalyticsPanel";
import MissionReplayPanel from "../components/MissionReplayPanel";
import NavigationStatusPanel from "../components/NavigationStatusPanel";
import NavigationLogsPanel from "../components/NavigationLogsPanel";
import NavigationAnalyticsPanel from "../components/NavigationAnalyticsPanel";
import NavigationReplayPanel from "../components/NavigationReplayPanel";
import StateEstimationPanel from "../components/StateEstimationPanel";
import EkfAnalyticsPanel from "../components/EkfAnalyticsPanel";
import EstimationComparisonPanel from "../components/EstimationComparisonPanel";
import StateEstimationBenchmarkPanel from "../components/StateEstimationBenchmarkPanel";
import ControlStatusPanel from "../components/ControlStatusPanel";

import {
  getBackendStatus,
  getRos2Status,
  getPx4Status,
  getGazeboStatus,
  getMissionUploadStatus,
  getMissionProgress,
  resetMissionState,
  uploadMission
} from "../services/api";

const TRAJECTORY_HISTORY_LIMIT = 300;

function getTelemetryGpsPosition(data) {
  const latitude = Number(data?.latitude ?? data?.lat);
  const longitude = Number(data?.longitude ?? data?.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { lat: latitude, lon: longitude };
}

function SectionHeader({ label, title }) {
  return (
    <div style={{ marginBottom: "0.9rem" }}>
      <div
        style={{
          color: "#38bdf8",
          fontSize: "0.78rem",
          fontWeight: "bold",
          letterSpacing: "0.08em",
          textTransform: "uppercase"
        }}
      >
        {label}
      </div>
      <h2 style={{ margin: "0.25rem 0 0 0" }}>{title}</h2>
    </div>
  );
}

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
  const [trajectoryHistory, setTrajectoryHistory] = useState([]);
  const [streamStatus, setStreamStatus] = useState("Connecting...");
  const [commandLogs, setCommandLogs] = useState([]);

  const [mission, setMission] = useState({
    name: "None",
    state: "Idle",
    activeWaypoint: 0,
    totalWaypoints: 0,
    progress: 0,
    lookaheadPoint: null,
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
      totalWaypoints: 3,
      progress: 0,
      lookaheadPoint: null,
      waypoints: [
        { lat: lat + 0.0005, lon: lon + 0.0005, alt: 20 },
        { lat: lat + 0.001, lon: lon - 0.0004, alt: 25 },
        { lat: lat + 0.0002, lon: lon - 0.001, alt: 20 }
      ]
    });

    addCommandLog("Demo mission created");
  };

  const resetMission = async () => {
    try {
      await resetMissionState();

      setMission({
        name: "None",
        state: "Idle",
        activeWaypoint: 0,
        totalWaypoints: 0,
        progress: 0,
        lookaheadPoint: null,
        waypoints: []
      });

      setUploadStatus(null);
      setTrajectoryHistory([]);
      addCommandLog("Mission state reset");
    } catch {
      addCommandLog("Mission reset failed");
    }
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
        state: "Uploaded",
        activeWaypoint: 0,
        progress: 0
      }));

      addCommandLog("Mission uploaded to ROS2. Start OFFBOARD to execute.");
    } catch {
      addCommandLog("Mission upload failed");
    }
  };

  useEffect(() => {
    const fetchSystemStatus = () => {
      getBackendStatus()
        .then((r) => setBackendStatus(r.data.status))
        .catch(() => setBackendStatus("Disconnected"));

      getRos2Status()
        .then((r) => setRos2Status(r.data.status))
        .catch(() => setRos2Status("Disconnected"));

      getPx4Status()
        .then((r) => setPx4Status(r.data.status))
        .catch(() => setPx4Status("Disconnected"));

      getGazeboStatus()
        .then((r) => setGazeboStatus(r.data.status))
        .catch(() => setGazeboStatus("Disconnected"));

      getMissionUploadStatus()
        .then((r) => setUploadStatus(r.data))
        .catch(() => setUploadStatus(null));

      getMissionProgress()
        .then((r) => {
          setMission((prev) => ({
            ...prev,
            state: r.data.mission_state,
            activeWaypoint: r.data.active_waypoint,
            totalWaypoints: r.data.total_waypoints,
            progress: r.data.progress_percent,
            distanceToWaypoint: r.data.distance_to_waypoint,
            currentPosition: r.data.current_position,
            targetPosition: r.data.target_position,
            lookaheadPoint: r.data.lookahead_point,
            guidanceMode: r.data.guidance_mode,
            crossTrackError: r.data.cross_track_error,
            alongTrackDistance: r.data.along_track_distance,
            pathLength: r.data.path_length,
            distanceToTarget: r.data.distance_to_target,
            bearingToTarget: r.data.bearing_to_target,
            altitudeError: r.data.altitude_error,
            lookaheadDistance: r.data.lookahead_distance,
            pursuitDistance: r.data.pursuit_distance,
            pursuitHeading: r.data.pursuit_heading,
            desiredHeading: r.data.desired_heading,
            pathHeading: r.data.path_heading,
            fieldStrength: r.data.field_strength,
            convergenceGain: r.data.convergence_gain,
            turnRadius: r.data.turn_radius,
            straightDistance: r.data.straight_distance,
            turnArcLength: r.data.turn_arc_length,
            estimatedDubinsLength: r.data.estimated_dubins_length,
            headingError: r.data.heading_error,
            turnFeasible: r.data.turn_feasible
          }));
        })
        .catch(() => {});
    };

    fetchSystemStatus();

    const statusInterval = setInterval(fetchSystemStatus, 3000);

    const telemetrySocket = new WebSocket("ws://localhost:8000/ws/telemetry");

    telemetrySocket.onopen = () => setStreamStatus("Connected");

    telemetrySocket.onmessage = (event) => {
      let data;

      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const gpsPosition = getTelemetryGpsPosition(data);

      setTelemetry((prev) => ({ ...prev, ...data }));

      if (gpsPosition) {
        setTrajectoryHistory((prev) => {
          const last = prev[prev.length - 1];

          if (
            last &&
            Math.abs(last.lat - gpsPosition.lat) < 0.000001 &&
            Math.abs(last.lon - gpsPosition.lon) < 0.000001
          ) {
            return prev;
          }

          return [...prev.slice(-TRAJECTORY_HISTORY_LIMIT), gpsPosition];
        });
      }

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

          <div style={{ marginBottom: "1.5rem" }}>
            <StatusCard
              backendStatus={backendStatus}
              ros2Status={ros2Status}
              px4Status={px4Status}
              gazeboStatus={gazeboStatus}
            />
          </div>

          <div className="dashboard-sections">
            <section className="dashboard-section">
              <SectionHeader label="Section A" title="Telemetry, Navigation, and State Estimation" />

              <div
                className="dashboard-grid dashboard-grid-three"
              >
                <TelemetryCard telemetry={telemetry} />
                <NavigationStatusPanel telemetry={telemetry} mission={mission} />
                <StateEstimationPanel />
              </div>

              <div style={{ marginTop: "1.4rem" }}>
                <TelemetryCharts history={telemetryHistory} />
              </div>
            </section>

            <section className="dashboard-section">
              <SectionHeader label="Section B" title="Mission Execution, Guidance, and Control" />

              <div
                className="mission-control-grid"
              >
                <MapPanel
                  telemetry={telemetry}
                  mission={mission}
                  trajectoryHistory={trajectoryHistory}
                />

                <div className="dashboard-stack">
                  <GuidanceModePanel addCommandLog={addCommandLog} />
                  <ControlStatusPanel addCommandLog={addCommandLog} />
                  <MissionStatusPanel mission={mission} uploadStatus={uploadStatus} />
                  <VehicleHealthPanel telemetry={telemetry} />
                </div>
              </div>

              <div
                className="dashboard-grid dashboard-grid-three section-followup"
              >
                <CommandPanel addCommandLog={addCommandLog} />
                <MissionPanel
                  mission={mission}
                  createDemoMission={createDemoMission}
                  resetMission={resetMission}
                  startMission={startMission}
                />
                <CommandLog logs={commandLogs} />
              </div>
            </section>

            <section className="dashboard-section">
              <SectionHeader label="Section C" title="Guidance, Navigation, and Estimation Analytics" />

              <div
                className="dashboard-grid dashboard-grid-four"
              >
                <GuidanceAnalyticsPanel />
                <NavigationAnalyticsPanel />
                <EkfAnalyticsPanel />
                <EstimationComparisonPanel />
              </div>
            </section>

            <section className="dashboard-section">
              <SectionHeader label="Section D" title="State Estimation Benchmark" />

              <StateEstimationBenchmarkPanel />
            </section>

            <section className="dashboard-section">
              <SectionHeader label="Section E" title="Logs and Replay" />

              <div
                className="dashboard-grid dashboard-grid-four"
              >
                <GuidanceLogsPanel />
                <NavigationLogsPanel />
                <MissionReplayPanel />
                <NavigationReplayPanel />
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
