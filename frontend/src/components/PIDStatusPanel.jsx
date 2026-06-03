import { useEffect, useState } from "react";

import {
  getPidAnalytics,
  getPidConfig,
  getPidStatus,
  updatePidConfig
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

function PIDStatusPanel({ addCommandLog }) {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedAxis, setSelectedAxis] = useState("altitude");
  const [draftGains, setDraftGains] = useState({});

  const fetchPidData = async () => {
    try {
      const [statusResponse, configResponse, analyticsResponse] = await Promise.all([
        getPidStatus(),
        getPidConfig(),
        getPidAnalytics()
      ]);

      setStatus(statusResponse.data || null);
      setConfig(configResponse.data || null);
      setAnalytics(analyticsResponse.data || null);
      setDraftGains(configResponse.data?.gains || {});
    } catch {
      setStatus(null);
      setConfig(null);
      setAnalytics(null);
    }
  };

  useEffect(() => {
    fetchPidData();
    const interval = setInterval(fetchPidData, 5000);
    return () => clearInterval(interval);
  }, []);

  const axisGains = draftGains[selectedAxis] || { kp: 0, ki: 0, kd: 0 };
  const axisOutput = status?.control_output?.[selectedAxis] || {};
  const health = status?.health || "--";

  const handleGainChange = (gainName, value) => {
    setDraftGains((prev) => ({
      ...prev,
      [selectedAxis]: {
        ...(prev[selectedAxis] || {}),
        [gainName]: value
      }
    }));
  };

  const saveGains = async () => {
    try {
      const response = await updatePidConfig({
        [selectedAxis]: {
          kp: Number(axisGains.kp),
          ki: Number(axisGains.ki),
          kd: Number(axisGains.kd)
        }
      });

      setConfig(response.data || null);
      addCommandLog?.(`PID ${selectedAxis} gains updated`);
      await fetchPidData();
    } catch {
      addCommandLog?.(`Failed to update PID ${selectedAxis} gains`);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>PID Controller</h2>

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
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          {["kp", "ki", "kd"].map((gainName) => (
            <label
              key={gainName}
              style={{
                display: "grid",
                gap: "0.35rem",
                color: "#94a3b8",
                fontSize: "0.82rem",
                textTransform: "uppercase"
              }}
            >
              {gainName}
              <input
                type="number"
                step="0.01"
                value={axisGains[gainName] ?? ""}
                onChange={(event) => handleGainChange(gainName, event.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  backgroundColor: "#0f172a",
                  color: "white",
                  fontWeight: "bold"
                }}
              />
            </label>
          ))}

          <button
            type="button"
            onClick={saveGains}
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
          <MetricTile label="Error" value={formatNumber(axisOutput.error)} color="#f59e0b" />
          <MetricTile
            label="Control Output"
            value={formatNumber(axisOutput.control_output)}
            color="#38bdf8"
          />
          <MetricTile label="Controller Health" value={health} color="#22c55e" />
          <MetricTile
            label="Status"
            value={status?.status || "Disconnected"}
            color={status?.status === "active" ? "#22c55e" : "#f59e0b"}
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
            label="Average Error"
            value={formatNumber(analytics?.average_error)}
            color="#e2e8f0"
          />
          <MetricTile
            label="Max Error"
            value={formatNumber(analytics?.max_error)}
            color="#f59e0b"
          />
          <MetricTile
            label="Control Effort"
            value={formatNumber(analytics?.control_effort)}
            color="#c4b5fd"
          />
          <MetricTile
            label="Samples"
            value={analytics?.samples ?? 0}
            color="#94a3b8"
          />
        </div>

        <div style={{ marginTop: "0.75rem", color: "#64748b", fontSize: "0.82rem" }}>
          Gain scheduling: {config?.future_ready?.gain_scheduling || "placeholder"} | Adaptive PID:{" "}
          {config?.future_ready?.adaptive_pid || "placeholder"}
        </div>
      </div>
    </div>
  );
}

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

export default PIDStatusPanel;
