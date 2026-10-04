import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { FaTshirt, FaTimes, FaCheckCircle, FaInbox } from "react-icons/fa";
import { db } from "../../../firebase";

const COLLECTION_NAME = "WorkSectors";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: "easeOut" },
  }),
};

const revealProps = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, amount: 0.2 },
};

function SectorCard({ sector, index, onOpen, lang }) {
  const title = lang === "ar" ? sector.title_ar : sector.title_en;
  const short = lang === "ar" ? sector.short_ar : sector.short_en;

  return (
    <motion.button
      {...revealProps}
      variants={fadeUp}
      custom={index}
      onClick={() => onOpen(sector)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white text-start shadow-md shadow-navy-900/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-navy-900/10"
    >
      {/* Image header */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-navy-900">
        {sector.imageUrl ? (
          <img
            src={sector.imageUrl}
            alt={title}
            className="block h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className={`h-full w-full items-center justify-center text-gold-500 ${
            sector.imageUrl ? "hidden" : "flex"
          }`}
        >
          <FaTshirt size={40} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-900/40 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-navy-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-navy-500">{short}</p>

        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold-600">
          {lang === "ar" ? "عرض التفاصيل" : "View Details"}
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
        </span>
      </div>
    </motion.button>
  );
}

function SectorModal({ sector, onClose, lang }) {
  if (!sector) {
    return <AnimatePresence />;
  }

  const title = lang === "ar" ? sector.title_ar : sector.title_en;
  const overview = lang === "ar" ? sector.overview_ar : sector.overview_en;
  const items = lang === "ar" ? sector.items_ar : sector.items_en;
  const features = lang === "ar" ? sector.features_ar : sector.features_en;

  return (
    <AnimatePresence>
      {sector && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            {/* Image banner header */}
            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-navy-900">
              {sector.imageUrl ? (
                <img
                  src={sector.imageUrl}
                  alt={title}
                  className="block h-full w-full object-cover object-center"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`h-full w-full items-center justify-center text-gold-500 ${
                  sector.imageUrl ? "hidden" : "flex"
                }`}
              >
                <FaTshirt size={48} />
              </div>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-900/80 via-navy-900/10 to-transparent" />

              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 end-4 flex h-9 w-9 items-center justify-center rounded-lg bg-black/30 text-white transition hover:bg-black/50"
              >
                <FaTimes size={16} />
              </button>

              <h3 className="absolute bottom-4 start-6 end-6 text-xl font-bold text-white">
                {title}
              </h3>
            </div>

            <div className="p-6">
              <p className="leading-relaxed text-navy-600">{overview}</p>

              {items?.length > 0 && (
                <>
                  <h4 className="mt-6 font-bold text-navy-900">
                    {lang === "ar" ? "ما نوفره:" : "What We Offer:"}
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-navy-700"
                      >
                        <FaCheckCircle
                          className="mt-0.5 shrink-0 text-gold-500"
                          size={14}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {features?.length > 0 && (
                <>
                  <h4 className="mt-6 font-bold text-navy-900">
                    {lang === "ar" ? "المميزات:" : "Features:"}
                  </h4>
                  <ul className="mt-3 space-y-2">
                    {features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-navy-700"
                      >
                        <FaCheckCircle
                          className="mt-0.5 shrink-0 text-gold-500"
                          size={14}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <button
                onClick={onClose}
                className="mt-8 w-full rounded-xl bg-gold-500 py-3 font-bold text-navy-900 transition hover:bg-gold-600"
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function WorkSectors() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSector, setActiveSector] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSectors(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching sectors:", err);
        setError(true);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <section className="bg-cream-100 px-4 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <motion.span
            {...revealProps}
            variants={fadeUp}
            custom={0}
            className="inline-block rounded-full bg-gold-500/20 px-4 py-1 text-sm font-bold text-gold-800"
          >
            {lang === "ar" ? "قطاعات عملنا" : "Our Sectors"}
          </motion.span>

          <motion.h2
            {...revealProps}
            variants={fadeUp}
            custom={1}
            className="mt-4 text-3xl font-extrabold text-navy-900 sm:text-4xl"
          >
            {lang === "ar" ? "نخدم كل القطاعات" : "We Serve Every Sector"}
          </motion.h2>

          <motion.div
            {...revealProps}
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 h-1 w-20 rounded-full bg-gold-500"
          />

          <motion.p
            {...revealProps}
            variants={fadeUp}
            custom={3}
            className="mt-5 text-base text-navy-600 sm:text-lg"
          >
            {lang === "ar"
              ? "نصنع أزياء موحدة مخصصة لطبيعة كل قطاع، بخامات وتصميمات تناسب احتياجات عملك."
              : "We craft custom uniforms tailored to each sector, using materials and designs that fit your business needs."}
          </motion.p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-100 border-t-gold-500" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center font-semibold text-red-600">
            {lang === "ar"
              ? "حدث خطأ أثناء تحميل القطاعات."
              : "Failed to load sectors."}
          </div>
        )}

        {!loading && !error && sectors.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-navy-300">
              <FaInbox size={26} />
            </span>
            <h3 className="mt-4 font-bold text-navy-700">
              {lang === "ar" ? "لا توجد قطاعات حالياً" : "No sectors yet"}
            </h3>
          </div>
        )}

        {!loading && !error && sectors.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((sector, index) => (
              <SectorCard
                key={sector.id}
                sector={sector}
                index={index}
                lang={lang}
                onOpen={setActiveSector}
              />
            ))}
          </div>
        )}
      </div>

      <SectorModal
        sector={activeSector}
        onClose={() => setActiveSector(null)}
        lang={lang}
      />
    </section>
  );
}
