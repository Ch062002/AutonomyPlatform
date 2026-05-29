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
    <div style={{ marginTop: "2rem" }}>
      <h2>Telemetry Graphs</h2>

      <div style={{
        backgroundColor: "#1e293b",
        padding: "1rem",
        borderRadius: "10px",
        border: "1px solid #334155"
      }}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            <Line
              type="monotone"
              dataKey="altitude"
              stroke="#22c55e"
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="velocity"
              stroke="#38bdf8"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TelemetryCharts;