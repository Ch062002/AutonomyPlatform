import { useEffect, useState } from "react";

import {
  getActiveController,
  getControlControllers,
  selectControlController
} from "../services/api";

const FALLBACK_CONTROLLERS = ["PID", "LQR", "SMC", "MPC"];

function ControllerSwitcherPanel({ addCommandLog }) {
  const [active, setActive] = useState(null);
  const [controllers, setControllers] = useState([]);
  const [selectedController, setSelectedController] = useState("MPC");
  const [error, setError] = useState(null);

  const fetchControllerState = async () => {
    try {
      const [activeResponse, controllersResponse] = await Promise.all([
        getActiveController(),
        getControlControllers()
      ]);

      const activeData = activeResponse.data || null;
      const controllerList = controllersResponse.data?.controllers || [];

      setActive(activeData);
      setControllers(controllerList);
      setSelectedController(activeData?.active_controller || "MPC");
      setError(null);
    } catch {
      setActive(null);
      setControllers([]);
      setError("Disconnected");
    }
  };

  useEffect(() => {
    fetchControllerState();
    const interval = setInterval(fetchControllerState, 5000);
    return () => clearInterval(interval);
  }, []);

  const switchController = async () => {
    try {
      await selectControlController(selectedController);
      addCommandLog?.(`Controller switched to ${selectedController}`);
      await fetchControllerState();
    } catch {
      addCommandLog?.(`Failed to switch controller to ${selectedController}`);
    }
  };

  const availableControllers = controllers.length
    ? controllers.map((controller) => controller.controller_name)
    : FALLBACK_CONTROLLERS;
  const activeController = active?.active_controller || "--";
  const health = active?.controller_health?.[activeController] || error || "--";
  const lastSwitch = active?.last_switch;
  const switchHistory = active?.switch_history || [];

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Controller Manager</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "12px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.12)"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          <MetricTile label="Active Controller" value={activeController} color="#38bdf8" />
          <MetricTile label="Controller Health" value={health} color="#22c55e" />
          <MetricTile
            label="Last Switch Time"
            value={lastSwitch?.timestamp ? new Date(lastSwitch.timestamp).toLocaleTimeString() : "--"}
            color="#c4b5fd"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "0.65rem",
            marginBottom: "0.85rem"
          }}
        >
          <select
            value={selectedController}
            onChange={(event) => setSelectedController(event.target.value)}
            style={{
              padding: "0.65rem",
              borderRadius: "8px",
              border: "1px solid #334155",
              backgroundColor: "#0f172a",
              color: "white",
              fontWeight: "bold"
            }}
          >
            {availableControllers.map((controllerName) => (
              <option key={controllerName} value={controllerName}>
                {controllerName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={switchController}
            style={{
              padding: "0.65rem 0.85rem",
              borderRadius: "8px",
              border: "1px solid #38bdf8",
              backgroundColor: "#075985",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            Switch
          </button>
        </div>

        <div
          style={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            padding: "0.75rem"
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginBottom: "0.5rem" }}>
            Switch History
          </div>

          {switchHistory.length ? (
            switchHistory.slice(-5).reverse().map((entry, index) => (
              <div
                key={`${entry.timestamp}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "0.5rem",
                  color: "#e2e8f0",
                  fontSize: "0.82rem",
                  padding: "0.3rem 0",
                  borderTop: index === 0 ? "none" : "1px solid #1e293b"
                }}
              >
                <span>{entry.previous_controller} to {entry.new_controller}</span>
                <span style={{ color: "#64748b" }}>
                  {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "--"}
                </span>
              </div>
            ))
          ) : (
            <div style={{ color: "#64748b", fontSize: "0.82rem" }}>No switches recorded</div>
          )}
        </div>

        <div style={{ marginTop: "0.75rem", color: "#64748b", fontSize: "0.82rem" }}>
          Future-ready: Gain Scheduling, Adaptive PID, LPV, Robust MPC, Tube MPC, DOBC, FTC,
          Backstepping, Adaptive SMC
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, color }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "0.7rem",
        borderRadius: "8px",
        border: "1px solid #334155",
        minHeight: "68px"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{label}</div>
      <div
        style={{
          color,
          fontWeight: "bold",
          marginTop: "0.35rem",
          overflowWrap: "anywhere"
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default ControllerSwitcherPanel;
