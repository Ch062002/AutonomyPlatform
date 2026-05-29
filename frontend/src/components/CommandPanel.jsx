import {
  armVehicle,
  disarmVehicle,
  takeoffVehicle,
  landVehicle
} from "../services/api";

function CommandPanel() {
  const buttonStyle = {
    padding: "0.8rem 1.4rem",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    marginRight: "1rem",
    marginTop: "1rem",
    fontWeight: "bold"
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
          onClick={() => armVehicle()}
          style={{ ...buttonStyle, backgroundColor: "#22c55e" }}
        >
          ARM
        </button>

        <button
          onClick={() => disarmVehicle()}
          style={{ ...buttonStyle, backgroundColor: "#ef4444", color: "white" }}
        >
          DISARM
        </button>

        <button
          onClick={() => takeoffVehicle()}
          style={{ ...buttonStyle, backgroundColor: "#38bdf8" }}
        >
          TAKEOFF
        </button>

        <button
          onClick={() => landVehicle()}
          style={{ ...buttonStyle, backgroundColor: "#facc15" }}
        >
          LAND
        </button>
      </div>
    </div>
  );
}

export default CommandPanel;