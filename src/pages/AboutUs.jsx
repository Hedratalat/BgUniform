import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  FaAward,
  FaUsers,
  FaShippingFast,
  FaHandshake,
  FaBullseye,
  FaEye,
} from "react-icons/fa";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";

/* ────────────────────────────────────────────────────────────
   أنيميشن: كل عنصر بيبدأ مختفي ومزحزح شوية، ولما يدخل الشاشة
   بيظهر ويرجع مكانه. viewport.once = true يعني بيحصل مرة واحدة بس.
   ──────────────────────────────────────────────────────────── */
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

const STATS = [
  { icon: FaAward, key: "years", value: "10+" },
  { icon: FaUsers, key: "clients", value: "500+" },
  { icon: FaShippingFast, key: "orders", value: "5000+" },
  { icon: FaHandshake, key: "partners", value: "50+" },
];

const VALUES = [
  { icon: FaBullseye, key: "quality" },
  { icon: FaEye, key: "vision" },
  { icon: FaHandshake, key: "trust" },
];

export default function About() {
  const { t } = useTranslation();

  return (
    <>
      <Navbar />

      <div className="overflow-hidden">
        {/* ───────── Hero ───────── */}
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
              {t("about.badge")}
            </motion.span>

            <motion.h2
              {...revealProps}
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl font-extrabold sm:text-4xl lg:text-5xl"
            >
              {t("about.heroTitle")}
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
              {t("about.heroText")}
            </motion.p>
          </div>
        </section>

        {/* ───────── Story + Image ───────── */}
        <section className="px-4 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <motion.div
              {...revealProps}
              variants={fadeUp}
              className="order-2 lg:order-none"
            >
              <span className="text-sm font-bold text-gold-700">
                {t("about.storyBadge")}
              </span>
              <h2 className="mt-3 text-2xl font-extrabold text-navy-900 sm:text-3xl">
                {t("about.storyTitle")}
              </h2>
              <p className="mt-5 leading-relaxed text-navy-700">
                {t("about.storyP1")}
              </p>
              <p className="mt-4 leading-relaxed text-navy-700">
                {t("about.storyP2")}
              </p>
            </motion.div>

            <motion.div {...revealProps} variants={popIn} className="relative">
              <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-navy-900 shadow-2xl shadow-navy-900/20">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-script text-5xl text-gold-500 sm:text-6xl">
                    BG
                  </span>
                </div>
                <div className="absolute -bottom-10 -end-10 h-40 w-40 rounded-full bg-gold-500/20" />
              </div>
              <div className="absolute -top-6 -start-6 h-24 w-24 rounded-2xl border-4 border-gold-500 sm:h-28 sm:w-28" />
            </motion.div>
          </div>
        </section>

        {/* ───────── Stats ───────── */}
        <section className="bg-navy-900 px-4 py-16 sm:px-8">
          <motion.div
            {...revealProps}
            variants={staggerContainer}
            className="mx-auto grid max-w-6xl grid-cols-2 gap-5 lg:grid-cols-4"
          >
            {STATS.map(({ icon: Icon, key, value }) => (
              <motion.div
                key={key}
                variants={popIn}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white transition-colors duration-300 hover:border-gold-500/40"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500 text-navy-900">
                  <Icon size={20} />
                </span>
                <p className="mt-4 text-2xl font-extrabold sm:text-3xl">
                  {value}
                </p>
                <p className="mt-1 text-sm text-navy-200">
                  {t(`about.stats.${key}`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ───────── Values ───────── */}
        <section className="px-4 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <motion.div
              {...revealProps}
              variants={fadeUp}
              className="mx-auto mb-12 max-w-xl text-center"
            >
              <span className="text-sm font-bold text-gold-700">
                {t("about.valuesBadge")}
              </span>
              <h2 className="mt-3 text-2xl font-extrabold text-navy-900 sm:text-3xl">
                {t("about.valuesTitle")}
              </h2>
            </motion.div>

            <motion.div
              {...revealProps}
              variants={staggerContainer}
              className="grid gap-6 sm:grid-cols-3"
            >
              {VALUES.map(({ icon: Icon, key }) => (
                <motion.div
                  key={key}
                  variants={fadeUp}
                  className="rounded-2xl border border-cream-300 bg-cream-50 p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold-500 hover:shadow-lg"
                >
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-gold-500">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-navy-900">
                    {t(`about.values.${key}.title`)}
                  </h3>
                  <p className="mt-2 leading-relaxed text-navy-600">
                    {t(`about.values.${key}.text`)}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ───────── CTA ───────── */}
        <motion.section
          {...revealProps}
          variants={fadeIn}
          className="px-4 pb-20 sm:px-8"
        >
          <div className="mx-auto max-w-4xl rounded-3xl bg-gold-500 px-6 py-12 text-center shadow-xl shadow-gold-500/30 sm:px-12">
            <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
              {t("about.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-navy-800">
              {t("about.ctaText")}
            </p>
            <a
              href="/contact"
              className="mt-7 inline-block rounded-xl bg-navy-900 px-8 py-3.5 font-extrabold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-800"
            >
              {t("about.ctaButton")}
            </a>
          </div>
        </motion.section>
      </div>
      <Footer />
    </>
  );
}
