import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeShoe, PALETTE } from './shoe.js';

const lerp = THREE.MathUtils.lerp;
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const range = (p, a, b) => clamp01((p - a) / (b - a));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function baseRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

function envFor(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}

// roda o loop só quando o canvas está visível
function visibilityLoop(canvas, tick) {
  let visible = false, raf = 0, last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt, now / 1000);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }, { rootMargin: '100px' }).observe(canvas);
}

function fitRenderer(renderer, camera, canvas, onResize) {
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    onResize?.(w, h);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
}

/* =========================================================
   HERO — sandália girando sobre a mesinha redonda da loja
   ========================================================= */
export function createHero(canvas, { reduced = false } = {}) {
  const renderer = baseRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 1.9, 9.2);

  // luz
  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x8a4a30, 0.6));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(3.5, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -3;
  key.shadow.camera.right = key.shadow.camera.top = 3;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.PointLight(0xff6a3d, 14, 12);
  rim.position.set(-3, 2.5, -2.5);
  scene.add(rim);

  // mesa redonda branca com pés de madeira (igual à da loja)
  const table = new THREE.Group();
  const topMat = new THREE.MeshPhysicalMaterial({ color: 0xf7f2ea, roughness: 0.35, clearcoat: 0.5 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.08, 96), topMat);
  top.position.y = -0.045;
  top.receiveShadow = true;
  table.add(top);
  const wood = new THREE.MeshStandardMaterial({ color: 0x3b2418, roughness: 0.55 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 3.2, 12), wood);
    leg.position.set(Math.cos(a) * 0.7, -1.65, Math.sin(a) * 0.7);
    leg.rotation.set(Math.sin(a) * -0.16, 0, Math.cos(a) * 0.16);
    leg.castShadow = true;
    table.add(leg);
  }
  scene.add(table);

  // sandália
  const pivot = new THREE.Group();
  const shoe = makeShoe();
  shoe.scale.setScalar(1.3);
  pivot.add(shoe);
  scene.add(pivot);

  // poeira dourada flutuando
  const N = 140;
  const dustGeo = new THREE.BufferGeometry();
  const arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) arr.set([(Math.random() - 0.5) * 9, Math.random() * 4 - 0.6, (Math.random() - 0.5) * 5], i * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: PALETTE.gold, size: 0.025, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(dust);

  // estado
  const state = {
    intro: 0,          // 0→1 entrada após loader
    scroll: 0,         // progresso do scroll no hero
    rotY: -0.6, velY: 0,
    mx: 0, my: 0, sx: 0, sy: 0,
    dragging: false, lastX: 0,
  };

  let tableY = -0.9;
  fitRenderer(renderer, camera, canvas, (w) => {
    const narrow = w < 700;
    camBase.set(0, narrow ? 2.6 : 1.9, narrow ? 17 : 9.2);
    tableY = narrow ? -0.4 : -0.9;
  });

  // interação
  window.addEventListener('pointermove', (e) => {
    state.mx = (e.clientX / innerWidth) * 2 - 1;
    state.my = (e.clientY / innerHeight) * 2 - 1;
    if (state.dragging) {
      const dx = e.clientX - state.lastX;
      state.lastX = e.clientX;
      state.velY = dx * 0.006;
      state.rotY += dx * 0.01;
    }
  });
  canvas.addEventListener('pointerdown', (e) => { state.dragging = true; state.lastX = e.clientX; });
  window.addEventListener('pointerup', () => (state.dragging = false));

  visibilityLoop(canvas, (dt, t) => {
    const intro = ease(state.intro);
    const s = state.scroll;

    if (!state.dragging) {
      state.velY *= 0.94;
      state.rotY += state.velY + (reduced ? 0 : dt * 0.35);
    }
    state.sx += (state.mx - state.sx) * 0.05;
    state.sy += (state.my - state.sy) * 0.05;

    table.position.y = tableY - (1 - intro) * 0.4 - s * 0.8;
    pivot.position.y = tableY + (1 - intro) * 3.2 + (Math.sin(t * 1.4) * 0.5 + 0.5) * 0.05 * intro + 0.01 + s * 0.6;
    pivot.rotation.y = state.rotY + (1 - intro) * 2.4 + s * 2.2;
    pivot.rotation.z = Math.sin(t * 0.9) * 0.03 + state.sy * 0.06 - s * 0.25;
    pivot.rotation.x = state.sx * 0.05;
    topMat.opacity = 1;

    dust.rotation.y = t * 0.02;
    dust.position.y = Math.sin(t * 0.3) * 0.1;

    camera.position.set(camBase.x + state.sx * 0.5, camBase.y - state.sy * 0.3 + s * 0.4, camBase.z - s * 1.5);
    camera.lookAt(0, tableY + 0.95 + s * 0.3, 0);
    renderer.render(scene, camera);
  });

  return {
    setIntro: (v) => (state.intro = v),
    setScroll: (v) => (state.scroll = v),
    state,
  };
}

/* =========================================================
   CAIXA — caixa kraft PIVÔ abre e revela a sandália
   ========================================================= */
function kraftTexture(withLogo) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  g.fillStyle = '#b5824f';
  g.fillRect(0, 0, 1024, 1024);
  // fibras do papelão
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 1024, y = Math.random() * 1024;
    g.fillStyle = Math.random() > 0.5 ? 'rgba(90,55,25,0.07)' : 'rgba(255,235,200,0.07)';
    g.fillRect(x, y, Math.random() * 18 + 2, 1.2);
  }
  if (withLogo) {
    g.fillStyle = '#8f3a22';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '200 300px Antonio, "Arial Narrow", sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '24px';
    g.fillText('PIVÔ', 512, 480);
    g.font = '600 30px Manrope, sans-serif';
    if ('letterSpacing' in g) g.letterSpacing = '10px';
    g.fillText('O SEU ESTILO TE MOVE', 512, 700);
    g.strokeStyle = '#8f3a22';
    g.lineWidth = 3;
    g.strokeRect(60, 250, 904, 524);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createBox(canvas, { reduced = false } = {}) {
  const renderer = baseRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = envFor(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xfff4e4, 0x6b3a22, 0.7));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.2);
  key.position.set(4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4;
  key.shadow.radius = 8;
  scene.add(key);
  const glow = new THREE.PointLight(0xffb27a, 0, 4);
  glow.position.set(0, 0.5, 0);
  scene.add(glow);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);

  const L = 2.7, W = 1.45, H = 0.85, T = 0.03;
  const kraft = new THREE.MeshStandardMaterial({ map: kraftTexture(false), roughness: 0.9 });
  const inside = new THREE.MeshStandardMaterial({ color: 0xa87a4c, roughness: 0.95 });
  const box = new THREE.Group();
  const panel = (w, h, d, x, y, z, mat = [kraft, kraft, kraft, kraft, kraft, kraft]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    box.add(m);
  };
  // materiais por face: [+x, -x, +y, -y, +z, -z]
  panel(L, T, W, 0, T / 2, 0, [kraft, kraft, inside, kraft, kraft, kraft]);
  panel(L, H, T, 0, H / 2, W / 2, [kraft, kraft, kraft, kraft, kraft, inside]);
  panel(L, H, T, 0, H / 2, -W / 2, [kraft, kraft, kraft, kraft, inside, kraft]);
  panel(T, H, W, L / 2, H / 2, 0, [kraft, inside, kraft, kraft, kraft, kraft]);
  panel(T, H, W, -L / 2, H / 2, 0, [inside, kraft, kraft, kraft, kraft, kraft]);

  // papel de seda cor ferrugem amassado
  const tissueGeo = new THREE.PlaneGeometry(L * 1.05, W * 1.6, 60, 40);
  const tp = tissueGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i);
    const edge = Math.abs(y) / (W * 0.8);
    tp.setZ(i, Math.sin(x * 7.3 + y * 3.1) * 0.03 + Math.sin(x * 2.1 - y * 9.7) * 0.02 + Math.pow(edge, 3) * 0.55);
  }
  tissueGeo.computeVertexNormals();
  const tissue = new THREE.Mesh(tissueGeo, new THREE.MeshStandardMaterial({ color: PALETTE.rust, roughness: 0.7, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
  tissue.rotation.x = -Math.PI / 2;
  tissue.position.y = 0.1;
  tissue.scale.set(0.97, 0.56, 1);
  box.add(tissue);
  scene.add(box);

  // tampa
  const lid = new THREE.Group();
  const LH = 0.26, M = 0.04;
  const logoMat = new THREE.MeshStandardMaterial({ map: kraftTexture(true), roughness: 0.85 });
  const lidPanel = (w, h, d, x, y, z, mats) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    lid.add(m);
    return m;
  };
  const lidTop = lidPanel(L + M * 2, T, W + M * 2, 0, 0, 0, [kraft, kraft, logoMat, inside, kraft, kraft]);
  // ajusta UV do topo para a proporção da tampa (logo não esticada)
  {
    const uv = lidTop.geometry.attributes.uv;
    const aspect = (L + M * 2) / (W + M * 2);
    for (let i = 8; i < 12; i++) { // face +y
      uv.setX(i, 0.5 + (uv.getX(i) - 0.5));
      uv.setY(i, 0.5 + (uv.getY(i) - 0.5) / aspect);
    }
  }
  lidPanel(L + M * 2, LH, T, 0, -LH / 2, W / 2 + M, [kraft, kraft, kraft, kraft, kraft, inside]);
  lidPanel(L + M * 2, LH, T, 0, -LH / 2, -W / 2 - M, [kraft, kraft, kraft, kraft, inside, kraft]);
  lidPanel(T, LH, W + M * 2, L / 2 + M, -LH / 2, 0, [kraft, inside, kraft, kraft, kraft, kraft]);
  lidPanel(T, LH, W + M * 2, -L / 2 - M, -LH / 2, 0, [inside, kraft, kraft, kraft, kraft, kraft]);
  scene.add(lid);

  // sandália dentro
  const shoePivot = new THREE.Group();
  const shoe = makeShoe();
  shoe.scale.setScalar(0.62);
  shoePivot.add(shoe);
  scene.add(shoePivot);

  const state = { target: 0, p: 0, mx: 0, sx: 0 };
  let dist = 9, offX = 0, offY = 0, zoomK = 0.8;
  fitRenderer(renderer, camera, canvas, (w, h) => {
    dist = w / h < 0.8 ? 13.5 : 9;
    offX = w / h > 1.2 ? -1.3 : 0; // desloca a caixa para a direita no desktop
    offY = w / h < 0.8 ? 0.9 : 0;
    zoomK = w / h < 0.8 ? 1.05 : 0.8; // no celular sobe a cena para o texto final caber embaixo
  });
  window.addEventListener('pointermove', (e) => (state.mx = (e.clientX / innerWidth) * 2 - 1));

  visibilityLoop(canvas, (dt, t) => {
    state.p += (state.target - state.p) * (reduced ? 1 : 1 - Math.exp(-dt * 6));
    state.sx += (state.mx - state.sx) * 0.05;
    const p = state.p;

    const open = easeIO(range(p, 0.12, 0.42));
    const rise = easeIO(range(p, 0.34, 0.72));
    const push = easeIO(range(p, 0.55, 1));

    box.rotation.y = lerp(-0.75, -0.25, ease(range(p, 0, 0.5))) + state.sx * 0.08;
    box.position.y = -0.2;

    // tampa sobe, inclina e sai para trás
    lid.rotation.copy(box.rotation);
    const lidUp = lerp(H + LH, H + LH + 2.4, open);
    lid.position.set(
      Math.sin(box.rotation.y) * -open * 0.6 - open * 1.4,
      box.position.y + lidUp + Math.sin(t * 1.2) * 0.03 * open,
      -open * 1.6
    );
    lid.rotation.x = -open * 0.55;
    lid.rotation.z = open * 0.22;

    glow.intensity = open * 6;
    glow.position.y = box.position.y + 0.6;

    // sandália emerge girando
    shoePivot.position.set(0, box.position.y + lerp(0.12, 1.4, rise) + Math.sin(t * 1.5) * 0.05 * rise, 0);
    shoePivot.rotation.y = box.rotation.y + rise * Math.PI * 2 + push * 0.6 + (reduced ? 0 : t * 0.25 * push);
    shoePivot.rotation.z = rise * -0.12;
    const sc = lerp(0.9, 1.5, rise);
    shoePivot.scale.setScalar(sc);

    camera.position.set(offX + state.sx * 0.4, lerp(4.2, 3.4, push) - offY * push, lerp(dist, dist * zoomK, push));
    camera.lookAt(offX, lerp(0.3, 1.3, rise) - offY * push, 0);
    renderer.render(scene, camera);
  });

  return { setProgress: (v) => (state.target = v) };
}
