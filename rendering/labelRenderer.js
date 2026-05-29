import * as THREE from "three";
import { scene, camera, globeRadius, chartGroup } from "../core/sceneSetup.js";
import { state } from "../appContext.js";
import { formatNumber, getMetricLabel } from "../appUtils.js";

// ─── Shared canvas utility ────────────────────────────────────────────────────

/**
 * Draw a rounded rectangle path on a 2D canvas context.
 */
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ─── Sprite label state ───────────────────────────────────────────────────────

let currentLabelSprite     = null;
let currentTimeLabelSprite = null;

// ─── Time label (globe top) ───────────────────────────────────────────────────

/**
 * Update or clear the floating time label above the globe.
 * @param {string|null} text
 */
export function updateGlobalTimeLabel(text) {
  if (currentTimeLabelSprite) {
    scene.remove(currentTimeLabelSprite);
    currentTimeLabelSprite.material.map?.dispose();
    currentTimeLabelSprite.material.dispose();
    currentTimeLabelSprite = null;
  }
  if (!text) return;

  const canvas = document.createElement("canvas");
  canvas.width  = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(3,7,18,0.5)";
  roundRect(ctx, 8, 8, canvas.width - 16, canvas.height - 16, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const tex    = new THREE.CanvasTexture(canvas);
  const mat    = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(60, 18, 1);
  sprite.position.set(0, globeRadius + 40, 0);
  sprite.lookAt(camera.position);
  scene.add(sprite);
  currentTimeLabelSprite = sprite;
}

// ─── 3D country label ─────────────────────────────────────────────────────────

function create3DLabel(textLines) {
  const canvas = document.createElement("canvas");
  canvas.width  = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth   = 4;
  ctx.stroke();
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";

  textLines.forEach((line, i) => {
    ctx.font      = i === 0 ? "bold 44px sans-serif" : "32px sans-serif";
    ctx.fillStyle = i === 0 ? "#fbbf24" : "#e2e8f0";
    ctx.fillText(line, canvas.width / 2, 60 + i * 55);
  });

  const texture  = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite   = new THREE.Sprite(material);
  sprite.scale.set(40, 20, 1);
  return sprite;
}

/**
 * Update or clear the small floating label that identifies a hovered/selected bar.
 * @param {object|null} userData  — bar mesh userData, or null to remove
 */
export function update3DLabel(userData) {
  if (currentLabelSprite) {
    scene.remove(currentLabelSprite);
    currentLabelSprite.material.map?.dispose();
    currentLabelSprite.material.dispose();
    currentLabelSprite = null;
  }
  if (!userData) return;

  const metricValue = state.metric === "fatalities" ? userData.fatalitiesTotal : userData.eventsTotal;
  const periodLabel = userData.periodLabel ?? userData.year;
  const periodName  = userData.periodType === "range" ? "Zeitraum" : "Jahr";
  const lines = [
    userData.country,
    `${userData.region} | ${periodName} ${periodLabel}`,
    `${getMetricLabel()}: ${formatNumber(metricValue)}`,
  ];

  currentLabelSprite = create3DLabel(lines);
  const mesh       = state.barMeshes.find((m) => m.userData?.country === userData.country);
  const worldAnchor = mesh
    ? mesh.getWorldPosition(new THREE.Vector3())
    : chartGroup.localToWorld(userData.pos?.clone() ?? new THREE.Vector3(0, 0, globeRadius));
  const normal = state.mode === "3d" ? worldAnchor.clone().normalize() : new THREE.Vector3(0, 0, 1);
  const offset = Math.max(8, Math.min(userData.height * 0.6 + 8, globeRadius * 0.4));
  currentLabelSprite.position.copy(worldAnchor.clone().add(normal.multiplyScalar(offset)));
  scene.add(currentLabelSprite);
}
