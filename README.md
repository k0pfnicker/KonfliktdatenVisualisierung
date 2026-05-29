# KonfliktdatenVisualisierung

Eine interaktive WebXR-Anwendung zur Visualisierung globaler Konfliktdaten.

Es bietet eine 3D-Globus-Ansicht und eine 2D-Partikelschwarm-Karte zur Analyse von Konfliktereignissen und Opferzahlen. Die WebXR-Integration ermöglicht AR/VR-Interaktionen.

## Data Attribution & Source

This project utilizes data from the Armed Conflict Location & Event Data Project (ACLED). 
Please refer to [ACLED's Terms of Use](https://acleddata.com/terms-of-use/) for full details on data usage.

**Citation:**
> Armed Conflict Location & Event Data Project (ACLED); www.acleddata.com.

The data provided in this repository has been heavily aggregated and downsampled from the original raw ACLED datasets specifically for the purpose of performance within this WebXR visualization.

## Asset Attributions

* **3D Earth Model (`earth3D_1.glb`)**: [Earth](https://sketchfab.com/3d-models/earth-a43fbb15921649d49f6e093c2662bfbc) via Sketchfab. License: CC Attribution.
* **2D Earth Map (`earth2D_2.jpg`)**: [Whole world - land and oceans](https://commons.wikimedia.org/wiki/File:Whole_world_-_land_and_oceans.jpg) via Wikimedia Commons. License: Public Domain (PD-USGov-NASA).

## Setup
1. Clone the repository
2. Run a local web server (e.g., `python -m http.server 8081`)
3. Open `http://localhost:8081` in your browser.
