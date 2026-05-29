import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

function TelemetryCharts({ history }) {
  return (
    <div>
      <h2
        style={{
          marginBottom: "1rem",
          textAlign: "center"
        }}
      >
        Telemetry Graphs
      </h2>

      <div
        style={{
          backgroundColor: "#1e293b",
          padding: "1rem",
          borderRadius: "14px",
          border: "1px solid #334155",
          boxShadow: "0 0 15px rgba(59,130,246,0.15)"
        }}
      >
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="time" />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="altitude"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="velocity"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TelemetryCharts;