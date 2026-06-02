function Sidebar() {
  const menuItems = [
    "Dashboard",
    "Telemetry",
    "Navigation",
    "Commands",
    "Mission",
    "Maps",
    "Logs",
    "Settings"
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
          key={item}
          style={{
            padding: "0.9rem",
            marginBottom: "0.8rem",
            borderRadius: "10px",
            backgroundColor:
              item === "Dashboard"
                ? "#1e293b"
                : "transparent",
            cursor: "pointer",
            transition: "0.2s",
            border: "1px solid #1e293b",
            fontWeight: "500"
          }}
        >
          {item}
        </div>
      ))}
    </aside>
  );
}

export default Sidebar;
