import { useEffect, useState } from "react";

import {
  getLqrAnalytics,
  getLqrConfig,
  getLqrStatus
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

function LQRStatusPanel() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchLqrData = async () => {
    try {
      const [statusResponse, configResponse, analyticsResponse] = await Promise.all([
        getLqrStatus(),
        getLqrConfig(),
        getLqrAnalytics()
      ]);

      setStatus(statusResponse.data || null);
      setConfig(configResponse.data || null);
      setAnalytics(analyticsResponse.data || null);
    } catch {
      setStatus(null);
      setConfig(null);
      setAnalytics(null);
    }
  };

  useEffect(() => {
    fetchLqrData();
    const interval = setInterval(fetchLqrData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>LQR Controller</h2>

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
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          <MetricTile
            label="State Error"
            value={formatVector(status?.state_error)}
            color="#f59e0b"
          />
          <MetricTile
            label="Control Output"
            value={formatVector(status?.control_output)}
            color="#38bdf8"
          />
          <MetricTile
            label="Controller Health"
            value={status?.health || "--"}
            color="#22c55e"
          />
          <MetricTile
            label="Stability Score"
            value={formatNumber(analytics?.stability_score)}
            color="#c4b5fd"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          <MatrixBlock title="Q Matrix" matrix={config?.q_matrix} />
          <MatrixBlock title="R Matrix" matrix={config?.r_matrix} />
          <MatrixBlock title="Gain Matrix K" matrix={config?.gain_matrix_k} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.65rem"
          }}
        >
          <MetricTile
            label="Average State Error"
            value={formatNumber(analytics?.average_state_error)}
            color="#e2e8f0"
          />
          <MetricTile
            label="Max State Error"
            value={formatNumber(analytics?.max_state_error)}
            color="#f59e0b"
          />
          <MetricTile
            label="Control Effort"
            value={formatNumber(analytics?.control_effort)}
            color="#c4b5fd"
          />
          <MetricTile
            label="Response Quality"
            value={formatNumber(analytics?.response_quality)}
            color="#22c55e"
          />
        </div>

        <div style={{ marginTop: "0.75rem", color: "#64748b", fontSize: "0.82rem" }}>
          Model: {config?.state_space_model || "x_dot = Ax + Bu"} | Law:{" "}
          {config?.control_law || "u = -Kx"} | Gain scheduling:{" "}
          {config?.future_ready?.gain_scheduling || "placeholder"} | LPV:{" "}
          {config?.future_ready?.lpv_control || "placeholder"}
        </div>
      </div>
    </div>
  );
}

function formatVector(values) {
  if (!Array.isArray(values)) {
    return "--";
  }

  return `[${values.map((value) => formatNumber(value)).join(", ")}]`;
}

function MatrixBlock({ title, matrix }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "0.75rem",
        borderRadius: "8px",
        border: "1px solid #334155",
        minHeight: "112px",
        overflowX: "auto"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: "0.45rem" }}>
        {title}
      </div>
      <pre
        style={{
          margin: 0,
          color: "#e2e8f0",
          fontSize: "0.78rem",
          lineHeight: 1.45,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
        }}
      >
        {formatMatrix(matrix)}
      </pre>
    </div>
  );
}

function formatMatrix(matrix) {
  if (!Array.isArray(matrix)) {
    return "--";
  }

  return matrix
    .map((row) => `[${(row || []).map((value) => formatNumber(value)).join(", ")}]`)
    .join("\n");
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

export default LQRStatusPanel;
