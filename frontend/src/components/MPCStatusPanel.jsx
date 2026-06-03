import { useEffect, useState } from "react";

import {
  getMpcAnalytics,
  getMpcConfig,
  getMpcStatus,
  updateMpcConfig
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

function MPCStatusPanel({ addCommandLog }) {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [draftConfig, setDraftConfig] = useState({
    prediction_horizon: 12,
    control_horizon: 4,
    dt: 0.05
  });

  const fetchMpcData = async () => {
    try {
      const [statusResponse, configResponse, analyticsResponse] = await Promise.all([
        getMpcStatus(),
        getMpcConfig(),
        getMpcAnalytics()
      ]);

      setStatus(statusResponse.data || null);
      setConfig(configResponse.data || null);
      setAnalytics(analyticsResponse.data || null);
      setDraftConfig({
        prediction_horizon: configResponse.data?.prediction_horizon ?? 12,
        control_horizon: configResponse.data?.control_horizon ?? 4,
        dt: configResponse.data?.dt ?? 0.05
      });
    } catch {
      setStatus(null);
      setConfig(null);
      setAnalytics(null);
    }
  };

  useEffect(() => {
    fetchMpcData();
    const interval = setInterval(fetchMpcData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (key, value) => {
    setDraftConfig((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const saveConfig = async () => {
    try {
      const response = await updateMpcConfig({
        prediction_horizon: Number(draftConfig.prediction_horizon),
        control_horizon: Number(draftConfig.control_horizon),
        dt: Number(draftConfig.dt)
      });

      setConfig(response.data || null);
      addCommandLog?.("MPC horizon configuration updated");
      await fetchMpcData();
    } catch {
      addCommandLog?.("Failed to update MPC horizon configuration");
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>MPC Controller</h2>

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
            gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          <NumberInput
            label="Prediction N"
            value={draftConfig.prediction_horizon}
            onChange={(value) => handleConfigChange("prediction_horizon", value)}
          />
          <NumberInput
            label="Control M"
            value={draftConfig.control_horizon}
            onChange={(value) => handleConfigChange("control_horizon", value)}
          />
          <NumberInput
            label="dt"
            step="0.01"
            value={draftConfig.dt}
            onChange={(value) => handleConfigChange("dt", value)}
          />
          <button
            type="button"
            onClick={saveConfig}
            style={{
              alignSelf: "end",
              padding: "0.62rem",
              borderRadius: "8px",
              border: "1px solid #38bdf8",
              backgroundColor: "#075985",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Apply
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
            label="Tracking Error"
            value={formatNumber(status?.tracking_error_norm)}
            color="#f59e0b"
          />
          <MetricTile
            label="Control Effort"
            value={formatNumber(status?.control_effort)}
            color="#38bdf8"
          />
          <MetricTile
            label="Prediction Cost"
            value={formatNumber(status?.prediction_cost)}
            color="#c4b5fd"
          />
          <MetricTile
            label="Solver Status"
            value={status?.solver_status || analytics?.solver_status || "--"}
            color="#22c55e"
          />
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
            label="Constraint Violations"
            value={status?.constraint_violation_count ?? analytics?.constraint_violation_count ?? 0}
            color="#f59e0b"
          />
          <MetricTile
            label="Computation Time"
            value={`${formatNumber(status?.computation_time_ms ?? analytics?.computation_time_ms)} ms`}
            color="#e2e8f0"
          />
          <MetricTile
            label="Controller Health"
            value={status?.health || "--"}
            color="#22c55e"
          />
          <MetricTile
            label="Avg Tracking Error"
            value={formatNumber(analytics?.average_tracking_error)}
            color="#94a3b8"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.65rem"
          }}
        >
          <WeightBlock title="Q Weights" weights={config?.q_weights} />
          <WeightBlock title="R Weights" weights={config?.r_weights} />
          <WeightBlock title="Control Output" weights={status?.control_output} />
        </div>

        <div style={{ marginTop: "0.75rem", color: "#64748b", fontSize: "0.82rem" }}>
          Cost: {config?.cost_function || "J = sum((x - x_ref)^T Q (x - x_ref) + u^T R u)"} |
          Robust MPC: {config?.future_ready?.robust_mpc || "placeholder"} | Tube MPC:{" "}
          {config?.future_ready?.tube_mpc || "placeholder"}
        </div>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, step = "1" }) {
  return (
    <label
      style={{
        display: "grid",
        gap: "0.35rem",
        color: "#94a3b8",
        fontSize: "0.82rem",
        textTransform: "uppercase"
      }}
    >
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function WeightBlock({ title, weights }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "0.75rem",
        borderRadius: "8px",
        border: "1px solid #334155",
        minHeight: "96px"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.45rem" }}>
        {title}
      </div>
      {weights ? (
        Object.entries(weights).map(([key, value]) => (
          <div
            key={key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "0.7rem",
              color: "#e2e8f0",
              fontSize: "0.82rem",
              marginBottom: "0.25rem"
            }}
          >
            <span>{key}</span>
            <strong>{Array.isArray(value) ? `[${value.join(", ")}]` : formatNumber(value)}</strong>
          </div>
        ))
      ) : (
        <div style={{ color: "#64748b", fontSize: "0.82rem" }}>--</div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.55rem",
  borderRadius: "8px",
  border: "1px solid #334155",
  backgroundColor: "#0f172a",
  color: "white",
  fontWeight: "bold"
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

export default MPCStatusPanel;
