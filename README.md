# KonfliktdatenVisualisierung

Eine interaktive WebXR-Anwendung zur Visualisierung globaler Konfliktdaten.

Es bietet eine 3D-Globus-Ansicht und eine 2D-Partikelschwarm-Karte zur Analyse von Konfliktereignissen und Opferzahlen. Die WebXR-Integration ermöglicht AR/VR-Interaktionen.

## Live-Version
[https://k0pfnicker.github.io/KonfliktdatenVisualisierung/](https://k0pfnicker.github.io/KonfliktdatenVisualisierung/)

## Dokumentation
### Verwendete Daten und Datenquelle (Data Attribution)
Visualisiert werden globale Konfliktdaten aus dem **Armed Conflict Location & Event Data Project (ACLED)**. Der Datensatz umfasst detaillierte Informationen über politische Gewalt, Demonstrationen und deren Auswirkungen (z. B. Opferzahlen). 

Um eine flüssige Darstellung in der WebXR-Umgebung zu gewährleisten, wurden die bereitgestellten Rohdaten im Vorfeld aggregiert und in der Auflösung angepasst (Downsampling).

> **Quellenangabe / Citation:**
> Armed Conflict Location & Event Data Project (ACLED); www.acleddata.com. 
> *Detaillierte Informationen zur Datennutzung finden sich in den [ACLED Terms of Use](https://acleddata.com/terms-of-use/).*

### Zielsetzung und Motivation
Das primäre Ziel dieser Visualisierung ist es, die räumliche und zeitliche Dynamik globaler Konfliktherde greifbar und verständlich zu machen. Durch die Projektion komplexer Datensätze auf ein dreidimensionales Globus-Modell können Betrachter intuitiv globale Muster, Eskalationsphasen und geopolitische Schwerpunkte (Hotspots) identifizieren.

### Datenmapping und visuelle Kodierung
Die geografische Verteilung der Konflikte wird präzise auf die Oberfläche eines 3D-Globus projiziert. Jeder Konfliktherd wird durch dreidimensionale Balken (**Spikes**) repräsentiert:
- **Höhe der Spikes:** Kodiert die quantitative Intensität (z. B. die absolute Anzahl der Ereignisse oder der Opferzahlen).
- **Farbgebung:** Dient als Hitze-Indikator, wobei Rot besonders kritische Werte und hohe Opferzahlen markiert.

### Interaktionskonzept, Filterung und XR-Integration
Die Anwendung unterstützt explorative Datenanalyse sowohl am klassischen Bildschirm als auch immersiv in Augmented Reality (AR):
- **Filterung & Metriken:** Konflikte lassen sich über einen **Zeit-Slider** chronologisch filtern, nach **Regionen** eingrenzen und zwischen "Ereignissen" und "Opferzahlen" umschalten.
- **Tooltips & Legende:** Klicks (bzw. XR-Raycasts) auf Spikes zeigen exakte Zahlenwerte zum jeweiligen Land an. Eine Legende dient als visuelle Referenz.
- **XR-Modus:** Der Globus lässt sich im physischen Raum platzieren, intuitiv per Geste **rotieren**, durch Pinch-to-Zoom **skalieren** und per Button jederzeit neu zentrieren.

### EEG Test Session Interpretation
Die beiliegende EEG-Auswertung dokumentiert die Gehirnaktivitätsmuster (Alpha- und Beta-Wellen) während der Interaktion mit der AR- und Web-Anwendung. 
- **AR-Interaktion:** Während aktiver AR-Aufgaben (z. B. Platzierung des Globus, Justierung und Skalierung) waren vermehrt **Beta-Wellen** (rot) messbar. Dieser erhöhte kognitive Fokus bzw. Stresspegel lässt sich maßgeblich darauf zurückführen, dass die Gyrosteuerung am Testgerät Probleme verursachte und die Bedienung dadurch erschwert wurde.
- **Explorative Phase:** Beim freien Betrachten und Filtern der Daten auf dem klassischen Bildschirm dominierten jedoch **Alpha-Wellen** (blau). Dies spricht für eine hohe Entspannung und bestätigt die intuitive, stressfreie Bedienbarkeit der Nutzeroberfläche. 

Die vollständige PDF-Auswertung (`EEG_Output.pdf`) liegt diesem Repository bei und dokumentiert die zeitlichen Verläufe detailliert. Für Präsentationszwecke steht ein synchronisiertes Test-Video mit eingeblendetem EEG-Streifen separat zur Verfügung.

## Quellenangaben für Assets
* **3D-Globus-Modell (`earth3D_1.glb`)**: [Earth](https://sketchfab.com/3d-models/earth-a43fbb15921649d49f6e093c2662bfbc) via Sketchfab. Lizenz: CC Attribution.
* **2D-Erdkarte (`earth2D_2.jpg`)**: [Whole world - land and oceans](https://commons.wikimedia.org/wiki/File:Whole_world_-_land_and_oceans.jpg) via Wikimedia Commons. Lizenz: Public Domain (PD-USGov-NASA).

## Installation und lokales Ausführen
1. Das Repository klonen.
2. Einen lokalen Webserver starten (z. B. mit `python -m http.server 8081`).
3. `http://localhost:8081` im Browser öffnen.
