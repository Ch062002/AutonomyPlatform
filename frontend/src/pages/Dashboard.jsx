import { useEffect, useState } from "react";

import StatusCard from "../components/StatusCard";
import TelemetryCard from "../components/TelemetryCard";
import TelemetryCharts from "../components/TelemetryCharts";
import MissionPanel from "../components/MissionPanel";

import {
    getBackendStatus,
    getRos2Status,
    getPx4Status,
    getGazeboStatus
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
        flight_mode: "--",
        arming_state: "--",
        failsafe: false
    });

    const [telemetryHistory, setTelemetryHistory] = useState([]);
    const [streamStatus, setStreamStatus] = useState("Connecting...");

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

        fetchSystemStatus();
        const statusInterval = setInterval(fetchSystemStatus, 3000);

        const telemetrySocket = new WebSocket("ws://localhost:8000/ws/telemetry");

        telemetrySocket.onopen = () => {
            setStreamStatus("Connected");
        };

        telemetrySocket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            setTelemetry(data);

            setTelemetryHistory((prev) => {
                const newPoint = {
                    time: new Date().toLocaleTimeString(),
                    altitude: Number(data.altitude),
                    velocity: Number(data.velocity),
                    battery: Number(data.battery)
                };

                return [...prev.slice(-30), newPoint];
            });
        };

        telemetrySocket.onerror = () => {
            setStreamStatus("Error");
        };

        telemetrySocket.onclose = () => {
            setStreamStatus("Disconnected");
        };

        return () => {
            clearInterval(statusInterval);
            telemetrySocket.close();
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

                <p style={{
                    textAlign: "center",
                    color: streamStatus === "Connected" ? "#22c55e" : "#ef4444"
                }}>
                    Telemetry Stream: {streamStatus}
                </p>

                <TelemetryCharts history={telemetryHistory} />

                <MissionPanel />
            </main>
        </div>
    );
}

export default Dashboard;