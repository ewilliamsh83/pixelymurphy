import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const stateEl = document.getElementById("state");
const sausagesEl = document.getElementById("sausages");
const levelEl = document.getElementById("level");
const objectiveEl = document.getElementById("objective");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayBody = document.getElementById("overlay-body");
const restartBtn = document.getElementById("restart");
const runBtn = document.getElementById("run-btn");
const moveZone = document.getElementById("move-zone");
const lookZone = document.getElementById("look-zone");

let gameRunning = true;
let currentLevel = 1;
let levelPhase = "play";
let collectibles = [];

const setOverlay = (title, body) => {
  overlayTitle.textContent = title;
  overlayBody.textContent = body;
  overlay.classList.add("show");
};

const hideOverlay = () => {
  overlay.classList.remove("show");
};

const clock = new THREE.Clock();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7cc7ff);
scene.fog = new THREE.Fog(0x7cc7ff, 30, 120);

const WORLD_SIZE = 140;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 4, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xdff2ff, 0x3d6b5b, 0.75);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xfff0d6, 1.0);
dir.position.set(10, 12, 6);
scene.add(dir);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xfff2b2 })
);
sun.position.set(10, 12, -10);
scene.add(sun);

const flashlight = new THREE.SpotLight(0xffffff, 1.6, 28, Math.PI / 6, 0.35, 1.2);
flashlight.visible = false;
flashlight.position.set(0, 4, 0);
scene.add(flashlight);
scene.add(flashlight.target);

const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 12, 12);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3f7f3b, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const addHedge = (x, z, w, h, color) => {
  const geo = new THREE.BoxGeometry(w, h, 2);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const hedge = new THREE.Mesh(geo, mat);
  hedge.position.set(x, h / 2, z);
  scene.add(hedge);
  return hedge;
};

const obstacles = [];
obstacles.push(addHedge(-18, -10, 7, 2.4, 0x2f5d3a));
obstacles.push(addHedge(22, -18, 9, 3, 0x2b5a36));
obstacles.push(addHedge(18, 12, 6, 2.6, 0x2c5f3a));
obstacles.push(addHedge(-24, 16, 9, 2.6, 0x2d5b38));

const createTree = (x, z, size = 1) => {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3 * size, 0.4 * size, 2.4 * size, 10),
    new THREE.MeshStandardMaterial({ color: 0x6b4b2a, roughness: 0.9 })
  );
  trunk.position.y = 1.2 * size;
  tree.add(trunk);

  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(1.3 * size, 18, 18),
    new THREE.MeshStandardMaterial({ color: 0x2f7a3b, roughness: 0.9 })
  );
  crown.position.y = 3 * size;
  tree.add(crown);

  tree.position.set(x, 0, z);
  scene.add(tree);
  return tree;
};

const createBush = (x, z, size = 1) => {
  const bush = new THREE.Mesh(
    new THREE.SphereGeometry(0.9 * size, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x2f6b36, roughness: 0.9 })
  );
  bush.position.set(x, 0.7 * size, z);
  scene.add(bush);
  return bush;
};

const createRock = (x, z, size = 1) => {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.8 * size, 0),
    new THREE.MeshStandardMaterial({ color: 0x6f7681, roughness: 0.95 })
  );
  rock.position.set(x, 0.4 * size, z);
  scene.add(rock);
  return rock;
};

const trees = [
  createTree(-28, -26, 1.2),
  createTree(26, -30, 1.4),
  createTree(-32, 22, 1.3),
  createTree(30, 26, 1.1),
  createTree(0, -30, 1.5),
  createTree(34, -4, 1.2),
  createTree(-36, 2, 1.3),
];

const bushes = [
  createBush(-14, 18, 1),
  createBush(14, 20, 0.9),
  createBush(-20, -12, 1.1),
  createBush(18, -6, 0.8),
  createBush(-4, -24, 1.0),
];

const rocks = [
  createRock(-6, -24, 1),
  createRock(20, 4, 1.1),
  createRock(-26, 6, 0.8),
  createRock(10, 24, 0.9),
];

const createHouse = (x, z) => {
  const house = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xf3f3f3, roughness: 0.7 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.6 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1b1f2a, roughness: 0.5 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.8 });

  const width = 8;
  const depth = 6;
  const wallThickness = 0.3;
  const floorHeight = 3.6;

  const addWall = (w, h, d, xPos, yPos, zPos) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(xPos, yPos, zPos);
    house.add(wall);
  };

  const addFloor = (y, h = 0.3) => {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width - wallThickness * 2, h, depth - wallThickness * 2), floorMat);
    floor.position.set(0, y, 0);
    house.add(floor);
  };

  // Ground floor walls (with door opening)
  const frontZ = depth / 2;
  const backZ = -depth / 2;
  const sideX = width / 2;
  const wallY = floorHeight / 2;

  // Front wall segments
  addWall(2.2, floorHeight, wallThickness, -2.2, wallY, frontZ);
  addWall(2.2, floorHeight, wallThickness, 2.2, wallY, frontZ);
  addWall(1.8, 1.0, wallThickness, 0, floorHeight - 0.5, frontZ);

  // Back and sides
  addWall(width, floorHeight, wallThickness, 0, wallY, backZ);
  addWall(wallThickness, floorHeight, depth, -sideX, wallY, 0);
  addWall(wallThickness, floorHeight, depth, sideX, wallY, 0);

  // Second floor walls
  const wallY2 = floorHeight + floorHeight / 2;
  addWall(width - 0.8, floorHeight - 0.2, wallThickness, 0, wallY2, backZ + 0.4);
  addWall(width - 0.8, floorHeight - 0.2, wallThickness, 0, wallY2, frontZ - 0.4);
  addWall(wallThickness, floorHeight - 0.2, depth - 0.8, -sideX + 0.4, wallY2, 0);
  addWall(wallThickness, floorHeight - 0.2, depth - 0.8, sideX - 0.4, wallY2, 0);

  // Floors
  addFloor(0.15, 0.3);
  addFloor(floorHeight + 0.15, 0.25);

  // Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.4, 4), roofMat);
  roof.position.y = floorHeight * 2 + 1.2;
  roof.rotation.y = Math.PI / 4;
  house.add(roof);

  // Door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 0.12), trimMat);
  door.position.set(0, 1.2, frontZ + 0.05);
  house.add(door);

  // Balcony
  const balcony = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 1.2), trimMat);
  balcony.position.set(0, floorHeight + 0.8, frontZ - 0.2);
  house.add(balcony);

  const rail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 0.2), trimMat);
  rail.position.set(0, floorHeight + 1.2, frontZ + 0.25);
  house.add(rail);

  const addWindow = (wx, wy, wz, flip = false) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 0.15), trimMat);
    frame.position.set(wx, wy, wz);
    if (flip) frame.rotation.y = Math.PI;
    house.add(frame);
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x9db9d4, roughness: 0.2 })
    );
    pane.position.set(wx, wy, wz + (flip ? -0.08 : 0.08));
    house.add(pane);
  };

  addWindow(-2.2, 2.2, frontZ + 0.02);
  addWindow(2.2, 2.2, frontZ + 0.02);
  addWindow(-2, floorHeight + 1.2, frontZ - 0.2);
  addWindow(2, floorHeight + 1.2, frontZ - 0.2);
  addWindow(-3.1, floorHeight + 1.2, -0.2, true);
  addWindow(3.1, floorHeight + 1.2, -0.2, true);

  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 0.9), trimMat);
  chimney.position.set(-2.4, floorHeight * 2 + 1.6, -1.8);
  house.add(chimney);

  // Interior: stairs, sofa, table, bed
  const stairs = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 1.2), trimMat);
  stairs.position.set(-2.6, 1.3, -1.2);
  house.add(stairs);

  const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 1), new THREE.MeshStandardMaterial({ color: 0x3d4b68, roughness: 0.7 }));
  sofa.position.set(1.6, 0.5, -1.5);
  house.add(sofa);

  const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), new THREE.MeshStandardMaterial({ color: 0x704e2b, roughness: 0.8 }));
  table.position.set(1.2, 0.35, 1.2);
  house.add(table);

  const bedBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.7 }));
  bedBase.position.set(-1.6, floorHeight + 0.35, -1.8);
  house.add(bedBase);

  const bedTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 1.4), new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 0.6 }));
  bedTop.position.set(-1.6, floorHeight + 0.65, -1.8);
  house.add(bedTop);

  house.position.set(x, 0, z);
  scene.add(house);
  return house;
};

const house = createHouse(30, -6);

const createFaceTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f2c6a0";
  ctx.beginPath();
  ctx.arc(128, 128, 120, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.arc(88, 110, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(168, 110, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(84, 106, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(164, 106, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#b77961";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(128, 150, 28, 0, Math.PI);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const createCharacter = (color) => {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x223042, roughness: 0.6 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c6a0, roughness: 0.5 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.6), mat);
  torso.position.y = 1.25;
  group.add(torso);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.55), mat);
  hips.position.y = 0.55;
  group.add(hips);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), skin);
  head.position.y = 2.15;
  group.add(head);

  const faceTex = createFaceTexture();
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), faceMat);
  face.position.set(0, 2.15, 0.46);
  group.add(face);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2), accent);
  hair.position.y = 2.25;
  group.add(hair);

  const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.55), mat);
  shoulder.position.y = 1.8;
  group.add(shoulder);

  const armGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.9, 16);
  const forearmGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.7, 16);
  const legGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.95, 18);

  const leftArm = new THREE.Mesh(armGeo, skin);
  leftArm.position.set(-0.85, 1.35, 0);
  leftArm.rotation.z = 0.1;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, skin);
  rightArm.position.set(0.85, 1.35, 0);
  rightArm.rotation.z = -0.1;
  group.add(rightArm);

  const leftForearm = new THREE.Mesh(forearmGeo, skin);
  leftForearm.position.set(-0.85, 0.8, 0);
  leftForearm.rotation.z = 0.2;
  group.add(leftForearm);

  const rightForearm = new THREE.Mesh(forearmGeo, skin);
  rightForearm.position.set(0.85, 0.8, 0);
  rightForearm.rotation.z = -0.2;
  group.add(rightForearm);

  const leftLeg = new THREE.Mesh(legGeo, mat);
  leftLeg.position.set(-0.35, 0.1, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, mat);
  rightLeg.position.set(0.35, 0.1, 0);
  group.add(rightLeg);

  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.4 });
  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), shoeMat);
  leftShoe.position.set(-0.35, -0.35, 0.15);
  group.add(leftShoe);

  const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), shoeMat);
  rightShoe.position.set(0.35, -0.35, 0.15);
  group.add(rightShoe);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.2 });
  const eyeGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.14, 2.2, 0.4);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.14, 2.2, 0.4);
  group.add(rightEye);

  const shirt = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.6, 0.62), accent);
  shirt.position.y = 1.1;
  group.add(shirt);

  return group;
};

const player = createCharacter(0x6ae6c3);
player.position.set(0, 0, 0);
scene.add(player);

const createDog = (color, options = {}) => {
  const dog = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.9 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.2 });

  const bodyRadius = options.bodyRadius ?? 0.55;
  const bodyLength = options.bodyLength ?? 1.2;
  const headScale = options.headScale ?? 1;
  const snoutLength = options.snoutLength ?? 0.5;
  const legHeight = options.legHeight ?? 0.7;
  const legRadius = options.legRadius ?? 0.12;
  const earScale = options.earScale ?? 1;
  const tailLength = options.tailLength ?? 0.6;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(bodyRadius, bodyLength, 6, 14), fur);
  torso.rotation.z = Math.PI / 2;
  torso.position.y = 0.75;
  dog.add(torso);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(bodyRadius, 18, 18), fur);
  chest.position.set(0.9, 0.75, 0);
  dog.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45 * headScale, 18, 18), fur);
  head.position.set(1.55, 0.95 + 0.1 * (headScale - 1), 0);
  dog.add(head);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * headScale, 0.26 * headScale, snoutLength, 12), fur);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(1.95, 0.82, 0);
  dog.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.12 * headScale, 12, 12), dark);
  nose.position.set(2.2, 0.82, 0);
  dog.add(nose);

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.07 * headScale, 10, 10), eyeMat);
  leftEye.position.set(1.7, 1.0, 0.18);
  dog.add(leftEye);
  const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.07 * headScale, 10, 10), eyeMat);
  rightEye.position.set(1.7, 1.0, -0.18);
  dog.add(rightEye);

  const earGeo = new THREE.ConeGeometry(0.18 * earScale, 0.35 * earScale, 12);
  const earLeft = new THREE.Mesh(earGeo, fur);
  earLeft.position.set(1.5, 1.25, 0.25);
  earLeft.rotation.z = -0.6;
  dog.add(earLeft);

  const earRight = new THREE.Mesh(earGeo, fur);
  earRight.position.set(1.5, 1.25, -0.25);
  earRight.rotation.z = -0.6;
  dog.add(earRight);

  const legGeo = new THREE.CylinderGeometry(legRadius, legRadius + 0.02, legHeight, 10);
  const legPositions = [
    [-0.6, 0.2, 0.35],
    [-0.6, 0.2, -0.35],
    [0.7, 0.2, 0.35],
    [0.7, 0.2, -0.35],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, fur);
    leg.position.set(x, y, z);
    dog.add(leg);
  });

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, tailLength, 10), fur);
  tail.position.set(-1.15, 0.95, 0);
  tail.rotation.z = 0.6;
  dog.add(tail);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 10, 22), new THREE.MeshStandardMaterial({ color: 0xe84c3d }));
  collar.position.set(1.2, 0.9, 0);
  collar.rotation.x = Math.PI / 2;
  dog.add(collar);

  return dog;
};

const golden = createDog(0xf4b23c);
const bulldog = createDog(0xf2f2f2, {
  bodyRadius: 0.7,
  bodyLength: 0.9,
  headScale: 1.25,
  snoutLength: 0.35,
  legHeight: 0.5,
  legRadius: 0.14,
  earScale: 0.75,
  tailLength: 0.3,
});
bulldog.scale.set(1.1, 0.95, 1.1);
const ghostDog = createDog(0xf2f2f2, {
  bodyRadius: 0.6,
  bodyLength: 1.1,
  headScale: 1.1,
  snoutLength: 0.45,
  legHeight: 0.6,
  legRadius: 0.12,
  earScale: 1.1,
  tailLength: 0.5,
});
ghostDog.traverse((child) => {
  if (child.isMesh) {
    child.material = child.material.clone();
    child.material.transparent = true;
    child.material.opacity = 0.35;
    child.material.emissive = new THREE.Color(0xa9dbff);
    child.material.emissiveIntensity = 0.8;
  }
});
const ghostTail = new THREE.Mesh(
  new THREE.ConeGeometry(0.9, 1.6, 16, 1, true),
  new THREE.MeshStandardMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.25, emissive: new THREE.Color(0xa9dbff), emissiveIntensity: 0.8 })
);
ghostTail.position.set(-0.6, 0.1, 0);
ghostTail.rotation.z = Math.PI / 2;
ghostDog.add(ghostTail);
const bulldogPatch = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.6 })
);
bulldogPatch.position.set(1.4, 1.0, 0.28);
bulldog.add(bulldogPatch);

golden.position.set(-6, 0, -6);
bulldog.position.set(8, 0, 6);
ghostDog.position.set(-12, 0, 12);

scene.add(golden, bulldog, ghostDog);

const keys = new Set();
let pointerLocked = false;
let yaw = 0;
let pitch = 0;
let mobileYaw = 0;
let mobilePitch = 0;
let runningTouch = false;
const uiPointers = new Set();
let movePointer = null;
let moveOrigin = { x: 0, y: 0 };
let moveVector = { x: 0, y: 0 };

const safeSetCapture = (el, id) => {
  if (!el || typeof el.setPointerCapture !== "function") return;
  try {
    el.setPointerCapture(id);
  } catch (err) {
    // Ignore capture errors on some mobile browsers.
  }
};

const safeReleaseCapture = (el, id) => {
  if (!el || typeof el.releasePointerCapture !== "function") return;
  try {
    el.releasePointerCapture(id);
  } catch (err) {
    // Ignore capture errors on some mobile browsers.
  }
};

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const onKey = (event, down) => {
  if (down) keys.add(event.code);
  else keys.delete(event.code);
};

window.addEventListener("keydown", (e) => onKey(e, true));
window.addEventListener("keyup", (e) => onKey(e, false));

const onMouseMove = (event) => {
  if (!pointerLocked) return;
  yaw -= event.movementX * 0.002;
  pitch -= event.movementY * 0.002;
  pitch = Math.max(-1.1, Math.min(1.1, pitch));
};

window.addEventListener("mousemove", onMouseMove);

renderer.domElement.addEventListener("click", () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
});

if (moveZone) {
  moveZone.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uiPointers.add(e.pointerId);
    movePointer = e.pointerId;
    moveOrigin = { x: e.clientX, y: e.clientY };
    safeSetCapture(moveZone, e.pointerId);
  });

  moveZone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== movePointer) return;
    const dx = e.clientX - moveOrigin.x;
    const dy = e.clientY - moveOrigin.y;
    const max = 60;
    const nx = THREE.MathUtils.clamp(dx / max, -1, 1);
    const ny = THREE.MathUtils.clamp(dy / max, -1, 1);
    moveVector = { x: nx, y: ny };
  });

  const endMove = (e) => {
    if (e.pointerId !== movePointer) return;
    safeReleaseCapture(moveZone, e.pointerId);
    uiPointers.delete(e.pointerId);
    movePointer = null;
    moveVector = { x: 0, y: 0 };
  };
  moveZone.addEventListener("pointerup", endMove);
  moveZone.addEventListener("pointercancel", endMove);
}

if (runBtn) {
  const setRun = (on) => {
    runningTouch = on;
    runBtn.style.transform = on ? "scale(0.96)" : "scale(1)";
  };
  runBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    uiPointers.add(e.pointerId);
    setRun(true);
  });
  runBtn.addEventListener("pointerup", (e) => {
    uiPointers.delete(e.pointerId);
    setRun(false);
  });
  runBtn.addEventListener("pointercancel", (e) => {
    uiPointers.delete(e.pointerId);
    setRun(false);
  });
}

let lookPointer = null;
let lookLastX = 0;
let lookLastY = 0;

const lookTarget = lookZone || renderer.domElement;

lookTarget.addEventListener("pointerdown", (e) => {
  if (window.matchMedia("(pointer: coarse)").matches) {
    if (!uiPointers.has(e.pointerId)) {
      lookPointer = e.pointerId;
      lookLastX = e.clientX;
      lookLastY = e.clientY;
      safeSetCapture(lookTarget, lookPointer);
    }
  } else {
    renderer.domElement.requestPointerLock();
  }
});

lookTarget.addEventListener("pointermove", (e) => {
  if (lookPointer !== null && e.pointerId === lookPointer) {
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    mobileYaw -= dx * 0.0022;
    mobilePitch -= dy * 0.0022;
  }
});

lookTarget.addEventListener("pointerup", (e) => {
  if (e.pointerId === lookPointer) {
    safeReleaseCapture(lookTarget, lookPointer);
    lookPointer = null;
  }
});

lookTarget.addEventListener("pointercancel", () => {
  lookPointer = null;
});

const updateCamera = () => {
  const distance = 6;
  const height = 3.5;
  const offsetX = Math.sin(yaw) * distance;
  const offsetZ = Math.cos(yaw) * distance;
  camera.position.set(player.position.x + offsetX, height + pitch, player.position.z + offsetZ);
  camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

  flashlight.position.set(player.position.x, player.position.y + 2.2, player.position.z);
  const lookDir = new THREE.Vector3(Math.sin(yaw), -0.05, Math.cos(yaw));
  flashlight.target.position.copy(player.position.clone().add(lookDir.multiplyScalar(6)));
};


const clampPosition = () => {
  const limit = WORLD_SIZE / 2 - 4;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -limit, limit);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -limit, limit);
};

const createSausage = (x, z) => {
  const sausage = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xd07a43, roughness: 0.6 });
  const casing = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 6, 12), baseMat);
  casing.rotation.z = Math.PI / 2;
  casing.position.y = 0.35;
  sausage.add(casing);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 16), new THREE.MeshStandardMaterial({ color: 0x7a3f21 }));
  band.position.set(-0.25, 0.35, 0);
  band.rotation.y = Math.PI / 2;
  sausage.add(band);

  sausage.position.set(x, 0, z);
  scene.add(sausage);
  return sausage;
};

const createToy = (x, z) => {
  const toy = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.5 })
  );
  base.position.y = 0.35;
  toy.add(base);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.08, 10, 18),
    new THREE.MeshStandardMaterial({ color: 0x4ec5ff, roughness: 0.4 })
  );
  ring.position.y = 0.35;
  ring.rotation.x = Math.PI / 2;
  toy.add(ring);

  toy.position.set(x, 0, z);
  scene.add(toy);
  return toy;
};

const sausagePositions = [
  [-20, -8],
  [10, -26],
  [24, 16],
  [-30, 18],
  [4, 26],
  [-8, 30],
  [18, -34],
  [-34, -14],
  [30, 30],
  [-2, 14],
];

const toyPositions = [
  [-26, 6],
  [14, -28],
  [26, 22],
  [-18, 26],
  [6, 30],
  [-10, -30],
  [20, -10],
  [-30, -22],
  [32, 10],
  [0, 18],
];

let collected = 0;
const updateCollectiblesUI = () => {
  sausagesEl.textContent = `${collected}/${collectibles.length}`;
  levelEl.textContent = `${currentLevel}`;
  objectiveEl.textContent = currentLevel === 1 ? "Salchichas" : "Juguetes";
};

const checkCaught = () => {
  const d1 = player.position.distanceTo(golden.position);
  const d2 = player.position.distanceTo(bulldog.position);
  const d3 = player.position.distanceTo(ghostDog.position);
  if (Math.min(d1, d2, d3) < 1.5) {
    gameRunning = false;
    stateEl.textContent = "Atrapado";
    setOverlay("Pierdes", "Los perros te alcanzaron. Reinicia la ronda.");
  }
};

const checkCollectibles = () => {
  if (!gameRunning) return;
  collectibles.forEach((s) => {
    if (!s.visible) return;
    if (player.position.distanceTo(s.position) < 1.3) {
      s.visible = false;
      collected += 1;
      updateCollectiblesUI();
      if (collected >= collectibles.length) {
        levelPhase = "reward";
        stateEl.textContent = "Premio";
      }
    }
  });
};

const updateDogs = (delta) => {
  const chaseSpeed = 1.5;
  const ghostSpeed = 2.2;
  if (levelPhase === "reward") {
    [golden, bulldog].forEach((dog) => {
      const toPlayer = player.position.clone().sub(dog.position);
      if (toPlayer.length() > 1.8) {
        toPlayer.normalize();
        dog.position.add(toPlayer.multiplyScalar(chaseSpeed * delta));
      }
    });
  } else {
    [golden, bulldog].forEach((dog) => {
      const toPlayer = player.position.clone().sub(dog.position);
      const distance = toPlayer.length();
      if (distance < 18) {
        toPlayer.normalize();
        dog.position.add(toPlayer.multiplyScalar(chaseSpeed * delta));
      }
    });
  }

  const ghostToPlayer = player.position.clone().sub(ghostDog.position);
  const ghostDistance = ghostToPlayer.length();
  if (ghostDistance < 30) {
    ghostToPlayer.normalize();
    ghostDog.position.add(ghostToPlayer.multiplyScalar(ghostSpeed * delta));
  }
};

let dayTime = 0;
const updateDayNight = (delta) => {
  if (currentLevel !== 1) return;
  dayTime = (dayTime + delta * 0.03) % 1;
  const angle = dayTime * Math.PI * 2;
  const radius = 30;
  const sunX = Math.cos(angle) * radius;
  const sunY = Math.sin(angle) * radius + 8;
  const sunZ = Math.sin(angle * 0.7) * radius;
  sun.position.set(sunX, sunY, sunZ);
  dir.position.set(sunX, sunY, sunZ);

  const skyDay = new THREE.Color(0x7cc7ff);
  const skyEvening = new THREE.Color(0xf7b07b);
  const t = Math.max(0, Math.sin(angle));
  scene.background = skyEvening.clone().lerp(skyDay, t);
  scene.fog.color.copy(scene.background);
  hemi.intensity = 0.55 + t * 0.35;
  dir.intensity = 0.4 + t * 0.8;
};

const stars = new THREE.Group();
const createStars = () => {
  stars.clear();
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 120; i += 1) {
    const star = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), starMat);
    star.position.set(
      THREE.MathUtils.randFloatSpread(140),
      THREE.MathUtils.randFloat(18, 60),
      THREE.MathUtils.randFloatSpread(140)
    );
    stars.add(star);
  }
  scene.add(stars);
};

const setDayMode = () => {
  scene.background = new THREE.Color(0x7cc7ff);
  scene.fog.color = new THREE.Color(0x7cc7ff);
  hemi.intensity = 0.75;
  dir.intensity = 1.0;
  sun.visible = true;
  stars.visible = false;
  flashlight.visible = false;
};

const setNightMode = () => {
  scene.background = new THREE.Color(0x08111f);
  scene.fog.color = new THREE.Color(0x08111f);
  hemi.intensity = 0.25;
  dir.intensity = 0.2;
  sun.visible = false;
  stars.visible = true;
  flashlight.visible = true;
};

const setupLevel = (level) => {
  currentLevel = level;
  collected = 0;
  collectibles.forEach((c) => scene.remove(c));
  collectibles = [];

  if (level === 1) {
    collectibles = sausagePositions.map(([x, z]) => createSausage(x, z));
    setDayMode();
  } else {
    collectibles = toyPositions.map(([x, z]) => createToy(x, z));
    setNightMode();
  }

  collectibles.forEach((c) => (c.visible = true));
  updateCollectiblesUI();
  levelPhase = "play";
  gameRunning = true;
  stateEl.textContent = "Oculto";
};

createStars();
setupLevel(1);

const updatePlayer = (delta) => {
  if (!gameRunning) return;
  direction.set(0, 0, 0);
  const speed = keys.has("ShiftLeft") || runningTouch ? 7 : 4;

  if (keys.has("KeyW") || keys.has("ArrowUp")) direction.z -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) direction.z += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) direction.x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) direction.x += 1;

  if (Math.abs(moveVector.x) > 0.1 || Math.abs(moveVector.y) > 0.1) {
    direction.x += moveVector.x;
    direction.z += moveVector.y;
  }

  if (direction.lengthSq() > 0) {
    direction.normalize();
  }

  yaw += mobileYaw;
  pitch += mobilePitch;
  pitch = Math.max(-1.1, Math.min(1.1, pitch));
  mobileYaw *= 0.85;
  mobilePitch *= 0.85;

  const angle = yaw;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  velocity.set(
    (direction.x * cos - direction.z * sin) * speed * delta,
    0,
    (direction.z * cos + direction.x * sin) * speed * delta
  );

  player.position.add(velocity);
  clampPosition();
};

const animate = () => {
  const delta = clock.getDelta();
  updatePlayer(delta);
  updateDogs(delta);
  updateDayNight(delta);
  updateCamera();
  checkCaught();
  checkCollectibles();
  if (levelPhase === "reward") {
    const gDist = player.position.distanceTo(golden.position);
    const bDist = player.position.distanceTo(bulldog.position);
    if (gDist < 2 && bDist < 2) {
      levelPhase = "transition";
      gameRunning = false;
      setOverlay("Nivel completado", "Los perros recibieron las salchichas. Pasas al nivel 2.");
      setTimeout(() => {
        hideOverlay();
        setupLevel(2);
      }, 1200);
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
};

restartBtn.addEventListener("click", () => {
  hideOverlay();
  gameRunning = true;
  stateEl.textContent = "Oculto";
  collected = 0;
  collectibles.forEach((s) => (s.visible = true));
  updateCollectiblesUI();
  player.position.set(0, 0, 0);
  golden.position.set(-6, 0, -6);
  bulldog.position.set(8, 0, 6);
  ghostDog.position.set(-12, 0, 12);
});


window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
