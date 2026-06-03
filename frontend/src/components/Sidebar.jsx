function Sidebar() {
  const activeControlItem = "Robustness Testing";
  const menuItems = [
    { label: "Dashboard" },
    { label: "Telemetry" },
    { label: "Navigation" },
    {
      label: "State Estimation",
      subItems: ["EKF", "UKF", "Comparison", "Estimator Benchmark"]
    },
    {
      label: "Control",
      subItems: ["PID", "LQR", "SMC", "MPC", "Controller Manager", "Comparison", "Robustness Testing"]
    },
    { label: "Commands" },
    { label: "Mission" },
    { label: "Maps" },
    { label: "Logs" },
    { label: "Settings" }
  ];

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        backgroundColor: "#020617",
        borderRight: "1px solid #1e293b",
        padding: "1.5rem",
        position: "fixed",
        left: 0,
        top: 0,
        boxSizing: "border-box"
      }}
    >
      <h2
        style={{
          marginBottom: "2rem",
          fontSize: "1.8rem"
        }}
      >
        AeroControl
      </h2>

      {menuItems.map((item) => (
        <div
          key={item.label}
        >
          <div
            style={{
              padding: "0.9rem",
              marginBottom: item.subItems ? "0.45rem" : "0.8rem",
              borderRadius: "10px",
              backgroundColor:
                item.label === "Dashboard"
                  ? "#1e293b"
                  : "transparent",
              cursor: "pointer",
              transition: "0.2s",
              border: "1px solid #1e293b",
              fontWeight: "500"
            }}
          >
            {item.label}
          </div>

          {item.subItems && (
            <div style={{ marginBottom: "0.8rem", paddingLeft: "0.8rem" }}>
              {item.subItems.map((subItem) => (
                <div
                  key={subItem}
                  style={{
                    padding: "0.45rem 0.7rem",
                    color: subItem === activeControlItem ? "#38bdf8" : "#94a3b8",
                    fontSize: "0.9rem",
                    borderLeft: subItem === activeControlItem ? "2px solid #38bdf8" : "1px solid #334155",
                    fontWeight: subItem === activeControlItem ? "bold" : "500"
                  }}
                >
                  {subItem}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;
