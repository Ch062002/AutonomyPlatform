import { useEffect, useState } from "react";
import { getMission, createMission, resetMission } from "../services/api";

function MissionPanel() {
  const [mission, setMission] = useState({
    name: "None",
    state: "Idle",
    waypoints: []
  });

  const fetchMission = () => {
    getMission()
      .then((response) => setMission(response.data))
      .catch(() => {
        setMission({
          name: "Unavailable",
          state: "Disconnected",
          waypoints: []
        });
      });
  };

  const handleCreateMission = () => {
    const newMission = {
      name: "Demo Surveillance Mission",
      waypoints: [
        { lat: 18.5204, lon: 73.8567, alt: 100 },
        { lat: 18.5210, lon: 73.8575, alt: 120 },
        { lat: 18.5220, lon: 73.8580, alt: 110 }
      ]
    };

    createMission(newMission).then(() => fetchMission());
  };

  const handleResetMission = () => {
    resetMission().then(() => fetchMission());
  };

  useEffect(() => {
    fetchMission();
  }, []);

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Mission Control</h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p>Current Mission: {mission.name}</p>
          <p>Mission State: {mission.state}</p>
          <p>Waypoint Count: {mission.waypoints.length}</p>

          <button
            onClick={handleCreateMission}
            style={{
              marginTop: "1rem",
              padding: "0.7rem 1.2rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Create Demo Mission
          </button>

          <button
            onClick={handleResetMission}
            style={{
              marginTop: "1rem",
              marginLeft: "1rem",
              padding: "0.7rem 1.2rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Reset Mission
          </button>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
          <h3>Waypoints</h3>

          {mission.waypoints.length === 0 ? (
            <p>No waypoints assigned.</p>
          ) : (
            <ul>
              {mission.waypoints.map((wp, index) => (
                <li key={index}>
                  WP{index + 1}: Lat {wp.lat}, Lon {wp.lon}, Alt {wp.alt} m
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default MissionPanel;