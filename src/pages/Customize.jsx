import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FaTshirt, FaShoppingCart } from "react-icons/fa";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import Mannequin3D from "../components/Customize/Mannequin3D";
import { COLORS, GARMENTS, EXCLUDES } from "../data/customizeConfig";

const initialDesign = Object.fromEntries(
  Object.entries(GARMENTS).map(([k, g]) => [
    k,
    {
      variant: g.variants[0],
      color: g.defaultColor,
      enabled: g.defaultEnabled,
    },
  ]),
);

export default function Customize() {
  const { t } = useTranslation();
  const [design, setDesign] = useState(initialDesign);
  const [active, setActive] = useState("shirt");

  const update = (part, patch) =>
    setDesign((d) => ({ ...d, [part]: { ...d[part], ...patch } }));

  const wear = (part) =>
    setDesign((d) => {
      if (d[part].enabled) return d;
      const next = { ...d, [part]: { ...d[part], enabled: true } };
      EXCLUDES[part].forEach((p) => {
        next[p] = { ...next[p], enabled: false };
      });
      return next;
    });

  const takeOff = (part) => update(part, { enabled: false });

  const selectPart = (part) => {
    setActive(part);
    wear(part);
  };

  const addToCart = () => {
    try {
      const raw = localStorage.getItem("bgUniform_cart");
      const cart = raw ? JSON.parse(raw) : [];
      const worn = Object.fromEntries(
        Object.entries(design).filter(([, v]) => v.enabled),
      );
      cart.push({
        id: `custom-${Date.now()}`,
        custom: true,
        design: worn,
        qty: 1,
      });
      localStorage.setItem("bgUniform_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cart:updated"));
    } catch (e) {
      console.error(e);
    }
  };

  const current = design[active];

  return (
    <>
      <Navbar />
      <section className="bg-cream-100 px-4 py-10 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-center text-3xl font-extrabold text-navy-900">
            {t("customize.title")}
          </h1>
          <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-gold-500" />

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* المانيكان 3D */}
            <div className="rounded-3xl border border-cream-300 bg-cream-50 p-4 shadow-lg">
              <Mannequin3D
                design={design}
                active={active}
                onSelect={setActive}
              />
              <p className="mt-2 text-center text-xs text-navy-600">
                {t("customize.hint")}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {Object.keys(GARMENTS).map((part) => (
                  <button
                    key={part}
                    onClick={() => selectPart(part)}
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      active === part
                        ? "bg-navy-900 text-gold-500"
                        : "bg-cream-200 text-navy-900 hover:bg-gold-100"
                    }`}
                  >
                    <FaTshirt size={14} />
                    {t(`customize.parts.${part}`)}
                    {design[part].enabled && (
                      <span className="h-2 w-2 rounded-full bg-gold-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* لوحة التحكم */}
            <div className="rounded-3xl border border-cream-300 bg-cream-50 p-6 shadow-lg">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold text-navy-900">
                      {t(`customize.parts.${active}`)}
                    </h2>
                    <button
                      onClick={() =>
                        current.enabled ? takeOff(active) : wear(active)
                      }
                      className="rounded-full border border-navy-900 px-4 py-1.5 text-sm font-bold text-navy-900 transition-colors hover:bg-navy-900 hover:text-gold-500"
                    >
                      {current.enabled
                        ? t("customize.takeOff")
                        : t("customize.wear")}
                    </button>
                  </div>

                  <h3 className="mb-3 mt-6 text-sm font-bold text-gold-700">
                    {t("customize.style")}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {GARMENTS[active].variants.map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          update(active, { variant: v });
                          wear(active);
                        }}
                        className={`rounded-xl border-2 px-5 py-2.5 font-semibold transition-all ${
                          current.variant === v
                            ? "border-gold-500 bg-gold-100 text-navy-900"
                            : "border-cream-300 hover:border-gold-500"
                        }`}
                      >
                        {t(`customize.variants.${v}`)}
                      </button>
                    ))}
                  </div>

                  <h3 className="mb-3 mt-6 text-sm font-bold text-gold-700">
                    {t("customize.color")}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {COLORS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => {
                          update(active, { color: c.hex });
                          wear(active);
                        }}
                        aria-label={t(`customize.colors.${c.key}`)}
                        style={{ backgroundColor: c.hex }}
                        className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${
                          current.color === c.hex
                            ? "border-white ring-4 ring-gold-500"
                            : "border-cream-300"
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={current.color}
                      onChange={(e) => {
                        update(active, { color: e.target.value });
                        wear(active);
                      }}
                      className="h-10 w-10 cursor-pointer rounded-full border-0 bg-transparent p-0"
                      aria-label={t("customize.customColor")}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              <button
                onClick={addToCart}
                className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-3.5 font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-navy-800"
              >
                <FaShoppingCart />
                {t("customize.addToCart")}
              </button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
