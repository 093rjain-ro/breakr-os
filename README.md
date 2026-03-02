# BREAKR OS

BREAKR is an AI-driven stock and crypto intelligence platform designed to provide institutional-grade market analysis.

## Project Structure

This is a Vite + React + TypeScript project.

- `src/App.tsx`: Main application component.
- `src/components/`: Reusable UI components (like Charts).
- `src/services/`: Core logic for data fetching, signal generation, and Gemini AI integration.
- `src/constants.ts`: Static data like indices lists and initial universes.
- `src/types.ts`: TypeScript interfaces and types.

## Setup

1.  Make sure you have Node.js installed.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up your Google Gemini API key:
    *   Create a `.env` file in the root directory.
    *   Add your key: `VITE_GEMINI_API_KEY=your_api_key_here` (If you want to use it in the browser, though currently the code uses `process.env.API_KEY` which is typically for Node.js. In a Vite app, you usually use `import.meta.env.VITE_API_KEY`. You might need to adjust `src/services/geminiService.ts` if running purely in the browser. For now, it's structured as provided.)

## Running

```bash
npm run dev
```

## Building

```bash
npm run build
```
