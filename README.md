# POWERAGRISIM — NASA POWER–based Crop Stage & Irrigation Sandbox

> A lightweight, client‑side web app for exploring crop phenology (GDD stages), weather/soil moisture, and simple irrigation recommendations — designed for the NASA Space Apps Challenge.

## ✨ What can it do?
- **Add a point** anywhere on the map (or use presets), choose **Soybean** or **Wheat**, set date range & sowing day.
- Fetches **daily NASA POWER** data (T2M_MIN, T2M_MAX, PRECTOTCORR, ALLSKY_SFC_SW_DWN, RH2M, GWETTOP, GWETROOT).
- Calculates **GDD** from the sowing date to determine **growth stages** (VE → V → R1 → R5 → R8).
- Shows two charts: **Temperature vs. Rain (incl. irrigation)** and **RH/GWETTOP/GWETROOT** (%).
- **Navigate** by stage or by day; the map marker & popup update accordingly.
- A small **“Tree life”** gamification and **day-by‑day irrigation choice** (Water / Not Water) for quick what‑if testing.
- **Export CSV** for the selected point with all variables, GDD, stage, and irrigation.

## 🧱 Tech stack
- **Leaflet** for the map (CDN), **Chart.js** for charts (CDN).
- Pure **HTML/CSS/JS**, no backend. Works offline *after* the first fetch (except API calls).

## 🗂 Project structure
```
/index.html        # Layout, sidebar (forms & controls), charts area, map container, module loading order
/css/style.css     # 2‑column layout (left sidebar+charts, sticky map right), dark theme
/js/crops.js       # NASA POWER fetch + cleaning, crop config, GDD & stage timeline helpers
/js/map.js         # Leaflet map init, base layers, fit map height to CSV button
/js/charts.js      # Chart.js setup + updateChartsToIndex(s, i)
/js/ui.js          # Add/Delete point, selectors, labels, CSV export, cursor navigation
/js/life.js        # Irrigation recommendation + “Tree life” logic & buttons wiring
/js/main.js        # App bootstrapping and event wiring
```

## ▶️ Running locally
Because browsers restrict file:// access, serve the folder via a local web server:

**Python 3 (recommended)**
```bash
cd <project-folder>
python -m http.server 8000
```
Then open: `http://localhost:8000/index.html`

> Tip: If tiles don’t show in Brave/Adblock browsers, disable shields/adblock for `localhost`.

## 🚜 Using the app (quick tour)
1. **Pick dates** (start/end) and **sowing date** (GDD starts here).
2. **Choose crop** (Soybean/Wheat) and give a **Point name**.
3. Click the **map** to fill **Latitude/Longitude** or click **Use sample coordinates**.
4. Hit **➕ Add Plant**. The app fetches NASA POWER daily data for your window and builds the time series.
5. Use **Point management** to jump to or delete a point.
6. Use **Jump along stage/day** controls to move the timeline. The **marker icon & popup** change with the stage; the **charts** update to the current day.
7. In **Today’s recommendation**, review the **ON/OFF** irrigation suggestion and choose **💧 Watering today** or **🚫 No watering** (for scenario testing). The **Tree life** bar updates accordingly.
8. Click **Download CSV file** to export the full series for the selected point.

## 🌱 Phenology & GDD
- **Soybean** (base 10 °C) stages at ~VE=100, V=450, R1=650, R5=900, R8=1200 cumulative GDD.
- **Wheat**   (base 0 °C)  stages at ~VE=120, V=500, R1=800, R5=1200, R8=1600 cumulative GDD.

The app computes daily GDD from the sowing date using Tmax/Tmin and accumulates to find the current stage and a forecast to the next stage threshold.

## 💧 Simple irrigation recommendation & “Tree life”
- The **recommendation** (`Water` / `Not Water`) is derived from a normalized mix of **temperature**, **root‑zone moisture** (GWETROOT), and **rain**, with a light **hysteresis** band.
- You can **accept or reject** the recommendation each day:
  - If you **Water**, “Tree life” increases a bit.
  - If you **don’t**, it decreases a bit.
- This is a **toy** mechanism for learning & scenario exploration — not agronomic advice.

> Note: A separate prototype (`na_map_power_stage_day_irrigation_v12_split_50_fallback.html`) includes **auto‑scan & batch irrigation** tools and adjustable thresholds for “days needing irrigation”. You can open it via the same local server to experiment.

## 📄 CSV export (columns)
`date, Tmax_C, Tmin_C, RH2M_percent, GWETTOP_frac, GWETROOT_frac, ALLSKY_MJ_m2_day, RAIN_plus_IRR_mm_day, GDD_base, CumGDD, Stage, Irrigation_mm`

- `GWETTOP_frac`/`GWETROOT_frac` are **fractions** (0–1). Charts show them as **%**.
- `RAIN_plus_IRR_mm_day` = `PRECTOTCORR + irrigation_mm` for that day.

## 🔌 Data source
- **NASA POWER** Daily Point API — community=AG, parameters: `T2M_MIN,T2M_MAX,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETTOP,GWETROOT`.
- Values marked as API **fillValue** or invalid are converted to **null** and ignored in charts.

## 🧩 Architecture notes
- **Modules** are loaded in this order: `crops.js → map.js → charts.js → ui.js → life.js → main.js`.
- `ui.js` builds the **site object**: `{ id, name, crop, lat, lon, dates, series, gdd, cumGDD, stageTL, stageCursor, dayCursor, irr_mm[] }`.
- `updateChartsToIndex(s, i)` refreshes both charts up to day *i*, combining **rain + irrigation** for the precip series.
- The map marker uses a small **emoji status** based on stage and simple **stress flags**.
- The **life** module keeps per‑site maps for actions & life and wires the **Water/No‑water** buttons.

## 🧪 How to verify quickly
- Add a preset point (e.g., **US Midwest (Kansas)**), pick a short recent window (e.g., 60–90 days), and **Add Plant**.
- Click **Next day**; confirm charts & marker update; check **Today’s recommendation** changes with the weather & soil moisture.
- Export CSV and open it to confirm columns & values.

## 🚧 Limitations
- POWER variables are **gridded reanalysis** — local farm conditions can differ.
- The irrigation model is intentionally **simple** (education only).
- Browser **CORS/adblock** may block API or tiles when loaded from `file://` — use the local server.

## 🙌 Credits
- **NASA POWER** team for open data and docs.
- **Leaflet** & **Chart.js** authors.
- Built for **NASA Space Apps Challenge**.

## 📜 License
Add your preferred license (MIT/Apache‑2.0) here.

---

## 📘 Algorithm model (overview)
*(Optional module used by the “Today’s recommendation” panel — you can ignore it if not needed.)*

- **Inputs per day:** air temperature **T** (≈ (Tmax+Tmin)/2), root‑zone moisture **S** (from `GWETROOT`), and **rain** **R** (from `PRECTOTCORR`).  
- **Normalize** T, S, R to `[0,1]` with robust percentiles.  
- Build a simple **water availability index** `W` from moisture, rain benefit, and evaporative demand (weights sum to 1).  
- **Hysteresis decision:**  
  - If **R** is large (rainy day) → **Not Water**.  
  - Else if **W** is **low** → **Water**; if **W** is **high** → **Not Water**; otherwise keep the **previous** state to avoid flip‑flop.
- **Where to tweak:** parameters live in `life.js`. The note `Math.pdf` briefly documents the idea. This is for **learning/demo**, not agronomic advice.

---

## 🔗 Data sources (summary)
- **NASA POWER – Daily Point API** (`community=AG`): `T2M_MIN`, `T2M_MAX`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`, `RH2M`, `GWETTOP`, `GWETROOT`.  
  See **data_sources.md** for details and an example query.
- **Basemap tiles (Leaflet):** OpenStreetMap Standard / OSM HOT / CartoDB Dark (fallback enabled).  
- **Third‑party libraries:** Leaflet (map), Chart.js (charts) — via CDN.
