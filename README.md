# PulseNav — Real-Time Speed Camera & Hazard Navigation App

PulseNav is a modern, high-performance, 100% free speed camera detector and GPS navigation web application designed for drivers. Inspired by popular navigation tools like Radarbot, PulseNav provides real-time speed camera alerts, road hazard reporting, and live speedometer tracking with absolute privacy and zero subscription fees.

## Key Features

- **Real-Time Speed Camera Detection**: Alerts drivers for fixed speed cameras, mobile radar traps, red-light cameras, average speed zones, and tunnel cameras.
- **Constant & Accurate Speedometer**: Real-time speed tracking via device GPS or simulation mode. Speed remains constant at 0 km/h when stationary.
- **Proximity Audio & Voice Alerts**: Audible warning chimes and synthesized voice alerts as you approach speed cameras or hazardous road zones.
- **Community Road Hazard Reporting**: Crowdsourced reporting interface to broadcast police checkpoints, hidden speed traps, accidents, and road debris instantly.
- **Dark Mode Optimized Map**: High-performance Leaflet & OpenStreetMap integration with a custom dark-mode tile filter for comfortable night driving.
- **Fully Customizable Settings**: Toggle audio alerts, voice guidance, detection warning radiuses (300m - 2000m), and specific camera filters.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4
- **Mapping**: React-Leaflet, Leaflet.js, OpenStreetMap
- **Audio & Speech**: HTML5 Web Audio API & Web Speech Synthesis API

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/tanishqshinde17/Radarcam.git
   cd Radarcam
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.
