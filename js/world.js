import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const GOLD = 0xe8a83c;
const GOLD_DIM = 0x8a5a16;
const BG = 0x0a0a0b;

const PRODUCTS = [
  { img: "./assets/planeja.jpg", x: 1.35, y: 0.35, z: -14, rot: -0.18 },
  { img: "./assets/tatame.jpg", x: -1.45, y: 0.2, z: -32, rot: 0.2 },
  { img: "./assets/nutribase.jpg", x: 1.4, y: 0.28, z: -50, rot: -0.16 },
  { img: "./assets/teachershub.jpg", x: -1.35, y: 0.22, z: -68, rot: 0.18 },
  { img: "./assets/fisio360.jpg", x: 1.3, y: 0.25, z: -86, rot: -0.14 },
  { img: "./assets/ma-manutencao.jpg", x: -1.25, y: 0.18, z: -104, rot: 0.16 },
];

const CAM_KEYS = [
  { z: 10, x: 0, y: 1.35, lookZ: -6 },
  { z: -8, x: -0.35, y: 0.55, lookZ: -14 },
  { z: -26, x: 0.4, y: 0.45, lookZ: -32 },
  { z: -44, x: -0.35, y: 0.5, lookZ: -50 },
  { z: -62, x: 0.35, y: 0.45, lookZ: -68 },
  { z: -80, x: -0.3, y: 0.48, lookZ: -86 },
  { z: -98, x: 0.25, y: 0.42, lookZ: -104 },
  { z: -118, x: 0, y: 0.9, lookZ: -128 },
];

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.querySelector("#webgl");
const loader = document.querySelector("#loader");
const fail = document.querySelector(".webgl-fail");
const panels = [...document.querySelectorAll(".panel")];

function webglOk() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpKey(progress) {
  const max = CAM_KEYS.length - 1;
  const x = progress * max;
  const i = Math.min(max - 1, Math.floor(x));
  const t = x - i;
  const A = CAM_KEYS[i];
  const B = CAM_KEYS[i + 1];
  return {
    x: lerp(A.x, B.x, t),
    y: lerp(A.y, B.y, t),
    z: lerp(A.z, B.z, t),
    lookZ: lerp(A.lookZ, B.lookZ, t),
  };
}

function makeFrame(texture, w, h) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.55,
    metalness: 0.08,
    emissive: new THREE.Color(GOLD),
    emissiveIntensity: 0.08,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  plane.position.z = 0.04;
  group.add(plane);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0x141418,
      metalness: 0.7,
      roughness: 0.35,
      emissive: new THREE.Color(GOLD_DIM),
      emissiveIntensity: 0.25,
    })
  );
  back.position.z = -0.02;
  group.add(back);

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(w + 0.2, h + 0.2)),
    new THREE.LineBasicMaterial({ color: GOLD })
  );
  edge.position.z = 0.06;
  group.add(edge);
  return group;
}

function makeBarcode(x, z) {
  const g = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const h = 0.25 + Math.random() * 1.8;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, h, 0.07),
      new THREE.MeshStandardMaterial({
        color: GOLD,
        metalness: 0.85,
        roughness: 0.25,
        emissive: GOLD,
        emissiveIntensity: 0.35,
      })
    );
    mesh.position.set(x + i * 0.11, h / 2 - 1.6, z);
    g.add(mesh);
  }
  return g;
}

async function boot() {
  if (!webglOk()) {
    fail.hidden = false;
    loader.classList.add("is-done");
    panels.forEach((p) => p.classList.add("is-on"));
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(BG, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.028);

  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    220
  );
  camera.position.set(0, 1.35, 10);

  const loader3 = new THREE.TextureLoader();
  const textures = await Promise.all(
    PRODUCTS.map(
      (p) =>
        new Promise((resolve) => {
          loader3.load(
            p.img,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              resolve(tex);
            },
            undefined,
            () => resolve(null)
          );
        })
    )
  );

  scene.add(new THREE.AmbientLight(0x4a3a22, 0.45));
  const sun = new THREE.DirectionalLight(0xffe2a8, 1.15);
  sun.position.set(4, 10, 6);
  scene.add(sun);
  const lamp = new THREE.PointLight(GOLD, 18, 28, 2);
  scene.add(lamp);

  const grid = new THREE.GridHelper(240, 90, GOLD, 0x3a2a10);
  grid.position.y = -1.85;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240),
    new THREE.MeshStandardMaterial({ color: 0x070708, metalness: 0.2, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.86;
  scene.add(floor);

  const frames = [];
  PRODUCTS.forEach((p, i) => {
    const tex = textures[i];
    if (!tex) return;
    const aspect = (tex.image?.width || 16) / (tex.image?.height || 9);
    const w = 3.4;
    const h = w / aspect;
    const frame = makeFrame(tex, w, Math.min(h, 2.15));
    frame.position.set(p.x, p.y, p.z);
    frame.rotation.y = p.rot;
    scene.add(frame);
    frames.push(frame);
    scene.add(makeBarcode(p.x + (p.x > 0 ? -2.6 : 1.1), p.z + 1.2));
  });

  const cubeGeo = new THREE.BoxGeometry(0.22, 1, 0.22);
  const cubeMat = new THREE.MeshStandardMaterial({
    color: GOLD,
    metalness: 0.8,
    roughness: 0.3,
    emissive: GOLD,
    emissiveIntensity: 0.2,
  });
  const COUNT = reduced ? 80 : 220;
  const cubes = new THREE.InstancedMesh(cubeGeo, cubeMat, COUNT);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < COUNT; i++) {
    const s = 0.4 + Math.random() * 2.2;
    dummy.position.set(
      (Math.random() - 0.5) * 28,
      s / 2 - 1.85,
      -Math.random() * 140
    );
    dummy.scale.set(1, s, 1);
    dummy.updateMatrix();
    cubes.setMatrixAt(i, dummy.matrix);
  }
  scene.add(cubes);

  const dustGeo = new THREE.BufferGeometry();
  const n = reduced ? 200 : 700;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = Math.random() * 10;
    pos[i * 3 + 2] = -Math.random() * 150;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xffe7b0, size: 0.035, transparent: true, opacity: 0.55 })
  );
  scene.add(dust);

  let composer = null;
  if (!reduced) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.42, 0.5, 0.22)
    );
  }

  const mouse = { x: 0, y: 0 };
  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  let progress = 0;
  const look = new THREE.Vector3();

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer?.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis && !reduced) {
    const lenis = new Lenis({ lerp: 0.08 });
    window.__lenis = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const st = ScrollTrigger.create({
    trigger: "#scroll-root",
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      progress = self.progress;
      const idx = Math.min(panels.length - 1, Math.round(progress * (panels.length - 1)));
      panels.forEach((p, i) => p.classList.toggle("is-on", i === idx));
    },
  });
  panels[0].classList.add("is-on");

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    const cam = lerpKey(progress);
    camera.position.x = lerp(camera.position.x, cam.x + mouse.x * 0.35, 0.08);
    camera.position.y = lerp(camera.position.y, cam.y + mouse.y * -0.18, 0.08);
    camera.position.z = lerp(camera.position.z, cam.z, 0.08);
    look.set(mouse.x * 0.4, 0.2 - mouse.y * 0.15, cam.lookZ);
    camera.lookAt(look);
    lamp.position.set(camera.position.x, camera.position.y + 1.2, camera.position.z - 4);
    frames.forEach((f, i) => {
      f.rotation.y = PRODUCTS[i].rot + Math.sin(t * 0.6 + i) * 0.04;
      f.position.y = PRODUCTS[i].y + Math.sin(t * 0.9 + i * 0.7) * 0.06;
    });
    dust.rotation.y = t * 0.015;
    if (composer) composer.render();
    else renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
  st.refresh();
  loader.classList.add("is-done");
}

boot().catch(() => {
  fail.hidden = false;
  loader.classList.add("is-done");
  panels.forEach((p) => p.classList.add("is-on"));
});
