import { useEffect, useState } from "react";

import {
  getControlControllers,
  getControlStatus,
  selectControlController
} from "../services/api";

function ControlStatusPanel({ addCommandLog }) {
  const [status, setStatus] = useState(null);
  const [controllers, setControllers] = useState([]);
  const [error, setError] = useState(null);

  const fetchControlStatus = async () => {
    try {
      const [statusResponse, controllersResponse] = await Promise.all([
        getControlStatus(),
        getControlControllers()
      ]);

      setStatus(statusResponse.data || null);
      setControllers(controllersResponse.data?.controllers || []);
      setError(null);
    } catch {
      setStatus(null);
      setControllers([]);
      setError("Disconnected");
    }
  };

  useEffect(() => {
    fetchControlStatus();
    const interval = setInterval(fetchControlStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = async (controllerName) => {
    try {
      const response = await selectControlController(controllerName);
      setStatus(response.data || null);
      await fetchControlStatus();
      addCommandLog?.(`Control controller changed to ${controllerName}`);
    } catch {
      addCommandLog?.(`Failed to select control controller ${controllerName}`);
    }
  };

  const activeController = status?.active_controller || "--";
  const controllerHealth = status?.controller_health || {};
  const activeHealth = controllerHealth[activeController] || "--";
  const controllerStatus = status?.controller_status || error || "--";
  const controlOutput = status?.control_output || {};
  const controlAxes = status?.supported_control_axes || [];

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Control Framework</h2>

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
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "0.75rem",
            marginBottom: "0.9rem"
          }}
        >
          <StatusTile label="Active Controller" value={activeController} color="#38bdf8" />
          <StatusTile label="Controller Health" value={activeHealth} color="#22c55e" />
          <StatusTile label="Controller Status" value={controllerStatus} color="#f59e0b" />
          <StatusTile
            label="Control Output"
            value={Object.keys(controlOutput).length ? JSON.stringify(controlOutput) : "Placeholder"}
            color="#c4b5fd"
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
            gap: "0.5rem",
            marginBottom: "0.9rem"
          }}
        >
          {(controllers.length ? controllers : ["PID", "LQR", "SMC", "MPC"].map((name) => ({ controller_name: name }))).map((controller) => {
            const name = controller.controller_name;
            const active = name === activeController;

            return (
              <button
                key={name}
                type="button"
                onClick={() => handleSelect(name)}
                style={{
                  padding: "0.65rem",
                  borderRadius: "8px",
                  border: active ? "1px solid #38bdf8" : "1px solid #334155",
                  backgroundColor: active ? "#0f3b57" : "#0f172a",
                  color: "white",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                {name}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "0.5rem"
          }}
        >
          {controlAxes.map((axis) => (
            <div
              key={axis}
              style={{
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "0.55rem 0.65rem",
                color: "#94a3b8",
                backgroundColor: "#0f172a",
                fontSize: "0.85rem"
              }}
            >
              {axis.replace("_", " ")}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusTile({ label, value, color }) {
  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        padding: "0.75rem",
        borderRadius: "8px",
        border: "1px solid #334155",
        minHeight: "74px"
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: "0.82rem" }}>{label}</div>
      <div
        style={{
          color,
          fontWeight: "bold",
          marginTop: "0.4rem",
          overflowWrap: "anywhere"
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default ControlStatusPanel;
