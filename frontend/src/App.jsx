import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSignals = async () => {
    try {
      const res = await axios.get("http://localhost:5000/signals");
      setSignals(res.data);
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
    });

    return () => socket.disconnect();
  }, []);

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
      <h1 style={{ marginBottom: "2rem", textAlign: "center" }}>
        Aircraft Signal Monitor
      </h1>

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
              {signals.map((signal) => (
                <tr key={signal._id}>
                  <td style={{ padding: "12px", border: "1px solid #ccc" }}>
                    {new Date(signal.detectedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: "12px", border: "1px solid #ccc", textAlign: "center" }}>
                    <strong>{signal.confidence}%</strong>
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
