import { useEffect, useState } from "react";

import {
  getEkfStatus,
  getStateEstimationStatus
} from "../services/api";

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "boolean") {
    return value ? "Ready" : "Pending";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : value.toFixed(4);
    return `${formatted}${suffix}`;
  }

  return `${value}${suffix}`;
}

function StatusTile({ label, value, color = "#e2e8f0" }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "0.8rem",
        borderRadius: "8px",
        border: "1px solid #334155",
        minHeight: "78px"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{label}</div>
      <div
        style={{
          color,
          fontWeight: "bold",
          marginTop: "0.45rem",
          overflowWrap: "anywhere"
        }}
      >
        {value}
      </div>
    </div>
  );
}

function filterStatus(filter) {
  if (!filter) {
    return "--";
  }

  return filter.enabled ? "Enabled" : filter.status || "placeholder";
}

function filterColor(filter) {
  return filter?.enabled ? "#22c55e" : "#94a3b8";
}

function StateEstimationPanel() {
  const [status, setStatus] = useState(null);
  const [ekf, setEkf] = useState(null);

  const fetchStatus = async () => {
    try {
      const [statusResponse, ekfResponse] = await Promise.all([
        getStateEstimationStatus(),
        getEkfStatus()
      ]);

      setStatus(statusResponse.data || null);
      setEkf(ekfResponse.data || null);
    } catch {
      setStatus(null);
      setEkf(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const rawGps = status?.raw_gps || {};
  const sensorFusion = status?.sensor_fusion || {};
  const ekfPosition = ekf?.estimated_position || {};
  const ekfVelocity = ekf?.estimated_velocity || {};

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>State Estimation</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.8rem"
          }}
        >
          <StatusTile
            label="Raw GPS"
            value={rawGps.available ? "Available" : "Waiting"}
            color={rawGps.available ? "#22c55e" : "#f59e0b"}
          />
          <StatusTile
            label="EKF Status"
            value={ekf?.status || filterStatus(status?.ekf)}
            color={ekf?.enabled ? "#22c55e" : filterColor(status?.ekf)}
          />
          <StatusTile
            label="UKF Status"
            value={filterStatus(status?.ukf)}
            color={filterColor(status?.ukf)}
          />
          <StatusTile
            label="Observer Status"
            value={filterStatus(status?.observer)}
            color={filterColor(status?.observer)}
          />
          <StatusTile
            label="Sensor Fusion Status"
            value={sensorFusion.status || "--"}
            color={sensorFusion.enabled ? "#22c55e" : "#94a3b8"}
          />
          <StatusTile
            label="Estimation Source"
            value={status?.estimation_source || "--"}
            color="#38bdf8"
          />
          <StatusTile
            label="Future Comparison Ready"
            value={formatValue(status?.future_comparison_ready)}
            color={status?.future_comparison_ready ? "#22c55e" : "#f59e0b"}
          />
          <StatusTile
            label="GPS Position"
            value={`${formatValue(rawGps.latitude)}, ${formatValue(rawGps.longitude)}`}
          />
          <StatusTile
            label="GPS Altitude"
            value={formatValue(rawGps.global_altitude, " m")}
          />
          <StatusTile
            label="GPS Velocity"
            value={formatValue(rawGps.velocity, " m/s")}
          />
          <StatusTile
            label="EKF Position"
            value={`${formatValue(ekfPosition.x)}, ${formatValue(ekfPosition.y)}`}
            color="#38bdf8"
          />
          <StatusTile
            label="EKF Velocity"
            value={`${formatValue(ekfVelocity.vx, " m/s")}, ${formatValue(ekfVelocity.vy, " m/s")}`}
            color="#38bdf8"
          />
          <StatusTile
            label="Innovation"
            value={formatValue(ekf?.innovation)}
            color="#f59e0b"
          />
          <StatusTile
            label="Covariance Trace"
            value={formatValue(ekf?.covariance_trace)}
            color="#a78bfa"
          />
          <StatusTile
            label="EKF Health"
            value={ekf?.health || "--"}
            color={ekf?.health === "healthy" ? "#22c55e" : "#f59e0b"}
          />
        </div>

        <div
          style={{
            marginTop: "0.9rem",
            padding: "0.8rem",
            backgroundColor: "#0f172a",
            borderRadius: "8px",
            border: "1px solid #334155",
            color: "#94a3b8"
          }}
        >
          UKF, Complementary Filter, and Observer modules are staged as placeholders.
        </div>
      </div>
    </div>
  );
}

export default StateEstimationPanel;
