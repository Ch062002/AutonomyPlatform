function MissionStatusPanel({ mission, uploadStatus }) {
  return (
    <div>
      <h2 style={{ textAlign: "center" }}>
        Mission Status
      </h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)",
          color: "white"
        }}
      >
        {/* MISSION OVERVIEW */}

        <p>
          <strong>Mission Mode:</strong>{" "}
          <span
            style={{
              color:
                mission?.state === "Completed"
                  ? "#4ade80"
                  : "#60a5fa",
              fontWeight: "bold"
            }}
          >
            {mission?.state || "Idle"}
          </span>
        </p>

        <p>
          <strong>Active Waypoint:</strong>{" "}
          {mission?.activeWaypoint || 0} /{" "}
          {mission?.totalWaypoints || 0}
        </p>

        <p>
          <strong>Mission Progress:</strong>{" "}
          {mission?.progress || 0}%
        </p>

        <p>
          <strong>Guidance Mode:</strong>{" "}
          {mission?.guidanceMode || "DIRECT_WAYPOINT"}
        </p>

        {/* LOS GUIDANCE METRICS */}

        {mission?.guidanceMode === "LOS_GUIDANCE" && (
          <>
            <p>
              <strong>Cross-Track Error:</strong>{" "}
              {mission?.crossTrackError ?? "--"} m
            </p>

            <p>
              <strong>Along-Track Distance:</strong>{" "}
              {mission?.alongTrackDistance ?? "--"} m
            </p>

            <p>
              <strong>Path Length:</strong>{" "}
              {mission?.pathLength ?? "--"} m
            </p>
          </>
        )}

        {/* PURE PURSUIT METRICS */}
        {mission?.guidanceMode === "PURE_PURSUIT" && (
  <>
            <p><strong>Lookahead Distance:</strong> {mission?.lookaheadDistance ?? "--"} m</p>
            <p><strong>Pursuit Distance:</strong> {mission?.pursuitDistance ?? "--"} m</p>
            <p><strong>Pursuit Heading:</strong> {mission?.pursuitHeading ?? "--"}°</p>
        </>
        )}

        {/* DIRECT WAYPOINT METRICS */}

        {mission?.guidanceMode === "DIRECT_WAYPOINT" && (
          <>
            <p>
              <strong>Distance To Target:</strong>{" "}
              {mission?.distanceToTarget ?? "--"} m
            </p>

            <p>
              <strong>Bearing To Target:</strong>{" "}
              {mission?.bearingToTarget ?? "--"}°
            </p>

            <p>
              <strong>Altitude Error:</strong>{" "}
              {mission?.altitudeError ?? "--"} m
            </p>
          </>
        )}

        {/* PROGRESS BAR */}

        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "#0f172a",
            borderRadius: "8px",
            marginTop: "1rem",
            marginBottom: "1rem"
          }}
        >
          <div
            style={{
              width: `${mission?.progress || 0}%`,
              height: "100%",
              backgroundColor: "#60a5fa",
              borderRadius: "8px",
              transition: "0.3s"
            }}
          />
        </div>

        {/* POSITION DATA */}

        <p>
          <strong>Distance to WP:</strong>{" "}
          {mission?.distanceToWaypoint ?? "--"} m
        </p>

        <p>
          <strong>Current Position:</strong>{" "}
          {mission?.currentPosition
            ? JSON.stringify(mission.currentPosition)
            : "--"}
        </p>

        <p>
          <strong>Target Position:</strong>{" "}
          {mission?.targetPosition
            ? JSON.stringify(mission.targetPosition)
            : "--"}
        </p>

        {/* WAYPOINT TIMELINE */}

        <h3
          style={{
            marginTop: "1.5rem"
          }}
        >
          Waypoint Timeline
        </h3>

        {mission?.waypoints?.map((wp, index) => {
          let status = "Pending";

          if (mission?.state === "Completed") {
            status = "Completed";
          } else if (index + 1 < mission.activeWaypoint) {
            status = "Completed";
          } else if (index + 1 === mission.activeWaypoint) {
            status = "Active";
          }

          return (
            <div
              key={index}
              style={{
                marginTop: "0.8rem",
                padding: "0.8rem",
                borderRadius: "10px",
                border: "1px solid #475569",
                backgroundColor: "#0f172a"
              }}
            >
              <p>
                <strong>WP{index + 1}</strong>
              </p>

              <p
                style={{
                  color:
                    status === "Completed"
                      ? "#4ade80"
                      : status === "Active"
                      ? "#60a5fa"
                      : "#94a3b8"
                }}
              >
                {status}
              </p>

              <p
                style={{
                  fontSize: "0.8rem"
                }}
              >
                Lat: {wp.lat}, Lon: {wp.lon}, Alt: {wp.alt} m
              </p>
            </div>
          );
        })}

        {/* UPLOAD INFO */}

        <hr
          style={{
            marginTop: "1rem",
            marginBottom: "1rem",
            borderColor: "#334155"
          }}
        />

        <p>
          <strong>Upload Status:</strong>{" "}
          {uploadStatus?.status || "idle"}
        </p>

        <p>
          <strong>Message:</strong>{" "}
          {uploadStatus?.message ||
            "No mission uploaded yet"}
        </p>

        <p>
          <strong>Uploaded Mission:</strong>{" "}
          {uploadStatus?.mission_name || "--"}
        </p>

        <p>
          <strong>Uploaded WPs:</strong>{" "}
          {uploadStatus?.waypoint_count || 0}
        </p>

        <p>
          <strong>Last Updated:</strong>{" "}
          {uploadStatus?.last_updated || "--"}
        </p>
      </div>
    </div>
  );
}

export default MissionStatusPanel;