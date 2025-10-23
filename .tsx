// This file contained Python code and was incorrectly named with a .tsx extension,
// which would cause compilation errors. The content has been removed as it does
// not belong in the frontend application source.
import React, { useEffect, useState } from "react";

// === Gemini API base ===
const BASE_URL = "https://api.gemini.com/v1";

// === Helper: Mask keys in logs ===
const maskKey = (key: string | undefined) =>
  key ? key.slice(0, 4) + "****" + key.slice(-4) : "N/A";

// === Load environment variables ===
// (Vite automatically injects variables that start with VITE_)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_SECRET = import.meta.env.VITE_GEMINI_API_SECRET;

// === Helper: Safe fetch with retries ===
async function safeRequest(
  endpoint: string,
  retries = 3,
  delay = 2000
): Promise<any | null> {
  const url = `${BASE_URL}/${endpoint}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error(`[Attempt ${attempt}] Error:`, err);
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error("❌ Max retries reached.");
        return null;
      }
    }
  }
  return null;
}

// === Main React component ===
const GeminiConnector: React.FC = () => {
  const [ticker, setTicker] = useState<any>(null);

  useEffect(() => {
    console.log("🔐 Using Gemini API Key:", maskKey(GEMINI_API_KEY));

    const fetchTicker = async () => {
      const data = await safeRequest("pubticker/btcusd");
      setTicker(data);
    };

    fetchTicker();
  }, []);

  return (
    <div className="p-4 rounded-xl bg-gray-900 text-white max-w-sm mx-auto text-center shadow-lg">
      <h2 className="text-lg font-semibold mb-3">Gemini BTC/USD Ticker</h2>

      {ticker ? (
        <>
          <p className="text-green-400">
            ✅ Current Price: ${ticker.last}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Bid: ${ticker.bid} | Ask: ${ticker.ask}
          </p>
        </>
      ) : (
        <p className="text-yellow-400">Fetching data...</p>
      )}
    </div>
  );
};

export default GeminiConnector;
