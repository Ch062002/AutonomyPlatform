import { useEffect, useState } from "react";

import {
  applyDisturbanceScenario,
  clearDisturbanceScenario,
  getDisturbanceAnalytics,
  getDisturbanceScenarios,
  getDisturbanceStatus
} from "../services/api";

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${value}`;
  }

  return Math.abs(number) >= 100 ? number.toFixed(1) : number.toFixed(4);
}

function DisturbanceTestingPanel({ addCommandLog }) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState("wind_disturbance");
  const [status, setStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchDisturbanceData = async () => {
    try {
      const [scenariosResponse, statusResponse, analyticsResponse] = await Promise.all([
        getDisturbanceScenarios(),
        getDisturbanceStatus(),
        getDisturbanceAnalytics()
      ]);

      const scenarioList = scenariosResponse.data?.scenarios || [];
      setScenarios(scenarioList);
      setStatus(statusResponse.data || null);
      setAnalytics(analyticsResponse.data || null);

      if (scenarioList.length && !scenarioList.some((scenario) => scenario.name === selectedScenario)) {
        setSelectedScenario(scenarioList[0].name);
      }
    } catch {
      setScenarios([]);
      setStatus(null);
      setAnalytics(null);
    }
  };

  useEffect(() => {
    fetchDisturbanceData();
    const interval = setInterval(fetchDisturbanceData, 5000);
    return () => clearInterval(interval);
  }, []);

  const applyScenario = async () => {
    try {
      await applyDisturbanceScenario(selectedScenario);
      addCommandLog?.(`Applied disturbance ${selectedScenario}`);
      await fetchDisturbanceData();
    } catch {
      addCommandLog?.(`Failed to apply disturbance ${selectedScenario}`);
    }
  };

  const clearScenario = async () => {
    try {
      await clearDisturbanceScenario();
      addCommandLog?.("Cleared active disturbance");
      await fetchDisturbanceData();
    } catch {
      addCommandLog?.("Failed to clear active disturbance");
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Robustness Testing</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "12px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.12)"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto auto",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          <select
            value={selectedScenario}
            onChange={(event) => setSelectedScenario(event.target.value)}
            style={{
              padding: "0.65rem",
              borderRadius: "8px",
              border: "1px solid #334155",
              backgroundColor: "#0f172a",
              color: "white",
              fontWeight: "bold"
            }}
          >
            {(scenarios.length ? scenarios : [{ name: "wind_disturbance" }]).map((scenario) => (
              <option key={scenario.name} value={scenario.name}>
                {scenario.name}
              </option>
            ))}
          </select>

          <button type="button" onClick={applyScenario} style={buttonStyle}>
            Apply
          </button>
          <button type="button" onClick={clearScenario} style={buttonStyle}>
            Clear
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          <MetricTile
            label="Active Disturbance"
            value={status?.scenario_name || "None"}
            color={status?.disturbance_active ? "#f59e0b" : "#22c55e"}
          />
          <MetricTile
            label="Controller Under Test"
            value={analytics?.controller_under_test || status?.controller_under_test || "--"}
            color="#38bdf8"
          />
          <MetricTile
            label="Robustness Score"
            value={formatNumber(analytics?.robustness_score)}
            color="#22c55e"
          />
          <MetricTile
            label="Tracking Error"
            value={formatNumber(analytics?.tracking_error_under_disturbance)}
            color="#f59e0b"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.65rem"
          }}
        >
          <MetricTile
            label="Recovery Time"
            value={analytics?.recovery_time_placeholder || "placeholder"}
            color="#94a3b8"
          />
          <MetricTile
            label="Rejection Score"
            value={formatNumber(analytics?.disturbance_rejection_score)}
            color="#c4b5fd"
          />
          <MetricTile
            label="Scenario Count"
            value={scenarios.length}
            color="#e2e8f0"
          />
        </div>

        <div style={{ marginTop: "0.75rem", color: "#64748b", fontSize: "0.82rem" }}>
          Supported: wind disturbance, sensor noise, actuator delay, measurement bias, GPS dropout placeholder
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "0.65rem 0.85rem",
  borderRadius: "8px",
  border: "1px solid #38bdf8",
  backgroundColor: "#075985",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  whiteSpace: "nowrap"
};

function MetricTile({ label, value, color }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "0.7rem",
        borderRadius: "8px",
        border: "1px solid #334155",
        minHeight: "68px"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{label}</div>
      <div
        style={{
          color,
          fontWeight: "bold",
          marginTop: "0.35rem",
          overflowWrap: "anywhere"
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default DisturbanceTestingPanel;
