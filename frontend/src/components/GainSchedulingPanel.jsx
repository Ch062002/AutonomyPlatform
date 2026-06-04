import { useEffect, useState } from "react";

import { getGainSchedulingAnalytics, getGainSchedulingStatus } from "../services/api";

function formatNumber(value, digits = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return number.toFixed(digits);
}

function percent(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return `${Math.round(Math.max(0, Math.min(1, number)) * 100)}%`;
}

function GainSchedulingPanel() {
  const [status, setStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchGainScheduling = async () => {
    try {
      const [statusResponse, analyticsResponse] = await Promise.all([
        getGainSchedulingStatus(),
        getGainSchedulingAnalytics()
      ]);

      setStatus(statusResponse.data || null);
      setAnalytics(analyticsResponse.data || null);
    } catch {
      setStatus(null);
      setAnalytics(null);
    }
  };

  useEffect(() => {
    fetchGainScheduling();
    const interval = setInterval(fetchGainScheduling, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectedGains = status?.selected_gains || {};
  const pidGains = selectedGains.pid_gains || {};
  const lqrPreset = selectedGains.lqr_preset || {};
  const mpcPreset = selectedGains.mpc_preset || {};

  return (
    <section className="gain-scheduling-panel">
      <div className="gain-scheduling-header">
        <div>
          <div className="panel-kicker">Gain Scheduling</div>
          <h2>Operating Region Adaptation</h2>
        </div>
        <span className={`gain-health ${status?.scheduling_health === "ready" ? "ready" : "disabled"}`}>
          {status?.scheduling_health || "offline"}
        </span>
      </div>

      <div className="gain-summary-grid">
        <Metric label="Active Schedule" value={status?.active_schedule || "--"} />
        <Metric label="Altitude Region" value={status?.altitude_region || "--"} />
        <Metric label="Velocity Region" value={status?.velocity_region || "--"} />
        <Metric label="Mission Phase" value={status?.mission_phase || "--"} />
      </div>

      <div className="gain-region-grid">
        <RegionBar label="Altitude" value={`${formatNumber(status?.altitude)} m`} region={status?.altitude_region} />
        <RegionBar label="Velocity" value={`${formatNumber(status?.velocity)} m/s`} region={status?.velocity_region} />
        <RegionBar label="Disturbance" value={status?.disturbance_level || "--"} region={status?.disturbance_level} />
      </div>

      <div className="gain-preset-grid">
        <PresetBlock title="PID Gains">
          {Object.entries(pidGains).map(([axis, gains]) => (
            <MiniRow
              key={axis}
              label={axis}
              value={`P ${formatNumber(gains.kp)} / I ${formatNumber(gains.ki)} / D ${formatNumber(gains.kd)}`}
            />
          ))}
        </PresetBlock>

        <PresetBlock title="LQR Preset">
          <MiniRow label="Q diag" value={matrixDiagonal(lqrPreset.q_matrix)} />
          <MiniRow label="R diag" value={matrixDiagonal(lqrPreset.r_matrix)} />
        </PresetBlock>

        <PresetBlock title="MPC Preset">
          <MiniRow label="Prediction" value={mpcPreset.prediction_horizon ?? "--"} />
          <MiniRow label="Control" value={mpcPreset.control_horizon ?? "--"} />
          <MiniRow label="Q weights" value={weightSummary(mpcPreset.q_weights)} />
          <MiniRow label="R weights" value={weightSummary(mpcPreset.r_weights)} />
        </PresetBlock>
      </div>

      <div className="gain-analytics-grid">
        <Metric label="Switch Count" value={analytics?.schedule_switch_count ?? status?.schedule_switch_count ?? 0} />
        <Metric label="Adaptation Score" value={percent(analytics?.adaptation_score ?? status?.adaptation_score)} />
        <Metric label="Tracking Error" value={formatNumber(analytics?.average_tracking_error_placeholder, 3)} />
      </div>
    </section>
  );
}

function matrixDiagonal(matrix) {
  if (!Array.isArray(matrix)) {
    return "--";
  }

  return matrix
    .map((row, index) => formatNumber(Array.isArray(row) ? row[index] : null, 1))
    .join(" / ");
}

function weightSummary(weights) {
  if (!weights || typeof weights !== "object") {
    return "--";
  }

  return Object.entries(weights)
    .map(([key, value]) => `${key.slice(0, 3)} ${formatNumber(value, 1)}`)
    .join("  ");
}

function RegionBar({ label, value, region }) {
  return (
    <div className="gain-region-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <em>{region || "--"}</em>
    </div>
  );
}

function PresetBlock({ title, children }) {
  return (
    <div className="gain-preset-block">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function MiniRow({ label, value }) {
  return (
    <div className="gain-mini-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="gain-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default GainSchedulingPanel;
