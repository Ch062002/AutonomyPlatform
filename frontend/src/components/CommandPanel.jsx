import { useState } from "react";

import {
  armVehicle,
  disarmVehicle,
  takeoffVehicle,
  landVehicle
} from "../services/api";

function CommandPanel() {
  const [commandStatus, setCommandStatus] = useState("No command sent");

  const buttonStyle = {
    padding: "0.8rem 1.4rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    marginRight: "1rem",
    marginTop: "1rem",
    fontWeight: "bold"
  };

  const sendCommand = async (commandFunction, label) => {
    if (label === "TAKEOFF" || label === "LAND") {
      const confirmed = window.confirm(
        `Are you sure you want to send ${label} command?`
      );

      if (!confirmed) {
        setCommandStatus(`${label} command cancelled`);
        return;
      }
    }

    try {
      await commandFunction();
      setCommandStatus(`${label} command sent successfully`);
    } catch (error) {
      setCommandStatus(`${label} command failed`);
    }
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Vehicle Command Panel</h2>

      <div style={{
        backgroundColor: "#1e293b",
        padding: "1rem",
        borderRadius: "10px",
        border: "1px solid #334155"
      }}>
        <button
          onClick={() => sendCommand(armVehicle, "ARM")}
          style={{ ...buttonStyle, backgroundColor: "#22c55e" }}
        >
          ARM
        </button>

        <button
          onClick={() => sendCommand(disarmVehicle, "DISARM")}
          style={{ ...buttonStyle, backgroundColor: "#ef4444", color: "white" }}
        >
          DISARM
        </button>

        <button
          onClick={() => sendCommand(takeoffVehicle, "TAKEOFF")}
          style={{ ...buttonStyle, backgroundColor: "#38bdf8" }}
        >
          TAKEOFF
        </button>

        <button
          onClick={() => sendCommand(landVehicle, "LAND")}
          style={{ ...buttonStyle, backgroundColor: "#facc15" }}
        >
          LAND
        </button>

        <div style={{
          marginTop: "1.5rem",
          padding: "0.8rem",
          backgroundColor: "#0f172a",
          borderRadius: "8px",
          border: "1px solid #334155"
        }}>
          <strong>Command Status:</strong>
          <p>{commandStatus}</p>
        </div>
      </div>
    </div>
  );
}

export default CommandPanel;