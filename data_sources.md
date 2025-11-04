# DATA_SOURCES.md

This document lists the **data sources** and **web services** used by the project.  
The app **does not bundle** large datasets; data are **fetched on demand** via APIs.  
Providing the source and **how to re-query** is enough to reproduce results.

---

## 1) NASA POWER – Daily Point API (weather & soil moisture)
- **Homepage/Docs:** https://power.larc.nasa.gov/
- **Endpoint:** `/api/temporal/daily/point`
- **Community:** `AG` (Agriculture)
- **Format:** `JSON`
- **Parameters used:**
  - `T2M_MIN` – Daily minimum air temperature (°C)
  - `T2M_MAX` – Daily maximum air temperature (°C)
  - `PRECTOTCORR` – Precipitation (mm/day, bias‑corrected)
  - `ALLSKY_SFC_SW_DWN` – Shortwave downwelling radiation (MJ/m²/day)
  - `RH2M` – Relative humidity at 2 m (%)
  - `GWETTOP` – Surface soil wetness (0–1)
  - `GWETROOT` – Root‑zone soil wetness (0–1)

- **Example query** (replace `LAT`, `LON`, `YYYYMMDD` as needed):
  ```text
  https://power.larc.nasa.gov/api/temporal/daily/point
    ?latitude=LAT
    &longitude=LON
    &start=YYYYMMDD
    &end=YYYYMMDD
    &parameters=T2M_MIN,T2M_MAX,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETTOP,GWETROOT
    &community=AG
    &format=JSON
  ```

- **Attribution / citation (suggested):**  
  “NASA POWER Project (POWER Data Access Viewer / API), NASA Langley Research Center (LaRC). Accessed on <yyyy‑mm‑dd>.”  
  (Please check the POWER website for their latest official citation text.)

- **Notes:** Some values can be returned as `fillValue`; the app treats them as `null` for charts and GDD calculations.

---

## 2) Basemap tiles (Leaflet)
The app uses Leaflet with multiple basemap providers (fallback enabled):

- **OpenStreetMap Standard**  
  URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`  
  Attribution: “© OpenStreetMap contributors”

- **OpenStreetMap HOT**  
  URL: `https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png`  
  Attribution: “© OpenStreetMap contributors, tiles style by Humanitarian OpenStreetMap Team (HOT)”

- **CartoDB Dark Matter**  
  URL: `https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png`  
  Attribution: “© OpenStreetMap contributors, © CARTO”

> Some browsers/extensions block tiles when loading via `file:///`. Run the app on `http://localhost` to ensure tiles load.

---

## 3) Third‑party libraries (not “data” but should be credited)
- **Leaflet** — JavaScript map library (CDN). https://leafletjs.com/  
- **Chart.js** — Charting library (CDN). https://www.chartjs.org/

---

## 4) GDD & growth stages (computed in‑app)
The app computes **GDD** from `T2M_MIN/T2M_MAX` and infers **phenology stages** (VE → V → R1 → R5 → R8) using crop‑specific GDD thresholds.  
These are **derived calculations**, not downloaded datasets.

---

## 5) Provenance Log (optional, to record real runs)
For reproducibility, you can append a short log for each run:
- **Access time:** 2025‑10‑05T20:15:00+07:00
- **Location:** 21.028, 105.854 (Hanoi, VN)
- **Date window:** 2025‑06‑01 → 2025‑08‑31
- **Crop:** Soybean (base 10 °C)
- **Exact API URL:** *(paste the full URL used)*
- **App version/commit:** v14.0 (hash: …)

---

## 6) Why we do **not** bundle large datasets
- Weather/soil data vary **by space and time**, becoming large and hard to keep in sync.
- NASA POWER supports **on‑demand** queries (lat/lon, start/end), so bundling is unnecessary.
- Documenting **sources and queries** is sufficient for others to **reproduce** results.
