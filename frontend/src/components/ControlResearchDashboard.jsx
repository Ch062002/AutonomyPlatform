import { useEffect, useMemo, useState } from "react";

import { getControlResearchSummary } from "../services/api";

const CONTROLLER_COLORS = {
  PID: "#38bdf8",
  LQR: "#22c55e",
  SMC: "#f59e0b",
  MPC: "#a78bfa"
};

function formatNumber(value, digits = 3) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return `${value}`;
  }

  return Math.abs(number) >= 100 ? number.toFixed(1) : number.toFixed(digits);
}

function pct(value) {
  return `${Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100)}%`;
}

function ControlResearchDashboard() {
  const [summary, setSummary] = useState(null);

  const fetchSummary = async () => {
    try {
      const response = await getControlResearchSummary();
      setSummary(response.data || null);
    } catch {
      setSummary(null);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => clearInterval(interval);
  }, []);

  const controllerCards = summary?.controller_cards || [];
  const leaderboard = summary?.controller_leaderboard || [];
  const benchmarkRows = summary?.benchmark?.results || [];
  const comparisonRows = summary?.comparison?.metrics || [];
  const winners = summary?.best_controller_summary || {};
  const analytics = summary?.control_analytics || {};
  const activeController = summary?.active_controller || "--";
  const benchmarkBest = winners.benchmark_best || "--";

  const maxValues = useMemo(() => ({
    trackingError: Math.max(...controllerCards.map((row) => Number(row.tracking_error) || 0), 0),
    effort: Math.max(...controllerCards.map((row) => Number(row.control_effort) || 0), 0),
    benchmark: Math.max(...benchmarkRows.map((row) => Number(row.overall_score) || 0), 0),
    comparison: Math.max(...comparisonRows.map((row) => Number(row.overall_score) || 0), 0)
  }), [benchmarkRows, comparisonRows, controllerCards]);

  return (
    <section className="control-research-panel">
      <div className="control-research-header">
        <div>
          <div className="panel-kicker">Control Research</div>
          <h2>PID / LQR / SMC / MPC Dashboard</h2>
        </div>
        <div className="active-controller-pill">{activeController}</div>
      </div>

      <div className="research-metric-grid">
        <MetricTile label="Best Controller" value={winners.comparison_best || "--"} tone="#22c55e" />
        <MetricTile label="Lowest Tracking Error" value={winners.lowest_tracking_error || "--"} tone="#38bdf8" />
        <MetricTile label="Highest Robustness" value={winners.highest_robustness || "--"} tone="#f59e0b" />
        <MetricTile label="Lowest Control Effort" value={winners.lowest_control_effort || "--"} tone="#a78bfa" />
        <MetricTile label="Fastest Computation" value={winners.fastest_computation || "--"} tone="#e2e8f0" />
      </div>

      <div className="research-main-grid">
        <div className="research-block">
          <BlockHeader title="Controller Health Overview" value={`${controllerCards.length} online`} />
          <div className="controller-health-grid">
            {controllerCards.map((card) => (
              <ControllerHealth key={card.controller} card={card} />
            ))}
          </div>
        </div>

        <div className="research-block">
          <BlockHeader title="Controller Leaderboard" value={benchmarkBest} />
          <div className="leaderboard-table">
            {leaderboard.map((row) => (
              <div className="leaderboard-row" key={row.controller}>
                <span className="leaderboard-rank">{row.rank}</span>
                <strong style={{ color: row.active ? "#38bdf8" : "#e2e8f0" }}>
                  {row.controller}
                </strong>
                <span>{pct(row.overall_score)}</span>
                <span>{formatNumber(row.tracking_error)}</span>
                <span>{formatNumber(row.control_effort)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="research-chart-grid">
        <BarChart
          title="Comparison Score"
          rows={comparisonRows}
          valueKey="overall_score"
          maxValue={maxValues.comparison}
          valueFormatter={pct}
        />
        <BarChart
          title="Benchmark Score"
          rows={benchmarkRows}
          valueKey="overall_score"
          maxValue={maxValues.benchmark}
          valueFormatter={pct}
        />
        <BarChart
          title="Tracking Error"
          rows={controllerCards}
          valueKey="tracking_error"
          maxValue={maxValues.trackingError}
          valueFormatter={formatNumber}
          lowerIsBetter
        />
        <BarChart
          title="Control Effort"
          rows={controllerCards}
          valueKey="control_effort"
          maxValue={maxValues.effort}
          valueFormatter={formatNumber}
          lowerIsBetter
        />
      </div>

      <div className="research-main-grid analytics-grid">
        <SummaryBlock title="Robustness Summary" summary={summary?.robustness_summary} valueFormatter={pct} />
        <SummaryBlock title="Computation Summary" summary={summary?.computation_time_summary} suffix=" ms" />
        <div className="research-block">
          <BlockHeader title="Control Analytics" value={analytics.disturbance_active ? "disturbed" : "nominal"} />
          <MiniRow label="Controllers" value={analytics.controller_count ?? 0} />
          <MiniRow label="Benchmark Samples" value={analytics.benchmark_samples ?? 0} />
          <MiniRow label="Average Tracking Error" value={formatNumber(analytics.average_tracking_error)} />
          <MiniRow label="Average Control Effort" value={formatNumber(analytics.average_control_effort)} />
          <MiniRow label="Average Benchmark Score" value={pct(analytics.average_benchmark_score)} />
          <MiniRow label="Disturbance Scenario" value={analytics.disturbance_scenario || "None"} />
        </div>
      </div>
    </section>
  );
}

function BlockHeader({ title, value }) {
  return (
    <div className="research-block-header">
      <h3>{title}</h3>
      <span>{value}</span>
    </div>
  );
}

function ControllerHealth({ card }) {
  return (
    <div className={`controller-health-card ${card.active ? "active" : ""}`}>
      <div className="controller-health-title">
        <strong>{card.controller}</strong>
        <span>{card.health}</span>
      </div>
      <MiniRow label="Error" value={formatNumber(card.tracking_error)} />
      <MiniRow label="Effort" value={formatNumber(card.control_effort)} />
      <MiniRow label="Robustness" value={pct(card.robustness_score)} />
      <MiniRow label="Benchmark" value={pct(card.benchmark_score)} />
    </div>
  );
}

function BarChart({ title, rows, valueKey, maxValue, valueFormatter, lowerIsBetter = false }) {
  return (
    <div className="research-block">
      <BlockHeader title={title} value={lowerIsBetter ? "lower wins" : "higher wins"} />
      <div className="bar-chart-stack">
        {rows.map((row) => {
          const controller = row.controller;
          const value = Number(row[valueKey]) || 0;
          const width = maxValue > 0 ? `${Math.max(4, (value / maxValue) * 100)}%` : "4%";

          return (
            <div className="bar-chart-row" key={`${title}-${controller}`}>
              <span>{controller}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width,
                    backgroundColor: CONTROLLER_COLORS[controller] || "#38bdf8"
                  }}
                />
              </div>
              <strong>{valueFormatter(value)}</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryBlock({ title, summary, suffix = "", valueFormatter = formatNumber }) {
  const values = summary?.values || {};

  return (
    <div className="research-block">
      <BlockHeader title={title} value={summary?.best_controller || "--"} />
      <div className="summary-best">
        {valueFormatter(summary?.best_value)}{suffix}
      </div>
      {Object.entries(values).map(([controller, value]) => (
        <MiniRow key={controller} label={controller} value={`${valueFormatter(value)}${suffix}`} />
      ))}
    </div>
  );
}

function MiniRow({ label, value }) {
  return (
    <div className="research-mini-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricTile({ label, value, tone }) {
  return (
    <div className="research-metric-tile">
      <span>{label}</span>
      <strong style={{ color: tone }}>{value}</strong>
    </div>
  );
}

export default ControlResearchDashboard;
