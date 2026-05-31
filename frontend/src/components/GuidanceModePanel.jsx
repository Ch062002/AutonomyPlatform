import { useState } from "react";
import { setGuidanceMode } from "../services/api";

function GuidanceModePanel({ addCommandLog }) {
  const [selectedMode, setSelectedMode] = useState("LOS_GUIDANCE");

  const modes = [
    "DIRECT_WAYPOINT",
    "LOS_GUIDANCE",
    "PURE_PURSUIT",
    "VECTOR_FIELD",
    "DUBINS"
  ];

  const handleChange = async (event) => {
    const mode = event.target.value;
    setSelectedMode(mode);

    try {
      await setGuidanceMode(mode);
      addCommandLog(`Guidance mode changed to ${mode}`);
    } catch {
      addCommandLog(`Failed to change guidance mode to ${mode}`);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Guidance Mode</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)",
          textAlign: "center"
        }}
      >
        <select
          value={selectedMode}
          onChange={handleChange}
          style={{
            padding: "0.8rem",
            borderRadius: "8px",
            width: "100%",
            backgroundColor: "#0f172a",
            color: "white",
            border: "1px solid #334155",
            fontWeight: "bold"
          }}
        >
          {modes.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default GuidanceModePanel;