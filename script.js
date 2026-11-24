
// NOXAR - Three.js World Engine
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const canvas = document.getElementById("gameCanvas");

if (!canvas) {
  throw new Error("NOXAR: gameCanvas not found");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color("#080711");
scene.fog = new THREE.FogExp2("#100b20", 0.009);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

scene.add(new THREE.HemisphereLight("#b6a3e8", "#171020", 2));

const moon = new THREE.DirectionalLight("#cbbaff", 2.5);
moon.position.set(-15, 30, 10);
scene.add(moon);

const world = new THREE.Group();
scene.add(world);

const groundMaterial = new THREE.MeshStandardMaterial({
  color: "#302540",
  roughness: 0.9
});

const rockMaterial = new THREE.MeshStandardMaterial({
  color: "#211a31",
  roughness: 0.95
});

const glowMaterial = new THREE.MeshStandardMaterial({
  color: "#a78bfa",
  emissive: "#6734c9",
  emissiveIntensity: 2
});

const clock = new THREE.Clock();

// FLOATING ISLANDS
const islands = [];

function createIsland(x, z, radius, height) {
  const island = new THREE.Group();

  island.position.set(x, 0, z);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.9, 0.8, 48),
    groundMaterial
  );

  top.position.y = -0.1;
  island.add(top);

  const bottom = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 1.1, height, 48),
    rockMaterial
  );

  bottom.position.y = -height / 2;
  island.add(bottom);

  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3),
      glowMaterial
    );

    crystal.position.set(
      Math.cos(angle) * radius * 0.7,
      0.4,
      Math.sin(angle) * radius * 0.7
    );

    island.add(crystal);
  }

  world.add(island);

  islands.push({
    object: island,
    phase: Math.random() * 10
  });
}

createIsland(0, 0, 13, 5);
createIsland(-28, -22, 8, 5);
createIsland(28, -24, 8, 5);
createIsland(-30, 24, 9, 5);
createIsland(30, 24, 9, 6);
createIsland(0, -50, 11, 7);

// STARS
const starPositions = [];

for (let i = 0; i < 3000; i++) {
  starPositions.push(
    (Math.random() - 0.5) * 350,
    Math.random() * 130,
    (Math.random() - 0.5) * 350
  );
}

const starGeometry = new THREE.BufferGeometry();

starGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(starPositions, 3)
);

const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: "#d7c9ff",
    size: 0.16
  })
);

world.add(stars);

// PLAYER
const player = new THREE.Group();
world.add(player);

const body = new THREE.Mesh(
  new THREE.ConeGeometry(0.5, 1.4, 16),
  rockMaterial
);

body.position.y = 0.85;
player.add(body);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.28, 20, 20),
  new THREE.MeshStandardMaterial({ color: "#c6b5dd" })
);

head.position.y = 1.7;
player.add(head);

player.position.set(0, 0, 4);

// PORTALS
const portalData = [
  { id: "cinema", title: "THE CINEMA", x: -8, z: -7 },
  { id: "anime", title: "ANIME REALM", x: 8, z: -7 },
  { id: "knowledge", title: "KNOWLEDGE", x: -8, z: 8 },
  { id: "archives", title: "THE ARCHIVES", x: 8, z: 8 }
];

const portals = [];

portalData.forEach(data => {
  const group = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.7, 0.12, 16, 64),
    glowMaterial
  );

  ring.position.y = 2.1;
  group.add(ring);

  const light = new THREE.PointLight("#a78bfa", 20, 15);
  light.position.y = 2;
  group.add(light);

  group.position.set(data.x, 0, data.z);
  world.add(group);

  portals.push({ data, group, ring });
});

// MOVEMENT
const keys = {};

let yaw = 0;
let pitch = 0.2;
let distance = 8;
let started = false;

window.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (e.code === "KeyE" && started) {
    const portal = getNearbyPortal();
    if (portal) openPortal(portal.data);
  }
});

window.addEventListener("keyup", e => {
  keys[e.code] = false;
});

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener("pointerdown", e => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

window.addEventListener("pointerup", () => {
  dragging = false;
});

window.addEventListener("pointermove", e => {
  if (!dragging) return;

  yaw -= (e.clientX - lastX) * 0.005;
  pitch = THREE.MathUtils.clamp(
    pitch + (e.clientY - lastY) * 0.003,
    -0.15,
    0.8
  );

  lastX = e.clientX;
  lastY = e.clientY;
});

canvas.addEventListener("wheel", e => {
  distance = THREE.MathUtils.clamp(
    distance + e.deltaY * 0.008,
    4,
    13
  );
}, { passive: true });

// CAMERA
function updateCamera(delta) {
  const target = new THREE.Vector3(
    player.position.x,
    player.position.y + 1.5,
    player.position.z
  );

  const offset = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  );

  camera.position.lerp(
    target.clone().add(offset.multiplyScalar(distance)),
    1 - Math.exp(-5 * delta)
  );

  camera.lookAt(target);
}

// PORTALS
function getNearbyPortal() {
  let nearest = null;
  let minDistance = Infinity;

  portals.forEach(portal => {
    const d = Math.hypot(
      player.position.x - portal.data.x,
      player.position.z - portal.data.z
    );

    if (d < minDistance) {
      minDistance = d;
      nearest = portal;
    }
  });

  return minDistance < 4.2 ? nearest : null;
}

function openPortal(data) {
  const modal = document.getElementById("portalModal");
  if (!modal) return;

  document.getElementById("portalTitle").textContent = data.title;
  modal.classList.add("open");
}

document.getElementById("closePortal")
  ?.addEventListener("click", () => {
    document.getElementById("portalModal")?.classList.remove("open");
  });

// START
document.getElementById("enterButton")
  ?.addEventListener("click", () => {
    started = true;
    document.getElementById("intro")?.classList.add("hidden");
  });

// ANIMATION
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.04);
  const time = clock.elapsedTime;

  islands.forEach(island => {
    island.object.position.y =
      Math.sin(time * 0.5 + island.phase) * 0.12;
  });

  portals.forEach(portal => {
    portal.ring.rotation.z = Math.sin(time * 0.5) * 0.08;
  });

  stars.rotation.y = time * 0.002;

  if (started) {
    const forward =
      keys.KeyW || keys.ArrowUp ? 1 :
      keys.KeyS || keys.ArrowDown ? -1 : 0;

    const side =
      keys.KeyD || keys.ArrowRight ? 1 :
      keys.KeyA || keys.ArrowLeft ? -1 : 0;

    const direction = new THREE.Vector3(
      Math.sin(yaw) * forward + Math.cos(yaw) * side,
      0,
      Math.cos(yaw) * forward - Math.sin(yaw) * side
    );

    if (direction.lengthSq() > 0) {
      direction.normalize();

      const speed = keys.ShiftLeft ? 10 : 6;

      player.position.addScaledVector(
        direction,
        speed * delta
      );

      player.rotation.y = Math.atan2(direction.x, direction.z);
    }

    player.position.x = THREE.MathUtils.clamp(player.position.x, -11.5, 11.5);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -11.5, 11.5);

    updateCamera(delta);
  }

  renderer.render(scene, camera);
}

// RESIZE
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
});

camera.position.set(0, 6, 10);
camera.lookAt(0, 1, 0);

animate();

console.log("NOXAR WORLD ENGINE READY");
