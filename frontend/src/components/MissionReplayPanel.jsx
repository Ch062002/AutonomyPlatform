import { useEffect, useState } from "react";

import { getGuidanceLogs } from "../services/api";

const REPLAY_FIELDS = [
  { key: "guidance_mode", label: "Guidance Mode" },
  { key: "mission_state", label: "Mission State" },
  { key: "progress_percent", label: "Progress" },
  { key: "distance_to_waypoint", label: "Distance To Waypoint" },
  { key: "cross_track_error", label: "Cross Track Error" },
  { key: "heading_error", label: "Heading Error" }
];

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : value.toFixed(2);
    return `${formatted}${suffix}`;
  }

  return `${value}${suffix}`;
}

function MissionReplayPanel() {
  const [logs, setLogs] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchLogs = async () => {
    try {
      const r = await getGuidanceLogs();
      const parsedLogs = Array.isArray(r.data) ? r.data : r.data.logs || [];

      setLogs(parsedLogs);
      setCurrentIndex((prev) => {
        if (parsedLogs.length === 0) {
          return 0;
        }

        return Math.min(prev, parsedLogs.length - 1);
      });
    } catch {
      setLogs([]);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  };

  const handlePlay = () => {
    if (logs.length > 0) {
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
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isPlaying || logs.length === 0) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= logs.length - 1) {
          setIsPlaying(false);
          return prev;
        }

        return prev + 1;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [isPlaying, logs.length]);

  const currentLog = logs[currentIndex] || {};
  const totalLogs = logs.length;
  const timelinePercent = totalLogs > 1
    ? (currentIndex / (totalLogs - 1)) * 100
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
      <h2 style={{ textAlign: "center" }}>Mission Replay</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
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
            disabled={totalLogs === 0 || isPlaying}
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
          <span>Index {totalLogs === 0 ? "--" : currentIndex + 1}</span>
          <span>Total {totalLogs || "--"}</span>
        </div>

        {totalLogs === 0 ? (
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
            No guidance logs available for replay
          </div>
        ) : (
          <div
            style={{
              marginTop: "1rem",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "0.55rem 1rem",
              backgroundColor: "#0f172a",
              padding: "0.9rem",
              borderRadius: "8px",
              border: "1px solid #334155"
            }}
          >
            {REPLAY_FIELDS.map((field) => (
              <div key={field.key} style={{ display: "contents" }}>
                <span style={{ color: "#94a3b8" }}>{field.label}</span>
                <span style={{ color: "#e2e8f0", textAlign: "right" }}>
                  {field.key === "progress_percent"
                    ? formatValue(currentLog[field.key], "%")
                    : formatValue(currentLog[field.key])}
                </span>
              </div>
            ))}

            <span style={{ color: "#94a3b8" }}>Waypoint</span>
            <span style={{ color: "#e2e8f0", textAlign: "right" }}>
              {formatValue(currentLog.active_waypoint)} / {formatValue(currentLog.total_waypoints)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MissionReplayPanel;
