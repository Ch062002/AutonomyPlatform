import { useEffect, useState } from "react";

import {
  getGuidanceLogs,
  clearGuidanceLogs,
  exportGuidanceLogs
} from "../services/api";

function GuidanceLogsPanel() {
  const [logs, setLogs] = useState([]);

  const buttonStyle = {
    padding: "0.65rem 0.95rem",
    borderRadius: "8px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: "bold"
  };

  const fetchLogs = async () => {
    try {
      const r = await getGuidanceLogs();

      const parsedLogs = Array.isArray(r.data)
        ? r.data
        : r.data.logs || [];

      setLogs(parsedLogs);
    } catch {
      setLogs([]);
    }
  };

  const handleClear = async () => {
    await clearGuidanceLogs();
    setLogs([]);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Guidance Logs</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)",
          maxHeight: "350px",
          overflowY: "auto"
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.8rem",
            flexWrap: "wrap",
            marginBottom: "1rem"
          }}
        >
          <button onClick={handleClear} style={buttonStyle}>
            Clear Logs
          </button>

          <button
            onClick={exportGuidanceLogs}
            style={{ ...buttonStyle, backgroundColor: "#164e63" }}
          >
            Export CSV
          </button>
        </div>

        {logs.slice(-20).reverse().map((log, index) => (
          <div
            key={index}
            style={{
              marginTop: "0.8rem",
              padding: "0.7rem",
              backgroundColor: "#0f172a",
              borderRadius: "8px",
              border: "1px solid #334155"
            }}
          >
            <strong>{log.guidance_mode || "--"}</strong>
            <p>Progress: {log.progress_percent ?? "--"}%</p>
            <p>
              WP: {log.active_waypoint ?? "--"}/
              {log.total_waypoints ?? "--"}
            </p>
            <p>Distance: {log.distance_to_waypoint ?? "--"} m</p>
            <p>CTE: {log.cross_track_error ?? "--"} m</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GuidanceLogsPanel;
