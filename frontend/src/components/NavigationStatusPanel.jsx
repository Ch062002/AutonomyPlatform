function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : value.toFixed(6);
    return `${formatted}${suffix}`;
  }

  return `${value}${suffix}`;
}

function formatCompactNumber(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : value.toFixed(2);
    return `${formatted}${suffix}`;
  }

  return `${value}${suffix}`;
}

function formatPosition(position) {
  if (!position) {
    return "--";
  }

  if (Array.isArray(position)) {
    return position.map((value) => formatCompactNumber(value)).join(", ");
  }

  if (typeof position === "object") {
    const x = position.x ?? position.north ?? position.lat;
    const y = position.y ?? position.east ?? position.lon;
    const z = position.z ?? position.down ?? position.alt;

    return [x, y, z]
      .filter((value) => value !== null && value !== undefined)
      .map((value) => formatCompactNumber(value))
      .join(", ") || "--";
  }

  return formatValue(position);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function NavigationStatusPanel({ telemetry, mission }) {
  const latitude = Number(telemetry?.latitude ?? telemetry?.lat);
  const longitude = Number(telemetry?.longitude ?? telemetry?.lon);
  const hasGpsFix = isFiniteNumber(latitude) && isFiniteNumber(longitude);
  const failsafeActive = Boolean(telemetry?.failsafe);
  const navigationHealthy = hasGpsFix && !failsafeActive;
  const navigationMode = (
    telemetry?.nav_state ||
    telemetry?.flight_mode ||
    mission?.guidanceMode ||
    "--"
  );
  const positionSource = telemetry?.position_source || "GPS/SITL";

  const primaryItems = [
    { label: "GPS Latitude", value: hasGpsFix ? formatValue(latitude) : "--" },
    { label: "GPS Longitude", value: hasGpsFix ? formatValue(longitude) : "--" },
    {
      label: "Global Altitude",
      value: formatCompactNumber(
        telemetry?.global_altitude ?? telemetry?.altitude,
        " m"
      )
    },
    {
      label: "Local Position",
      value: formatPosition(mission?.currentPosition ?? telemetry?.local_position)
    },
    {
      label: "Velocity",
      value: formatCompactNumber(telemetry?.velocity, " m/s")
    },
    { label: "PX4 Nav State", value: formatValue(navigationMode) }
  ];

  const statusItems = [
    {
      label: "Failsafe",
      value: failsafeActive ? "ACTIVE" : "Normal",
      color: failsafeActive ? "#ef4444" : "#22c55e"
    },
    {
      label: "Navigation Health",
      value: navigationHealthy ? "Healthy" : "Warning",
      color: navigationHealthy ? "#22c55e" : "#f59e0b"
    },
    {
      label: "State Estimator",
      value: "Pending integration",
      color: "#94a3b8"
    },
    {
      label: "EKF Status",
      value: "Pending integration",
      color: "#94a3b8"
    },
    {
      label: "Position Source",
      value: positionSource,
      color: "#38bdf8"
    }
  ];

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Navigation Status</h2>

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
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.8rem"
          }}
        >
          {primaryItems.map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: "#0f172a",
                padding: "0.8rem",
                borderRadius: "8px",
                border: "1px solid #334155",
                minHeight: "82px"
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                {item.label}
              </div>
              <div
                style={{
                  color: "#e2e8f0",
                  fontWeight: "bold",
                  marginTop: "0.5rem",
                  overflowWrap: "anywhere"
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.8rem",
            marginTop: "0.8rem"
          }}
        >
          {statusItems.map((item) => (
            <div
              key={item.label}
              style={{
                backgroundColor: "#0f172a",
                padding: "0.8rem",
                borderRadius: "8px",
                border: "1px solid #334155"
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                {item.label}
              </div>
              <div
                style={{
                  color: item.color,
                  fontWeight: "bold",
                  marginTop: "0.5rem"
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NavigationStatusPanel;
