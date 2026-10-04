import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getSlots, holdSlot } from "../api/api";
import "./SlotSelection.css";

const REFRESH_MS = 6000; // how often to re-poll slot status from the backend

// ---- layout config ----------------------------------------------------

// ---- layout config ----------------------------------------------------
const FLOORS = [1, 2, 3, 4];
const GRID_COLS = 10;
const GRID_ROWS = 10;            // 10 x 10 = 100 slots per floor
const ROWS_PER_BLOCK = 2;        // a driving aisle after every 2 rows
const BAY_SIZE = 2.2;
const BAY_GAP = 0.4;
const STEP = BAY_SIZE + BAY_GAP;

const ROAD_WIDTH = 4.2;          // internal aisles between row pairs
const PERIMETER_ROAD = 6.5;      // ring road around the whole block
const FORECOURT = 5;             // extra tarmac in front, for the gate

const INTERNAL_ROADS = Math.floor((GRID_ROWS - 1) / ROWS_PER_BLOCK); // 4
const BLOCK_W = GRID_COLS * STEP;
const BLOCK_D = GRID_ROWS * STEP + INTERNAL_ROADS * ROAD_WIDTH;
const OUTER_W = BLOCK_W + PERIMETER_ROAD * 2;
const OUTER_D = BLOCK_D + PERIMETER_ROAD * 2;

const LOT_D = OUTER_D + FORECOURT;
const LOT_Z = FORECOURT / 2;             // lot centre, shifted toward +z
const FRONT_Z = OUTER_D / 2 + FORECOURT; // front boundary line
const BACK_Z = -OUTER_D / 2;

// gate + security cabin sit in the front-right corner
const CABIN_W = 6;
const CABIN_D = 4.6;
const CABIN_H = 3.2;
const CABIN_X = OUTER_W / 2 - CABIN_W / 2 - 1.2;
const CABIN_Z = FRONT_Z - CABIN_D / 2 - 1.2;
const ENTRY_W = 8;
const ENTRY_X = CABIN_X - CABIN_W / 2 - 1.2 - ENTRY_W / 2;

const STATUS_COLOR = {
  available: 0x2ecc71,
  held: 0xf1c40f,
  occupied: 0xe74c3c,
  selected: 0x3498db,
};

// grid helpers ----------------------------------------------------------
const roadsBefore = (row) => Math.floor(row / ROWS_PER_BLOCK);
const bayX = (col) => col * STEP - BLOCK_W / 2 + STEP / 2;
const bayZ = (row) => row * STEP + roadsBefore(row) * ROAD_WIDTH - BLOCK_D / 2 + STEP / 2;

// ---- canvas textures --------------------------------------------------
function makeLabelTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 128);
  ctx.font = "bold 74px Inter, Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.strokeText(text, 128, 68);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 128, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function makeSignTexture(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#12161d";
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(0, 108, 512, 8);
  ctx.font = "bold 62px Inter, Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e9eef6";
  ctx.fillText(text, 256, 56);
  return new THREE.CanvasTexture(canvas);
}

function makeStripeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#e74c3c" : "#f2f4f8";
    ctx.fillRect(i * 32, 0, 32, 32);
  }
  return new THREE.CanvasTexture(canvas);
}

// ---- static garage shell (roads, walls, gate, cabin) ------------------
function buildGarage() {
  const group = new THREE.Group();

  const asphalt = new THREE.MeshStandardMaterial({ color: 0x23272f, roughness: 0.96 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2e3440, roughness: 0.9 });
  const paintMat = new THREE.MeshBasicMaterial({
    color: 0xf3f6fa,
    transparent: true,
    opacity: 0.5,
  });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a4150, roughness: 0.8 });
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x4a5464, roughness: 0.85 });

  // full tarmac (ring road + forecourt + aisles all read as road)
  const lot = new THREE.Mesh(new THREE.PlaneGeometry(OUTER_W, LOT_D), asphalt);
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(0, 0.02, LOT_Z);
  lot.receiveShadow = true;
  group.add(lot);

  // slightly lighter pad under each pair of parking rows
  for (let b = 0; b * ROWS_PER_BLOCK < GRID_ROWS; b++) {
    const r0 = b * ROWS_PER_BLOCK;
    const r1 = Math.min(r0 + ROWS_PER_BLOCK - 1, GRID_ROWS - 1);
    const zc = (bayZ(r0) + bayZ(r1)) / 2;
    const depth = (r1 - r0 + 1) * STEP;
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK_W, depth), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.03, zc);
    pad.receiveShadow = true;
    group.add(pad);
  }

  // dashed centre line helper
  const dash = (length, axis, x, z, opts = {}) => {
    const dashLen = 1.7;
    const gap = 1.5;
    const count = Math.floor(length / (dashLen + gap));
    const start = -((count - 1) * (dashLen + gap)) / 2;
    const geo =
      axis === "x"
        ? new THREE.PlaneGeometry(dashLen, 0.16)
        : new THREE.PlaneGeometry(0.16, dashLen);
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geo, opts.material || paintMat);
      m.rotation.x = -Math.PI / 2;
      const off = start + i * (dashLen + gap);
      m.position.set(axis === "x" ? x + off : x, 0.05, axis === "x" ? z : z + off);
      group.add(m);
    }
  };

  // internal aisles
  for (let k = 1; k <= INTERNAL_ROADS; k++) {
    const rowBefore = k * ROWS_PER_BLOCK - 1;
    const zc = bayZ(rowBefore) + STEP / 2 + ROAD_WIDTH / 2;
    dash(BLOCK_W - 2, "x", 0, zc);
  }

  // ring road centre lines
  const ringX = BLOCK_W / 2 + PERIMETER_ROAD / 2;
  const ringZ = BLOCK_D / 2 + PERIMETER_ROAD / 2;
  dash(BLOCK_W + PERIMETER_ROAD - 2, "x", 0, -ringZ);
  dash(BLOCK_W + PERIMETER_ROAD - 2, "x", 0, ringZ);
  dash(BLOCK_D + PERIMETER_ROAD - 2, "z", -ringX, 0);
  dash(BLOCK_D + PERIMETER_ROAD - 2, "z", ringX, 0);
  // entry lane, gate to ring road
  dash(FRONT_Z - ringZ - 1, "z", ENTRY_X, (FRONT_Z + ringZ) / 2);

  // kerb around the parking block so the ring road reads as a road
  const kerbH = 0.18;
  const kerb = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, kerbH, d), kerbMat);
    m.position.set(x, kerbH / 2, z);
    m.receiveShadow = true;
    group.add(m);
  };
  kerb(BLOCK_W + 0.6, 0.3, 0, -BLOCK_D / 2 - 0.15);
  kerb(BLOCK_W + 0.6, 0.3, 0, BLOCK_D / 2 + 0.15);
  kerb(0.3, BLOCK_D + 0.6, -BLOCK_W / 2 - 0.15, 0);
  kerb(0.3, BLOCK_D + 0.6, BLOCK_W / 2 + 0.15, 0);

  // boundary wall, with a gap for the gate on the front side
  const wallH = 1.3;
  const wallT = 0.4;
  const wall = (w, d, x, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    m.position.set(x, wallH / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  };
  wall(OUTER_W, wallT, 0, BACK_Z);
  wall(wallT, LOT_D, -OUTER_W / 2, LOT_Z);
  wall(wallT, LOT_D, OUTER_W / 2, LOT_Z);

  const gapStart = ENTRY_X - ENTRY_W / 2;
  const gapEnd = ENTRY_X + ENTRY_W / 2;
  const leftLen = gapStart + OUTER_W / 2;
  const rightLen = OUTER_W / 2 - gapEnd;
  wall(leftLen, wallT, (-OUTER_W / 2 + gapStart) / 2, FRONT_Z);
  wall(rightLen, wallT, (gapEnd + OUTER_W / 2) / 2, FRONT_Z);

  // ---- security cabin -------------------------------------------------
  const cabin = new THREE.Group();
  cabin.position.set(CABIN_X, 0, CABIN_Z);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(CABIN_W, CABIN_H, CABIN_D),
    new THREE.MeshStandardMaterial({ color: 0x525b6b, roughness: 0.7 })
  );
  body.position.y = CABIN_H / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  cabin.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(CABIN_W + 0.7, 0.28, CABIN_D + 0.7),
    new THREE.MeshStandardMaterial({ color: 0x2b313c, roughness: 0.8 })
  );
  roof.position.y = CABIN_H + 0.14;
  roof.castShadow = true;
  cabin.add(roof);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x8fd8ff,
    emissive: 0x2e6f8f,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });
  const winFront = new THREE.Mesh(new THREE.BoxGeometry(CABIN_W * 0.72, 1.15, 0.12), glassMat);
  winFront.position.set(0, 1.85, -CABIN_D / 2 - 0.02); // faces the lot
  cabin.add(winFront);

  const winSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, CABIN_D * 0.6), glassMat);
  winSide.position.set(-CABIN_W / 2 - 0.02, 1.85, 0); // faces the gate lane
  cabin.add(winSide);

  const signTex = makeSignTexture("SECURITY");
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 1.05),
    new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })
  );
  sign.position.set(0, 2.85, -CABIN_D / 2 - 0.08);
  sign.rotation.y = Math.PI;
  cabin.add(sign);

  const lamp = new THREE.PointLight(0xffd9a0, 0.9, 22, 2);
  lamp.position.set(0, CABIN_H + 1.2, -CABIN_D / 2 - 0.5);
  cabin.add(lamp);
  group.add(cabin);

  // ---- boom barrier across the entry lane -----------------------------
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2f353f, roughness: 0.7 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.55), postMat);
  const postX = gapEnd + 0.5;
  const boomZ = FRONT_Z - 2.6;
  post.position.set(postX, 0.75, boomZ);
  post.castShadow = true;
  group.add(post);

  const stripeTex = makeStripeTexture();
  const boom = new THREE.Mesh(
    new THREE.BoxGeometry(ENTRY_W + 0.4, 0.22, 0.26),
    new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 })
  );
  boom.position.set(postX - (ENTRY_W + 0.4) / 2, 1.35, boomZ);
  boom.castShadow = true;
  group.add(boom);

  // stop line in front of the barrier
  const stopLine = new THREE.Mesh(new THREE.PlaneGeometry(ENTRY_W, 0.35), paintMat);
  stopLine.rotation.x = -Math.PI / 2;
  stopLine.position.set(ENTRY_X, 0.05, boomZ + 1.4);
  group.add(stopLine);

  // ---- pillars --------------------------------------------------------
  const pillarGeo = new THREE.CylinderGeometry(0.45, 0.45, 6, 12);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a3f4b, roughness: 0.8 });
  const px = BLOCK_W / 2 + PERIMETER_ROAD - 1.2;
  const pz = BLOCK_D / 2 + PERIMETER_ROAD - 1.2;
  [
    [-px, -pz], [px, -pz], [-px, pz], [px, pz],
    [-px, 0], [px, 0], [0, -pz], [0, pz],
  ].forEach(([x, z]) => {
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.set(x, 3, z);
    p.castShadow = true;
    group.add(p);
  });

  return group;
}

export default function SlotSelection({ selectedSlotId, setSelectedSlotId }) {
  const navigate = useNavigate();

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const slotMeshesRef = useRef(new Map()); // slot id -> mesh
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2(-10, -10));
  const hoveredRef = useRef(null);
  const handleSelectRef = useRef(null);
  const bayGeoRef = useRef(null);
  const labelGeoRef = useRef(null);
  const labelTexRef = useRef(new Map()); // slot id -> CanvasTexture

  const [allSlots, setAllSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [hoveredSlotId, setHoveredSlotId] = useState(null);
  const [holdError, setHoldError] = useState(null);

  // ---- fetch slot data, then keep polling ------------------------------
  // Slot status lives on the backend now and can change from other users
  // (someone else holds/frees a bay) or from the server's own 3-minute
  // hold timeout — neither of which this tab would otherwise know about,
  // so a short poll is what actually keeps the grid honest.
  useEffect(() => {
    let cancelled = false;

    const refresh = () =>
      getSlots()
        .then((data) => {
          if (cancelled) return;
          setAllSlots(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });

    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const slotColor = useCallback(
    (slot) =>
      slot.id === selectedSlotId
        ? STATUS_COLOR.selected
        : STATUS_COLOR[slot.status] ?? STATUS_COLOR.available,
    [selectedSlotId]
  );

  // ---- select / hold a slot ---------------------------------------------
  const handleSelect = useCallback(
    async (slot) => {
      if (!slot || slot.status !== "available") return;
      const result = await holdSlot(slot.id);

      if (!result.success) {
        // Someone else's hold request won the race for this exact bay —
        // don't pretend it's ours. Re-pull the real state so the color
        // updates immediately instead of waiting for the next poll.
        setHoldError(`${slot.id} was just taken — pick another bay.`);
        getSlots().then((data) => Array.isArray(data) && setAllSlots(data));
        return;
      }

      setHoldError(null);
      setAllSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, status: "held" } : s)));
      setSelectedSlotId(slot.id);
    },
    [setSelectedSlotId]
  );
  useEffect(() => {
    handleSelectRef.current = handleSelect;
  }, [handleSelect]);

  useEffect(() => {
    if (!holdError) return;
    const t = setTimeout(() => setHoldError(null), 4000);
    return () => clearTimeout(t);
  }, [holdError]);

  // ---- one-time three.js scene setup ------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x11151c);
    scene.fog = new THREE.Fog(0x11151c, 70, 210);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 600);
    camera.position.set(0, 42, 56);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 12;
    controls.maxDistance = 130;
    controls.target.set(0, 0, 2);
    controlsRef.current = controls;

    // lighting
    scene.add(new THREE.HemisphereLight(0x8fa8c8, 0x1a1a1a, 0.95));
    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(30, 55, 25);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -55;
    dir.shadow.camera.right = 55;
    dir.shadow.camera.top = 55;
    dir.shadow.camera.bottom = -55;
    dir.shadow.camera.far = 160;
    scene.add(dir);

    // ground beyond the lot
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x191d25, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    scene.add(buildGarage());

    // shared geometry for the bays + their labels
    bayGeoRef.current = new THREE.BoxGeometry(BAY_SIZE * 0.92, 0.5, BAY_SIZE * 0.92);
    labelGeoRef.current = new THREE.PlaneGeometry(BAY_SIZE * 0.8, BAY_SIZE * 0.4);

    let animFrame;
    const animate = () => {
      animFrame = requestAnimationFrame(animate);
      controls.update();

      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const meshes = Array.from(slotMeshesRef.current.values());
      const hit = raycasterRef.current.intersectObjects(meshes, false)[0]?.object ?? null;
      const validHit = hit && hit.userData.slot.status === "available" ? hit : null;
      if (hoveredRef.current !== validHit) {
        if (hoveredRef.current) hoveredRef.current.scale.set(1, 1, 1);
        if (validHit) validHit.scale.set(1.08, 1.3, 1.08);
        hoveredRef.current = validHit;
        setHoveredSlotId(validHit?.userData.slot.id ?? null);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const handlePointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const handleClick = () => {
      if (hoveredRef.current) handleSelectRef.current?.(hoveredRef.current.userData.slot);
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("click", handleClick);

    const texCache = labelTexRef.current;
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("click", handleClick);
      controls.dispose();
      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => {
            m?.map?.dispose();
            m?.dispose();
          });
        }
      });
      texCache.forEach((t) => t.dispose());
      texCache.clear();
      bayGeoRef.current = null;
      labelGeoRef.current = null;
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- (re)build the bays for the current floor -------------------------
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || loading || !bayGeoRef.current) return;

    slotMeshesRef.current.forEach((mesh) => {
      mesh.traverse((o) => {
        if (o.isMesh && o.material) o.material.dispose(); // geometry + label textures are shared
      });
      scene.remove(mesh);
    });
    slotMeshesRef.current.clear();
    hoveredRef.current = null;
    setHoveredSlotId(null);

    const floorSlots = allSlots.filter((s) => s.floor === currentFloor);

    floorSlots.forEach((slot, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);

      const mesh = new THREE.Mesh(
        bayGeoRef.current,
        new THREE.MeshStandardMaterial({
          color: slotColor(slot),
          roughness: 0.55,
          transparent: slot.status === "occupied",
          opacity: slot.status === "occupied" ? 0.85 : 1,
        })
      );
      mesh.position.set(bayX(col), 0.26, bayZ(row));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.slot = slot;

      // slot number printed on top of the bay
      let tex = labelTexRef.current.get(slot.id);
      if (!tex) {
        tex = makeLabelTexture(slot.id);
        labelTexRef.current.set(slot.id, tex);
      }
      const label = new THREE.Mesh(
        labelGeoRef.current,
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, depthWrite: false })
      );
      label.rotation.x = -Math.PI / 2;
      label.position.set(0, 0.26, 0); // sits just above the bay's top face
      label.renderOrder = 2;
      mesh.add(label);

      scene.add(mesh);
      slotMeshesRef.current.set(slot.id, mesh);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSlots, currentFloor, loading]);

  // ---- keep bay colors in sync with status/selection, no full rebuild ---
  useEffect(() => {
    slotMeshesRef.current.forEach((mesh) => {
      mesh.material.color.setHex(slotColor(mesh.userData.slot));
    });
  }, [selectedSlotId, allSlots, slotColor]);

  function handleContinue() {
    if (selectedSlotId) navigate("/book");
  }

  const selectedSlot = allSlots.find((s) => s.id === selectedSlotId);

  return (
    <div className="page slot3d-page">
      <div className="slot3d-overlay">
        <div className="slot3d-header">
          <h1 className="title">Select a Slot</h1>
          <p className="subtitle">Drag to look around · Click a green bay to reserve it</p>
        </div>

        <div className="floor-tabs">
          {FLOORS.map((f) => (
            <button
              key={f}
              className={`floor-tab ${f === currentFloor ? "active" : ""}`}
              onClick={() => setCurrentFloor(f)}
            >
              Floor {f}
            </button>
          ))}
        </div>

        <div className="legend">
          <span><i className="dot available" /> Available</span>
          <span><i className="dot held" /> Held</span>
          <span><i className="dot occupied" /> Occupied</span>
          <span><i className="dot selected" /> Selected</span>
        </div>

        {hoveredSlotId && <div className="hover-chip">{hoveredSlotId}</div>}
        {holdError && <div className="hold-error-chip">{holdError}</div>}
      </div>

      <div ref={mountRef} className="slot3d-canvas" />

      <div className="slot3d-footer">
        <div className="selected-info">
          {selectedSlot ? `Selected: ${selectedSlot.id} (Floor ${selectedSlot.floor})` : "No slot selected yet"}
        </div>
        <button className="btn btn-primary" disabled={!selectedSlotId} onClick={handleContinue}>
          Continue
        </button>
      </div>

      {loading && <div className="slot3d-loading">Loading garage…</div>}
    </div>
  );
}