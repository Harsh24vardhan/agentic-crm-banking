let baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Render's Blueprint VITE_API_BASE_URL host variable does not include the protocol.
// Automatically prepend https:// to hostnames lacking a protocol.
if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
  baseUrl = "https://" + baseUrl;
}

export const API_BASE_URL = baseUrl;
