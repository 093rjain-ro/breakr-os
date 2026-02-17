# Breakr Stock Intelligence // The "Authority" Update

<div align="center">
  <h3>Real-Time Authority Feed & AI-Powered Market Sentinel</h3>
  <p><em>"Institutional-grade signal processing for the rest of us."</em></p>
</div>

---

## 👨‍💻 The "Human" Update

Alright, let's cut the corporate jargon. 

I built **Breakr Stock Intelligence** because I was tired of retail traders flying blind. We needed something that felt like a **weapon**, not just another watchlist. This isn't just a dashboard; it's a **War Room**.

I've wired up a simulated "Price Authority" feed that checks for data integrity every millisecond. If the price drifts too far from the source, it locks down. No bad data. No noise.

And the best part? I've integrated **Google's Gemini AI** right into the core. It doesn't just "summarize news"—it acts as a **Hedge Fund Strategist**, giving you punchy, no-nonsense commentary on what's actually happening.

This is **v0.5.0**. It's raw, it's powerful, and it's built to give you an edge.

---

## ⚡ What's Under the Hood?

- **The "Authority" Engine**: A custom-built validation layer that simulates high-frequency institutional feeds. It validates LTP (Last Traded Price) against an internal authority to ensure you're seeing the *real* picture.
- **AI Sentinel (Gemini-Powered)**: I'm using `gemini-3-flash` to analyze market structure in real-time. It sees the patterns you might miss.
- **War Room Mode (05:00 - 09:30 AM)**: Before the market opens, the system scours the web for global cues and GIFT Nifty trends to give you a "Battle Bias".
- **Visual Alpha**: 
  - **Conviction Radar**: A hex-grid visualization of buy/sell Signal Strength.
  - **Institutional Flow**: Tracking simulated FII/DII money movement.

---

## 🛠️ The Tech Stack (My Rig)

Built this using the cleanest, fastest stack I know:
- **React 18 + TypeScript** (because type safety validates my sanity)
- **Vite** (lighting fast builds)
- **Tailwind CSS** (for that sweet, sweet Neon/Glassmorphism aesthetic)
- **Google GenAI SDK** (the brain)

---

## 🚀 How to Run this Beast

You want to run this locally? Easy.

1.  **Clone it:**
    ```bash
    git clone https://github.com/093rjain-ro/breakr-os.git
    cd breakr-os
    ```

2.  **Install the deps:**
    ```bash
    npm install
    ```

3.  **The Secret Sauce (API Key):**
    You need a Gemini API key to wake up the AI.
    - Get one [here](https://aistudio.google.com/).
    - Create a `.env.local` file:
    ```env
    GEMINI_API_KEY=your_key_goes_here
    ```

4.  **Ignition:**
    ```bash
    npm run dev
    ```

---

## ⚠️ A Heads Up

This is a **simulation**. The "Authority Feed" generates realistic but *simulated* market data for demonstration purposes. Don't go betting your life savings based on the "Institutional Flow" chart here—it's a demo of the *interface* and *intelligence capabilities*.

---

<div align="center">
  <sub>Transmission End // 093rjain-ro</sub>
</div>
