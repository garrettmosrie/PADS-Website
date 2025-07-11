import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

function App() {
  const [signals, setSignals] = useState([]);
  const [sensorLocation, setSensorLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("newest");
  const [lastDetectedTime, setLastDetectedTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastAlert, setLastAlert] = useState(null);
  const [recentFlights, setRecentFlights] = useState([]);
  const [flightPullTime, setFlightPullTime] = useState(null);
  const [flightsInRadius, setFlightsInRadius] = useState(0);
  const [unknownDetections, setUnknownDetections] = useState([]);


  useEffect(() => {
    const fetchRecentFlights = async () => {
      try {
        const res = await axios.get("https://pads-website.onrender.com/api/recent-flights");
        setRecentFlights(res.data.flights || []);
      } catch (err) {
        console.error("Flight log fetch error:", err);
      }
    };

    fetchRecentFlights();
    const interval = setInterval(fetchRecentFlights, 30000);
    return () => clearInterval(interval);
  }, []);


  const fetchSignals = async () => {
    try {
      const res = await axios.get("https://pads-website.onrender.com/signals");
      setSignals(res.data);
      setLastDetectedTime(
        res.data.length > 0 ? new Date(res.data[0].detectedAt) : null
      );
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const fetchSensor = async () => {
    try {
      const res = await axios.get("https://pads-website.onrender.com/sensor-location");
      if (res.data) setSensorLocation(res.data);
    } catch (err) {
      console.error("Sensor fetch error:", err);
    }
  };

  const clearSignals = async () => {
    try {
      await axios.delete("https://pads-website.onrender.com/signals");
      setSignals([]);
      setLastDetectedTime(null);
      setElapsedSeconds(0);
      setLastAlert(null);
    } catch (err) {
      console.error("Clear error:", err);
    }
  };

  useEffect(() => {
    fetchSignals();
    fetchSensor();
    setLoading(false);

    const socket = io("https://pads-website.onrender.com");

    socket.on("new-signal", (data) => {
    const { signal, alert } = data.signal ? data : { signal: data, alert: null };

    setSignals((prev) => [signal, ...prev]);
    setLastDetectedTime(new Date(signal.detectedAt));

    const now = new Date();
    setFlightPullTime(now);

    if (alert) {
      setLastAlert(alert);
      if (alert.startsWith("⚠️ Unknown aircraft")) {
        setUnknownDetections((prev) => [
          { time: now.toLocaleTimeString(), message: alert },
          ...prev.slice(0, 4),
        ]);
      }
    }

    if (alert?.startsWith("✅")) {
      setFlightsInRadius((prev) => prev + 1); 
    }
});


    socket.on("cleared-signals", () => {
      setSignals([]);
      setLastDetectedTime(null);
      setElapsedSeconds(0);
      setLastAlert(null);
    });

    socket.on("sensor-location-updated", (data) => {
      setSensorLocation(data);
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
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#ffffff",
        color: "#000000",
      }}
    >
      {/* Left Column - Sensor Location */}
      <div style={{ flex: 1, padding: "1rem", borderRight: "1px solid #ccc" }}>
        <h2 style={{ textAlign: "center", margin: "0 0 1rem 0" }}>Sensor Location</h2>
        {sensorLocation ? (
          <div style={{ backgroundColor: "#f9f9f9", padding: "1rem", borderRadius: "8px" }}>
            <p style={{ margin: "0.5rem 0" }}>
              <strong>Latitude:</strong>{" "}
              {Math.abs(sensorLocation.latitude).toFixed(5)}°{" "}
              {sensorLocation.latitude >= 0 ? "N" : "S"}
            </p>
            <p style={{ margin: "0.5rem 0" }}>
              <strong>Longitude:</strong>{" "}
              {Math.abs(sensorLocation.longitude).toFixed(5)}°{" "}
              {sensorLocation.longitude >= 0 ? "E" : "W"}
            </p>
            <p style={{ margin: "0.5rem 0", fontStyle: "italic", color: "#555" }}>
              Reported: {new Date(sensorLocation.createdAt).toLocaleString()}
            </p>

            <div style={{ marginTop: "1rem" }}>
              <iframe
                width="100%"
                height="250"
                frameBorder="0"
                style={{ border: 0, borderRadius: "6px" }}
                src={`https://maps.google.com/maps?q=${sensorLocation.latitude},${sensorLocation.longitude}&z=15&output=embed`}
                allowFullScreen
              ></iframe>
            </div>

            <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
              <a
                href={`https://maps.google.com/?q=${sensorLocation.latitude},${sensorLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  backgroundColor: "#1e88e5",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: "4px",
                  transition: "background-color 0.3s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1565c0")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#1e88e5")}
              >
                View in Google Maps
              </a>
            </div>

            <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid #ccc" }} />

            <div style={{ fontSize: "0.9rem", color: "#555", textAlign: "center" }}>
              <p style={{ margin: "0.3rem 0" }}>
                <strong>Status:</strong> Online
              </p>
              <p style={{ margin: "0.3rem 0" }}>
                <strong>ID:</strong> SENSOR-001
              </p>
              <p style={{ margin: "0.3rem 0" }}>
                <strong>Last Update:</strong> {new Date(sensorLocation.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ) : (
          <p>No sensor data available.</p>
        )}
      </div>

      {/* Center Column - Aircraft Signals */}
      <div style={{ flex: 2, padding: "2rem", textAlign: "center" }}>
        <h2 style={{ textAlign: "center", margin: "0 0 1rem 0", fontSize: "1.8rem" }}>Aircraft Signal Monitor</h2>

        {!loading && (
          <div style={{ marginBottom: "1rem" }}>
            <p>
              <strong>{signals.length}</strong> signal(s) detected.
            </p>
            {lastDetectedTime && (
              <p>
                Last detected <strong>{elapsedSeconds}</strong> second(s) ago.
              </p>
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
          <>
            <div style={{
              width: "100%",
              maxWidth: "700px",
              margin: "0 auto",
              overflowX: "auto",
              maxHeight: "700px",
              overflowY: "auto"
            }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                  backgroundColor: "#fff",
                  color: "#000"
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

            <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#333" }}>
              <p><strong>Confidence Legend:</strong></p>
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: "20px", height: "20px", backgroundColor: "#c8e6c9", border: "1px solid #aaa", marginRight: "0.5rem" }}></div>
                  <span>High (≥ 70%)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: "20px", height: "20px", backgroundColor: "#fff9c4", border: "1px solid #aaa", marginRight: "0.5rem" }}></div>
                  <span>Medium (40–69%)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ width: "20px", height: "20px", backgroundColor: "#ffcdd2", border: "1px solid #aaa", marginRight: "0.5rem" }}></div>
                  <span>Low (&lt; 40%)</span>
                </div>
              </div>
            </div>

            {signals.length > 0 && (
              <button
                onClick={clearSignals}
                style={{
                  marginTop: "1rem",
                  padding: "8px 16px",
                  backgroundColor: "#e53935",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  transition: "background-color 0.3s",
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#c62828"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#e53935"}
              >
                Clear All Signals
              </button>
            )}
          </>
        )}
      </div>

      {/* Right Column - Flight Comparison Alerts */}
      <div style={{ flex: 1, padding: "1rem", borderLeft: "1px solid #ccc" }}>
        <h2 style={{ textAlign: "center", margin: "0 0 1rem 0" }}>Flight Comparison</h2>
        {lastAlert ? (
          <div style={{
            backgroundColor: lastAlert.startsWith("✅") ? "#e6f4ea" : "#ffe6e6",
            border: `1px solid ${lastAlert.startsWith("✅") ? "#2e7d32" : "#cc0000"}`,
            borderRadius: "8px",
            padding: "1rem",
            color: lastAlert.startsWith("✅") ? "#2e7d32" : "#990000",
            fontWeight: "bold",
            fontSize: "1rem",
            textAlign: "center"
          }}>
            {lastAlert}
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "#555" }}>No unknown aircraft detected.</p>
        )}

        <hr style={{ margin: "1rem 0" }} />
        <h3 style={{ textAlign: "center", fontSize: "1.1rem" }}>Nearby Flights</h3>
        <div style={{ maxHeight: "200px", overflowY: "auto", fontSize: "0.9rem" }}>
          {recentFlights.length === 0 ? (
            <p style={{ textAlign: "center", color: "#777" }}>No recent flights detected.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {recentFlights.map((flight, idx) => {
                return (
                  <li
                    key={idx}
                    style={{
                      marginBottom: "0.6rem",
                      padding: "0.4rem",
                      background: "#f2f2f2",
                      borderRadius: "5px",
                    }}
                  >
                      <strong>{flight.callsign || "N/A"}</strong><br />
                      Altitude: {flight.altitude} m<br />
                      Time Seen: {flight.timeSeen} (UTC)<br />
                      Origin: {flight.originCountry}<br />
                      <strong>Lat: {flight.latitude?.toFixed(5)}°</strong><br />
                      <strong>Lon: {flight.longitude?.toFixed(5)}°</strong>
                  </li>
                );
              })}
            </ul>
            
          )}
          
        </div>
        
        <div style={{
          marginTop: "1rem",
          backgroundColor: "#f1f8e9",
          border: "1px solid #c5e1a5",
          borderRadius: "8px",
          padding: "1rem",
          color: "#33691e"
        }}>
          <h3 style={{ textAlign: "center", marginTop: 0 }}>Status Panel</h3>
          <p><strong>Total flights in radius:</strong> {flightsInRadius}</p>
          <p><strong>Last OpenSky pull:</strong> {flightPullTime ? flightPullTime.toLocaleTimeString() : "N/A"}</p>
          <p><strong>Sensor status:</strong> {sensorLocation ? "Online" : "❌ Offline"}</p>
        </div>
        <div style={{
          marginTop: "1rem",
          backgroundColor: "#fff3e0",
          border: "1px solid #ffcc80",
          borderRadius: "8px",
          padding: "1rem",
          color: "#e65100"
        }}>
          <h3 style={{ textAlign: "center", marginTop: 0 }}>Recent Unknowns</h3>
          {unknownDetections.length === 0 ? (
            <p style={{ textAlign: "center", color: "#777" }}>No recent unknown aircraft.</p>
          ) : (
            <ul style={{ paddingLeft: "1rem", margin: 0 }}>
              {unknownDetections.map((entry, idx) => (
                <li key={idx}>⚠️ Unknown aircraft detected at {entry.time}</li>
              ))}
            </ul>
          )}
      </div>
    </div>  
  </div>
  );
}

export default App;
