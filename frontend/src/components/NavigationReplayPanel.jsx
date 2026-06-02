import { useEffect, useState } from "react";

import { getNavigationReplay } from "../services/api";

const REPLAY_FIELDS = [
  { key: "timestamp", label: "Timestamp" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
  { key: "global_altitude", label: "Altitude", suffix: " m" },
  { key: "velocity", label: "Velocity", suffix: " m/s" },
  { key: "nav_state", label: "Nav State" },
  { key: "failsafe", label: "Failsafe" },
  { key: "navigation_health", label: "Navigation Health" }
];

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "boolean") {
    return value ? "ACTIVE" : "Normal";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : value.toFixed(4);
    return `${formatted}${suffix}`;
  }

  return `${value}${suffix}`;
}

function NavigationReplayPanel() {
  const [samples, setSamples] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [message, setMessage] = useState("Loading navigation replay...");

  const fetchReplay = async (index = currentIndex) => {
    try {
      const r = await getNavigationReplay(index);
      const replay = r.data.replay || {};
      const replaySamples = replay.samples || [];

      setSamples(replaySamples);
      setCurrentIndex(replay.current_index || 0);
      setMessage(r.data.message || "Navigation replay ready");
    } catch {
      setSamples([]);
      setCurrentIndex(0);
      setIsPlaying(false);
      setMessage("Navigation replay unavailable");
    }
  };

  const handlePlay = () => {
    if (samples.length > 0) {
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  useEffect(() => {
    fetchReplay(0);
  }, []);

  useEffect(() => {
    if (!isPlaying || samples.length === 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= samples.length - 1) {
          setIsPlaying(false);
          return prev;
        }

        return prev + 1;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [isPlaying, samples.length]);

  const currentSample = samples[currentIndex] || {};
  const totalSamples = samples.length;
  const timelinePercent = totalSamples > 1
    ? (currentIndex / (totalSamples - 1)) * 100
    : 0;

  const buttonStyle = {
    padding: "0.65rem 0.95rem",
    borderRadius: "8px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: "bold"
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Navigation Replay</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <p style={{ color: "#94a3b8", marginTop: 0 }}>{message}</p>

        <div
          style={{
            display: "flex",
            gap: "0.7rem",
            flexWrap: "wrap",
            marginBottom: "1rem"
          }}
        >
          <button
            onClick={handlePlay}
            disabled={totalSamples === 0 || isPlaying}
            style={{
              ...buttonStyle,
              backgroundColor: isPlaying ? "#334155" : "#16a34a"
            }}
          >
            Play
          </button>

          <button
            onClick={handlePause}
            disabled={!isPlaying}
            style={{
              ...buttonStyle,
              backgroundColor: isPlaying ? "#f59e0b" : "#334155",
              color: isPlaying ? "#111827" : "#cbd5e1"
            }}
          >
            Pause
          </button>

          <button onClick={handleReset} style={buttonStyle}>
            Reset
          </button>
        </div>

        <div
          style={{
            height: "10px",
            backgroundColor: "#0f172a",
            borderRadius: "999px",
            border: "1px solid #334155",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${timelinePercent}%`,
              height: "100%",
              backgroundColor: "#38bdf8",
              transition: "width 0.2s ease"
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#94a3b8",
            fontSize: "0.85rem",
            marginTop: "0.5rem"
          }}
        >
          <span>Index {totalSamples === 0 ? "--" : currentIndex + 1}</span>
          <span>Total {totalSamples || "--"}</span>
        </div>

        {totalSamples === 0 ? (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.9rem",
              backgroundColor: "#0f172a",
              borderRadius: "8px",
              border: "1px solid #334155",
              color: "#cbd5e1"
            }}
          >
            No navigation samples available for replay
          </div>
        ) : (
          <div
            style={{
              marginTop: "1rem",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: "0.8rem",
              backgroundColor: "#0f172a",
              padding: "0.9rem",
              borderRadius: "8px",
              border: "1px solid #334155"
            }}
          >
            {REPLAY_FIELDS.map((field) => (
              <div key={field.key}>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  {field.label}
                </div>
                <div
                  style={{
                    color: field.key === "navigation_health" &&
                      currentSample[field.key] === "Warning"
                      ? "#f59e0b"
                      : "#e2e8f0",
                    fontWeight: "bold",
                    marginTop: "0.4rem",
                    overflowWrap: "anywhere"
                  }}
                >
                  {field.key === "nav_state"
                    ? formatValue(currentSample.nav_state || currentSample.flight_mode)
                    : formatValue(currentSample[field.key], field.suffix || "")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NavigationReplayPanel;
