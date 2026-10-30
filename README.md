# TerraForm 🌍

A terrain-based world simulation game built for SocialHack SF 2026, responding to the UNCCD land-use problem statement.

TerraForm lets players explore how land-use decisions affect the environment and the communities living on it. restoration projects, work within a limited budget, and simulate how your choices unfold over time.

## The idea

Land restoration involves many factors in play. In order to let students at the ages of 15-24 to better understand such, a gamified approach was made. 

TerraForm makes these relationships interactive through local scenarios, visual feedback, and opportunities to try different plans, in hopes of giving the student an intuition of how things would play out in different scenarios.

Each chapter presents a landscape with its own challenges. Players choose interventions and balance environmental recovery, community needs, and available resources.

## Run the game locally

### Requirements

- Node.js 22.12+ and npm
- Git
- A modern browser with WebGL enabled

### 1. Clone the repository

```bash
git clone https://github.com/SebL2/TerraForm.git
cd TerraForm
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Start the development server

```bash
npm run dev
```

Open **http://127.0.0.1:5173** in your browser. If that port is occupied, use the address printed in your terminal.

The default game uses the Three.js renderer and bundled landscape data. No API key or data-generation step is required to get started.

### 4. Play

1. Start with the San Francisco chapter and follow the PDA tutorial.
2. Select a tool and click a valid tile, or select a tile before choosing a tool.
3. Queue changes while keeping enough credits for construction and care.
4. Click **Submit & simulate** to watch the landscape change.
5. Open **Environment info** to inspect outcomes and compare runs.
6. Complete chapter objectives to unlock more locations on the world map.

Use the map controls to rotate, zoom, recenter, and switch between the angled and overhead views.

**Progress lasts for the current page session. Refreshing the page starts a new run.**

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm test` | Run the Vitest test suite |
| `npm run data:sf` | Regenerate the San Francisco land-cover sample |
| `npm run data:global` | Regenerate the global chapter landscape samples |

To preview a production build locally:

```bash
npm run build
npx vite preview --host 127.0.0.1
```

Open the preview URL printed in the terminal.

## Built with

- **React and TypeScript** for the interface and game logic
- **Vite** for local development and builds
- **Three.js, React Three Fiber, and Drei** for interactive 3D landscapes
- **Tailwind CSS** and custom styles for the interface
- **Vitest** for automated tests

## Landscape data and simulation

TerraForm combines **ESA WorldCover 2021** land-cover samples with **OpenStreetMap** geometry to place gameplay in recognizable landscapes.

The San Francisco chapter estimates generated storm runoff using an SCS curve-number equation. Global chapters use simplified seasonal rules to illustrate restoration trade-offs.

Costs, growth rates, weather sequences, community scores, and intervention effects are educational assumptions. Results illustrate possible relationships and support experimentation; they are not site-specific forecasts or construction assessments.

## Data attribution

- **ESA WorldCover project 2021** — contains modified Copernicus Sentinel data (2021), licensed under **CC BY 4.0**.
- **© OpenStreetMap contributors** — geographic data licensed under **ODbL 1.0**.

Additional background sources and modeling assumptions are available through the game’s **Sources** panel.

---

Created for **SocialHack SF 2026 · UNCCD land-use challenge**.
