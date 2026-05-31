import * as THREE from "three";
import { scene, camera, renderer, chartGroup, worldRoot } from "./sceneSetup.js";
import {
  applyIdleEarthRotation,
  isIdleActive,
  isRestoring,
  getLastUserInteractionAtMs,
  idleStartedAtMs,
  startRestoreRotation,
} from "./idleRotation.js";

// ─── Ripples ──────────────────────────────────────────────────────────────────
const ripples = [];

function spawnRipple(pos, colorHex, lookAtTarget, ratio) {
  const geo = new THREE.RingGeometry(0.1, 1.2, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.lookAt(lookAtTarget);
  chartGroup.add(mesh);
  ripples.push({ mesh, age: 0, maxAge: 2.0, ratio: Math.min(0.55, Math.max(0.08, ratio)) });
}

function updateRipples(dt) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.age += dt;
    if (r.age >= r.maxAge) {
      chartGroup.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.mesh.material.dispose();
      ripples.splice(i, 1);
    } else {
      const progress = r.age / r.maxAge;
      const maxScale = 1.0 + 5.0 * r.ratio;
      const scale = 1.0 + progress * (maxScale - 1.0);
      r.mesh.scale.set(scale, scale, scale);
      r.mesh.material.opacity = (1.0 - progress) * Math.max(0.08, r.ratio);
    }
  }
}

// ─── Number popups ────────────────────────────────────────────────────────────
function spawnNumberPopup(appState, pos, text, colorHex) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.font = "bold 38px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
  ctx.lineWidth = 6;
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = colorHex || "#ffffff";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true, opacity: 1.0 });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(16, 8, 1);

  sprite.position.copy(pos);
  const normal = pos.clone().normalize();
  sprite.position.add(normal.multiplyScalar(6));

  scene.add(sprite);
  appState.numberPopups.push({
    sprite,
    age: 0,
    maxAge: 1.5,
    velocity: normal.multiplyScalar(3.0),
  });
}

function updateNumberPopups(appState, dt) {
  for (let i = appState.numberPopups.length - 1; i >= 0; i--) {
    const p = appState.numberPopups[i];
    p.age += dt;
    if (p.age >= p.maxAge) {
      scene.remove(p.sprite);
      p.sprite.material.map.dispose();
      p.sprite.material.dispose();
      appState.numberPopups.splice(i, 1);
    } else {
      const progress = p.age / p.maxAge;
      p.sprite.position.addScaledVector(p.velocity, dt);
      p.sprite.material.opacity = 1.0 - progress;
      p.sprite.lookAt(camera.position);
    }
  }
}

// ─── Animation loop ───────────────────────────────────────────────────────────
let lastRippleTime = 0;

/**
 * Start the main render loop.
 * @param {object} appState  — the shared application state object
 * @param {object} controls  — OrbitControls instance
 * @param {object} loopCallbacks  — { advanceYear, commitTimeRangeSelection, setPlayback,
 *                                    syncSelectionControls, updateTimeRangeVisuals,
 *                                    syncYearSliderValueLabel, renderCurrentView }
 */
export function startAnimationLoop(appState, controls, loopCallbacks) {
  const {
    advanceYear,
    commitTimeRangeSelection,
    setPlayback,
    syncSelectionControls,
    updateTimeRangeVisuals,
    syncYearSliderValueLabel,
    renderCurrentView,
  } = loopCallbacks;

  // Expose setPlayback globally so idleRotation can call it without a circular dep
  globalThis.__appSetPlayback = setPlayback;

  const restoreOpts = {
    setPlayback,
    syncSelectionControls,
    updateTimeRangeVisuals,
    syncYearSliderValueLabel,
    renderCurrentView,
    get yearSlider()           { return globalThis.__appSliders?.yearSlider ?? null; },
    get timeRangeStartSlider() { return globalThis.__appSliders?.timeRangeStartSlider ?? null; },
    get timeRangeEndSlider()   { return globalThis.__appSliders?.timeRangeEndSlider ?? null; },
  };

  let lastObservedTimeRangeStart = globalThis.__appSliders?.timeRangeStartSlider?.value ?? "0";
  let lastObservedTimeRangeEnd   = globalThis.__appSliders?.timeRangeEndSlider?.value   ?? "0";

  function animate() {
    const now = performance.now() * 0.001;
    const dt  = now - (animate.lastTime || now);
    animate.lastTime = now;

    // Sync time range sliders if changed externally
    const trs = globalThis.__appSliders?.timeRangeStartSlider;
    const tre = globalThis.__appSliders?.timeRangeEndSlider;
    if (appState.selectedRegion && trs && tre) {
      if (trs.value !== lastObservedTimeRangeStart || tre.value !== lastObservedTimeRangeEnd) {
        lastObservedTimeRangeStart = trs.value;
        lastObservedTimeRangeEnd   = tre.value;
        commitTimeRangeSelection();
      }
    }

    controls.update();
    applyIdleEarthRotation(dt, appState);

    // Process AR Reset request (Zentrieren)
    if (appState.triggerArReset && appState.arSessionActive && worldRoot) {
      appState.triggerArReset = false;
      const xrCamera = renderer.xr.getCamera(camera);
      const distance = 2.5;
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(xrCamera.quaternion);

      worldRoot.position.copy(xrCamera.position).add(direction.multiplyScalar(distance));
      worldRoot.position.y -= 0.2; // Keep it slightly lowered for comfortable viewing
    }

    // Detect when user interacts after idle started → trigger one restore animation
    if (isIdleActive() && !isRestoring() && getLastUserInteractionAtMs() > idleStartedAtMs) {
      startRestoreRotation(restoreOpts, 600);
    }

    // Playback advance
    if (appState.isPlaying && appState.yearKeys.length > 1) {
      appState.playAccumulator += dt;
      if (appState.playAccumulator >= appState.playStepSeconds) {
        appState.playAccumulator = 0;
        advanceYear();
      }
    }

    // Spawn ripples every 0.6 s
    if (now - lastRippleTime > 0.6) {
      lastRippleTime = now;
      for (const mesh of appState.barMeshes) {
        if (mesh.userData?.pos) {
          spawnRipple(
            mesh.userData.pos,
            mesh.userData.colorHex,
            mesh.userData.lookAtTarget,
            mesh.userData.ratio,
          );
        }
      }
    }

    updateRipples(dt);
    updateNumberPopups(appState, dt);

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);
}

// Export popup spawner so playbackUI can call it
export { spawnNumberPopup };
