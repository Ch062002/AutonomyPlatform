import { useEffect, useState } from "react";

import {
  getEkfStatus,
  getEstimationComparison,
  getObserverStatus,
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
  const [observer, setObserver] = useState(null);
  const [comparison, setComparison] = useState(null);

  const fetchStatus = async () => {
    try {
      const [
        statusResponse,
        ekfResponse,
        observerResponse,
        comparisonResponse
      ] = await Promise.all([
        getStateEstimationStatus(),
        getEkfStatus(),
        getObserverStatus(),
        getEstimationComparison()
      ]);

      setStatus(statusResponse.data || null);
      setEkf(ekfResponse.data || null);
      setObserver(observerResponse.data || null);
      setComparison(comparisonResponse.data || null);
    } catch {
      setStatus(null);
      setEkf(null);
      setObserver(null);
      setComparison(null);
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
  const ukf = comparison?.ukf || status?.ukf || {};
  const ukfPosition = ukf?.estimated_position || ukf?.output?.position || {};
  const ukfVelocity = ukf?.estimated_velocity || ukf?.output?.velocity || {};
  const observerData = observer || comparison?.observer || status?.observer || {};
  const observerPosition = (
    observerData?.estimated_position ||
    observerData?.output?.position ||
    {}
  );
  const observerVelocity = (
    observerData?.estimated_velocity ||
    observerData?.output?.velocity ||
    {}
  );
  const comparisonMetrics = comparison?.comparison || {};

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
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "0.9rem"
          }}
        >
          <div>
            <h3 style={{ marginTop: 0 }}>Raw GPS</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "0.7rem"
              }}
            >
              <StatusTile
                label="Status"
                value={rawGps.available ? "Available" : "Waiting"}
                color={rawGps.available ? "#22c55e" : "#f59e0b"}
              />
              <StatusTile
                label="Position"
                value={`${formatValue(rawGps.latitude)}, ${formatValue(rawGps.longitude)}`}
              />
              <StatusTile
                label="Altitude"
                value={formatValue(rawGps.global_altitude, " m")}
              />
              <StatusTile
                label="Velocity"
                value={formatValue(rawGps.velocity, " m/s")}
              />
            </div>
          </div>

          <div>
            <h3 style={{ marginTop: 0 }}>EKF</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "0.7rem"
              }}
            >
              <StatusTile
                label="Status"
                value={ekf?.status || filterStatus(status?.ekf)}
                color={ekf?.enabled ? "#22c55e" : filterColor(status?.ekf)}
              />
              <StatusTile
                label="Position"
                value={`${formatValue(ekfPosition.x)}, ${formatValue(ekfPosition.y)}`}
                color="#38bdf8"
              />
              <StatusTile
                label="Velocity"
                value={`${formatValue(ekfVelocity.vx, " m/s")}, ${formatValue(ekfVelocity.vy, " m/s")}`}
                color="#38bdf8"
              />
              <StatusTile
                label="Innovation"
                value={formatValue(ekf?.innovation)}
                color="#f59e0b"
              />
              <StatusTile
                label="Covariance"
                value={formatValue(ekf?.covariance_trace)}
                color="#a78bfa"
              />
              <StatusTile
                label="Health"
                value={ekf?.health || "--"}
                color={ekf?.health === "healthy" ? "#22c55e" : "#f59e0b"}
              />
            </div>
          </div>

          <div>
            <h3 style={{ marginTop: 0 }}>UKF</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "0.7rem"
              }}
            >
              <StatusTile
                label="Status"
                value={ukf?.status || filterStatus(status?.ukf)}
                color={ukf?.enabled ? "#22c55e" : filterColor(status?.ukf)}
              />
              <StatusTile
                label="Position"
                value={`${formatValue(ukfPosition.x)}, ${formatValue(ukfPosition.y)}`}
                color="#38bdf8"
              />
              <StatusTile
                label="Velocity"
                value={`${formatValue(ukfVelocity.vx, " m/s")}, ${formatValue(ukfVelocity.vy, " m/s")}`}
                color="#38bdf8"
              />
              <StatusTile
                label="Innovation"
                value={formatValue(ukf?.innovation)}
                color="#f59e0b"
              />
              <StatusTile
                label="Covariance"
                value={formatValue(ukf?.covariance_trace ?? ukf?.covariance)}
                color="#a78bfa"
              />
              <StatusTile
                label="Health"
                value={ukf?.health || "--"}
                color={ukf?.health === "healthy" ? "#22c55e" : "#f59e0b"}
              />
            </div>
          </div>

          <div>
            <h3 style={{ marginTop: 0 }}>Comparison</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "0.7rem"
              }}
            >
              <StatusTile
                label="Position Diff"
                value={formatValue(comparisonMetrics.position_difference)}
                color="#f59e0b"
              />
              <StatusTile
                label="Velocity Diff"
                value={formatValue(comparisonMetrics.velocity_difference)}
                color="#f59e0b"
              />
              <StatusTile
                label="Innovation Diff"
                value={formatValue(comparisonMetrics.innovation_difference)}
                color="#f59e0b"
              />
              <StatusTile
                label="Observer Pos Diff"
                value={formatValue(comparisonMetrics.observer_position_difference)}
                color="#f59e0b"
              />
              <StatusTile
                label="Observer Vel Diff"
                value={formatValue(comparisonMetrics.observer_velocity_difference)}
                color="#f59e0b"
              />
              <StatusTile
                label="Fusion Status"
                value={sensorFusion.status || "--"}
                color={sensorFusion.enabled ? "#22c55e" : "#94a3b8"}
              />
              <StatusTile
                label="Source"
                value={status?.estimation_source || "--"}
                color="#38bdf8"
              />
              <StatusTile
                label="Ready"
                value={formatValue(status?.future_comparison_ready)}
                color={status?.future_comparison_ready ? "#22c55e" : "#f59e0b"}
              />
            </div>
          </div>

          <div>
            <h3 style={{ marginTop: 0 }}>Observer</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "0.7rem"
              }}
            >
              <StatusTile
                label="Status"
                value={observerData?.status || filterStatus(status?.observer)}
                color={observerData?.enabled ? "#22c55e" : filterColor(status?.observer)}
              />
              <StatusTile
                label="Position"
                value={`${formatValue(observerPosition.x)}, ${formatValue(observerPosition.y)}`}
                color="#38bdf8"
              />
              <StatusTile
                label="Velocity"
                value={`${formatValue(observerVelocity.vx, " m/s")}, ${formatValue(observerVelocity.vy, " m/s")}`}
                color="#38bdf8"
              />
              <StatusTile
                label="Observer Gain"
                value={formatValue(observerData?.observer_gain)}
                color="#a78bfa"
              />
              <StatusTile
                label="Estimation Error"
                value={formatValue(observerData?.estimation_error)}
                color="#f59e0b"
              />
              <StatusTile
                label="Health"
                value={observerData?.health || "--"}
                color={observerData?.health === "healthy" ? "#22c55e" : "#f59e0b"}
              />
            </div>
          </div>
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
