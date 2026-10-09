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

/* ════════════════ الخامات ════════════════ */
const Skin = () => (
  <meshPhysicalMaterial
    color={MANNEQUIN}
    roughness={0.35}
    clearcoat={0.4}
    clearcoatRoughness={0.4}
  />
);

function Fabric({ color, selected }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.95}
      sheen={0.08}
      sheenRoughness={0.8}
      sheenColor={color}
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

/* ════════════════ الأفارول ════════════════ */
function Coverall({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} />;
  const off = 0.02;
  const zs = 0.68;
  return (
    <group>
      <mesh
        geometry={lathe("torso", TORSO_P, 0.78, 1.54, off)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>
      <Crotch fab={fab} w={0.2} />
      {[1, -1].map((s) => (
        <mesh
          key={s}
          geometry={lathe("leg", LEG_P, 0.07, 0.9, off)}
          position={[s * 0.088, 0, 0]}
        >
          {fab}
        </mesh>
      ))}
      <Sleeves fab={fab} y0={-0.6} off={off} />
      <Ring y={1.538} radius={0.074} tube={0.02} zs={0.72}>
        {fab}
      </Ring>

      {/* جيوب الصدر */}
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.075, 1.28, frontZ(1.28, off, zs) + 0.004]}
        >
          <boxGeometry args={[0.07, 0.07, 0.01]} />
          {fab}
        </mesh>
      ))}

      {variant === "zip" ? (
        <mesh position={[0, 1.125, frontZ(1.15, off, zs) + 0.004]}>
          <boxGeometry args={[0.012, 0.55, 0.008]} />
          <Metal />
        </mesh>
      ) : (
        [1.38, 1.28, 1.18, 1.08, 0.98].map((y) => (
          <mesh key={y} position={[0, y, frontZ(y, off, zs) + 0.008]}>
            <sphereGeometry args={[0.012, 14, 14]} />
            <Plastic />
          </mesh>
        ))
      )}
    </group>
  );
}

/* ════════════════ الجاكيت ════════════════ */
function Jacket({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} />;
  const off = 0.03;
  const zs = 0.72;
  const bomber = variant === "bomber";
  const hem = bomber ? 0.88 : 0.8;

  return (
    <group>
      <mesh
        geometry={lathe("torso", TORSO_P, hem, 1.54, off)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>
      <Sleeves fab={fab} y0={-0.6} off={off} />
      <Ring y={1.538} radius={0.076} tube={0.024} zs={0.74}>
        {fab}
      </Ring>

      {bomber && (
        <>
          {/* حواف مضلعة */}
          <mesh
            geometry={lathe("torso", TORSO_P, 0.88, 0.95, off + 0.004)}
            scale={[1, 1, zs]}
          >
            <meshStandardMaterial
              color={DARK}
              roughness={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
          <Arms>
            <mesh geometry={lathe("arm", ARM_P, -0.62, -0.53, off + 0.004)}>
              <meshStandardMaterial
                color={DARK}
                roughness={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          </Arms>
        </>
      )}

      {/* السوستة */}
      <mesh position={[0, 1.17, frontZ(1.15, off, zs) + 0.004]}>
        <boxGeometry args={[0.013, 0.7, 0.008]} />
        <Metal />
      </mesh>
    </group>
  );
}

/* ════════════════ البدلة ════════════════ */
function Suit({ variant, color, selected }) {
  const fab = <Fabric color={color} selected={selected} />;
  const off = 0.032;
  const zs = 0.72;
  const z = frontZ(1.3, off, zs);

  const vShape = (() => {
    const s = new THREE.Shape();
    s.moveTo(-0.06, 0.12);
    s.lineTo(0.06, 0.12);
    s.lineTo(0, -0.1);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  })();

  const buttons =
    variant === "double"
      ? [
          [-0.05, 1.08],
          [0.05, 1.08],
          [-0.05, 0.96],
          [0.05, 0.96],
        ]
      : [[0, 1.02]];

  return (
    <group>
      <mesh
        geometry={lathe("torso", TORSO_P, 0.76, 1.54, off)}
        scale={[1, 1, zs]}
      >
        {fab}
      </mesh>
      <Sleeves fab={fab} y0={-0.6} off={off} />
      <Ring y={1.538} radius={0.076} tube={0.022} zs={0.74}>
        {fab}
      </Ring>

      {/* القميص الأبيض + الكرافتة */}
      <mesh geometry={vShape} position={[0, 1.3, z + 0.003]}>
        <meshStandardMaterial color="#FFFFFF" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.385, z + 0.008]}>
        <boxGeometry args={[0.03, 0.035, 0.012]} />
        <meshStandardMaterial color={GOLD} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.29, z + 0.007]}>
        <boxGeometry args={[0.028, 0.17, 0.01]} />
        <meshStandardMaterial color={GOLD} roughness={0.5} />
      </mesh>

      {/* طيات الياقة */}
      {[1, -1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.052, 1.31, z + 0.008]}
          rotation={[0, 0, -s * 0.27]}
        >
          <boxGeometry args={[0.032, 0.24, 0.014]} />
          {fab}
        </mesh>
      ))}

      {buttons.map(([x, y]) => (
        <mesh key={`${x}-${y}`} position={[x, y, frontZ(y, off, zs) + 0.008]}>
          <sphereGeometry args={[0.013, 14, 14]} />
          <meshStandardMaterial color={DARK} roughness={0.4} />
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
