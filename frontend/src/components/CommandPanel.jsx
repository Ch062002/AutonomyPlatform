import { useState } from "react";

import {
  armVehicle,
  disarmVehicle,
  takeoffVehicle,
  landVehicle,
  rtlVehicle,
  holdVehicle
} from "../services/api";

function CommandPanel({ addCommandLog }) {
  const [commandStatus, setCommandStatus] = useState("No command sent");

  const buttonStyle = {
    padding: "0.8rem 1.4rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    marginRight: "1rem",
    marginTop: "1rem",
    fontWeight: "bold",
    transition: "0.2s",
    boxShadow: "0 0 10px rgba(0,0,0,0.3)"
  };

  const sendCommand = async (commandFunction, label) => {
    if (["TAKEOFF", "LAND", "RTL"].includes(label)) {
      const confirmed = window.confirm(
        `Are you sure you want to send ${label} command?`
      );

      if (!confirmed) {
        setCommandStatus(`${label} command cancelled`);
        addCommandLog(`${label} command cancelled`);
        return;
      }
    }

    try {
      await commandFunction();
      setCommandStatus(`${label} command sent successfully`);
      addCommandLog(`${label} command sent successfully`);
    } catch {
      setCommandStatus(`${label} command failed`);
      addCommandLog(`${label} command failed`);
    }
  };

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Vehicle Command Panel</h2>

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
        <button onClick={() => sendCommand(armVehicle, "ARM")} style={{ ...buttonStyle, backgroundColor: "#22c55e", color: "white" }}>
          ARM
        </button>

        <button onClick={() => sendCommand(disarmVehicle, "DISARM")} style={{ ...buttonStyle, backgroundColor: "#ef4444", color: "white" }}>
          DISARM
        </button>

        <button onClick={() => sendCommand(takeoffVehicle, "TAKEOFF")} style={{ ...buttonStyle, backgroundColor: "#38bdf8", color: "white" }}>
          TAKEOFF
        </button>

        <button onClick={() => sendCommand(landVehicle, "LAND")} style={{ ...buttonStyle, backgroundColor: "#facc15", color: "black" }}>
          LAND
        </button>

        <button onClick={() => sendCommand(holdVehicle, "HOLD")} style={{ ...buttonStyle, backgroundColor: "#a855f7", color: "white" }}>
          HOLD
        </button>

        <button onClick={() => sendCommand(rtlVehicle, "RTL")} style={{ ...buttonStyle, backgroundColor: "#fb923c", color: "black" }}>
          RTL
        </button>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "0.8rem",
            backgroundColor: "#0f172a",
            borderRadius: "10px",
            border: "1px solid #334155"
          }}
        >
          <strong>Command Status:</strong>
          <p>{commandStatus}</p>
        </div>
      </div>
    </div>
  );
}

export default CommandPanel;