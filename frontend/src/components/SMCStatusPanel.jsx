import { useEffect, useState } from "react";

import {
  getSmcAnalytics,
  getSmcConfig,
  getSmcStatus,
  updateSmcConfig
} from "../services/api";

const AXES = ["attitude", "altitude", "velocity", "position"];

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

function SMCStatusPanel({ addCommandLog }) {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedAxis, setSelectedAxis] = useState("altitude");
  const [draftParameters, setDraftParameters] = useState({});

  const fetchSmcData = async () => {
    try {
      const [statusResponse, configResponse, analyticsResponse] = await Promise.all([
        getSmcStatus(),
        getSmcConfig(),
        getSmcAnalytics()
      ]);

      setStatus(statusResponse.data || null);
      setConfig(configResponse.data || null);
      setAnalytics(analyticsResponse.data || null);
      setDraftParameters(configResponse.data?.parameters || {});
    } catch {
      setStatus(null);
      setConfig(null);
      setAnalytics(null);
    }
  };

  useEffect(() => {
    fetchSmcData();
    const interval = setInterval(fetchSmcData, 5000);
    return () => clearInterval(interval);
  }, []);

  const axisParameters = draftParameters[selectedAxis] || {
    lambda: 0,
    k: 0,
    phi: 0,
    mode: "saturation"
  };
  const axisOutput = status?.control_output?.[selectedAxis] || {};

  const handleParameterChange = (parameterName, value) => {
    setDraftParameters((prev) => ({
      ...prev,
      [selectedAxis]: {
        ...(prev[selectedAxis] || {}),
        [parameterName]: value
      }
    }));
  };

  const saveParameters = async () => {
    try {
      const response = await updateSmcConfig({
        [selectedAxis]: {
          lambda: Number(axisParameters.lambda),
          k: Number(axisParameters.k),
          phi: Number(axisParameters.phi),
          mode: axisParameters.mode
        }
      });

      setConfig(response.data || null);
      addCommandLog?.(`SMC ${selectedAxis} parameters updated`);
      await fetchSmcData();
    } catch {
      addCommandLog?.(`Failed to update SMC ${selectedAxis} parameters`);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>SMC Controller</h2>

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
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "0.45rem",
            marginBottom: "0.85rem"
          }}
        >
          {AXES.map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => setSelectedAxis(axis)}
              style={{
                padding: "0.55rem 0.45rem",
                borderRadius: "8px",
                border: axis === selectedAxis ? "1px solid #38bdf8" : "1px solid #334155",
                backgroundColor: axis === selectedAxis ? "#0f3b57" : "#0f172a",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                textTransform: "capitalize"
              }}
            >
              {axis}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(105px, 1fr))",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          {["lambda", "k", "phi"].map((parameterName) => (
            <label
              key={parameterName}
              style={{
                display: "grid",
                gap: "0.35rem",
                color: "#94a3b8",
                fontSize: "0.82rem",
                textTransform: "uppercase"
              }}
            >
              {parameterName}
              <input
                type="number"
                step="0.01"
                value={axisParameters[parameterName] ?? ""}
                onChange={(event) => handleParameterChange(parameterName, event.target.value)}
                style={inputStyle}
              />
            </label>
          ))}

          <label
            style={{
              display: "grid",
              gap: "0.35rem",
              color: "#94a3b8",
              fontSize: "0.82rem",
              textTransform: "uppercase"
            }}
          >
            mode
            <select
              value={axisParameters.mode || "saturation"}
              onChange={(event) => handleParameterChange("mode", event.target.value)}
              style={inputStyle}
            >
              <option value="saturation">saturation</option>
              <option value="sign">sign</option>
            </select>
          </label>

          <button
            type="button"
            onClick={saveParameters}
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
            label="Sliding Surface"
            value={formatNumber(axisOutput.sliding_surface)}
            color="#f59e0b"
          />
          <MetricTile
            label="Control Output"
            value={formatNumber(axisOutput.control_output)}
            color="#38bdf8"
          />
          <MetricTile
            label="Chattering Index"
            value={formatNumber(analytics?.chattering_index)}
            color="#c4b5fd"
          />
          <MetricTile
            label="Controller Health"
            value={status?.health || "--"}
            color="#22c55e"
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
            label="Average Surface"
            value={formatNumber(analytics?.average_sliding_surface)}
            color="#e2e8f0"
          />
          <MetricTile
            label="Max Surface"
            value={formatNumber(analytics?.max_sliding_surface)}
            color="#f59e0b"
          />
          <MetricTile
            label="Control Effort"
            value={formatNumber(analytics?.control_effort)}
            color="#c4b5fd"
          />
          <MetricTile
            label="Robustness Score"
            value={formatNumber(analytics?.robustness_score)}
            color="#22c55e"
          />
        </div>

        <div style={{ marginTop: "0.75rem", color: "#64748b", fontSize: "0.82rem" }}>
          Surface: {config?.sliding_surface || "s = lambda * error + error_dot"} | Law:{" "}
          {config?.control_law || "u = -k * sign(s)"} | Chattering reduction:{" "}
          {config?.future_ready?.chattering_reduction || "placeholder"}
        </div>
      </div>
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

export default SMCStatusPanel;
