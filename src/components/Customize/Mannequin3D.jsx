import { useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
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

/* ════════════════ قطاعات الجسم (بتتلف حوالين المحور) ════════════════ */
const sample = (pts, n = 160) =>
  new THREE.SplineCurve(pts.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(
    n,
  );

// الجذع: [نصف القطر, الارتفاع]  (الأكتاف نزلت شوية لتحت)
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

// الدراع (من الرسغ للكتف)
const ARM_P = sample([
  [0.028, -0.62],
  [0.033, -0.52],
  [0.04, -0.4],
  [0.046, -0.28],
  [0.052, -0.14],
  [0.054, -0.02],
  [0.05, 0.02],
]);

// الرجل (من الكعب للفخذ)
const LEG_P = sample([
  [0.034, 0.05],
  [0.041, 0.14],
  [0.056, 0.3],
  [0.054, 0.44],
  [0.066, 0.56],
  [0.08, 0.72],
  [0.086, 0.9],
]);

// الراس: شكل بيضاوي ناعم من غير دقن
const HEAD_P = sample(
  [
    [0.0, -0.122],
    [0.04, -0.112],
    [0.072, -0.078],
    [0.089, -0.02],
    [0.092, 0.04],
    [0.082, 0.092],
    [0.05, 0.123],
    [0.0, 0.132],
  ],
  80,
);
const HEAD_GEO = new THREE.LatheGeometry(HEAD_P, 64);

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

// مكان سطح القماش من قدام عند ارتفاع معين (للأزرار والجيوب)
function frontZ(y, off, zs) {
  let best = TORSO_P[0];
  for (const p of TORSO_P) {
    if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
  }
  return (best.x + off) * zs;
}

/* ════════════════ أدوات القطع الواقعية (أفارول / بدلة / جاكيت) ════════════════ */

// قيمة بتتغير بالتدريج حسب الارتفاع: pl(y, [[y1,v1],[y2,v2],...])
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

// لون أغمق شوية (أو أفتح لو الأصل غامق) للخياطة والحواف
const edgeColor = (c) => {
  const col = new THREE.Color(c);
  const hsl = {};
  col.getHSL(hsl, THREE.SRGBColorSpace);
  hsl.l = hsl.l > 0.3 ? hsl.l * 0.72 : Math.min(hsl.l + 0.09, 1);
  col.setHSL(hsl.h, hsl.s, hsl.l, THREE.SRGBColorSpace);
  return `#${col.getHexString(THREE.SRGBColorSpace)}`;
};

// تجاعيد خفيفة (بتتحط على الرأس بعد ما الشكل يتبني)
function applyFolds(g, { amp, k = 3, freq = 44, mask = () => 1 }) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue;
    const th = Math.atan2(x, z);
    const d =
      amp *
      mask(y) *
      (Math.sin(y * freq + th * k) +
        0.6 * Math.sin(y * freq * 1.7 - th * (k + 2) + 1.3));
    p.setXYZ(i, (x * (r + d)) / r, y, (z * (r + d)) / r);
  }
  g.computeVertexNormals();
}

// خطوط طولية زي الريب (الأكمام والحواف المضلعة)
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

// نفس lathe بس الإزاحة بتتغير حسب الارتفاع (قصّة فضفاضة / ضيقة)
const loftCache = new Map();
function loft(name, prof, y0, y1, offFn, fold, ribs) {
  const key = `${name}|${y0}|${y1}`;
  if (!loftCache.has(key)) {
    const pts = prof
      .filter((p) => p.y >= y0 && p.y <= y1)
      .map((p) => new THREE.Vector2(p.x + offFn(p.y), p.y));
    const g = new THREE.LatheGeometry(pts, 96);
    if (fold) applyFolds(g, fold);
    if (ribs) applyRibs(g, ribs, 0.0022);
    loftCache.set(key, g);
  }
  return loftCache.get(key);
}

const torsoR = (y) => {
  let b = TORSO_P[0];
  for (const p of TORSO_P) {
    if (Math.abs(p.y - y) < Math.abs(b.y - y)) b = p;
  }
  return b.x;
};

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
  rows = 24,
  cols = 6,
  children,
}) {
  const geo = useMemo(() => {
    const pos = [];
    const idx = [];
    for (let i = 0; i <= rows; i++) {
      const { y, a, b } = edges(i / rows);
      for (let j = 0; j <= cols; j++) {
        const x = a + ((b - a) * j) / cols;
        pos.push(x, y, surf(x, y, offFn, zs) + lift);
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
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return <mesh geometry={geo}>{children}</mesh>;
}

// خط خياطة / حافة رفيعة بتمشي على سطح القماش
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

/* ════════════════ الخامات ════════════════ */
const Skin = () => (
  <meshPhysicalMaterial
    color={MANNEQUIN}
    roughness={0.35}
    clearcoat={0.4}
    clearcoatRoughness={0.4}
  />
);

// نسيج القماش (ملمس بس، من غير ما يغيّر اللون)
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

function Fabric({ color, selected }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.95}
      sheen={0.08}
      sheenRoughness={0.8}
      sheenColor={color}
      bumpMap={weave()}
      bumpScale={0.6}
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
const SHOULDER_Y = 1.39; // كان 1.44 — الأكتاف نزلت

function Arms({ children }) {
  return [1, -1].map((s) => (
    <group
      key={s}
      position={[s * SHOULDER_X, SHOULDER_Y, 0]}
      rotation={[0, 0, s * 0.18]}
    >
      {children}
    </group>
  ));
}

// كم + كتف
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

// كم واقعي (قصّته بتتغير حسب الارتفاع) + كتف
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

// ياقة دائرية
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
      {/* الراس والرقبة */}
      {/* <mesh
        geometry={HEAD_GEO}
        position={[0, 1.69, 0.008]}
        scale={[1, 1, 1.12]}
      >
        <Skin />
      </mesh> */}
      <mesh position={[0, 1.585, 0]}>
        <cylinderGeometry args={[0.042, 0.05, 0.1, 24]} />
        <Skin />
      </mesh>

      {/* الجذع */}
      <mesh geometry={lathe("torso", TORSO_P, 0.78, 1.56)} scale={[1, 1, 0.62]}>
        <Skin />
      </mesh>
      <Crotch fab={<Skin />} />

      {/* الأكتاف والدراعين والإيدين */}
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

      {/* الرجلين والقدمين */}
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
          {/* فتحة الأزرار */}
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
      {/* الحزام */}
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

/* ════════════════ قصّات الأفارول / الجاكيت / البدلة ════════════════ */
const F_BODY = { amp: 0.0028, k: 3, freq: 44 };
const F_ARM = {
  amp: 0.0034,
  k: 3,
  freq: 52,
  mask: (y) => Math.exp(-(((y + 0.3) / 0.16) ** 2)) + 0.25,
};
const F_LEG = {
  amp: 0.003,
  k: 3,
  freq: 48,
  mask: (y) => Math.exp(-(((y - 0.45) / 0.18) ** 2)) + 0.25,
};

const COV_OFF = (y) =>
  pl(y, [
    [0.78, 0.034],
    [1.08, 0.042],
    [1.3, 0.036],
    [1.5, 0.03],
  ]);
const COV_LEG = (y) =>
  pl(y, [
    [0.07, 0.012],
    [0.16, 0.012],
    [0.4, 0.024],
    [0.9, 0.022],
  ]);
const COV_SLV = (y) =>
  pl(y, [
    [-0.62, 0.012],
    [-0.5, 0.012],
    [-0.3, 0.026],
    [0.02, 0.034],
  ]);

const SUIT_OFF = (y) =>
  pl(y, [
    [0.78, 0.042],
    [1.0, 0.034],
    [1.1, 0.026],
    [1.3, 0.034],
    [1.5, 0.03],
  ]);
const SUIT_SLV = (y) =>
  pl(y, [
    [-0.62, 0.012],
    [-0.3, 0.02],
    [0.02, 0.03],
  ]);

const BOMBER_OFF = (y) =>
  pl(y, [
    [0.95, 0.012],
    [1.08, 0.05],
    [1.3, 0.05],
    [1.5, 0.034],
  ]);
const BOMBER_SLV = (y) =>
  pl(y, [
    [-0.5, 0.01],
    [-0.4, 0.03],
    [-0.3, 0.04],
    [0.02, 0.045],
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
    [-0.3, 0.03],
    [0.02, 0.038],
  ]);

// ياقة مفتوحة (طيتين) بتتحط على الصدر
function Collar({ id, offFn, zs, fab, color }) {
  const ec = edgeColor(color);
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
          rows={10}
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
          lift={0.01}
        />
      </group>
    );
  });
}

// جيب مائل (welt) على الجنب
function Welt({ id, offFn, zs, color, s, p0, p1 }) {
  return (
    <>
      <Seam
        id={`${id}-w1${s}`}
        pts={[
          [s * p0[0], p0[1]],
          [s * p1[0], p1[1]],
        ]}
        offFn={offFn}
        zs={zs}
        color={color}
        lift={0.003}
      />
      <Seam
        id={`${id}-w2${s}`}
        pts={[
          [s * p0[0], p0[1] + 0.011],
          [s * p1[0], p1[1] + 0.011],
        ]}
        offFn={offFn}
        zs={zs}
        color={color}
        lift={0.003}
        r={0.0016}
      />
    </>
  );
}

// سوستة: شريط + أسنان + سحاب
function Zip({ id, offFn, zs, color, yTop, yBot, fab }) {
  const ec = edgeColor(color);
  const band = (
    <meshStandardMaterial color={ec} roughness={0.95} side={THREE.DoubleSide} />
  );
  return (
    <>
      <Panel
        id={`${id}-zipband`}
        edges={(t) => ({ y: yTop - (yTop - yBot) * t, a: -0.009, b: 0.009 })}
        offFn={offFn}
        zs={zs}
        lift={0.006}
        rows={30}
        cols={2}
      >
        {band}
      </Panel>
      <Seam
        id={`${id}-zipteeth`}
        pts={[
          [0, yTop],
          [0, yBot],
        ]}
        offFn={offFn}
        zs={zs}
        color="#C4C4C4"
        r={0.0026}
        lift={0.01}
        metal
      />
      <mesh
        position={[0, yTop - 0.03, surf(0, yTop - 0.03, offFn, zs) + 0.015]}
      >
        <boxGeometry args={[0.014, 0.034, 0.009]} />
        <Metal />
      </mesh>
      {fab && null}
    </>
  );
}

/* ════════════════ الأفارول ════════════════ */
function Coverall({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} />;
  const off = COV_OFF;
  const zs = 0.72;
  const ec = edgeColor(color);
  const id = `cov-${variant}`;
  const band = (
    <meshStandardMaterial color={ec} roughness={0.95} side={THREE.DoubleSide} />
  );

  return (
    <group>
      {/* الجسم */}
      <mesh
        geometry={loft("cov-body", TORSO_P, 0.78, 1.54, off, F_BODY)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>
      <Crotch fab={fab} w={0.2} />

      {/* حزام الوسط (خياطة) */}
      <mesh
        geometry={loft("cov-waist", TORSO_P, 1.06, 1.09, (y) => off(y) + 0.005)}
        scale={[1, 1, zs]}
      >
        {band}
      </mesh>

      {/* الرجلين + أساور الكاحل */}
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.088, 0, 0]}>
          <mesh geometry={loft("cov-leg", LEG_P, 0.07, 0.9, COV_LEG, F_LEG)}>
            {fab}
          </mesh>
          <mesh
            geometry={loft(
              "cov-ankle",
              LEG_P,
              0.07,
              0.15,
              () => 0.015,
              null,
              40,
            )}
          >
            {band}
          </mesh>
        </group>
      ))}

      {/* الأكمام + أساور الرسغ */}
      <Sl
        geo={loft("cov-arm", ARM_P, -0.62, 0.02, COV_SLV, F_ARM)}
        r={0.066 + COV_SLV(0.02)}
      >
        {fab}
      </Sl>
      <Arms>
        <mesh
          geometry={loft(
            "cov-cuff",
            ARM_P,
            -0.62,
            -0.55,
            () => 0.014,
            null,
            36,
          )}
        >
          {band}
        </mesh>
      </Arms>

      {/* الياقة */}
      <Ring y={1.538} radius={0.076} tube={0.021} zs={0.74}>
        {fab}
      </Ring>
      <Collar id={id} offFn={off} zs={zs} fab={fab} color={color} />

      {/* جيوب الصدر (جيب + غطاء) */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Panel
            id={`${id}-pk${s}`}
            edges={(t) => ({ y: 1.31 - 0.078 * t, a: s * 0.045, b: s * 0.115 })}
            offFn={off}
            zs={zs}
            lift={0.006}
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
          <Panel
            id={`${id}-fl${s}`}
            edges={(t) => ({
              y: 1.335 - 0.032 * t,
              a: s * 0.045,
              b: s * 0.115,
            })}
            offFn={off}
            zs={zs}
            lift={0.011}
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
            lift={0.013}
          />
          <Welt
            id={`${id}-hip`}
            offFn={off}
            zs={zs}
            color={ec}
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
            edges={(t) => ({ y: 1.52 - 0.65 * t, a: -0.022, b: 0.022 })}
            offFn={off}
            zs={zs}
            lift={0.007}
            rows={30}
            cols={2}
          >
            {fab}
          </Panel>
          {[-0.022, 0.022].map((x) => (
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
              lift={0.009}
            />
          ))}
          {[1.44, 1.34, 1.24, 1.14, 1.04, 0.94].map((y) => (
            <mesh key={y} position={[0, y, surf(0, y, off, zs) + 0.015]}>
              <cylinderGeometry args={[0.0105, 0.0105, 0.007, 20]} />
              <Plastic />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

/* ════════════════ الجاكيت ════════════════ */
function Jacket({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} />;
  const bomber = variant === "bomber";
  const off = bomber ? BOMBER_OFF : CLASSIC_OFF;
  const slv = bomber ? BOMBER_SLV : CLASSIC_SLV;
  const zs = bomber ? 0.76 : 0.74;
  const y0 = bomber ? 0.95 : 0.8;
  const ec = edgeColor(color);
  const id = `jkt-${variant}`;
  const rib = (
    <meshStandardMaterial
      color={DARK}
      roughness={0.95}
      side={THREE.DoubleSide}
    />
  );

  return (
    <group>
      {/* الجسم */}
      <mesh
        geometry={loft(`${id}-body`, TORSO_P, y0, 1.54, off, F_BODY)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>

      {/* الأكمام */}
      <Sl
        geo={loft(`${id}-arm`, ARM_P, bomber ? -0.5 : -0.6, 0.02, slv, F_ARM)}
        r={0.066 + slv(0.02)}
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
          <Arms>
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
          </Arms>
          <Ring y={1.538} radius={0.077} tube={0.028} zs={0.76}>
            {rib}
          </Ring>
        </>
      ) : (
        <>
          <Ring y={1.538} radius={0.076} tube={0.02} zs={0.74}>
            {fab}
          </Ring>
          <Collar id={id} offFn={off} zs={zs} fab={fab} color={color} />
          {/* خياطة طرف الكم */}
          <Arms>
            <mesh
              geometry={loft(
                "jkt-cuffline",
                ARM_P,
                -0.62,
                -0.585,
                () => 0.02,
                null,
                0,
              )}
            >
              <meshStandardMaterial
                color={ec}
                roughness={0.95}
                side={THREE.DoubleSide}
              />
            </mesh>
          </Arms>
        </>
      )}

      {/* جيوب الجنب المائلة */}
      {[1, -1].map((s) => (
        <Welt
          key={s}
          id={id}
          offFn={off}
          zs={zs}
          color={ec}
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
        yTop={1.525}
        yBot={y0 + 0.005}
      />
    </group>
  );
}

/* ════════════════ البدلة ════════════════ */
function Suit({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} />;
  const off = SUIT_OFF;
  const zs = 0.74;
  const ec = edgeColor(color);
  const dbl = variant === "double";
  const id = `suit-${variant}`;

  // شكل الطية
  const ly = (t) => 1.505 - 0.385 * t;
  const lin = (t) => 0.004 + 0.05 * (1 - t);
  const lout = (t) =>
    pl(t, [
      [0, 0.09],
      [0.35, 0.125],
      [1, 0.012],
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

  return (
    <group>
      {/* الجاكيت */}
      <mesh
        geometry={loft("suit-body", TORSO_P, 0.78, 1.54, off, F_BODY)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>
      <Sl
        geo={loft("suit-arm", ARM_P, -0.6, 0.02, SUIT_SLV, F_ARM)}
        r={0.066 + SUIT_SLV(0.02)}
      >
        {fab}
      </Sl>
      {/* كُم القميص الأبيض اللي طالع من الجاكيت */}
      <Arms>
        <mesh
          geometry={loft(
            "suit-cuff",
            ARM_P,
            -0.62,
            -0.585,
            () => 0.008,
            null,
            0,
          )}
        >
          <meshStandardMaterial
            color="#F4F4F4"
            roughness={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      </Arms>

      {/* ياقة القميص + الياقة الخلفية */}
      <Ring y={1.538} radius={0.076} tube={0.022} zs={0.74}>
        {fab}
      </Ring>
      <Ring y={1.552} radius={0.069} tube={0.012} zs={0.74}>
        <meshStandardMaterial color="#F4F4F4" roughness={0.6} />
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
        <meshStandardMaterial
          color="#F7F7F7"
          roughness={0.6}
          side={THREE.DoubleSide}
        />
      </Panel>

      {/* الكرافتة */}
      <Panel
        id={`${id}-tie`}
        edges={(t) => {
          const h = pl(t, [
            [0, 0.008],
            [0.15, 0.011],
            [0.8, 0.022],
            [1, 0.002],
          ]);
          return { y: 1.49 - 0.33 * t, a: -h, b: h };
        }}
        offFn={off}
        zs={zs}
        lift={0.006}
        rows={30}
        cols={4}
      >
        <meshStandardMaterial
          color={GOLD}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </Panel>
      <mesh position={[0, 1.497, surf(0, 1.497, off, zs) + 0.011]}>
        <boxGeometry args={[0.028, 0.03, 0.014]} />
        <meshStandardMaterial color={GOLD} roughness={0.5} />
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
            rows={26}
            cols={6}
          >
            {fab}
          </Panel>
          <Seam
            id={`${id}-lapelO${s}`}
            pts={sweep(10, (t) => [s * lout(t), ly(t)])}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.012}
          />
          <Seam
            id={`${id}-lapelI${s}`}
            pts={sweep(10, (t) => [s * lin(t), ly(t)])}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.012}
          />

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
                color={ec}
                lift={0.004}
              />
              <Panel
                id={`${id}-square`}
                edges={(t) => ({ y: 1.243 - 0.018 * t, a: -0.12, b: -0.082 })}
                offFn={off}
                zs={zs}
                lift={0.004}
                rows={2}
                cols={4}
              >
                <meshStandardMaterial
                  color="#F7F7F7"
                  roughness={0.6}
                  side={THREE.DoubleSide}
                />
              </Panel>
            </>
          )}

          {/* جيب بغطاء */}
          <Panel
            id={`${id}-flap${s}`}
            edges={(t) => ({ y: 0.985 - 0.04 * t, a: s * 0.085, b: s * 0.15 })}
            offFn={off}
            zs={zs}
            lift={0.008}
            rows={4}
            cols={4}
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
            lift={0.01}
          />
        </group>
      ))}

      {/* خط التقفيل + الحافة المقوّسة */}
      {dbl ? (
        <Seam
          id={`${id}-front`}
          pts={[
            [-0.085, 1.1],
            [-0.085, 0.86],
            [-0.075, 0.81],
            [-0.05, 0.783],
          ]}
          offFn={off}
          zs={zs}
          color={ec}
          lift={0.01}
        />
      ) : (
        <>
          <Seam
            id={`${id}-front`}
            pts={[
              [0, 1.1],
              [0.002, 0.98],
              [0.012, 0.9],
              [0.04, 0.83],
              [0.075, 0.784],
            ]}
            offFn={off}
            zs={zs}
            color={ec}
            lift={0.008}
          />
        </>
      )}

      {buttons.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, surf(x, y, off, zs) + 0.011]}>
          <cylinderGeometry args={[0.0115, 0.0115, 0.007, 20]} />
          <meshStandardMaterial color={DARK} roughness={0.35} />
        </mesh>
      ))}

      {/* بنطلون البدلة */}
      <Pants variant="classic" color={color} selected={selected} />
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

/* ════════════════ المشهد ════════════════ */
export default function Mannequin3D({ design, active, onSelect }) {
  return (
    <div className="h-[560px] w-full">
      <Canvas
        camera={{ position: [0, 1.05, 4.6], fov: 30 }}
        dpr={[1, 2]}
        flat
        gl={{ antialias: true }}
      >
        {/* إضاءة استوديو (من غير ملفات خارجية) — هادية عشان الألوان تفضل صح */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={0.6} />
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
