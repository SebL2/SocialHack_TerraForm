# test game — San Francisco

PhaserJS + React + TypeScript + Vite game with a low-poly isometric world and a six-button action tray underneath.

## Run

```
npm install
npm run dev
```

Open http://127.0.0.1:5173. `npm run build` checks TypeScript and creates a production build. `npm test` runs the six simulation tests.

## Play

Start from the title screen, follow the San Francisco beacon, open the chapter preview, and complete Harry’s guided tutorial. Choose an intervention, click a terrain cell (or **Find a plot**), then start your project in the plot panel. **Submit & simulate** commits the selected intervention and advances a year in four animated quarterly steps. **Environment info** opens the run history and compares generated runoff under a fixed hypothetical 35 mm event. Drag to pan; use + / − to zoom. The cloud icon toggles the runoff overlay. Undo explores alternate choices. Browser storage saves progress.

The goal is 360 illustrative homes without increasing test-storm runoff. Whole grid cells are game intervention units, not real parcels.

## Data and model

Actual ESA WorldCover 2021 v200 samples are stored in `src/data/sf-landcover.json`. `npm run data:sf` regenerates the 64 × 56 nearest-neighbor sample from public GeoTIFF tile N36W123. A geographic mask approximates the mainland play area, while surrounding land provides context. It is not an administrative boundary.

Attribution: © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. CC BY 4.0. https://esa-worldcover.org/en/data-access

Runoff uses the SCS curve-number equation documented by InVEST, implemented independently in TypeScript. https://storage.googleapis.com/releases.naturalcapitalproject.org/invest-userguide/latest/en/urban_flood_mitigation.html

Uniform soil group B, mixed-cover parameters, growth rates, costs, durations and housing capacity are educational assumptions. Restoration interpolates CN 75 toward 55 over 60 months with a condition multiplier. Since grass has CN 61, early planting can initially increase modeled runoff: an illustrative establishment/disturbance assumption.

The fixed comparison storm is not continuous hydrology. Terrain heights, buildings, bridge, trees and ambient animation are stylized game art, not a surveyed digital twin. No flood depths, drainage routing, sewers, groundwater or actual development feasibility are modeled. Other hack-pack sources are not integrated yet.

## Code

- `src/simulation.ts`: deterministic model and action rules.
- `src/Landscape.tsx`: Phaser isometric terrain, picking, pan/zoom and effects.
- `src/App.tsx`: HUD, bottom controls, selected-plot panel and dialogs.
- `src/styles.css`: responsive game styling.
- `src/simulation.test.ts`: runoff bounds, baseline, project timing, costs, protection, replay and horizon checks.

## Entry flow

`src/EntryFlow.tsx` provides the spinning globe title, geographic chapter pins, hover spotlight and existing chapter previews. Continue zooms toward the selected chapter, then enters its existing PDA/grid screen. Later chapters retain the existing unlock rules. The former flat Natural Earth outlines remain archived in `src/data/world-paths.json`; the active globe uses the bundled Aceternity country polygons described below.

`src/Tutorial.tsx` spotlights the world, infrastructure choices, then the Submit button. The tutorial selects an eligible plot for the player’s first intervention; Submit pays its cost and starts the one-year forecast. The forecast recalculates a fixed 35 mm benchmark storm after quarterly updates; it is not a real weather forecast.

## Painted Ladies street-level level

The main level now opens across Steiner Street facing 710–722 Steiner (the Painted Ladies), with street-level planning and an animated bird's-eye results view. Three.js renders this 3D scene; the original Phaser regional renderer is retained in `src/Landscape.tsx`. The React UI and TF2 overlay typography remain in place.

Data actually integrated:

- **ESA WorldCover 2021 v200:** a new ~10m, 64 × 50 sample covering Alamo Square and nearby blocks. `node scripts/prepare-painted-ladies.mjs` regenerates `src/data/painted-ladies-landcover.json`.
- **OpenStreetMap:** real building footprints, the Alamo Square boundary, street/path centerlines, and available Painted Ladies height, facade-color and roof tags. Attribution: © OpenStreetMap contributors, ODbL 1.0, https://www.openstreetmap.org/copyright. `python3 scripts/prepare-alamo-osm.py` regenerates the local data snapshot.
- **InVEST documentation:** the SCS curve-number event-runoff method, implemented locally in TypeScript. No live InVEST service or other hack-pack datasets are called.

`src/neighborhood.ts` provides coordinates, polygon membership and distance-to-path/road calculations. `src/PaintedLadies.tsx` builds the 3D geometry, handles ground selection and previews, and animates the camera between street and overhead views. Available interventions are park-edge trees, a Steiner curb rain garden, permeable park paths and protection of existing green space. Mapped buildings are excluded from interventions. The legacy internal action key `housing` now denotes permeable paths and adds no housing.

Choosing an action selects eligible ground and displays a translucent visual proposal without spending credits. Submit applies the proposal, raises the camera and advances one year. Completed patches are labeled in the overhead view, with area and modeled runoff differences. A fixed hypothetical 35 mm event provides the before/after comparison; the animation is not continuous stormwater routing.

Cell footprints are approximately 89 m². OSM road/path centerlines are given assumed widths to refine narrow paving missed by the raster. Exact curb/buildability boundaries, ground slopes, window details, tree positions, intervention geometry, costs and planting growth are illustrative. The model does not establish engineering feasibility or forecast actual flooding. New trees interpolate from CN 61 toward 55 over 60 months, with the maintenance condition multiplier; this replaces the earlier CN 75 establishment rule.

## Streamed surroundings

The camera can pan beyond the simulation extent. Left-drag pans, right-drag rotates, wheel/pinch zooms, and the map-pin button returns to the level. Interventions remain limited to the Alamo Square model; exploration does not silently expand the environmental calculation.

`src/WorldStreamer.ts` divides surroundings into 256m chunks and determines requests from the current camera frustum. Terrain is generated once per revealed chunk, using the wider ESA WorldCover sample for coarse colors outside the detailed level. Real OSM road/building detail loads incrementally through `/api/map-chunk`. An underlay fills the horizon while detail loads. The request queue follows the viewport and limits requests to one at a time.

Already built terrain and geometry stay in memory for this scene; stable OSM way IDs prevent duplicate geometry across adjacent chunks. Three.js culls off-screen meshes. Camera movement still requires drawing frames, but revisiting an area does not fetch or regenerate its world geometry.

`src/mapChunks.ts` shares in-flight requests, caches decoded features in memory, and saves data in IndexedDB where available. The Vite development/preview middleware additionally saves raw OSM chunks in ignored `.cache/map/`. Failed requests can be retried. Preview thumbnails do not stream extra chunks.

For local use, `npm run dev` serves both the app and chunk endpoint. A production static host needs an equivalent server endpoint for new, uncached surroundings; `vite preview` includes the provided middleware. OSM is attributed under ODbL, and source data is accessed from the public OpenStreetMap map API.

## TerraForm: first experiment and community challenge

The launch title and in-game branding are now **TerraForm**. After the guided single-intervention experiment, each submitted choice receives an explanation covering modeled environmental consequences, illustrative community opportunities/trade-offs, and scenario costs. Harry’s story then introduces a fresh 50-credit community challenge.

Players queue several distinct patches without spending credits until Submit. Queued interventions are rendered as translucent proposals. Construction can run together or be staggered. Each run records construction, year one and year three; the final report includes one explanation per selection, fictional resident reactions, costs, maintenance reserve and an explicit pleased-score breakdown.

### Scoring and progression

`src/community.ts` owns plan validation, construction schedules, reports and progression rules:

- Environment: up to 40 points (25 for benchmark runoff savings, 15 for planting establishment and protection).
- Community: up to 35 points (Maya’s comfort/route preferences, Luis’s construction-disruption preference, Sam’s vegetation-condition preference).
- Budget: up to 25 points for funding the required future planting reserve.
- Level 1: 50 credits, 35 mm storm, 75-point target, 12-month planting reserve.
- Level 2, **A wetter season**: same neighborhood, 55 credits, 60 mm storm, 80-point target, 18-month planting reserve.
- Passing also requires at least two intervention types and no more than one path patch under construction at a time. A high point total alone cannot bypass those gates.

Several combinations can pass. Failed attempts can start fresh, preserving the streamed map cache. The meter updates after simulation, rather than rewarding button clicks. A completed challenge can be reviewed without changing its final state.

These weights, resident opinions, route-disruption rules, credit prices and work-task opportunities are educational scenario assumptions. They do not predict actual jobs, earnings, public opinion, accessibility compliance, health benefits or temperature reductions. OSM centerlines are not a route-connectivity model. "At most one path patch under construction" is a simplified game constraint, not a verified access guarantee. The rain-garden/path model currently omits their recurring upkeep; the reports disclose this limitation. Actual runoff estimates remain based on the documented curve-number equation.

`src/RunReport.tsx` renders per-selection explanations, checkpoint tables, resident feedback and the pleased meter. `src/community.test.ts` verifies combined-plan costs, staging, multiple passing combinations, maintenance failures, access gates, reports and the second level.

## Global chapters

The atlas now progresses San Francisco → Senegal → Mongolia → Indonesia. Completing the first SF community challenge opens Senegal (the former heavier-rain exercise is retained in the simulation module). Chapter unlocks stay in memory for the current app run only. Later chapters can be previewed while locked, but cannot be launched until their prerequisite is completed.

The later chapters use mapped landscape snapshots near Téssékéré in Senegal, the Khustai approach in Mongolia, and Kereng Bangkirai on the Sebangau edge in Indonesia. Characters, degradation baselines, tree positions, seasonal sequences and effect weights are illustrative. The maps do not establish surveyed restoration plots or a literal moving Sahara boundary. Half-moon earthworks, assisted native regrowth, rotational access, and community fodder/care expose restoration and livelihood trade-offs. Mongolia uses grassland and pastoral choices; Indonesia uses peat rewetting, wetland vegetation, protection, and wet-compatible livelihoods. Eight seasonal timesteps apply 40% of each intervention's index effects, then seasonal stress (0.6× in even steps, 1.3× in odd steps), clamped to 0–100. No claimed physical units or forecasts. Costs reserve four credits for care; targets are displayed before playing. The pleased score weights land 40%, water 30%, livelihoods 30%, requiring at least 48 overall, every need at least 35, and three distinct intervention types. These rules are tested for affordable balanced solutions; they do not estimate income, restored hectares, groundwater, or fire probability.

Official issue context, also linked in each chapter's evidence dialog:
- Senegal / Great Green Wall: https://www.unccd.int/our-work/ggwi/impact
- Mongolia / participatory rangeland management: https://www.undp.org/mongolia/press-releases/mongolia-launches-participatory-digital-rangeland-monitoring-system-unccd-cop17
- Indonesia / peat restoration: https://www.unep.org/en/news-and-stories/story/unep-supports-project-restore-peatlands-indonesia

## SF tile-grid presentation

The active San Francisco view and chapter preview now use `SFGrid.tsx` (Phaser), replacing the Three.js street renderer. It displays the original 64×50 WorldCover/OSM-refined simulation cells as isometric tiles, with symbolic building blocks and trees. Isometric and overhead views share the same cells. Dragging pans; wheel/buttons zoom; selecting an intervention focuses its eligible area. Wider WorldCover context tiles are built on demand from the bundled coarse raster and cached in memory. They are visual context and cannot receive interventions; no new OSM requests are needed by this renderer.

Each action affects its selected simulation cell, never a whole district: street trees on eligible park-edge grass/bare cells (12 credits), rain garden on eligible Steiner curb paving (18), permeable paving on eligible mapped park paths (15), protection on existing park grass/tree cells (6). Green, blue, sand and purple highlights distinguish the four tools. Pending plan previews remain separate from committed state; Submit reserves construction, timestep updates complete it, and the existing runoff/community model evaluates the final cells. The old Three.js renderer is retained as unused source.

### Focused SF mission board

The active mission now uses `sf-level-landcover.json`: a 12×12 crop of the original 64×50 WorldCover grid (source window x=43, y=15). The original raster sample remains unchanged in `painted-ladies-landcover.json`. Each tile retains its original geographic size, and building exclusions/park/path eligibility are recomputed from OSM for the cropped extent. All four interventions and both challenge configurations remain playable. SFGrid renders only these 144 tiles and their landmark symbols; the previous coarse surrounding tile field is no longer shown, to reduce visual clutter.

### Persistent, map-first placements

SF and the global chapters now use tile → option → next tile interaction. Clicking a map tile only selects it. Clicking an action adds or replaces the placement on that tile; previously placed tiles remain visible. SF's plan is now authoritative in both the first experiment and the community challenge, and Submit runs that complete plan even when no tile is selected. Placements reserve credits until submission. Explicit removal controls replace click-to-toggle deletion. `placeInPlan` validates replacement, eligibility and aggregate budgets without mutating the committed state; regression tests cover persistence, duplicate clicks, replacements and rejected placements. The first-mission tutorial guides tile selection before showing the action choices.

### Stable, single-tile visuals

SF no longer recolours eligible terrain when the active tool changes. Hover and selection only add an outline; selecting a different tile no longer pans the camera. Only actual planned or committed placements paint their own tile. `sfChoices.ts` shares the stable palette with the legend: tree symbol on the original ground, rain garden green `#4f9465`, permeable paving grey `#aeb4b8`, protected park light blue `#9ed8e8`. Queued and completed placements use the same opaque tile colours, so selection changes do not change their appearance.

## Mapbox real-landscape prototype

San Francisco now offers **Real landscape** and **Illustrated grid** renderers with shared tile IDs, selection, queued interventions and simulation state. Real landscape uses Mapbox Standard surroundings, optional Mapbox satellite imagery and Terrain-DEM at 1× elevation. The 12 × 12 scenario grid is drawn from its geographic bounding box and draped on terrain; selecting a tile inspects its loaded terrain elevation in meters. Angled/top-down views, zoom, recenter, intervention overlays, piece highlighting and modeled runoff coloring are supported. Mapbox attribution remains visible.

To enable live maps, create `.env.local` with `VITE_MAPBOX_ACCESS_TOKEN=pk.your_public_token`, then restart Vite. Use a public browser token from your account, with appropriate allowed URL restrictions. Alternatively enter a public token in the in-app setup card; it is kept in React memory for the current session only. Do not enter a secret `sk.` token. Mapbox account billing and usage limits apply. `.env.local` is ignored. Without a token the setup card appears above the illustrated grid; the illustrated renderer remains available.

Mapbox imagery and terrain provide visual context and inspectable elevation, **not new simulation land-use classes**. Existing ESA WorldCover + OSM classifications, building exclusions and assumed path widths remain authoritative for the game. Elevation is not yet used in runoff calculations: the model still has no routed drainage or flood-depth simulation. Terrain resolution and source dates do not establish surveyed curbs, exact parcels or construction feasibility. Interventions are currently colored geographic overlays with labels, not replacement 3D assets; real base-map vegetation/buildings are not removed. The global chapters retain their existing illustrative views.

`src/mapGrid.test.ts` checks all cell-center coordinate round trips, grid bounds, shared boundaries and rejection of out-of-area clicks. Live map appearance, terrain availability and token-restricted requests require a configured Mapbox account to verify.

Live verification confirmed the 3D basemap, geographic tile selection, a queued protection overlay, top-down/angled view switching, and a selected-tile terrain elevation readout. Satellite tile requests returned HTTP 429 during this check; the renderer now falls back to the Standard 3D map with an explicit status message. It does not bypass provider limits. Standard Satellite is used when imagery is available so opaque basemap land-cover layers do not hide the imagery.

## Illustrated Alamo Square diorama (current default)

**Park view** now opens a self-contained Three.js scene of the east Alamo Square lawn facing the Painted Ladies. The art direction uses warm afternoon light, pastel Victorian façades, cream trim, rounded foliage, soft shadows, picnic details and a stylized skyline. These architectural details, tree positions, people, ground heights and skyline are illustrations, not surveyed features. The earlier photographic-splat and Mapbox prototypes remain in source but are no longer offered in the main renderer switch or fetched by this view.

`src/alamoLayout.ts` provides geographic cell bounds, coordinate picking, mapped surface classification and intervention clipping. The diorama samples OSM park/building polygons and paths plus Steiner Street, using the same assumed 3m path / 8m road half-widths as the simulation. A single smooth terrain-height function is shared by scenery, grid outlines, hit-testing and placed objects. The visible planning grid spans the exact scenario bounding box. Ground clicks resolve to stable simulation IDs; rendered house bodies/roofs block clicks through them. The **Grid view** retains the original renderer and the same queue and selection.

Interventions are subdivided into small surface samples inside their geographic cell. Paths receive paving, lawn receives trees/protection, and street/pavement receives gardens; buildings are excluded. Clipping is an approximately 1m sampling mask, not exact cadastral or engineering geometry. The underlying hydrology still computes the scenario's whole-cell curve number: clipped visual area is not a new hydrologic-area model. Modeled runoff coloring is a game overlay, not a flood map. Park/tree/people embellishments are decorative and do not establish real access, canopy or public opinion.

The scene includes planning-grid visibility, hover/selection outlines, queued/completed changes, piece highlighting, drag pan, right-drag orbit, zoom, recenter, rain animation and overhead/angled views. No API token or map service is needed for this local illustrated view. `src/alamoLayout.test.ts` verifies all cell-center mappings, intervention sample/cell containment and surface constraints.

Mapped park lawn also refines coarse built-up ESA pixels in the initial simulation state: inside the OSM park, non-building built-up samples become lawn unless the mapped path/street override applies. This aligns planting availability with the illustrated ground while keeping source resolution and assumed widths explicit.

The illustrated Alamo palette applies only to the rendered game world. The surrounding application, action tray, header, HUD and map controls retain the original teal interface.

### Current-run progress

Returning to the world map or title preserves each level’s placed choices, selection, budget, results, tutorial stage and unlocks. In-progress simulations pause while away and resume at the next timestep when the level is reopened. Started levels show Continue in the preview. Progress lives in the mounted React app; a full reload, new tab or fresh app launch starts a new run. Legacy local-storage saves are no longer read or written. Explicit Reset scenario / Fresh attempt controls still reset the selected scenario. Map asset caches are independent of gameplay progress.

## Current default: Alamo Square inside the original grid

The original Phaser isometric grid is the sole main SF renderer again; the app UI is unchanged. `src/gridLandscape.ts` projects the mapped park boundary, buffered path/street centerlines, and building footprints into continuous grid coordinates. Lawn, curved paths and Steiner Street cross tile boundaries rather than becoming independent single-color squares. The seven Painted Ladies are extruded from their distinct geographic footprints instead of snapping building symbols to tile centers. Roof/window details and rounded tree canopies remain stylized.

Ground hit-testing retains the original tile IDs, pan/zoom and overhead/isometric modes. Elevated building faces block ground selection through them; clicking a tree selects its own tile. Intervention geometry is intersected with both its selected tile and the mapped lawn, path or paved surface. The tile finder omits choices with no matching mapped surface, and the placement handler rejects those cases. Tiny interior object anchors never fall back to boundary vertices in a neighboring cell. Grid lines and hover/selection outlines remain part of the original environment. Paths use the existing assumed 3m half-width and Steiner uses the existing 8m half-width, not surveyed construction edges. Hydrology still uses whole-cell assumptions.

`src/gridLandscape.test.ts` checks coordinate round trips, all seven distinct landmark footprints, extent clipping, and intervention/anchor containment. Earlier Three.js, Mapbox and splat experiments remain in source for reference but are not loaded by the main game.

The right-side map controls now include **Rotate map left** and **Rotate map right** (90° per click). Rotation affects only projection; mapped geometry, selected tile IDs, queued plans, and simulation state remain in their original geographic frame. Object depth ordering and elevated-object hit regions are rebuilt for each view. Rotation also works in the overhead view. `src/gridRotation.test.ts` round-trips every cell through each quarter-turn projection and inverse.

Tutorial step 2 now always spotlights the four intervention choices and positions its card outside their bounds. Selecting a tutorial choice advances to a separate map-selection step. The card stays in the upper half while the grid is highlighted; selecting a valid square creates the preview and advances to the Submit spotlight (step 4 of 4). Normal play keeps manual tile selection. Tutorial targets leave scroll margin for the spotlight border.


## Mapped grids for Senegal, Mongolia and Indonesia

`src/data/global-landscapes.json` stores real ESA WorldCover 2021 v200 samples and OpenStreetMap way snapshots for three small, named geographic extents. Each is a 12 × 12 scenario grid. `npm run data:global` regenerates the snapshots from public COG tiles and the OSM map API; it requires Node dependencies and Python 3 for XML parsing. Snapshot footprint dimensions are around 1–2 km, so cells are representative coarse samples rather than individual parcels.

- Senegal: Téssékéré Ouolof, Ferlo (15.8574673, −15.0596902).
- Mongolia: Khustai park approach, Töv (47.76371, 105.8779546).
- Indonesia: Kereng Bangkirai / Sebangau edge, Central Kalimantan (−2.301, 113.906).

`src/globalLandscape.ts` converts geographic features to continuous grid coordinates, clips mapped area features to the board, and supplies stable geographic patch centers. `src/GlobalMappedGrid.tsx` is shared by chapter gameplay and atlas previews. The original teal UI, chapter progression, budgets and seasonal index model remain. Each board supports pan, zoom, quarter-turn rotation and overhead/isometric views; placements and selection IDs stay geographically fixed. Native class colors and mapped roads, water and building footprints replace the previous random tile pattern. Trees/acacias, grass tufts, gers, care huts and intervention symbols are stylized illustrations. Road/waterway stroke widths and building heights are exaggerated for legibility.

Mapped open-water samples and centers inside OSM water/building polygons reject terrestrial interventions. Placement overlays are cut around mapped water and buildings. This does not establish ecological suitability: WorldCover is not a peat, soil, land degradation or restoration feasibility survey. The model still adds scenario-defined index effects by intervention type, not location-specific hydrology or measured restoration yield. Project symbols mark game interventions, not existing projects or real structures. Geography stays fixed while simulated outcomes appear as separate overlays.

Attribution: © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021), CC BY 4.0. © OpenStreetMap contributors, ODbL 1.0. The chapter evidence dialog exposes the snapshot method, named site, attribution and limitations. `src/globalLandscape.test.ts` covers all 432 patch coordinate round trips, clipped extents, rotation/inverse projection, open-water rejection and unchanged source baselines. Local browser QA used ignored fixtures under `.cache/` to inspect all chapters without changing progression in the main app.

### Post-experiment discovery

The SF practice run now finishes before introducing Environment info. Harry’s spotlight prompt points to the Environment info button in the PDA controls with a brief flash (reduced-motion preferences disable the animation). Opening it shows the fixed-storm before/after runoff, surface and protection counts, credits, project status, tree condition, future care needs, and per-tile completion/age status from the simulated state. Planning considerations and model limits live in the same scrollable panel. Continue Harry’s story opens the community-challenge introduction; the old automatic action-description carousel is skipped for practice. The info button remains available in that app run, including after navigation and in the community challenge.

### Construction PDA

All four levels dock their actions in a compact, centered construction PDA below the map. The reusable `ConstructionPDA` shell provides a CSS mechanical rolling SOCIAL HACK display, metal casing, illuminated 2×2 choice keys, and a side control column. Symbols are level-specific through `PDASymbol`; the existing callbacks, disabled states, budgets, and tutorial target refs are retained. SF provides storm-test and Submit keys; global chapters provide Field guide and Submit. Global mission details remain available in a collapsed readout below the device. Reduced-motion preferences stop the display rotation.

The PDA's Engineer-style pass uses a narrower calculator silhouette, sloped cream hood, charcoal chassis, cream mechanical keys, numbered tool slots, heavy TF2 Build captions, an amber submit key, and a decorative red rocker. All visuals remain HTML/CSS/SVG; the TF2 reference image is not bundled into the game.

The SF pieces control now combines highlighting and plan controls. Hover or keyboard focus expands the plan; moving into its contents keeps it open, and clicking the trigger pins/unpins it. Escape closes it. The separate Your plan row is removed. Tutorial, help and story text is shortened and dialogs use smaller widths.

The PDA display now mirrors the queued plan: six initial slots fill left-to-right with level-specific action icons, followed by the total installation cost. Additional placements add rows rather than hiding choices. Replacing or removing a planned piece updates the display from the authoritative plan. The keybed is a separately padded dark panel so buttons remain centered. A measured SVG projection beam connects the top-center emitter to the grid; a subtle scan overlay gives the map a holographic appearance. Decorative device labels and the rotating text display were removed at the user's request. Keep subsequent UI changes scoped to requested structure; do not add decorative microcopy.

Camera changes now swing over 850 ms between isometric and direct overhead views. The ground projection rotates and lifts continuously; building height and vegetation visuals flatten along the same progress. Forward/inverse projection tests cover intermediate angles and all quarter-turn rotations. Reduced-motion preferences use the final view immediately.

All levels now start with 100 build credits. Submit preserves the player's current camera view; the overhead toggle remains manual. Environment info includes linked before/after overhead maps based on the actual run snapshots, land-cover and fixed-storm runoff layers, changed-tile outlines, per-tile inspection, and paired runoff/vegetation/protection/budget bars. The starting land classification comes from WorldCover refined with OSM; the after panel is explicitly simulated. Detailed metrics, care and limitations remain in expandable sections.

## Globe navigation

The entry screen uses Aceternity UI’s `globe-demo` registry, adapted for Vite/React 19 in `src/components/ui/globe.tsx` and `src/components/globe-demo.tsx`. Source: https://ui.aceternity.com/registry/globe-demo.json and https://ui.aceternity.com/registry/globe.json. Country polygons are bundled locally from https://assets.aceternity.com/globe.json; no remote asset fetch is needed during play. The globe uses ThreeGlobe, React Three Fiber 9 and Drei 10, with TerraForm’s teal/green palette. Existing HTML flag/lock chapter pins are positioned at mapped level centers (`src/globeLocations.ts`) and hidden behind the sphere. Drag to rotate (or focus the globe and use left/right arrows); hover/click uses the existing chapter previews and unlock rules. Continue flies toward that chapter before entering its existing PDA/grid screen. Runtime progress still stays in App, not in the globe.

TypeScript was already enabled. Tailwind CSS v4 is configured through its Vite plugin and `src/tailwind.css`, without Preflight so legacy game styling stays intact. The shadcn/ui configuration is `components.json`, with `@/` aliases and its Radix/CVA Button in `src/components/ui/button.tsx`; the title start control uses its unstyled variant. Aceternity’s Next.js dynamic import is replaced with React lazy/Suspense. No example headings, random flight arcs, or demo point styles are carried into the game.

Tutorial spotlights and the results-discovery prompt use body portals and the shared `useSpotlightTarget` hook. Their SVG masks stay viewport-sized while target rectangles follow scrolling, resize and animated layout. Globe/level transitions in `src/levelTransition.ts` blend a temporary still of the outgoing scene with the arriving screen; world and PDA animate separately. Exit reverses that motion and pulls back from the departing chapter's coordinates. Temporary overlays are inert and removed after the animation; only the destination scene keeps a live WebGL renderer. Reduced-motion preferences skip the blend.
