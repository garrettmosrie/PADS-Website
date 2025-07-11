import axios from "axios";

let accessToken = null;
let tokenExpiry = null;

export async function getOpenSkyToken() {
  const now = Date.now();
  if (accessToken && tokenExpiry && now < tokenExpiry - 60_000) {
    return accessToken; // Return cached token if still valid (with 60s buffer)
  }

  try {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", "gritzl-api-client");
    params.append("client_secret", "vMLh9N6gY3IP5DemfWOn9IVxYR0Cc6Rt");

    const res = await axios.post("https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    accessToken = res.data.access_token;
    tokenExpiry = now + res.data.expires_in * 1000;

    return accessToken;
  } catch (err) {
    console.error("Failed to fetch OpenSky token:", err.message);
    throw err;
  }
}
