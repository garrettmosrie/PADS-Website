import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("newest");
  const [lastDetectedTime, setLastDetectedTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchSignals = async () => {
    try {
      const res = await axios.get("http://localhost:5000/signals");
      setSignals(res.data);
      setLastDetectedTime(
        res.data.length > 0 ? new Date(res.data[0].detectedAt) : null
      );
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();

    const socket = io("http://localhost:5000");

    socket.on("new-signal", (newSignal) => {
      setSignals((prev) => [newSignal, ...prev]);
      setLastDetectedTime(new Date(newSignal.detectedAt));
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastDetectedTime) {
        const seconds = Math.floor(
          (Date.now() - lastDetectedTime.getTime()) / 1000
        );
        setElapsedSeconds(seconds);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastDetectedTime]);

  const getConfidenceColor = (confidence) => {
    if (confidence >= 70) return "#c8e6c9"; 
    if (confidence >= 40) return "#fff9c4"; 
    return "#ffcdd2"; 
  };

  const sortedSignals = [...signals].sort((a, b) => {
    if (sortOption === "oldest") return new Date(a.detectedAt) - new Date(b.detectedAt);
    if (sortOption === "confidence") return b.confidence - a.confidence;
    return new Date(b.detectedAt) - new Date(a.detectedAt); 
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f9f9f9",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginBottom: "1rem", textAlign: "center" }}>
        Aircraft Signal Monitor
      </h1>

      {!loading && (
        <div style={{ marginBottom: "1rem", textAlign: "center" }}>
          <p>
            <strong>{signals.length}</strong> signal(s) detected.
          </p>
          {lastDetectedTime && (
            <p>Last detected <strong>{elapsedSeconds}</strong> second(s) ago.</p>
          )}
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Sort by:&nbsp;
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="confidence">Highest Confidence</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : signals.length === 0 ? (
        <p>No signals detected.</p>
      ) : (
        <div style={{ width: "100%", maxWidth: "700px", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
              backgroundColor: "#fff",
            }}
          >
            <thead style={{ backgroundColor: "#eee" }}>
              <tr>
                <th style={{ padding: "12px", border: "1px solid #ccc" }}>Detected At</th>
                <th style={{ padding: "12px", border: "1px solid #ccc" }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sortedSignals.map((signal) => (
                <tr key={signal._id} style={{ backgroundColor: getConfidenceColor(signal.confidence) }}>
                  <td style={{ padding: "12px", border: "1px solid #ccc" }}>
                    {new Date(signal.detectedAt).toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      border: "1px solid #ccc",
                      textAlign: "center",
                      fontWeight: "bold",
                    }}
                  >
                    {signal.confidence}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
