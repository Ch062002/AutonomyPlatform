import { useEffect, useState } from "react";

import { getLpvAnalytics, getLpvConfig, getLpvStatus } from "../services/api";

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

function LPVControlPanel() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const fetchLpv = async () => {
    try {
      const [statusResponse, configResponse, analyticsResponse] = await Promise.all([
        getLpvStatus(),
        getLpvConfig(),
        getLpvAnalytics()
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
    fetchLpv();
    const interval = setInterval(fetchLpv, 5000);
    return () => clearInterval(interval);
  }, []);

  const scheduling = status?.scheduling_parameter || analytics?.scheduling_parameter || {};
  const gains = status?.interpolated_gain || analytics?.interpolated_gain || {};
  const variables = config?.scheduling_variables || status?.scheduling_variables || {};
  const health = status?.lpv_health || analytics?.lpv_health || "offline";

  return (
    <section className="lpv-control-panel">
      <div className="lpv-header">
        <div>
          <div className="panel-kicker">LPV Control</div>
          <h2>Scheduling Parameter Layer</h2>
        </div>
        <span className={`lpv-health ${health === "ready" ? "ready" : "disabled"}`}>
          {health}
        </span>
      </div>

      <div className="lpv-metric-grid">
        <Metric label="Altitude Parameter" value={percent(scheduling.altitude)} />
        <Metric label="Velocity Parameter" value={percent(scheduling.velocity)} />
        <Metric label="Active Region" value={status?.active_region || analytics?.active_region || "--"} />
        <Metric label="Stability Margin" value={formatNumber(analytics?.stability_margin_placeholder)} />
      </div>

      <div className="lpv-detail-grid">
        <div className="lpv-block">
          <h3>Scheduling Variables</h3>
          <MiniRow
            label="Altitude"
            value={`${formatNumber(status?.altitude)} ${variables.altitude?.units || "m"}`}
            meta={rangeText(variables.altitude?.range)}
          />
          <MiniRow
            label="Velocity"
            value={`${formatNumber(status?.velocity)} ${variables.velocity?.units || "m/s"}`}
            meta={rangeText(variables.velocity?.range)}
          />
        </div>

        <div className="lpv-block">
          <h3>Interpolated Gains</h3>
          <GainTable gains={gains} />
        </div>
      </div>

      <div className="lpv-footer-grid">
        <Metric
          label="Tracking Error"
          value={formatNumber(analytics?.average_tracking_error_placeholder)}
        />
        <Metric label="Samples" value={analytics?.samples ?? 0} />
        <Metric label="Future" value="Robust MPC / Tube MPC / Comparison" />
      </div>
    </section>
  );
}

function GainTable({ gains }) {
  return (
    <div className="lpv-gain-table">
      <div>Gain</div>
      <div>Value</div>
      <span>Kp</span>
      <strong>{formatNumber(gains.kp)}</strong>
      <span>Ki</span>
      <strong>{formatNumber(gains.ki)}</strong>
      <span>Kd</span>
      <strong>{formatNumber(gains.kd)}</strong>
    </div>
  );
}

function rangeText(values) {
  if (!Array.isArray(values) || values.length !== 2) {
    return "--";
  }

  return `${formatNumber(values[0])} - ${formatNumber(values[1])}`;
}

function MiniRow({ label, value, meta }) {
  return (
    <div className="lpv-mini-row">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{meta}</em>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="lpv-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default LPVControlPanel;
