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
              gridTemplateColumns: "minmax(0, 1.75fr) minmax(340px, 0.95fr)",
              gap: "1.6rem",
              alignItems: "start"
            }}
          >
            <div>
              <TelemetryCard telemetry={telemetry} />

              <div style={{ marginTop: "1.6rem" }}>
                <NavigationStatusPanel telemetry={telemetry} mission={mission} />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <NavigationAnalyticsPanel />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <NavigationLogsPanel />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <TelemetryCharts history={telemetryHistory} />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <CommandPanel addCommandLog={addCommandLog} />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <GuidanceLogsPanel />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <GuidanceAnalyticsPanel />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <MissionReplayPanel />
              </div>
            </div>

            <div>
              <MapPanel
                telemetry={telemetry}
                mission={mission}
                trajectoryHistory={trajectoryHistory}
              />

              <div style={{ marginTop: "1.6rem" }}>
                <GuidanceModePanel addCommandLog={addCommandLog} />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <MissionStatusPanel mission={mission} uploadStatus={uploadStatus} />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <VehicleHealthPanel telemetry={telemetry} />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
                <CommandLog logs={commandLogs} />
              </div>

              <div style={{ marginTop: "1.6rem" }}>
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
