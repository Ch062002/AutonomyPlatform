const ESTIMATION_MODULES = [
  "EKF",
  "UKF",
  "Complementary Filter",
  "Observer"
];

function StateEstimationPlaceholderPanel() {
  return (
    <div>
      <h2 style={{ textAlign: "center" }}>State Estimation</h2>

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
            padding: "0.9rem",
            backgroundColor: "#0f172a",
            borderRadius: "8px",
            border: "1px solid #334155",
            color: "#cbd5e1"
          }}
        >
          EKF/UKF module coming soon
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.8rem",
            marginTop: "0.9rem"
          }}
        >
          {ESTIMATION_MODULES.map((module) => (
            <div
              key={module}
              style={{
                backgroundColor: "#0f172a",
                padding: "0.8rem",
                borderRadius: "8px",
                border: "1px solid #334155"
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                {module}
              </div>
              <div
                style={{
                  color: "#94a3b8",
                  fontWeight: "bold",
                  marginTop: "0.45rem"
                }}
              >
                Pending integration
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StateEstimationPlaceholderPanel;
