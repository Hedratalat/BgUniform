import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
  FaLayerGroup,
  FaTimes,
  FaCheckCircle,
  FaImage,
  FaInbox,
  FaExclamationTriangle,
} from "react-icons/fa";
import { db } from "../../firebase";
import Navbar from "../components/Navbar/Navbar";
import { useLang } from "../context/LangContext";
import Footer from "../components/Footer/Footer";

const COLLECTION_NAME = "Materials";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const popIn = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const revealProps = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, amount: 0.3 },
};

/* ─── material detail modal ─── */
function MaterialModal({ material, lang, onClose }) {
  if (!material) return null;

  const name = lang === "ar" ? material.name_ar : material.name_en;
  const overview = lang === "ar" ? material.overview_ar : material.overview_en;
  const features =
    (lang === "ar" ? material.features_ar : material.features_en) || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 px-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl"
        >
          <div className="relative h-56 w-full overflow-hidden bg-navy-900">
            {material.imageUrl ? (
              <img
                src={material.imageUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-navy-500">
                <FaImage size={36} />
              </div>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 end-4 flex h-9 w-9 items-center justify-center rounded-full bg-navy-900/70 text-white transition hover:bg-navy-900"
            >
              <FaTimes size={16} />
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <h3 className="text-xl font-extrabold text-navy-900 sm:text-2xl">
              {name}
            </h3>

            {overview && (
              <p className="mt-4 leading-relaxed text-navy-600">{overview}</p>
            )}

            {features.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-bold uppercase tracking-wide text-gold-700">
                  {lang === "ar" ? "مميزات الخامة" : "Features"}
                </h4>
                <ul className="mt-3 space-y-2">
                  {features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-navy-700"
                    >
                      <FaCheckCircle
                        className="mt-1 shrink-0 text-gold-500"
                        size={14}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── single material card ─── */
function MaterialCard({ material, lang, onSelect }) {
  const name = lang === "ar" ? material.name_ar : material.name_en;
  const short = lang === "ar" ? material.short_ar : material.short_en;

  return (
    <motion.div
      variants={popIn}
      onClick={() => onSelect(material)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-cream-300 bg-cream-50 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-500 hover:shadow-xl"
    >
      <div className="relative h-48 w-full overflow-hidden bg-navy-900">
        {material.imageUrl ? (
          <img
            src={material.imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-500">
            <FaImage size={30} />
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-navy-900">{name}</h3>
        {short && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-navy-600">
            {short}
          </p>
        )}
        <span className="mt-4 inline-block text-sm font-bold text-gold-700 transition-colors group-hover:text-gold-600">
          {lang === "ar" ? "اعرف أكتر ←" : "Learn more →"}
        </span>
      </div>
    </motion.div>
  );
}

export default function Materials() {
  const { t } = useTranslation();
  const { lang } = useLang();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMaterials(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching materials:", err);
        setError(true);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Navbar />

      <div className="overflow-hidden">
        {/*  Hero  */}
        <section className="relative bg-navy-900 px-4 py-20 text-white sm:px-8 lg:py-28">
          <div className="pointer-events-none absolute -top-20 -end-20 h-72 w-72 rounded-full bg-gold-500/10" />
          <div className="pointer-events-none absolute -bottom-28 -start-28 h-80 w-80 rounded-full border-2 border-gold-500/15" />

          <div className="relative mx-auto max-w-3xl text-center">
            <motion.span
              {...revealProps}
              variants={fadeUp}
              custom={0}
              className="inline-block rounded-full bg-gold-500/15 px-4 py-1 text-sm font-bold text-gold-400"
            >
              {t("materials.badge")}
            </motion.span>

            <motion.h2
              {...revealProps}
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl font-extrabold sm:text-4xl lg:text-5xl"
            >
              {t("materials.heroTitle")}
            </motion.h2>

            <motion.div
              {...revealProps}
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-5 h-1 w-20 rounded-full bg-gold-500"
            />

            <motion.p
              {...revealProps}
              variants={fadeUp}
              custom={3}
              className="mt-6 text-base leading-relaxed text-navy-100 sm:text-lg"
            >
              {t("materials.heroText")}
            </motion.p>
          </div>
        </section>

        {/*  Materials grid  */}
        <section className="px-4 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <motion.div
              {...revealProps}
              variants={fadeUp}
              className="mx-auto mb-12 max-w-xl text-center"
            >
              <span className="text-sm font-bold text-gold-700">
                {t("materials.gridBadge")}
              </span>
              <h2 className="mt-3 text-2xl font-extrabold text-navy-900 sm:text-3xl">
                {t("materials.gridTitle")}
              </h2>
            </motion.div>

            {loading && (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-100 border-t-gold-500" />
              </div>
            )}

            {!loading && error && (
              <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <FaExclamationTriangle size={26} className="text-red-500" />
                <p className="font-semibold text-red-600">
                  {t("materials.errorText")}
                </p>
              </div>
            )}

            {!loading && !error && materials.length === 0 && (
              <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-navy-200 bg-cream-50 py-16 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-navy-300">
                  <FaInbox size={26} />
                </span>
                <h3 className="mt-4 font-bold text-navy-700">
                  {t("materials.emptyTitle")}
                </h3>
                <p className="mt-1 text-sm text-navy-400">
                  {t("materials.emptyText")}
                </p>
              </div>
            )}

            {!loading && !error && materials.length > 0 && (
              <motion.div
                {...revealProps}
                variants={staggerContainer}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {materials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    lang={lang}
                    onSelect={setSelected}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/*  CTA  */}
        <motion.section
          {...revealProps}
          variants={fadeIn}
          className="px-4 pb-20 sm:px-8"
        >
          <div className="mx-auto max-w-4xl rounded-3xl bg-gold-500 px-6 py-12 text-center shadow-xl shadow-gold-500/30 sm:px-12">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-500">
              <FaLayerGroup size={22} />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold text-navy-900 sm:text-3xl">
              {t("materials.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-navy-800">
              {t("materials.ctaText")}
            </p>
            <a
              href="/contact"
              className="mt-7 inline-block rounded-xl bg-navy-900 px-8 py-3.5 font-extrabold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-800"
            >
              {t("materials.ctaButton")}
            </a>
          </div>
        </motion.section>
      </div>

      <MaterialModal
        material={selected}
        lang={lang}
        onClose={() => setSelected(null)}
      />
      <Footer />
    </>
  );
}
