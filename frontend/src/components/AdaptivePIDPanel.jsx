import { useEffect, useState } from "react";

import {
  getAdaptivePidAnalytics,
  getAdaptivePidConfig,
  getAdaptivePidStatus,
  updateAdaptivePidConfig
} from "../services/api";

const AXES = ["attitude", "altitude", "velocity", "position"];

function formatNumber(value, digits = 3) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "--";
  }

  return Math.abs(number) >= 100 ? number.toFixed(1) : number.toFixed(digits);
}

function AdaptivePIDPanel({ addCommandLog }) {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedAxis, setSelectedAxis] = useState("altitude");

  const fetchAdaptivePid = async () => {
    try {
      const [statusResponse, configResponse, analyticsResponse] = await Promise.all([
        getAdaptivePidStatus(),
        getAdaptivePidConfig(),
        getAdaptivePidAnalytics()
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
    fetchAdaptivePid();
    const interval = setInterval(fetchAdaptivePid, 5000);
    return () => clearInterval(interval);
  }, []);

  const enabled = Boolean(config?.enabled ?? status?.adaptation_enabled);
  const axisOutput = status?.control_output?.[selectedAxis] || {};
  const baseGains = config?.base_gains?.[selectedAxis] || axisOutput.base_gains || {};
  const adaptiveGains = status?.adaptive_gains?.[selectedAxis] || axisOutput.adaptive_gains || {};
  const limits = config?.gain_limits || status?.gain_limits || {};
  const rate = config?.adaptation_rate || status?.adaptation_rate || {};
  const health = status?.adaptation_health || analytics?.adaptation_health || "offline";

  const toggleEnabled = async () => {
    try {
      await updateAdaptivePidConfig({ enabled: !enabled });
      addCommandLog?.(`Adaptive PID ${!enabled ? "enabled" : "disabled"}`);
      await fetchAdaptivePid();
    } catch {
      addCommandLog?.("Adaptive PID configuration update failed");
    }
  };

  return (
    <section className="adaptive-pid-panel">
      <div className="adaptive-pid-header">
        <div>
          <div className="panel-kicker">Adaptive PID</div>
          <h2>Online Gain Adjustment</h2>
        </div>
        <button
          className={`adaptive-toggle ${enabled ? "enabled" : "disabled"}`}
          type="button"
          onClick={toggleEnabled}
        >
          {enabled ? "Enabled" : "Disabled"}
        </button>
      </div>

      <div className="adaptive-axis-tabs">
        {AXES.map((axis) => (
          <button
            className={axis === selectedAxis ? "active" : ""}
            key={axis}
            type="button"
            onClick={() => setSelectedAxis(axis)}
          >
            {axis}
          </button>
        ))}
      </div>

      <div className="adaptive-pid-metrics">
        <Metric label="Error" value={formatNumber(axisOutput.error)} />
        <Metric label="Control Output" value={formatNumber(axisOutput.control_output)} />
        <Metric label="Adaptation Health" value={health} />
        <Metric label="Activity" value={formatNumber(status?.adaptation_activity ?? analytics?.adaptation_activity)} />
      </div>

      <div className="adaptive-gain-grid">
        <div className="adaptive-gain-block">
          <h3>Base vs Adaptive Gains</h3>
          <GainComparisonTable baseGains={baseGains} adaptiveGains={adaptiveGains} />
        </div>
        <div className="adaptive-gain-block">
          <h3>Adaptation Rate and Limits</h3>
          <AdaptationTable rate={rate} limits={limits} />
        </div>
      </div>

      <div className="adaptive-pid-metrics">
        <Metric label="Avg Error" value={formatNumber(analytics?.average_error)} />
        <Metric label="Max Error" value={formatNumber(analytics?.max_error)} />
        <Metric label="Avg Kp/Ki/Kd" value={`${formatNumber(analytics?.average_adaptive_kp)} / ${formatNumber(analytics?.average_adaptive_ki)} / ${formatNumber(analytics?.average_adaptive_kd)}`} />
        <Metric label="Control Effort" value={formatNumber(analytics?.control_effort)} />
      </div>
    </section>
  );
}

function GainComparisonTable({ baseGains, adaptiveGains }) {
  return (
    <div className="adaptive-gain-table">
      <div>Gain</div>
      <div>Base</div>
      <div>Adaptive</div>
      <span>Kp</span>
      <strong>{formatNumber(baseGains.kp)}</strong>
      <strong>{formatNumber(adaptiveGains.kp)}</strong>
      <span>Ki</span>
      <strong>{formatNumber(baseGains.ki)}</strong>
      <strong>{formatNumber(adaptiveGains.ki)}</strong>
      <span>Kd</span>
      <strong>{formatNumber(baseGains.kd)}</strong>
      <strong>{formatNumber(adaptiveGains.kd)}</strong>
    </div>
  );
}

function AdaptationTable({ rate, limits }) {
  return (
    <div className="adaptive-gain-table adaptive-rate-table">
      <div>Term</div>
      <div>Rate</div>
      <div>Limit</div>
      <span>Kp / Alpha</span>
      <strong>{formatNumber(rate.alpha, 4)}</strong>
      <strong>{limitText(limits.kp)}</strong>
      <span>Ki / Beta</span>
      <strong>{formatNumber(rate.beta, 4)}</strong>
      <strong>{limitText(limits.ki)}</strong>
      <span>Kd / Gamma</span>
      <strong>{formatNumber(rate.gamma, 4)}</strong>
      <strong>{limitText(limits.kd)}</strong>
    </div>
  );
}

function limitText(values) {
  if (!Array.isArray(values) || values.length !== 2) {
    return "--";
  }

  return `${formatNumber(values[0])} - ${formatNumber(values[1])}`;
}

function Metric({ label, value }) {
  return (
    <div className="adaptive-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default AdaptivePIDPanel;
