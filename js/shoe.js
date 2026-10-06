// Sandália de salto fino PIVÔ — geometria procedural (sem modelo externo)
import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

export const PALETTE = {
  wine: 0x4a0f12,
  rust: 0x94280b,
  cream: 0xefe3cc,
  kraft: 0xc29767,
  gold: 0xc9a36a,
  ink: 0x1a1412,
};

const HEEL_H = 1.0;   // altura do salto
const X0 = -1.1;      // calcanhar
const X1 = 1.1;       // bico
const SOLE_T = 0.07; // espessura da sola

const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// perfil lateral da sola: altura em função de x
export function profile(x) {
  if (x < -0.62) return HEEL_H - (x - X0) * 0.07;
  if (x < 0.38) {
    const t = (x + 0.62) / 1.0;
    const top = HEEL_H - (-0.62 - X0) * 0.07;
    // cai rápido no arco e suaviza perto da planta do pé
    return 0.03 + (top - 0.03) * (1 - smooth(Math.pow(t, 0.85)));
  }
  const toe = clamp01((x - 0.72) / 0.38);
  return 0.03 + toe * toe * 0.12;
}

// meia largura da sola em função de u (0 = calcanhar, 1 = bico)
function halfWidth(u) {
  let w;
  if (u < 0.08) w = 0.16 * Math.sqrt(Math.max(0, 1 - ((0.08 - u) / 0.08) ** 2));
  else if (u < 0.7) w = 0.16 + (0.235 - 0.16) * smooth((u - 0.08) / 0.62);
  else w = 0.235 * Math.sqrt(Math.max(0, 1 - ((u - 0.7) / 0.3) ** 1.6)); // bico amendoado
  return Math.max(w, 0.0005);
}

function soleGeometry() {
  const n = 8; // superelipse => seção retangular arredondada
  const sp = (c) => Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const geo = new ParametricGeometry((u, v, target) => {
    const x = X0 + (X1 - X0) * u;
    const a = halfWidth(u);
    const th = v * Math.PI * 2;
    const b = SOLE_T / 2;
    const yc = profile(x) + b;
    target.set(x, yc + b * sp(Math.sin(th)), a * sp(Math.cos(th)));
  }, 140, 48);
  geo.computeVertexNormals();

  // cores por vértice: palmilha creme no topo, vinho nas laterais/base
  const uv = geo.attributes.uv;
  const colors = new Float32Array(uv.count * 3);
  const top = new THREE.Color(PALETTE.cream);
  const side = new THREE.Color(PALETTE.wine);
  const c = new THREE.Color();
  for (let i = 0; i < uv.count; i++) {
    const k = smooth(clamp01((Math.sin(uv.getY(i) * Math.PI * 2) - 0.7) / 0.2));
    c.copy(side).lerp(top, k);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

// fita (tira de couro) ao longo de uma curva, com largura numa direção fixa
function ribbon(pointAt, dirAt, width, segs = 80) {
  const p = new THREE.Vector3();
  const d = new THREE.Vector3();
  const geo = new ParametricGeometry((u, v, target) => {
    pointAt(u, p);
    dirAt(u, d);
    target.copy(p).addScaledVector(d, (v - 0.5) * width);
  }, segs, 2);
  geo.computeVertexNormals();
  return geo;
}

function strapOverFoot(xc, lean, width, rise) {
  // tira que passa por cima do peito do pé, apoiada nas bordas da sola
  return ribbon(
    (u, out) => {
      const phi = u * Math.PI;
      const x = xc + Math.sin(phi) * lean;
      const uu = (x - X0) / (X1 - X0);
      const hw = halfWidth(uu) * 1.02;
      const base = profile(x) + SOLE_T;
      out.set(x, base + Math.sin(phi) * rise, Math.cos(phi) * hw);
    },
    (u, out) => out.set(1, 0, 0),
    width
  );
}

export function makeShoe({ envIntensity = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'pivo-shoe';

  const patent = new THREE.MeshPhysicalMaterial({
    color: PALETTE.wine,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: envIntensity,
    side: THREE.DoubleSide,
  });
  const soleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.45,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: envIntensity,
  });
  const gold = new THREE.MeshStandardMaterial({ color: PALETTE.gold, metalness: 1, roughness: 0.22, envMapIntensity: envIntensity * 1.3 });
  const tip = new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.6 });

  const add = (geo, mat) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  // sola
  add(soleGeometry(), soleMat);

  // salto agulha (afinando para baixo, levemente inclinado)
  const heelTopX = -0.93;
  const heelTopY = profile(heelTopX);
  const heelGeo = new THREE.CylinderGeometry(0.095, 0.024, heelTopY, 40, 12);
  // inclina a ponta para frente deslocando vértices pela altura
  const pos = heelGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (heelTopY / 2 - y) / heelTopY; // 0 topo, 1 base
    pos.setX(i, pos.getX(i) + t * t * 0.12);
  }
  heelGeo.computeVertexNormals();
  const heel = add(heelGeo, patent);
  heel.position.set(heelTopX, heelTopY / 2, 0);
  heel.scale.z = 0.85;

  const cap = add(new THREE.CylinderGeometry(0.026, 0.024, 0.035, 20), tip);
  cap.position.set(heelTopX + 0.12, 0.0175, 0);

  // tiras do peito do pé (cruzadas)
  add(strapOverFoot(0.6, 0.0, 0.2, 0.2), patent);
  add(strapOverFoot(0.18, 0.1, 0.07, 0.3), patent);
  add(strapOverFoot(0.3, -0.12, 0.07, 0.27), patent);

  // tira do tornozelo
  const ankleC = new THREE.Vector3(-0.8, HEEL_H + 0.42, 0);
  add(ribbon(
    (u, out) => {
      const a = u * Math.PI * 2;
      out.set(ankleC.x + Math.cos(a) * 0.21, ankleC.y + Math.cos(a) * 0.035, ankleC.z + Math.sin(a) * 0.17);
    },
    (u, out) => out.set(0, 1, 0),
    0.055, 120
  ), patent);

  // tira traseira (calcanhar → tornozelo)
  add(ribbon(
    (u, out) => {
      const x = THREE.MathUtils.lerp(-1.08, ankleC.x - 0.205, u) - Math.sin(u * Math.PI) * 0.03;
      const y = THREE.MathUtils.lerp(profile(-1.08) + SOLE_T * 0.6, ankleC.y - 0.04, u);
      out.set(x, y, 0);
    },
    (u, out) => out.set(0, 0, 1),
    0.09
  ), patent);

  // laterais do calcanhar conectando ao tornozelo
  for (const s of [-1, 1]) {
    add(ribbon(
      (u, out) => {
        const x0 = -0.72, xu = THREE.MathUtils.lerp(x0, ankleC.x + 0.05, u);
        const z0 = halfWidth((x0 - X0) / (X1 - X0)) * s;
        const y = THREE.MathUtils.lerp(profile(x0) + SOLE_T, ankleC.y - 0.02, u);
        out.set(xu, y, THREE.MathUtils.lerp(z0, 0.17 * s, u) + Math.sin(u * Math.PI) * 0.02 * s);
      },
      (u, out) => out.set(1, 0, 0),
      0.05
    ), patent);
  }

  // fivela dourada
  const buckle = add(new THREE.TorusGeometry(0.045, 0.011, 12, 32), gold);
  buckle.position.set(ankleC.x, ankleC.y, 0.176);
  buckle.scale.set(1, 0.85, 1);

  // plaquinha dourada na palmilha
  const plate = add(new THREE.BoxGeometry(0.16, 0.006, 0.045), gold);
  plate.position.set(-0.9, profile(-0.9) + SOLE_T + 0.004, 0);
  plate.rotation.z = -0.07;

  // centraliza no eixo de rotação
  group.children.forEach((m) => (m.position.x += 0.05));
  return group;
}
