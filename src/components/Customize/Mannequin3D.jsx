import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Environment,
  Lightformer,
} from "@react-three/drei";

/* ════════════════ الألوان الثابتة ════════════════ */
const MANNEQUIN = "#E7E2DA";
const DARK = "#1b1b1b";
const GOLD = "#FFD500";
const NAVY = "#0D1B45";
const SRGB = THREE.SRGBColorSpace;

/* ════════════════ قطاعات الجسم (بتتلف حوالين المحور) ════════════════ */
const sample = (pts, n = 160) =>
  new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(
    n,
  );

const TORSO_P = sample([
  [0.15, 0.78],
  [0.182, 0.86],
  [0.172, 0.95],
  [0.152, 1.08],
  [0.16, 1.2],
  [0.174, 1.31],
  [0.184, 1.385],
  [0.162, 1.46],
  [0.09, 1.52],
  [0.05, 1.56],
]);

const ARM_P = sample([
  [0.028, -0.62],
  [0.033, -0.52],
  [0.04, -0.4],
  [0.046, -0.28],
  [0.052, -0.14],
  [0.054, -0.02],
  [0.05, 0.02],
]);

const LEG_P = sample([
  [0.034, 0.05],
  [0.041, 0.14],
  [0.056, 0.3],
  [0.054, 0.44],
  [0.066, 0.56],
  [0.08, 0.72],
  [0.086, 0.9],
]);

const cache = new Map();
function lathe(name, prof, y0, y1, off = 0) {
  const key = `${name}|${y0}|${y1}|${off}`;
  if (!cache.has(key)) {
    const pts = prof
      .filter((p) => p.y >= y0 && p.y <= y1)
      .map((p) => new THREE.Vector2(p.x + off, p.y));
    cache.set(key, new THREE.LatheGeometry(pts, 64));
  }
  return cache.get(key);
}

function frontZ(y, off, zs) {
  let best = TORSO_P[0];
  for (const p of TORSO_P) {
    if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
  }
  return (best.x + off) * zs;
}

/* ════════════════ أدوات رياضية ════════════════ */

// قيمة بتتغير بالتدريج حسب الارتفاع
const pl = (y, pts) => {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [ya, va] = pts[i - 1];
      const [yb, vb] = pts[i];
      return va + ((vb - va) * (y - ya)) / (yb - ya);
    }
  }
  return pts[pts.length - 1][1];
};

const hexOf = (col) => `#${col.getHexString(SRGB)}`;

// لون أغمق شوية (أو أفتح لو الأصل غامق) للحواف
const edgeColor = (c) => {
  const col = new THREE.Color(c);
  const hsl = {};
  col.getHSL(hsl, SRGB);
  hsl.l = hsl.l > 0.3 ? hsl.l * 0.72 : Math.min(hsl.l + 0.09, 1);
  col.setHSL(hsl.h, hsl.s, hsl.l, SRGB);
  return hexOf(col);
};

// لون خيط الخياطة (يبان فوق القماش)
const threadColor = (c) => {
  const col = new THREE.Color(c);
  const hsl = {};
  col.getHSL(hsl, SRGB);
  hsl.l = hsl.l > 0.55 ? hsl.l - 0.2 : Math.min(hsl.l + 0.22, 0.92);
  hsl.s *= 0.75;
  col.setHSL(hsl.h, hsl.s, hsl.l, SRGB);
  return hexOf(col);
};

/* ── نويز ثلاثي الأبعاد (للتجاعيد الطبيعية) ── */
const hash3 = (x, y, z) => {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
};
const fade = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
function vnoise(x, y, z) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  const zf = fade(z - zi);
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return (
    lerp(
      lerp(
        lerp(c(0, 0, 0), c(1, 0, 0), xf),
        lerp(c(0, 1, 0), c(1, 1, 0), xf),
        yf,
      ),
      lerp(
        lerp(c(0, 0, 1), c(1, 0, 1), xf),
        lerp(c(0, 1, 1), c(1, 1, 1), xf),
        yf,
      ),
      zf,
    ) *
      2 -
    1
  );
}
function fbm(x, y, z, oct = 3) {
  let a = 0;
  let amp = 1;
  let f = 1;
  let s = 0;
  for (let i = 0; i < oct; i++) {
    a += amp * vnoise(x * f, y * f, z * f);
    s += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return a / s;
}

/**
 * تجاعيد واقعية: طيات طولية عشوائية + تجاعيد أفقية عند المفاصل + حروف مكوية
 * (كل ده بيتحسب من (الزاوية، الارتفاع) فقط، فأي قطعة تانية بنفس الإعدادات
 *  بتتحرك بنفس المقدار — وده اللي بيخلي الأشرطة والغرز لازقة في القماش)
 */
function applyDrape(g, o = {}) {
  const {
    amp = 0.003,
    kx = 6,
    ky = 5,
    seed = 0,
    mask = () => 1,
    calm = 0,
    creases = [],
    ridges = [],
    hem = null,
  } = o;
  const p = g.attributes.position;
  let minY = Infinity;
  for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i));
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue;
    const c = z / r;
    const s = x / r;

    // طيات طولية (مستطيلة رأسياً)
    let d =
      amp *
      mask(y) *
      (1.5 * fbm(c * kx + seed, y * ky, s * kx + seed * 1.7, 3) +
        0.45 * vnoise(c * kx * 3.1 + seed, y * ky * 2.4, s * kx * 3.1));

    // تجاعيد أفقية عند المفاصل
    for (const cr of creases) {
      const g0 = Math.exp(-(((y - cr.y) / cr.w) ** 2));
      if (g0 < 0.01) continue;
      const ph = 2.6 * fbm(c * 2.2 + seed, 0.5, s * 2.2 + cr.y * 7, 2);
      d += cr.amp * g0 * Math.sin((y - cr.y) * cr.sp + ph);
    }

    // الواجهة الأمامية أهدى (عشان الجيوب والأزرار)
    d *= 1 - calm * Math.pow(Math.max(0, c), 3);

    // حروف مكوية (خط البنطلون)
    if (ridges.length) {
      const ang = Math.atan2(s, c);
      for (const rd of ridges) {
        const da = Math.abs(
          Math.atan2(Math.sin(ang - rd.th), Math.cos(ang - rd.th)),
        );
        if (da < rd.w)
          d += rd.amp * (1 - da / rd.w) * (rd.mask ? rd.mask(y) : 1);
      }
    }

    // حافة أمامية مقوّسة (قصّة البدلة)
    let ny = y;
    if (hem) {
      const t = (y - minY) / hem.span;
      if (t < 1)
        ny =
          y +
          hem.amp * Math.exp(-((x / hem.w) ** 2)) * Math.max(0, c) * (1 - t);
    }
    p.setXYZ(i, (x * (r + d)) / r, ny, (z * (r + d)) / r);
  }
  g.computeVertexNormals();
}

// خطوط طولية زي الريب
function applyRibs(g, n, amp) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue;
    const th = Math.atan2(x, z);
    const d = amp * Math.sin(th * n);
    p.setXYZ(i, (x * (r + d)) / r, y, (z * (r + d)) / r);
  }
  g.computeVertexNormals();
}

const profR = (prof, y) => {
  let b = prof[0];
  for (const p of prof) {
    if (Math.abs(p.y - y) < Math.abs(b.y - y)) b = p;
  }
  return b.x;
};
const torsoR = (y) => profR(TORSO_P, y);

const loftCache = new Map();
function loft(name, prof, y0, y1, offFn, fold, ribs) {
  const key = `${name}|${y0}|${y1}`;
  if (!loftCache.has(key)) {
    const pts = prof
      .filter((p) => p.y >= y0 && p.y <= y1)
      .map((p) => new THREE.Vector2(p.x + offFn(p.y), p.y));
    const g = new THREE.LatheGeometry(pts, ribs ? Math.max(96, ribs * 4) : 96);
    if (fold) applyDrape(g, fold);
    if (ribs) applyRibs(g, ribs, 0.0022);
    loftCache.set(key, g);
  }
  return loftCache.get(key);
}

// شريط رفيع جداً حوالين القطعة (خط خياطة / حافة) بيتحرك مع تجاعيد القماش
function stripGeo(name, prof, y, h, offFn, fold, lift) {
  const key = `${name}|strip|${y}|${h}`;
  if (!loftCache.has(key)) {
    const pts = [y - h / 2, y + h / 2].map(
      (yy) => new THREE.Vector2(profR(prof, yy) + offFn(yy) + lift, yy),
    );
    const g = new THREE.LatheGeometry(pts, 96);
    if (fold) applyDrape(g, { ...fold, hem: null });
    loftCache.set(key, g);
  }
  return loftCache.get(key);
}

function RingStrip({
  name,
  prof,
  y,
  h = 0.004,
  offFn,
  fold,
  color,
  lift = 0.003,
  zs = 1,
}) {
  return (
    <mesh
      geometry={stripGeo(name, prof, y, h, offFn, fold, lift)}
      scale={[1, 1, zs]}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// عمق سطح القماش عند (x, y)
const surf = (x, y, offFn, zs) => {
  const R = torsoR(y) + offFn(y);
  return zs * Math.sqrt(Math.max(R * R - x * x, 1e-6));
};

const sweep = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));

// لوح قماش بيلزق على الجذع (طيات، جيوب، شريط السوستة...)
function Panel({
  id,
  edges,
  offFn,
  zs,
  lift = 0.006,
  bulge = 0,
  rows = 24,
  cols = 6,
  children,
}) {
  const geo = useMemo(() => {
    const pos = [];
    const uv = [];
    const idx = [];
    for (let i = 0; i <= rows; i++) {
      const { y, a, b } = edges(i / rows);
      for (let j = 0; j <= cols; j++) {
        const x = a + ((b - a) * j) / cols;
        const bl =
          bulge *
          Math.sin((Math.PI * i) / rows) *
          Math.sin((Math.PI * j) / cols);
        pos.push(x, y, surf(x, y, offFn, zs) + lift + bl);
        uv.push(x / 1.25, y / 0.8);
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const k = i * (cols + 1) + j;
        idx.push(k, k + cols + 1, k + 1, k + 1, k + cols + 1, k + cols + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return <mesh geometry={geo}>{children}</mesh>;
}

// حافة مجسمة رفيعة بتمشي على سطح القماش
function Seam({
  id,
  pts,
  offFn,
  zs,
  color,
  r = 0.0022,
  lift = 0.004,
  closed = false,
  metal = false,
}) {
  const geo = useMemo(() => {
    const src = closed ? [...pts, pts[0]] : pts;
    const dense = [];
    for (let i = 0; i < src.length - 1; i++) {
      const [x0, y0] = src[i];
      const [x1, y1] = src[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.012));
      for (let j = 0; j < n; j++) {
        dense.push([x0 + ((x1 - x0) * j) / n, y0 + ((y1 - y0) * j) / n]);
      }
    }
    if (!closed) dense.push(src[src.length - 1]);
    const v = dense.map(
      ([x, y]) => new THREE.Vector3(x, y, surf(x, y, offFn, zs) + lift),
    );
    const c = new THREE.CatmullRomCurve3(v, closed, "centripetal");
    return new THREE.TubeGeometry(c, v.length * 2, r, 6, closed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color={color}
        roughness={metal ? 0.35 : 0.9}
        metalness={metal ? 0.8 : 0}
      />
    </mesh>
  );
}

// غرزة مقطّعة (top-stitch) — شرطات صغيرة بتمشي على القماش
function Stitch({
  id,
  pts,
  offFn,
  zs,
  color,
  lift = 0.006,
  dash = 0.009,
  gap = 0.006,
  r = 0.0011,
  closed = false,
  metal = false,
}) {
  const geo = useMemo(() => {
    const src = closed ? [...pts, pts[0]] : pts;
    const poly = [[src[0][0], src[0][1], 0]];
    let L = 0;
    for (let i = 1; i < src.length; i++) {
      L += Math.hypot(src[i][0] - src[i - 1][0], src[i][1] - src[i - 1][1]);
      poly.push([src[i][0], src[i][1], L]);
    }
    const at = (s) => {
      let k = 1;
      while (k < poly.length - 1 && poly[k][2] < s) k++;
      const a = poly[k - 1];
      const b = poly[k];
      const t = b[2] === a[2] ? 0 : (s - a[2]) / (b[2] - a[2]);
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      return new THREE.Vector3(x, y, surf(x, y, offFn, zs) + lift);
    };
    const parts = [];
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    for (let s = 0; s + dash <= L + 1e-6; s += dash + gap) {
      const A = at(s);
      const B = at(Math.min(s + dash, L));
      const len = A.distanceTo(B);
      if (len < 1e-4) continue;
      const g = new THREE.CylinderGeometry(r, r, len, 5, 1);
      const q = new THREE.Quaternion().setFromUnitVectors(
        up,
        B.clone().sub(A).normalize(),
      );
      g.applyMatrix4(
        new THREE.Matrix4().compose(
          A.clone().add(B).multiplyScalar(0.5),
          q,
          one,
        ),
      );
      parts.push(g);
    }
    return parts.length ? mergeGeometries(parts) : new THREE.BufferGeometry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color={color}
        roughness={metal ? 0.35 : 0.9}
        metalness={metal ? 0.8 : 0}
      />
    </mesh>
  );
}

/* ════════════════ الخامات ════════════════ */
const Skin = () => (
  <meshPhysicalMaterial
    color={MANNEQUIN}
    roughness={0.35}
    clearcoat={0.4}
    clearcoatRoughness={0.4}
  />
);

// نسيج القطن (الأصلي — للتيشرت والبنطلون)
let weaveTex;
function weave() {
  if (weaveTex || typeof document === "undefined") return weaveTex;
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const g = c.getContext("2d");
  const img = g.createImageData(32, 32);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const v =
        128 +
        45 * Math.sin((x / 32) * Math.PI * 8 + (y / 32) * Math.PI * 4) +
        20 * Math.sin((y / 32) * Math.PI * 8);
      const i = (y * 32 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  weaveTex = new THREE.CanvasTexture(c);
  weaveTex.wrapS = weaveTex.wrapT = THREE.RepeatWrapping;
  weaveTex.repeat.set(70, 40);
  weaveTex.anisotropy = 4;
  return weaveTex;
}

// أنسجة تانية: تويل (شغل)، صوف (بدلة)، نايلون ريب ستوب (بومبر)
const texCache = {};
const TEX = {
  twill: { rep: [34, 20] },
  wool: { rep: [40, 24] },
  nylon: { rep: [44, 26] },
};
function weaveKind(kind) {
  if (kind === "cotton") return weave();
  if (typeof document === "undefined") return undefined;
  if (texCache[kind]) return texCache[kind];
  const S = 64;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d");
  const img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = hash3(x, y, 3) - 0.5;
      let v;
      if (kind === "twill") {
        v = 128 + 58 * Math.sin(((x + y) / S) * Math.PI * 16) + 22 * n;
      } else if (kind === "wool") {
        v =
          128 +
          24 * Math.sin(((x - y) / S) * Math.PI * 16) +
          14 * Math.sin((x / S) * Math.PI * 32) +
          46 * n;
      } else {
        v = 128 + (x % 16 === 0 || y % 16 === 0 ? 34 : 0) + 12 * n;
      }
      const i = (y * S + x) * 4;
      img.data[i] =
        img.data[i + 1] =
        img.data[i + 2] =
          Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...TEX[kind].rep);
  t.anisotropy = 4;
  texCache[kind] = t;
  return t;
}

const FABRIC = {
  cotton: { rough: 0.95, sheen: 0.08, bump: 0.6, coat: 0 },
  twill: { rough: 0.9, sheen: 0.12, bump: 1.0, coat: 0 },
  wool: { rough: 0.8, sheen: 0.32, bump: 0.8, coat: 0 },
  nylon: { rough: 0.36, sheen: 0.45, bump: 0.35, coat: 0.18 },
};

function Fabric({ color, selected, kind = "cotton" }) {
  const f = FABRIC[kind];
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={f.rough}
      sheen={f.sheen}
      sheenRoughness={0.7}
      sheenColor={color}
      clearcoat={f.coat}
      clearcoatRoughness={0.5}
      bumpMap={weaveKind(kind)}
      bumpScale={f.bump}
      side={THREE.DoubleSide}
      emissive={color}
      emissiveIntensity={selected ? 0.12 : 0}
    />
  );
}

const Metal = () => (
  <meshStandardMaterial color="#B8B8B8" metalness={0.7} roughness={0.35} />
);
const Plastic = ({ color = "#EDEDED" }) => (
  <meshStandardMaterial color={color} roughness={0.4} />
);
const Refl = () => (
  <meshStandardMaterial
    color="#D3D8DC"
    roughness={0.28}
    metalness={0.4}
    side={THREE.DoubleSide}
  />
);

// زرار (قرص + حلقة + 4 ثقوب)
function Button({
  position,
  rotation = [Math.PI / 2, 0, 0],
  r = 0.0105,
  color = "#EDEDED",
  rough = 0.4,
}) {
  const h = r * 0.28;
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[r, r, 0.0055, 28]} />
        <meshStandardMaterial color={color} roughness={rough} />
      </mesh>
      <mesh position={[0, 0.003, 0]}>
        <cylinderGeometry args={[r * 0.68, r * 0.68, 0.0016, 24]} />
        <meshStandardMaterial color={edgeColor(color)} roughness={rough} />
      </mesh>
      {[
        [h, h],
        [-h, h],
        [h, -h],
        [-h, -h],
      ].map(([a, b]) => (
        <mesh key={`${a}${b}`} position={[a, 0.0036, b]}>
          <sphereGeometry args={[r * 0.12, 8, 8]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ════════════════ عناصر مساعدة ════════════════ */
function Part({ id, onSelect, children }) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {children}
    </group>
  );
}

const SHOULDER_X = 0.2;
const SHOULDER_Y = 1.39;

// children ممكن تكون دالة بتاخد الجهة (1 / -1)
function Arms({ children }) {
  return [1, -1].map((s) => (
    <group
      key={s}
      position={[s * SHOULDER_X, SHOULDER_Y, 0]}
      rotation={[0, 0, s * 0.18]}
    >
      {typeof children === "function" ? children(s) : children}
    </group>
  ));
}

function Sleeves({ fab, y0, off }) {
  return (
    <Arms>
      <mesh geometry={lathe("arm", ARM_P, y0, 0.02, off)}>{fab}</mesh>
      <mesh>
        <sphereGeometry args={[0.056 + off, 24, 24]} />
        {fab}
      </mesh>
    </Arms>
  );
}

function Sl({ geo, r, children }) {
  return (
    <Arms>
      <mesh geometry={geo}>{children}</mesh>
      <mesh>
        <sphereGeometry args={[r, 28, 28]} />
        {children}
      </mesh>
    </Arms>
  );
}

function Ring({ y, radius, tube, zs = 0.7, children }) {
  return (
    <group position={[0, y, 0]} scale={[1, 1, zs]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, tube, 16, 48]} />
        {children}
      </mesh>
    </group>
  );
}

const Crotch = ({ fab, w = 0.17, y = 0.81 }) => (
  <mesh position={[0, y, 0]} scale={[w, 0.08, w * 0.62]}>
    <sphereGeometry args={[1, 32, 32]} />
    {fab}
  </mesh>
);

/* ════════════════ الجسم العاري ════════════════ */
function Body() {
  return (
    <group>
      <mesh position={[0, 1.585, 0]}>
        <cylinderGeometry args={[0.042, 0.05, 0.1, 24]} />
        <Skin />
      </mesh>

      <mesh geometry={lathe("torso", TORSO_P, 0.78, 1.56)} scale={[1, 1, 0.62]}>
        <Skin />
      </mesh>
      <Crotch fab={<Skin />} />

      {[1, -1].map((s) => (
        <mesh key={s} position={[s * SHOULDER_X, SHOULDER_Y, 0]}>
          <sphereGeometry args={[0.062, 24, 24]} />
          <Skin />
        </mesh>
      ))}
      <Arms>
        <mesh geometry={lathe("arm", ARM_P, -0.62, 0.02)}>
          <Skin />
        </mesh>
        <mesh position={[0, -0.68, 0]} scale={[0.03, 0.07, 0.02]}>
          <sphereGeometry args={[1, 24, 24]} />
          <Skin />
        </mesh>
      </Arms>

      {[1, -1].map((s) => (
        <group key={s}>
          <mesh
            geometry={lathe("leg", LEG_P, 0.05, 0.9)}
            position={[s * 0.088, 0, 0]}
          >
            <Skin />
          </mesh>
          <mesh
            position={[s * 0.088, 0.04, 0.045]}
            scale={[0.07, 0.045, 0.125]}
          >
            <sphereGeometry args={[1, 24, 24]} />
            <Skin />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ════════════════ التيشرت ════════════════ */
function Shirt({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} />;
  const off = 0.02;
  const zs = 0.66;
  const pz = frontZ(1.4, off, zs) + 0.004;

  return (
    <group>
      <mesh
        geometry={lathe("torso", TORSO_P, 0.9, 1.54, off)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>
      <Sleeves fab={fab} y0={-0.2} off={off} />

      {variant === "round" ? (
        <Ring y={1.538} radius={0.074} tube={0.015} zs={0.72}>
          {fab}
        </Ring>
      ) : (
        <>
          <Ring y={1.54} radius={0.074} tube={0.019} zs={0.72}>
            {fab}
          </Ring>
          <mesh position={[0, 1.43, pz]}>
            <boxGeometry args={[0.034, 0.15, 0.008]} />
            {fab}
          </mesh>
          {[1.49, 1.44, 1.39].map((y) => (
            <mesh key={y} position={[0, y, frontZ(y, off, zs) + 0.01]}>
              <sphereGeometry args={[0.007, 12, 12]} />
              <Plastic />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/* ════════════════ البنطلون ════════════════ */
function Pants({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} />;
  const off = 0.012;
  return (
    <group>
      <mesh
        geometry={lathe("torso", TORSO_P, 0.8, 1.07, off)}
        scale={[1, 1, 0.66]}
      >
        {fab}
      </mesh>
      <Crotch fab={fab} w={0.19} />
      <mesh
        geometry={lathe("torso", TORSO_P, 1.03, 1.08, 0.016)}
        scale={[1, 1, 0.67]}
      >
        <meshStandardMaterial
          color={DARK}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {[1, -1].map((s) => (
        <group key={s}>
          <mesh
            geometry={lathe("leg", LEG_P, 0.07, 0.9, off)}
            position={[s * 0.088, 0, 0]}
          >
            {fab}
          </mesh>
          {variant === "cargo" && (
            <>
              <mesh position={[s * 0.178, 0.6, 0]}>
                <boxGeometry args={[0.03, 0.14, 0.085]} />
                {fab}
              </mesh>
              <mesh position={[s * 0.186, 0.66, 0]}>
                <boxGeometry args={[0.02, 0.04, 0.09]} />
                {fab}
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

/* ════════════════ شكل القماش (من غير أي تجاعيد) ════════════════ */
const PI = Math.PI;
const FD = {
  covBody: null,
  covArm: null,
  covLeg: null,
  bomBody: null,
  bomArm: null,
  clsBody: null,
  clsArm: null,
  // البدلة: بس قصّة الحافة الأمامية المقوّسة
  suitBody: { amp: 0, hem: { amp: 0.045, w: 0.085, span: 0.09 } },
  suitArm: null,
  trsHip: null,
  trs: null,
};

/* ════════════════ قصّات (offsets) ════════════════ */
const COV_OFF = (y) =>
  pl(y, [
    [0.78, 0.034],
    [1.08, 0.044],
    [1.3, 0.038],
    [1.5, 0.03],
  ]);
const COV_LEG = (y) =>
  pl(y, [
    [0.07, 0.034],
    [0.2, 0.03],
    [0.45, 0.028],
    [0.9, 0.024],
  ]);
const COV_SLV = (y) =>
  pl(y, [
    [-0.62, 0.02],
    [-0.5, 0.024],
    [-0.3, 0.03],
    [0.02, 0.03],
  ]);

const SUIT_OFF = (y) =>
  pl(y, [
    [0.78, 0.05],
    [0.95, 0.04],
    [1.1, 0.022],
    [1.3, 0.034],
    [1.5, 0.03],
  ]);
const SUIT_SLV = (y) =>
  pl(y, [
    [-0.62, 0.014],
    [-0.4, 0.02],
    [-0.3, 0.022],
    [0.02, 0.026],
  ]);
const TRS_LEG = (y) =>
  pl(y, [
    [0.07, 0.036],
    [0.25, 0.034],
    [0.5, 0.026],
    [0.9, 0.02],
  ]);

const BOMBER_OFF = (y) =>
  pl(y, [
    [0.95, 0.012],
    [0.99, 0.032],
    [1.08, 0.052],
    [1.3, 0.05],
    [1.5, 0.034],
  ]);
const BOMBER_SLV = (y) =>
  pl(y, [
    [-0.5, 0.01],
    [-0.4, 0.034],
    [-0.3, 0.04],
    [0.02, 0.04],
  ]);
const CLASSIC_OFF = (y) =>
  pl(y, [
    [0.8, 0.046],
    [1.08, 0.04],
    [1.3, 0.04],
    [1.5, 0.032],
  ]);
const CLASSIC_SLV = (y) =>
  pl(y, [
    [-0.62, 0.02],
    [-0.3, 0.028],
    [0.02, 0.032],
  ]);

/* ════════════════ قطع تفصيلية ════════════════ */

// ياقة مفتوحة (طيتين) مع غرز
function Collar({ id, offFn, zs, fab, color }) {
  const ec = edgeColor(color);
  const th = threadColor(color);
  return [1, -1].map((s) => {
    const y = (t) => 1.535 - 0.105 * t;
    const a = (t) => s * (0.032 - 0.026 * t);
    const b = (t) => s * (0.1 - 0.055 * t);
    return (
      <group key={s}>
        <Panel
          id={`${id}-collar${s}`}
          edges={(t) => ({ y: y(t), a: a(t), b: b(t) })}
          offFn={offFn}
          zs={zs}
          lift={0.009}
          bulge={0.006}
          rows={12}
          cols={6}
        >
          {fab}
        </Panel>
        <Seam
          id={`${id}-collarS${s}`}
          pts={[
            [b(0), y(0)],
            [b(0.5), y(0.5)],
            [b(1), y(1)],
            [a(1), y(1)],
          ]}
          offFn={offFn}
          zs={zs}
          color={ec}
          lift={0.012}
        />
        <Stitch
          id={`${id}-collarT${s}`}
          pts={[
            [b(0.04) - s * 0.007, y(0.04) - 0.002],
            [b(0.5) - s * 0.007, y(0.5) - 0.002],
            [b(0.94) - s * 0.007, y(0.94) - 0.002],
            [a(0.94) + s * 0.002, y(0.94) - 0.002],
          ]}
          offFn={offFn}
          zs={zs}
          color={th}
          lift={0.0175}
        />
      </group>
    );
  });
}

// جيب مائل (slash) مع حواف وخياطة
function SlashPocket({ id, offFn, zs, color, thread, s, p0, p1 }) {
  const A = [s * p0[0], p0[1]];
  const B = [s * p1[0], p1[1]];
  const sh = (dy) => [
    [A[0], A[1] + dy],
    [B[0], B[1] + dy],
  ];
  return (
    <>
      <Seam
        id={`${id}-slit${s}`}
        pts={sh(0)}
        offFn={offFn}
        zs={zs}
        color="#0a0a0a"
        r={0.0042}
        lift={0.004}
      />
      <Seam
        id={`${id}-pipU${s}`}
        pts={sh(0.008)}
        offFn={offFn}
        zs={zs}
        color={color}
        r={0.0028}
        lift={0.007}
      />
      <Seam
        id={`${id}-pipL${s}`}
        pts={sh(-0.008)}
        offFn={offFn}
        zs={zs}
        color={color}
        r={0.0028}
        lift={0.007}
      />
      <Stitch
        id={`${id}-stU${s}`}
        pts={sh(0.0135)}
        offFn={offFn}
        zs={zs}
        color={thread}
        lift={0.008}
      />
      <Stitch
        id={`${id}-stL${s}`}
        pts={sh(-0.0135)}
        offFn={offFn}
        zs={zs}
        color={thread}
        lift={0.008}
      />
    </>
  );
}

// سوستة: شريط قماش + أسنان + سحاب + مقبض
function Zip({ id, offFn, zs, color, yTop, yBot }) {
  const ec = edgeColor(color);
  const th = threadColor(color);
  const tape = (
    <meshStandardMaterial color={ec} roughness={0.95} side={THREE.DoubleSide} />
  );
  const zTop = surf(0, yTop - 0.03, offFn, zs);
  return (
    <>
      {[1, -1].map((s) => (
        <group key={s}>
          <Panel
            id={`${id}-tape${s}`}
            edges={(t) => ({
              y: yTop - (yTop - yBot) * t,
              a: s * 0.0035,
              b: s * 0.0135,
            })}
            offFn={offFn}
            zs={zs}
            lift={0.006}
            bulge={0.0015}
            rows={40}
            cols={2}
          >
            {tape}
          </Panel>
          <Stitch
            id={`${id}-tapeS${s}`}
            pts={[
              [s * 0.0118, yTop],
              [s * 0.0118, yBot],
            ]}
            offFn={offFn}
            zs={zs}
            color={th}
            lift={0.0078}
            dash={0.006}
            gap={0.004}
            r={0.0008}
          />
          <Stitch
            id={`${id}-teeth${s}`}
            pts={[
              [s * 0.0024, yTop],
              [s * 0.0024, yBot],
            ]}
            offFn={offFn}
            zs={zs}
            color="#C8C8C8"
            lift={0.0095}
            dash={0.0028}
            gap={0.0017}
            r={0.0021}
            metal
          />
        </group>
      ))}
      <Seam
        id={`${id}-gap`}
        pts={[
          [0, yTop],
          [0, yBot],
        ]}
        offFn={offFn}
        zs={zs}
        color="#0d0d0d"
        r={0.0015}
        lift={0.006}
      />
      {/* السحاب + المقبض */}
      <mesh position={[0, yTop - 0.022, zTop + 0.013]}>
        <boxGeometry args={[0.016, 0.03, 0.009]} />
        <Metal />
      </mesh>
      <mesh position={[0, yTop - 0.05, zTop + 0.018]}>
        <boxGeometry args={[0.009, 0.034, 0.004]} />
        <Metal />
      </mesh>
      <mesh
        position={[0, yTop - 0.069, zTop + 0.018]}
        rotation={[PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.005, 0.0016, 8, 16]} />
        <Metal />
      </mesh>
      <mesh position={[0, yBot - 0.002, surf(0, yBot, offFn, zs) + 0.012]}>
        <boxGeometry args={[0.02, 0.008, 0.007]} />
        <Metal />
      </mesh>
    </>
  );
}

// ياقة مضلعة (ريب) للبومبر
function RibCollar({ material }) {
  const geo = useMemo(() => {
    const pts = new THREE.SplineCurve(
      [
        [0.118, 1.5],
        [0.1, 1.528],
        [0.082, 1.556],
        [0.07, 1.586],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
    ).getPoints(16);
    const g = new THREE.LatheGeometry(pts, 176);
    applyRibs(g, 44, 0.0022);
    return g;
  }, []);
  return (
    <mesh geometry={geo} scale={[1, 1, 0.88]}>
      {material}
    </mesh>
  );
}

/* ════════════════ الأفارول ════════════════ */
function Coverall({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} kind="twill" />;
  const off = COV_OFF;
  const zs = 0.72;
  const ec = edgeColor(color);
  const th = threadColor(color);
  const id = `cov-${variant}`;
  const band = (
    <meshStandardMaterial color={ec} roughness={0.95} side={THREE.DoubleSide} />
  );
  const beltOff = (y) => off(y) + 0.008;
  const hemOff = (y) => COV_LEG(y) + 0.004;
  const cuffOff = (y) => COV_SLV(y) + 0.005;
  const zB = surf(0, 1.07, beltOff, zs);

  return (
    <group>
      {/* الجسم */}
      <mesh
        geometry={loft("cov-body", TORSO_P, 0.78, 1.54, off, FD.covBody)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>
      <Crotch fab={fab} w={0.2} />

      {/* شريط عاكس على الوسط */}
      <mesh
        geometry={loft(
          "cov-tapeT",
          TORSO_P,
          0.9,
          0.945,
          (y) => off(y) + 0.0045,
          FD.covBody,
        )}
        scale={[1, 1, zs]}
      >
        <Refl />
      </mesh>

      {/* الحزام + الإبزيم */}
      <mesh
        geometry={loft("cov-belt", TORSO_P, 1.045, 1.095, beltOff, FD.covBody)}
        scale={[1, 1, zs]}
      >
        {band}
      </mesh>
      {[1.05, 1.09].map((y) => (
        <RingStrip
          key={y}
          name={`cov-belt${y}`}
          prof={TORSO_P}
          y={y}
          offFn={beltOff}
          fold={FD.covBody}
          color={th}
          zs={zs}
          lift={0.004}
        />
      ))}
      <group position={[0, 1.07, zB + 0.013]}>
        <mesh>
          <boxGeometry args={[0.048, 0.04, 0.007]} />
          <Metal />
        </mesh>
        <mesh position={[0, 0, 0.0012]}>
          <boxGeometry args={[0.032, 0.026, 0.007]} />
          <meshStandardMaterial color={ec} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.006]}>
          <boxGeometry args={[0.005, 0.03, 0.004]} />
          <Metal />
        </mesh>
      </group>

      {/* الرجلين: كسرات + حاشية مخيطة + شريط عاكس */}
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.088, 0, 0]}>
          <mesh
            geometry={loft("cov-leg", LEG_P, 0.07, 0.9, COV_LEG, FD.covLeg)}
          >
            {fab}
          </mesh>
          <mesh
            geometry={loft("cov-hem", LEG_P, 0.07, 0.118, hemOff, FD.covLeg)}
          >
            {fab}
          </mesh>
          <RingStrip
            name="cov-hemA"
            prof={LEG_P}
            y={0.118}
            offFn={hemOff}
            fold={FD.covLeg}
            color={th}
            lift={0.003}
          />
          <RingStrip
            name="cov-hemB"
            prof={LEG_P}
            y={0.098}
            offFn={hemOff}
            fold={FD.covLeg}
            color={th}
            lift={0.003}
          />
          <mesh
            geometry={loft(
              "cov-tapeL",
              LEG_P,
              0.28,
              0.33,
              (y) => COV_LEG(y) + 0.0045,
              FD.covLeg,
            )}
          >
            <Refl />
          </mesh>
        </group>
      ))}

      {/* الأكمام */}
      <Sl
        geo={loft("cov-arm", ARM_P, -0.62, 0.02, COV_SLV, FD.covArm)}
        r={0.054 + COV_SLV(0.02)}
      >
        {fab}
      </Sl>
      <Arms>
        {(s) => (
          <>
            <mesh
              geometry={loft(
                "cov-cuff",
                ARM_P,
                -0.62,
                -0.53,
                cuffOff,
                FD.covArm,
              )}
            >
              {band}
            </mesh>
            <RingStrip
              name="cov-cuffA"
              prof={ARM_P}
              y={-0.53}
              offFn={cuffOff}
              fold={FD.covArm}
              color={th}
              lift={0.003}
            />
            <RingStrip
              name="cov-cuffB"
              prof={ARM_P}
              y={-0.61}
              offFn={cuffOff}
              fold={FD.covArm}
              color={th}
              lift={0.003}
            />
            <mesh
              geometry={loft(
                "cov-tapeA",
                ARM_P,
                -0.4,
                -0.35,
                (y) => COV_SLV(y) + 0.0045,
                FD.covArm,
              )}
            >
              <Refl />
            </mesh>
            <Button
              position={[
                s * (profR(ARM_P, -0.575) + cuffOff(-0.575) + 0.008),
                -0.575,
                0,
              ]}
              rotation={[0, 0, -s * (PI / 2)]}
              r={0.008}
            />
          </>
        )}
      </Arms>

      {/* الياقة */}
      <Ring y={1.538} radius={0.076} tube={0.021} zs={0.74}>
        {fab}
      </Ring>
      <Collar id={id} offFn={off} zs={zs} fab={fab} color={color} />

      {/* جيوب الصدر (جيب + غطاء + زرار) */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Panel
            id={`${id}-pk${s}`}
            edges={(t) => ({ y: 1.31 - 0.078 * t, a: s * 0.045, b: s * 0.115 })}
            offFn={off}
            zs={zs}
            lift={0.006}
            bulge={0.005}
            rows={8}
            cols={4}
          >
            {fab}
          </Panel>
          <Seam
            id={`${id}-pkS${s}`}
            pts={[
              [s * 0.045, 1.31],
              [s * 0.115, 1.31],
              [s * 0.115, 1.236],
              [s * 0.08, 1.232],
              [s * 0.045, 1.236],
            ]}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.008}
            closed
          />
          <Stitch
            id={`${id}-pkT${s}`}
            pts={[
              [s * 0.05, 1.303],
              [s * 0.11, 1.303],
              [s * 0.11, 1.242],
              [s * 0.08, 1.238],
              [s * 0.05, 1.242],
            ]}
            offFn={off}
            zs={zs}
            color={th}
            lift={0.0105}
            closed
          />
          <Panel
            id={`${id}-fl${s}`}
            edges={(t) => ({
              y: 1.335 - 0.032 * t,
              a: s * 0.045,
              b: s * 0.115,
            })}
            offFn={off}
            zs={zs}
            lift={0.012}
            bulge={0.004}
            rows={4}
            cols={4}
          >
            {fab}
          </Panel>
          <Seam
            id={`${id}-flS${s}`}
            pts={[
              [s * 0.045, 1.337],
              [s * 0.045, 1.303],
              [s * 0.08, 1.299],
              [s * 0.115, 1.303],
              [s * 0.115, 1.337],
            ]}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.015}
          />
          <Stitch
            id={`${id}-flT${s}`}
            pts={[
              [s * 0.05, 1.309],
              [s * 0.08, 1.305],
              [s * 0.11, 1.309],
            ]}
            offFn={off}
            zs={zs}
            color={th}
            lift={0.0165}
          />
          <Button
            position={[s * 0.08, 1.31, surf(s * 0.08, 1.31, off, zs) + 0.019]}
            r={0.0075}
          />
          <SlashPocket
            id={`${id}-hip`}
            offFn={off}
            zs={zs}
            color={ec}
            thread={th}
            s={s}
            p0={[0.085, 1.0]}
            p1={[0.15, 0.9]}
          />
        </group>
      ))}

      {/* القفل: سوستة أو أزرار */}
      {variant === "zip" ? (
        <Zip
          id={id}
          offFn={off}
          zs={zs}
          color={color}
          yTop={1.525}
          yBot={0.87}
        />
      ) : (
        <>
          <Panel
            id={`${id}-placket`}
            edges={(t) => ({ y: 1.52 - 0.65 * t, a: -0.024, b: 0.024 })}
            offFn={off}
            zs={zs}
            lift={0.007}
            bulge={0.0025}
            rows={30}
            cols={2}
          >
            {fab}
          </Panel>
          {[-0.024, 0.024].map((x) => (
            <Seam
              key={x}
              id={`${id}-plS${x}`}
              pts={[
                [x, 1.52],
                [x, 0.87],
              ]}
              offFn={off}
              zs={zs}
              color={ec}
              lift={0.0095}
            />
          ))}
          {[-0.0155, 0.0155].map((x) => (
            <Stitch
              key={x}
              id={`${id}-plT${x}`}
              pts={[
                [x, 1.515],
                [x, 0.875],
              ]}
              offFn={off}
              zs={zs}
              color={th}
              lift={0.0105}
            />
          ))}
          {[1.44, 1.34, 1.24, 1.14, 1.04, 0.94].map((y) => (
            <Button
              key={y}
              position={[0, y, surf(0, y, off, zs) + 0.015]}
              r={0.0105}
            />
          ))}
        </>
      )}
    </group>
  );
}

/* ════════════════ الجاكيت ════════════════ */
function Jacket({ variant, color, selected }) {
  const bomber = variant === "bomber";
  const fab = (
    <Fabric
      color={color}
      selected={selected}
      kind={bomber ? "nylon" : "twill"}
    />
  );
  const off = bomber ? BOMBER_OFF : CLASSIC_OFF;
  const slv = bomber ? BOMBER_SLV : CLASSIC_SLV;
  const zs = bomber ? 0.76 : 0.74;
  const y0 = bomber ? 0.95 : 0.8;
  const fb = bomber ? FD.bomBody : FD.clsBody;
  const fa = bomber ? FD.bomArm : FD.clsArm;
  const ec = edgeColor(color);
  const th = threadColor(color);
  const id = `jkt-${variant}`;
  const rib = (
    <meshPhysicalMaterial
      color={ec}
      roughness={0.95}
      sheen={0.25}
      sheenColor={ec}
      side={THREE.DoubleSide}
    />
  );
  const cuffOff = (y) => slv(y) + 0.006;

  return (
    <group>
      {/* الجسم */}
      <mesh
        geometry={loft(`${id}-body`, TORSO_P, y0, 1.54, off, fb)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>

      {/* الأكمام */}
      <Sl
        geo={loft(`${id}-arm`, ARM_P, bomber ? -0.5 : -0.6, 0.02, slv, fa)}
        r={0.054 + slv(0.02)}
      >
        {fab}
      </Sl>

      {bomber ? (
        <>
          {/* حواف مضلعة: الذيل + الرسغ + الياقة */}
          <mesh
            geometry={loft(
              "bomber-hem",
              TORSO_P,
              0.88,
              0.96,
              () => 0.012,
              null,
              56,
            )}
            scale={[1, 1, zs]}
          >
            {rib}
          </mesh>
          <RibCollar material={rib} />
          <Arms>
            {(s) => (
              <>
                <mesh
                  geometry={loft(
                    "bomber-cuff",
                    ARM_P,
                    -0.62,
                    -0.49,
                    () => 0.01,
                    null,
                    40,
                  )}
                >
                  {rib}
                </mesh>
                {/* جيب السوستة على الكم الأيمن (MA-1) */}
                {s === 1 && (
                  <group
                    position={[
                      profR(ARM_P, -0.14) + slv(-0.14) + 0.006,
                      -0.14,
                      0,
                    ]}
                  >
                    <mesh>
                      <boxGeometry args={[0.009, 0.11, 0.036]} />
                      {fab}
                    </mesh>
                    <mesh position={[0.0055, 0, 0.002]}>
                      <boxGeometry args={[0.002, 0.1, 0.005]} />
                      <meshStandardMaterial color="#111" roughness={0.6} />
                    </mesh>
                    <mesh position={[0.0075, 0.04, 0.002]}>
                      <boxGeometry args={[0.004, 0.014, 0.008]} />
                      <Metal />
                    </mesh>
                  </group>
                )}
              </>
            )}
          </Arms>
        </>
      ) : (
        <>
          <Ring y={1.538} radius={0.076} tube={0.02} zs={0.74}>
            {fab}
          </Ring>
          <Collar id={id} offFn={off} zs={zs} fab={fab} color={color} />

          {/* حاشية مخيطة */}
          {[y0 + 0.03, y0 + 0.042].map((y) => (
            <RingStrip
              key={y}
              name={`${id}-hem${y}`}
              prof={TORSO_P}
              y={y}
              offFn={off}
              fold={fb}
              color={th}
              zs={zs}
              lift={0.003}
            />
          ))}

          {/* أساور الكم: حزام + زرار */}
          <Arms>
            {(s) => (
              <>
                <mesh
                  geometry={loft("jkt-cuff", ARM_P, -0.62, -0.55, cuffOff, fa)}
                >
                  {fab}
                </mesh>
                <RingStrip
                  name="jkt-cuffA"
                  prof={ARM_P}
                  y={-0.55}
                  offFn={cuffOff}
                  fold={fa}
                  color={th}
                  lift={0.003}
                />
                <RingStrip
                  name="jkt-cuffB"
                  prof={ARM_P}
                  y={-0.615}
                  offFn={cuffOff}
                  fold={fa}
                  color={th}
                  lift={0.003}
                />
                <Button
                  position={[
                    s * (profR(ARM_P, -0.585) + cuffOff(-0.585) + 0.007),
                    -0.585,
                    0,
                  ]}
                  rotation={[0, 0, -s * (PI / 2)]}
                  r={0.007}
                  color={DARK}
                />
              </>
            )}
          </Arms>
        </>
      )}

      {/* جيوب الجنب المائلة */}
      {[1, -1].map((s) => (
        <SlashPocket
          key={s}
          id={id}
          offFn={off}
          zs={zs}
          color={ec}
          thread={th}
          s={s}
          p0={bomber ? [0.07, 1.12] : [0.09, 0.98]}
          p1={bomber ? [0.135, 1.03] : [0.145, 0.88]}
        />
      ))}

      {/* السوستة */}
      <Zip
        id={id}
        offFn={off}
        zs={zs}
        color={color}
        yTop={bomber ? 1.5 : 1.525}
        yBot={bomber ? 0.885 : y0 + 0.005}
      />
    </group>
  );
}

/* ════════════════ بنطلون البدلة ════════════════ */
function Trousers({ color, selected }) {
  const fab = <Fabric color={color} selected={selected} kind="wool" />;
  const ec = edgeColor(color);
  const cuffOff = (y) => TRS_LEG(y) + 0.005;
  return (
    <group>
      <mesh
        geometry={loft("trs-hip", TORSO_P, 0.78, 1.09, () => 0.02, FD.trsHip)}
        scale={[1, 1, 0.68]}
      >
        {fab}
      </mesh>
      <Crotch fab={fab} w={0.2} />
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.088, 0, 0]}>
          <mesh geometry={loft("trs-leg", LEG_P, 0.07, 0.9, TRS_LEG, FD.trs)}>
            {fab}
          </mesh>
          {/* ذيل البنطلون (turn-up) */}
          <mesh
            geometry={loft("trs-cuff", LEG_P, 0.07, 0.125, cuffOff, FD.trs)}
          >
            {fab}
          </mesh>
          <RingStrip
            name="trs-cuffA"
            prof={LEG_P}
            y={0.125}
            h={0.005}
            offFn={cuffOff}
            fold={FD.trs}
            color={ec}
            lift={0.003}
          />
        </group>
      ))}
    </group>
  );
}

/* ════════════════ البدلة ════════════════ */
function Suit({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} kind="wool" />;
  const off = SUIT_OFF;
  const zs = 0.74;
  const ec = edgeColor(color);
  const th = threadColor(color);
  const dbl = variant === "double";
  const id = `suit-${variant}`;
  const white = (
    <meshStandardMaterial
      color="#F4F4F2"
      roughness={0.55}
      side={THREE.DoubleSide}
    />
  );
  const cuffSlvOff = (y) => SUIT_SLV(y) + 0.003;
  const shirtCuffOff = () => 0.007;

  // شكل الطية
  const ly = (t) => 1.505 - 0.385 * t;
  const lin = (t) => 0.004 + 0.05 * (1 - t);
  const lout = (t) =>
    dbl
      ? pl(t, [
          [0, 0.1],
          [0.35, 0.128],
          [1, 0.05],
        ])
      : pl(t, [
          [0, 0.088],
          [0.115, 0.092],
          [0.15, 0.072],
          [0.3, 0.118],
          [0.55, 0.09],
          [1, 0.008],
        ]);

  const buttons = dbl
    ? [
        [-0.055, 1.04],
        [0.055, 1.04],
        [-0.055, 0.9],
        [0.055, 0.9],
      ]
    : [
        [0, 1.06],
        [0, 0.93],
      ];

  // حافة الجاكيت المزدوج (بتقوّس لجوّه تحت)
  const dcurve = (t) =>
    pl(t, [
      [0.85, 0],
      [1, 0.05],
    ]);
  const dy = (t) => 1.11 - 0.27 * t;

  return (
    <group>
      {/* الجاكيت */}
      <mesh
        geometry={loft("suit-body", TORSO_P, 0.8, 1.54, off, FD.suitBody)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>
      <Sl
        geo={loft("suit-arm", ARM_P, -0.56, 0.02, SUIT_SLV, FD.suitArm)}
        r={0.054 + SUIT_SLV(0.02)}
      >
        {fab}
      </Sl>

      <Arms>
        {(s) => (
          <>
            {/* كُم القميص الأبيض اللي طالع من الجاكيت */}
            <mesh
              geometry={loft("suit-cuff", ARM_P, -0.62, -0.545, shirtCuffOff)}
            >
              {white}
            </mesh>
            <RingStrip
              name="suit-cuffW"
              prof={ARM_P}
              y={-0.6}
              h={0.003}
              offFn={shirtCuffOff}
              color="#d9d9d6"
              lift={0.002}
            />
            {/* حافة كُم الجاكيت + أزرار الكم */}
            <RingStrip
              name="suit-slvHem"
              prof={ARM_P}
              y={-0.552}
              h={0.007}
              offFn={cuffSlvOff}
              fold={FD.suitArm}
              color={ec}
              lift={0.001}
            />
            <RingStrip
              name="suit-slvT"
              prof={ARM_P}
              y={-0.52}
              h={0.0025}
              offFn={cuffSlvOff}
              fold={FD.suitArm}
              color={th}
              lift={0.001}
            />
            {[-0.52, -0.495, -0.47].map((y) => (
              <Button
                key={y}
                position={[
                  s * (profR(ARM_P, y) + SUIT_SLV(y) + 0.006),
                  y + 0.0,
                  0,
                ]}
                rotation={[0, 0, -s * (PI / 2)]}
                r={0.0068}
                color={DARK}
                rough={0.35}
              />
            ))}
          </>
        )}
      </Arms>

      {/* ياقة الجاكيت الخلفية + ياقة القميص */}
      <Ring y={1.54} radius={0.08} tube={0.02} zs={0.74}>
        {fab}
      </Ring>
      <Ring y={1.558} radius={0.067} tube={0.011} zs={0.74}>
        {white}
      </Ring>

      {/* القميص الأبيض */}
      <Panel
        id={`${id}-shirt`}
        edges={(t) => ({ y: ly(t), a: -(lin(t) + 0.008), b: lin(t) + 0.008 })}
        offFn={off}
        zs={zs}
        lift={0.003}
        rows={22}
        cols={6}
      >
        {white}
      </Panel>

      {/* أطراف ياقة القميص */}
      {[1, -1].map((s) => (
        <Panel
          key={s}
          id={`${id}-scol${s}`}
          edges={(t) => ({
            y: 1.545 - 0.075 * t,
            a: s * (0.012 + 0.036 * t),
            b: s * (0.062 - 0.012 * t),
          })}
          offFn={off}
          zs={zs}
          lift={0.005}
          bulge={0.004}
          rows={8}
          cols={4}
        >
          {white}
        </Panel>
      ))}

      {/* الكرافتة (حرير) + العقدة */}
      <Panel
        id={`${id}-tie`}
        edges={(t) => {
          const h = pl(t, [
            [0, 0.008],
            [0.15, 0.011],
            [0.78, 0.023],
            [0.93, 0.021],
            [1, 0.0],
          ]);
          return { y: 1.49 - 0.33 * t, a: -h, b: h };
        }}
        offFn={off}
        zs={zs}
        lift={0.007}
        bulge={0.004}
        rows={36}
        cols={4}
      >
        <meshPhysicalMaterial
          color={GOLD}
          roughness={0.38}
          sheen={0.6}
          sheenColor="#fff2a8"
          side={THREE.DoubleSide}
        />
      </Panel>
      <mesh
        position={[0, 1.497, surf(0, 1.497, off, zs) + 0.011]}
        scale={[1, 1, 0.8]}
      >
        <sphereGeometry args={[0.0165, 20, 16]} />
        <meshPhysicalMaterial
          color={GOLD}
          roughness={0.38}
          sheen={0.6}
          sheenColor="#fff2a8"
        />
      </mesh>

      {/* الطيات (lapels) */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Panel
            id={`${id}-lapel${s}`}
            edges={(t) => ({ y: ly(t), a: s * lin(t), b: s * lout(t) })}
            offFn={off}
            zs={zs}
            lift={0.01}
            bulge={0.007}
            rows={44}
            cols={7}
          >
            {fab}
          </Panel>
          <Seam
            id={`${id}-lapelO${s}`}
            pts={sweep(16, (t) => [s * lout(t), ly(t)])}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.0125}
          />
          <Seam
            id={`${id}-lapelI${s}`}
            pts={sweep(10, (t) => [s * lin(t), ly(t)])}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.0125}
          />
          <Stitch
            id={`${id}-lapelT${s}`}
            pts={sweep(16, (t) => [
              s * (lout(t) - 0.0065),
              ly(t) - 0.0015,
            ]).slice(1, -1)}
            offFn={off}
            zs={zs}
            color={th}
            lift={0.0165}
            dash={0.007}
            gap={0.005}
          />
          {!dbl && (
            <Seam
              id={`${id}-notch${s}`}
              pts={[
                [s * 0.056, 1.488],
                [s * 0.092, 1.461],
              ]}
              offFn={off}
              zs={zs}
              color={ec}
              lift={0.013}
            />
          )}

          {/* جيب الصدر + منديل */}
          {s === -1 && (
            <>
              <Seam
                id={`${id}-chest`}
                pts={[
                  [-0.075, 1.225],
                  [-0.125, 1.235],
                ]}
                offFn={off}
                zs={zs}
                color="#0a0a0a"
                r={0.0035}
                lift={0.005}
              />
              <Seam
                id={`${id}-chestP`}
                pts={[
                  [-0.075, 1.232],
                  [-0.125, 1.242],
                ]}
                offFn={off}
                zs={zs}
                color={ec}
                r={0.0024}
                lift={0.007}
              />
              <Panel
                id={`${id}-square`}
                edges={(t) => ({ y: 1.246 - 0.018 * t, a: -0.12, b: -0.082 })}
                offFn={off}
                zs={zs}
                lift={0.006}
                bulge={0.004}
                rows={3}
                cols={5}
              >
                {white}
              </Panel>
            </>
          )}

          {/* جيب بغطاء (flap) + ظل تحته */}
          <Panel
            id={`${id}-flap${s}`}
            edges={(t) => ({ y: 0.985 - 0.04 * t, a: s * 0.085, b: s * 0.15 })}
            offFn={off}
            zs={zs}
            lift={0.01}
            bulge={0.005}
            rows={5}
            cols={5}
          >
            {fab}
          </Panel>
          <Seam
            id={`${id}-flapS${s}`}
            pts={[
              [s * 0.085, 0.987],
              [s * 0.085, 0.945],
              [s * 0.118, 0.94],
              [s * 0.15, 0.945],
              [s * 0.15, 0.987],
            ]}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.0125}
          />
          <Seam
            id={`${id}-flapSh${s}`}
            pts={[
              [s * 0.087, 0.937],
              [s * 0.118, 0.932],
              [s * 0.148, 0.937],
            ]}
            offFn={off}
            zs={zs}
            color="#0a0a0a"
            r={0.003}
            lift={0.006}
          />
          <Stitch
            id={`${id}-flapT${s}`}
            pts={[
              [s * 0.09, 0.98],
              [s * 0.09, 0.95],
              [s * 0.118, 0.945],
              [s * 0.145, 0.95],
              [s * 0.145, 0.98],
            ]}
            offFn={off}
            zs={zs}
            color={th}
            lift={0.0145}
            dash={0.006}
            gap={0.004}
          />
        </group>
      ))}

      {/* خط التقفيل + الحافة المقوّسة */}
      {dbl ? (
        <>
          <Panel
            id={`${id}-overlap`}
            edges={(t) => ({
              y: dy(t),
              a: -(0.085 - dcurve(t)),
              b: 0.085 - dcurve(t),
            })}
            offFn={off}
            zs={zs}
            lift={0.008}
            bulge={0.004}
            rows={28}
            cols={6}
          >
            {fab}
          </Panel>
          <Seam
            id={`${id}-front`}
            pts={sweep(14, (t) => [-(0.085 - dcurve(t)), dy(t)])}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.0115}
          />
          <Stitch
            id={`${id}-frontT`}
            pts={sweep(14, (t) => [-(0.078 - dcurve(t)), dy(t) - 0.002])}
            offFn={off}
            zs={zs}
            color={th}
            lift={0.0145}
          />
        </>
      ) : (
        <>
          <Seam
            id={`${id}-front`}
            pts={[
              [0, 1.1],
              [0.001, 0.98],
              [0.004, 0.91],
              [0.02, 0.865],
              [0.05, 0.838],
            ]}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.008}
          />
          <Stitch
            id={`${id}-frontT`}
            pts={[
              [0.007, 1.09],
              [0.008, 0.98],
              [0.011, 0.912],
              [0.026, 0.87],
              [0.052, 0.846],
            ]}
            offFn={off}
            zs={zs}
            color={th}
            lift={0.0105}
          />
        </>
      )}

      {buttons.map(([x, y]) => (
        <Button
          key={`${x}-${y}`}
          position={[x, y, surf(x, y, off, zs) + 0.014]}
          r={0.0112}
          color={DARK}
          rough={0.3}
        />
      ))}

      {/* بنطلون البدلة + جزم */}
      <Trousers color={color} selected={selected} />
    </group>
  );
}

const COMPONENTS = {
  shirt: Shirt,
  pants: Pants,
  coverall: Coverall,
  jacket: Jacket,
  suit: Suit,
};

// بيفعّل الظلال على كل الأجزاء (ظلال ذاتية بين الطيات والجيوب)
function ShadowEnabler() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  });
  return null;
}

/* ════════════════ المشهد ════════════════ */
export default function Mannequin3D({ design, active, onSelect }) {
  return (
    <div className="h-[560px] w-full">
      <Canvas
        shadows
        camera={{ position: [0, 1.05, 4.6], fov: 30 }}
        dpr={[1, 2]}
        flat
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={0.85}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0003}
          shadow-normalBias={0.004}
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[-1.4, 1.4, 1.4, -1.4, 0.5, 14]}
          />
        </directionalLight>
        <Environment resolution={256}>
          <Lightformer
            form="rect"
            intensity={1.2}
            position={[0, 5, 3]}
            scale={[8, 4, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.7}
            position={[-5, 2, 2]}
            scale={[4, 6, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.7}
            position={[5, 2, -2]}
            scale={[4, 6, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.5}
            position={[0, 1, -6]}
            scale={[10, 5, 1]}
          />
        </Environment>

        {/* القاعدة */}
        <mesh position={[0, -0.016, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.03, 64]} />
          <meshStandardMaterial color={NAVY} metalness={0.3} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.007, 12, 64]} />
          <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
        </mesh>

        <Body />

        {Object.entries(COMPONENTS).map(([key, Comp]) => {
          const d = design[key];
          if (!d.enabled) return null;
          return (
            <Part key={key} id={key} onSelect={onSelect}>
              <Comp
                variant={d.variant}
                color={d.color}
                selected={active === key}
              />
            </Part>
          );
        })}

        <ShadowEnabler />

        <ContactShadows
          position={[0, -0.03, 0]}
          opacity={0.45}
          scale={4}
          blur={2.5}
          far={2}
        />
        <OrbitControls
          target={[0, 0.95, 0]}
          enablePan={false}
          minDistance={2.2}
          maxDistance={6}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
