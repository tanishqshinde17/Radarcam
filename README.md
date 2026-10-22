# Radarcam — Real-Time Speed Camera Alerts

Radarcam is a free speed camera detector web app for drivers. It shows real speed cameras from around the world on a dark map, warns you as you approach one, and tracks your live speed against the posted limit, with no accounts or subscriptions.

## Key Features

- **Worldwide speed cameras**: Fixed, mobile, red-light and average-speed cameras from OpenStreetMap, covering every country where they have been mapped.
- **Fast loading**: Camera data is split into small regional tiles. The app only downloads the cameras within 200 km of you and fetches more as you drive.
- **Live speedometer**: Real-time speed from your device's GPS, or a simulation mode for testing. Speed stays at 0 when stationary.
- **Audio & voice alerts**: Warning chimes, an overspeed alarm, and spoken alerts with the distance and speed limit.
- **Community reports**: Mark a camera or road hazard at your current location.
- **Dark map**: Leaflet and OpenStreetMap with a dark tile filter for night driving, no API key required.
- **Customizable**: Toggle sounds and voice, set the warning distance (300 m – 2 km), switch km/h / mph, and filter camera types.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4
- **Mapping**: React-Leaflet, Leaflet.js, OpenStreetMap
- **Audio & Speech**: Web Audio API & Web Speech Synthesis API

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

## Camera Data

Camera locations come from [OpenStreetMap](https://www.openstreetmap.org/copyright) (`highway=speed_camera` nodes and `type=enforcement` relations), © OpenStreetMap contributors, available under the Open Database License. Coverage depends on what volunteers have mapped: it is dense across most of Europe and thinner in some other regions.

The data ships as static tiles in `public/cameras/`. To refresh it with the latest OpenStreetMap data:

```bash
npm run fetch-cameras
```

This queries the public Overpass API region by region and can take a while; it retries automatically when a server is busy.
