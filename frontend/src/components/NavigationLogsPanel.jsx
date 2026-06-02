import { useEffect, useState } from "react";

import {
  getNavigationLogs,
  clearNavigationLogs,
  exportNavigationLogs
} from "../services/api";

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : value.toFixed(4);
    return `${formatted}${suffix}`;
  }

  if (typeof value === "boolean") {
    return value ? "ACTIVE" : "Normal";
  }

  return `${value}${suffix}`;
}

function NavigationLogsPanel() {
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
      const r = await getNavigationLogs();
      const parsedLogs = Array.isArray(r.data) ? r.data : r.data.logs || [];

      setLogs(parsedLogs);
    } catch {
      setLogs([]);
    }
  };

  const handleClear = async () => {
    await clearNavigationLogs();
    setLogs([]);
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Navigation Logs</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)",
          maxHeight: "420px",
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
            onClick={exportNavigationLogs}
            style={{ ...buttonStyle, backgroundColor: "#164e63" }}
          >
            Export CSV
          </button>
        </div>

        {logs.length === 0 ? (
          <div
            style={{
              padding: "0.9rem",
              backgroundColor: "#0f172a",
              borderRadius: "8px",
              border: "1px solid #334155",
              color: "#cbd5e1"
            }}
          >
            No navigation logs available
          </div>
        ) : (
          logs.slice(-20).reverse().map((log, index) => (
            <div
              key={`${log.timestamp || "nav-log"}-${index}`}
              style={{
                marginTop: "0.8rem",
                padding: "0.8rem",
                backgroundColor: "#0f172a",
                borderRadius: "8px",
                border: "1px solid #334155"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                  alignItems: "center",
                  marginBottom: "0.7rem"
                }}
              >
                <strong>{formatValue(log.nav_state || log.flight_mode)}</strong>
                <span
                  style={{
                    color: log.navigation_health === "Healthy"
                      ? "#22c55e"
                      : "#f59e0b",
                    fontWeight: "bold"
                  }}
                >
                  {formatValue(log.navigation_health)}
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: "0.55rem 1rem",
                  fontSize: "0.92rem"
                }}
              >
                <span>Lat: {formatValue(log.latitude)}</span>
                <span>Lon: {formatValue(log.longitude)}</span>
                <span>Alt: {formatValue(log.global_altitude, " m")}</span>
                <span>Vel: {formatValue(log.velocity, " m/s")}</span>
                <span>Failsafe: {formatValue(log.failsafe)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default NavigationLogsPanel;
