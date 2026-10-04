import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

/* ────────────────────────────────────────────────────────────
   صور الفريق: استبدل المسارات دي بصور عملائك (شيف، دكتورة،
   مهندس، فني) واحطهم في src/assets وسمّيهم زي ما تحب.
   ──────────────────────────────────────────────────────────── */
import img1 from "../../../public/cover1.jpg";
import img2 from "../../../public/cover2.jpg";
import img3 from "../../../public/cover3.jfif";
import img4 from "../../../public/cover4.jpg";

const PHOTOS = [img1, img2, img3, img4];

const SOCIALS = [
  {
    name: "Facebook",
    icon: FaFacebookF,
    href: "https://www.facebook.com/BGuniform",
  },
  { name: "Instagram", icon: FaInstagram, href: "https://instagram.com/" },
];

/* أنيميشن واحد منسّق لحظة تحميل الصفحة: النص بيدخل من ناحية،
   الصور بتدخل من الناحية التانية بفاصل بسيط بين كل صورة */
const textIn = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.15 + i * 0.12, ease: "easeOut" },
  }),
};

const photoIn = {
  hidden: { opacity: 0, y: 40, scale: 0.94 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, delay: 0.35 + i * 0.12, ease: "easeOut" },
  }),
};

export default function HeroSection() {
  const { t } = useTranslation();

  // الموبايل بيعرض صورتين بس مرة واحدة، فبنعمل سلايدر يلف بين الزوج
  // الأول (0,1) والزوج الثاني (2,3) لحد ما الأربع صور تظهر
  const pages = [
    [0, 1],
    [2, 3],
  ];
  const [page, setPage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPage((p) => (p + 1) % pages.length);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section dir="ltr" className="relative overflow-hidden">
      {/* ───── الخلفية ─────
          الموبايل: تقسيم بسيط أفقي (كريمي فوق للنص، كحلي تحت للصور).
          الديسكتوب: القطع المائل الأصلي زي الصورة المرجعية. */}
      <div className="pointer-events-none absolute inset-0">
        {/* Mobile / tablet */}
        <div
          className="absolute inset-x-0 bottom-0 h-[52%] bg-navy-900 lg:hidden"
          style={{ clipPath: "polygon(0 22%, 100% 0, 100% 100%, 0 100%)" }}
        />

        {/* Desktop */}
        <div
          className="absolute inset-y-0 end-0 hidden h-full w-[64%] bg-navy-900 lg:block"
          style={{
            clipPath: "polygon(38% 0, 100% 0, 100% 100%, 12% 100%)",
          }}
        />

        {/* الثلاث خطوط المايلة (الزخرفة الوحيدة المتبقية) */}
        <div className="absolute start-6 bottom-8 hidden flex-col gap-1.5 opacity-40 lg:flex">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-0.5 w-10 -rotate-45 bg-gold-500"
              style={{ marginInlineStart: `${i * 10}px` }}
            />
          ))}
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-6 sm:px-8 sm:pb-14 sm:pt-8 lg:px-12 lg:pb-0 lg:pt-10">
        {/* شريط علوي: اللوجو + تابعنا */}
        <div className="mb-6 flex items-center justify-between sm:mb-8 lg:mb-4">
          <motion.span
            initial="hidden"
            animate="visible"
            custom={0}
            variants={textIn}
            className="font-script text-xl text-navy-900 sm:text-2xl lg:text-3xl"
          >
            BG Uniform
          </motion.span>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.5}
            variants={textIn}
            className="flex items-center gap-2.5 sm:gap-3"
          >
            <span className="hidden text-sm font-bold text-navy-900 sm:inline lg:text-white">
              {t("hero.followUs")}
            </span>
            {SOCIALS.map(({ name, icon: Icon, href }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-navy-900 transition-transform duration-300 hover:-translate-y-0.5 sm:h-9 sm:w-9"
              >
                <Icon size={13} />
              </a>
            ))}
          </motion.div>
        </div>

        {/* المحتوى: النص والصور */}
        <div className="grid items-center gap-8 pb-4 sm:gap-10 lg:min-h-[440px] lg:grid-cols-2 lg:gap-6 lg:pb-16">
          {/* النص */}
          <div className="text-center lg:text-start">
            <motion.h1
              initial="hidden"
              animate="visible"
              custom={1}
              variants={textIn}
              className="text-2xl font-extrabold leading-[1.3] text-navy-900 sm:text-3xl lg:text-5xl"
            >
              {t("hero.line1")}
            </motion.h1>

            <motion.h2
              initial="hidden"
              animate="visible"
              custom={2}
              variants={textIn}
              className="mt-2 text-2xl font-extrabold leading-[1.3] text-gold-500 sm:mt-3 sm:text-3xl lg:text-5xl"
            >
              {t("hero.line2")}
            </motion.h2>

            <motion.p
              initial="hidden"
              animate="visible"
              custom={2.5}
              variants={textIn}
              className="mx-auto mt-4 max-w-md text-sm text-navy-700 sm:text-base lg:mx-0"
            >
              {t("hero.subtitle")}
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              custom={3}
              variants={textIn}
              className="mt-7 flex flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4 lg:justify-start"
            >
              <a
                href="/products"
                className="inline-block rounded-xl bg-navy-900 px-6 py-3 text-sm font-extrabold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-800 sm:px-8 sm:py-3.5 sm:text-base"
              >
                {t("hero.cta")}
              </a>
              <a
                href="/contact"
                className="inline-block rounded-xl border-2 border-navy-900 px-6 py-3 text-sm font-extrabold text-navy-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-900 hover:text-white sm:px-8 sm:py-3.5 sm:text-base"
              >
                {t("hero.ctaSecondary")}
              </a>
            </motion.div>
          </div>

          {/* الصور: على الموبايل سلايدر بيلف بين زوجين، ومن sm لفوق الأربعة ظاهرين مرة واحدة */}
          <div>
            {/* Mobile slider */}
            <div className="sm:hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="grid grid-cols-2 gap-3"
                >
                  {pages[page].map((i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-2xl border-2 border-white/70 shadow-xl shadow-navy-950/30"
                    >
                      <img
                        src={PHOTOS[i]}
                        alt={t("hero.photoAlt", { defaultValue: "BG Uniform" })}
                        className="h-80 w-full object-cover"
                      />
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* نقاط السلايدر */}
              <div className="mt-3 flex justify-center gap-2">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    aria-label={`slide ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      page === i ? "w-6 bg-gold-500" : "w-2 bg-white"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Tablet / Desktop: الأربع صور ظاهرين مرة واحدة زي الأصل */}
            <div className="hidden sm:grid sm:grid-cols-4 sm:gap-4 lg:gap-3">
              {PHOTOS.map((src, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  variants={photoIn}
                  className={`overflow-hidden rounded-2xl border-2 border-white/70 shadow-xl shadow-navy-950/30 ${
                    i % 2 === 1 ? "sm:translate-y-4 lg:translate-y-6" : ""
                  }`}
                >
                  <img
                    src={src}
                    alt={t("hero.photoAlt", { defaultValue: "BG Uniform" })}
                    className="h-64 w-full object-cover lg:h-80"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
