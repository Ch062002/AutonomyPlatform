import { useEffect, useState } from "react";

import {
  getTubeMpcAnalytics,
  getTubeMpcConfig,
  getTubeMpcStatus
} from "../services/api";

function formatNumber(value, digits = 3) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return Math.abs(number) >= 100 ? number.toFixed(1) : number.toFixed(digits);
}

function percent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`;
}

function TubeMPCPanel() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchTubeMpc = async () => {
    try {
      const [statusResponse, configResponse, analyticsResponse] = await Promise.all([
        getTubeMpcStatus(),
        getTubeMpcConfig(),
        getTubeMpcAnalytics()
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
    fetchTubeMpc();
    const interval = setInterval(fetchTubeMpc, 5000);
    return () => clearInterval(interval);
  }, []);

  const feasibility = status?.tube_feasibility_status || "offline";
  const health = status?.health || (feasibility === "feasible" ? "ready" : "offline");

  return (
    <section className="tube-mpc-panel">
      <div className="tube-mpc-header">
        <div>
          <div className="panel-kicker">Tube MPC</div>
          <h2>Bounded-Disturbance Tracking</h2>
        </div>
        <span className={`tube-mpc-health ${feasibility === "feasible" ? "ready" : "disabled"}`}>
          {health}
        </span>
      </div>

      <div className="tube-mpc-metric-grid">
        <Metric label="Tube Radius" value={formatNumber(status?.tube_radius ?? analytics?.tube_radius)} />
        <Metric label="Disturbance Bound" value={formatNumber(status?.disturbance_bound ?? analytics?.disturbance_bound)} />
        <Metric label="Tightening" value={percent(status?.constraint_tightening_level ?? analytics?.constraint_tightening_level)} />
        <Metric label="Tube Violations" value={status?.tube_violation_count ?? analytics?.tube_violation_count ?? 0} />
        <Metric label="Feasibility Rate" value={percent(analytics?.feasibility_rate)} />
        <Metric label="Robustness Score" value={percent(status?.robustness_score ?? analytics?.robustness_score)} />
        <Metric label="Tracking Error" value={formatNumber(status?.tracking_error_norm ?? analytics?.average_tracking_error)} />
        <Metric label="Control Effort" value={formatNumber(status?.control_effort ?? analytics?.average_control_effort)} />
        <Metric label="Computation" value={`${formatNumber(status?.computation_time_ms ?? analytics?.computation_time)} ms`} />
      </div>

      <div className="tube-mpc-detail-grid">
        <div className="tube-mpc-block">
          <h3>Tube Parameters</h3>
          <ParameterTable
            rows={[
              ["radius", status?.tube_radius ?? config?.tube_radius],
              ["disturbance", status?.disturbance_bound ?? config?.disturbance_bound],
              ["tightening", status?.constraint_tightening_level ?? config?.constraint_tightening_level],
              ["invariant set", status?.invariant_set_placeholder?.status || config?.invariant_set_placeholder || "--"]
            ]}
          />
        </div>

        <div className="tube-mpc-block">
          <h3>Tightened Constraints</h3>
          <ConstraintTable
            constraints={status?.tightened_constraints || {
              state_constraints: config?.state_constraints || {},
              input_constraints: config?.input_constraints || {}
            }}
          />
        </div>
      </div>
    </section>
  );
}

function ParameterTable({ rows }) {
  return (
    <div className="tube-mpc-table tube-parameter-table">
      <div>Parameter</div>
      <div>Value</div>
      {rows.map(([label, value]) => (
        <TableRow key={label} cells={[labelText(label), formatMaybeNumber(value)]} />
      ))}
    </div>
  );
}

function ConstraintTable({ constraints }) {
  const rows = [
    ...Object.entries(constraints.state_constraints || {}).map(([name, value]) => [`state ${name}`, rangeText(value)]),
    ...Object.entries(constraints.input_constraints || {}).map(([name, value]) => [`input ${name}`, rangeText(value)])
  ];

  return (
    <div className="tube-mpc-table tube-constraint-table">
      <div>Constraint</div>
      <div>Range</div>
      {rows.map(([name, value]) => (
        <TableRow key={name} cells={[labelText(name), value]} />
      ))}
    </div>
  );
}

function TableRow({ cells }) {
  return cells.map((cell, index) => (
    <strong key={`${cell}-${index}`}>{cell}</strong>
  ));
}

function formatMaybeNumber(value) {
  const number = Number(value);

  if (Number.isFinite(number)) {
    return formatNumber(number);
  }

  return value || "--";
}

function rangeText(values) {
  if (!Array.isArray(values) || values.length !== 2) {
    return "--";
  }

  return `${formatNumber(values[0])} - ${formatNumber(values[1])}`;
}

function labelText(value) {
  return `${value}`.replaceAll("_", " ");
}

function Metric({ label, value }) {
  return (
    <div className="tube-mpc-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default TubeMPCPanel;
