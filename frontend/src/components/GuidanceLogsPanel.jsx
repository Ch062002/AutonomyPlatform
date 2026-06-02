import { useEffect, useState } from "react";
import { getGuidanceLogs, clearGuidanceLogs } from "../services/api";

function GuidanceLogsPanel() {
  const [logs, setLogs] = useState([]);

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
          maxHeight: "350px",
          overflowY: "auto"
        }}
      >
        <button onClick={handleClear}>
          Clear Logs
        </button>

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
            <p>WP: {log.active_waypoint ?? "--"}/{log.total_waypoints ?? "--"}</p>
            <p>Distance: {log.distance_to_waypoint ?? "--"} m</p>
            <p>CTE: {log.cross_track_error ?? "--"} m</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default GuidanceLogsPanel;