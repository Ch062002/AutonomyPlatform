import { useEffect, useState } from "react";

import {
  getRobustMpcAnalytics,
  getRobustMpcConfig,
  getRobustMpcStatus
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

function RobustMPCPanel() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchRobustMpc = async () => {
    try {
      const [statusResponse, configResponse, analyticsResponse] = await Promise.all([
        getRobustMpcStatus(),
        getRobustMpcConfig(),
        getRobustMpcAnalytics()
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
    fetchRobustMpc();
    const interval = setInterval(fetchRobustMpc, 5000);
    return () => clearInterval(interval);
  }, []);

  const feasibility = status?.robust_feasibility_status || "offline";
  const constraintsOk = (status?.constraint_violation_count ?? 0) === 0;

  return (
    <section className="robust-mpc-panel">
      <div className="robust-mpc-header">
        <div>
          <div className="panel-kicker">Robust MPC</div>
          <h2>Uncertainty-Aware Constraints</h2>
        </div>
        <span className={`robust-mpc-health ${feasibility === "feasible" ? "ready" : "disabled"}`}>
          {feasibility}
        </span>
      </div>

      <div className="robust-mpc-metric-grid">
        <Metric label="Uncertainty Level" value={percent(status?.uncertainty_level ?? analytics?.uncertainty_level)} />
        <Metric label="Constraint Status" value={constraintsOk ? "clear" : "violated"} />
        <Metric label="Robustness Score" value={percent(status?.robustness_score ?? analytics?.robustness_score)} />
        <Metric label="Feasibility Rate" value={percent(analytics?.feasibility_rate)} />
        <Metric label="Tracking Error" value={formatNumber(status?.tracking_error_norm ?? analytics?.average_tracking_error)} />
        <Metric label="Control Effort" value={formatNumber(status?.control_effort ?? analytics?.average_control_effort)} />
        <Metric label="Violations" value={status?.constraint_violation_count ?? analytics?.constraint_violation_count ?? 0} />
        <Metric label="Computation" value={`${formatNumber(status?.computation_time_ms ?? analytics?.computation_time)} ms`} />
      </div>

      <div className="robust-mpc-detail-grid">
        <div className="robust-mpc-block">
          <h3>Uncertainty Models</h3>
          <UncertaintyTable models={config?.uncertainty_models || status?.uncertainty_models || {}} />
        </div>

        <div className="robust-mpc-block">
          <h3>Constraint Envelope</h3>
          <ConstraintTable
            stateConstraints={config?.state_constraints || status?.state_constraints || {}}
            inputConstraints={config?.input_constraints || status?.input_constraints || {}}
          />
        </div>
      </div>
    </section>
  );
}

function UncertaintyTable({ models }) {
  return (
    <div className="robust-mpc-table uncertainty-table">
      <div>Model</div>
      <div>Status</div>
      <div>Bound</div>
      {Object.entries(models).map(([name, model]) => (
        <TableRow
          key={name}
          cells={[
            labelText(name),
            model.enabled === false ? "off" : "on",
            formatNumber(model.bound)
          ]}
        />
      ))}
    </div>
  );
}

function ConstraintTable({ stateConstraints, inputConstraints }) {
  const rows = [
    ...Object.entries(stateConstraints).map(([name, value]) => [`state ${name}`, rangeText(value)]),
    ...Object.entries(inputConstraints).map(([name, value]) => [`input ${name}`, rangeText(value)])
  ];

  return (
    <div className="robust-mpc-table constraint-table">
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
    <div className="robust-mpc-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default RobustMPCPanel;
