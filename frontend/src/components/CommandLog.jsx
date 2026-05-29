function CommandLog({ logs }) {
  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Command Log</h2>

      <div style={{
        backgroundColor: "#1e293b",
        padding: "1rem",
        borderRadius: "10px",
        border: "1px solid #334155",
        textAlign: "left"
      }}>
        {logs.length === 0 ? (
          <p>No commands logged yet.</p>
        ) : (
          <ul>
            {logs.map((log, index) => (
              <li key={index}>
                {log.time} — {log.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default CommandLog;