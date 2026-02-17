# Breakr Stock Intelligence

<div align="center">
  <h3>Real-Time Authority Feed & AI-Powered Market Sentinel</h3>
  <p>An advanced terminal-style dashboard for institutional-grade stock analysis</p>
</div>

---

## 🚀 Overview

**Breakr Stock Intelligence** is a high-performance, terminal-inspired dashboard designed to simulate an institutional trading environment. It combines a real-time "Price Authority" feed with Generative AI insights to provide a unique perspective on the Indian Stock Market (NSE/BSE).

> **Note:** This application places a heavy emphasis on "Authority" validation, ensuring data integrity through a simulated verification process.

## ✨ Key Features

- **🛡️ Real-Time Authority Feed**: Simulates a high-speed, validated price feed with "LTP Authority" checks to prevent data drift.
- **🧠 Generative AI Sentinel**: Powered by **Google Gemini**, the "AI Authority Reasoner" provides punchy, hedge-fund style commentary on price action and market structure.
- **⚡ "War Room" & "News Time" Modes**: 
  - **War Room (05:00 - 09:30 AM)**: Pre-market intelligence briefing.
  - **News Time (09:30 AM onwards)**: Live breaking news feed aggregation.
- **📊 Advanced Visualization**:
  - **Conviction Radar**: Visualizes the strength of buy/sell signals.
  - **Institutional Footprint**: Tracks simulated FII/DII flow.
  - **Price-Volume Divergence**: Detects hidden accumulation or distribution.
- **🔍 Smart Scanner**: Filter stocks by index (Nifty 50, Bank Nifty, etc.), exchange (NSE/BSE), or sector.

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Glassmorphism & Neon aesthetic)
- **AI Engine**: Google Generative AI SDK (`@google/genai`)
- **Icons**: Lucide React
- **Charts**: Recharts

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **Google Gemini API Key**: [Get it here](https://aistudio.google.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/093rjain-ro/breakr-os.git
    cd breakr-os
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env.local` file in the root directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Run the application:**
    ```bash
    npm run dev
    ```

## 📂 Project Structure

```
breakr-os/
├── src/
│   ├── components/      # Charting and UI components
│   ├── services/        # AI, Universe, and Price Authority services
│   ├── constants.ts     # Configuration and predefined data
│   ├── types.ts         # TypeScript definitions
│   ├── App.tsx          # Main dashboard logic
│   └── main.tsx         # Entry point
├── public/
└── ...
```

## ⚠️ Disclaimer

This application is a **simulation/demonstration** of a trading interface. The "Authority Feed" data is simulated for demonstration purposes. **Do not use this for actual financial trading decisions.**

---

<div align="center">
  <sub>Built with ❤️ by breakr-os</sub>
</div>
