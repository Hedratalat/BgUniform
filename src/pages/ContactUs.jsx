import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { z } from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaTiktok,
  FaPaperPlane,
  FaCheckCircle,
} from "react-icons/fa";
import { db } from "../../firebase";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";

const PHONE = "+20 100 000 0000";
const EMAIL = "info@bguniform.com";
const WHATSAPP_LINK = "https://wa.me/201000000000";

const SOCIALS = [
  {
    name: "Facebook",
    icon: FaFacebookF,
    href: "https://www.facebook.com/BGuniform",
  },
  { name: "Instagram", icon: FaInstagram, href: "https://instagram.com/" },
  { name: "WhatsApp", icon: FaWhatsapp, href: WHATSAPP_LINK },
  { name: "TikTok", icon: FaTiktok, href: "https://tiktok.com/" },
];

const contactSchema = z.object({
  fullName: z
    .string()
    .min(3, "contact.errors.nameInvalid")
    .max(50, "contact.errors.nameInvalid")
    .regex(/^[a-zA-Z\s\u0600-\u06FF]+$/, "contact.errors.nameLetters"),
  email: z
    .string()
    .email("contact.errors.emailInvalid")
    .refine(
      (val) =>
        /^[a-zA-Z][a-zA-Z0-9._%+-]*@gmail\.(com|net|org)(\.eg)?$/.test(
          val.toLowerCase(),
        ),
      { message: "contact.errors.emailGmail" },
    ),
  phone: z
    .string()
    .regex(/^(\+2)?01[0125][0-9]{8}$/, "contact.errors.phoneInvalid"),
  message: z
    .string()
    .min(10, "contact.errors.messageMin")
    .max(500, "contact.errors.messageMax"),
});

const INITIAL_FORM = { fullName: "", email: "", phone: "", message: "" };

const inputBase =
  "w-full rounded-xl border bg-cream-50 px-4 py-3 text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-gold-500 focus:bg-white focus:ring-2 focus:ring-gold-500/40";

const inputClass = (hasError) =>
  `${inputBase} ${hasError ? "border-red-400" : "border-cream-300"}`;

/* ────────────────────────────────────────────────────────────
   أنيميشن: العنصر بيبدأ مختفي ومزحزح، ولما يدخل الشاشة بيظهر
   ويرجع مكانه. once: true يعني بيحصل مرة واحدة بس.
   ──────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
  }),
};

const revealProps = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, amount: 0.3 },
};

function FieldError({ message }) {
  const { t } = useTranslation();
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs font-semibold text-red-600">{t(message)}</p>
  );
}

function InfoRow({ icon: Icon, label, value, href, ltr = false }) {
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500 text-navy-900">
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-navy-200">{label}</span>
        <span
          dir={ltr ? "ltr" : undefined}
          className="block break-words font-semibold text-white"
        >
          {value}
        </span>
      </span>
    </>
  );

  const base = "flex items-center gap-4";

  return href ? (
    <a
      href={href}
      className={`${base} group transition-transform duration-300 hover:translate-x-1 rtl:hover:-translate-x-1`}
    >
      {content}
    </a>
  ) : (
    <div className={base}>{content}</div>
  );
}

export default function ContactUs() {
  const { t } = useTranslation();
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (status !== "success") return;
    const id = setTimeout(() => setStatus(null), 8000);
    return () => clearTimeout(id);
  }, [status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (status === "error") setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setStatus(null);
    setIsSubmitting(true);

    const result = contactSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "Messages"), {
        fullName: result.data.fullName,
        email: result.data.email,
        phone: result.data.phone,
        message: result.data.message,
        createdAt: serverTimestamp(),
      });

      setForm(INITIAL_FORM);
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error sending message:");
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <section className="px-4 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-6xl">
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              role="status"
              className="mb-8 flex items-center gap-3 rounded-2xl border border-gold-500 bg-gold-50 px-5 py-4 font-semibold shadow-md"
            >
              <FaCheckCircle size={22} className="shrink-0 text-gold-700" />
              {t("contact.success")}
            </motion.div>
          )}

          {/* Header (نفس فكرة hero بتاعة About: كل سطر بيظهر لوحده بفاصل بسيط) */}
          <div className="mx-auto mb-10 max-w-2xl text-center lg:mb-14">
            <motion.span
              {...revealProps}
              variants={fadeUp}
              custom={0}
              className="inline-block rounded-full bg-gold-500/20 px-4 py-1 text-sm font-bold text-gold-800"
            >
              {t("contact.badge")}
            </motion.span>

            <motion.h2
              {...revealProps}
              variants={fadeUp}
              custom={1}
              className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl"
            >
              {t("contact.title")}
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
              className="mt-5 text-base text-navy-700 sm:text-lg"
            >
              {t("contact.subtitle")}
            </motion.p>
          </div>

          {/* Contact info first top on mobile - start side on desktop form second */}
          <div className="grid overflow-hidden rounded-3xl shadow-2xl shadow-navy-900/15 lg:grid-cols-5">
            {/*  Info + Socials  */}
            <motion.div
              {...revealProps}
              variants={fadeUp}
              custom={0}
              className="relative overflow-hidden bg-navy-900 p-8 text-white sm:p-10 lg:col-span-2"
            >
              {/* decorative shapes */}
              <div className="pointer-events-none absolute -top-16 -end-16 h-56 w-56 rounded-full bg-gold-500/15" />
              <div className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full border-2 border-gold-500/20" />
              <div className="pointer-events-none absolute bottom-24 end-6 h-16 w-16 rounded-full border-2 border-gold-500/30" />

              <div className="relative">
                <h2 className="text-2xl font-bold">{t("contact.infoTitle")}</h2>
                <p className="mt-2 text-navy-200">{t("contact.infoText")}</p>

                <div className="mt-8 space-y-6">
                  <InfoRow
                    icon={FaPhoneAlt}
                    label={t("contact.phone")}
                    value={PHONE}
                    href={`tel:${PHONE.replace(/\s/g, "")}`}
                    ltr
                  />
                  <InfoRow
                    icon={FaEnvelope}
                    label={t("contact.email")}
                    value={EMAIL}
                    href={`mailto:${EMAIL}`}
                    ltr
                  />
                  <InfoRow
                    icon={FaMapMarkerAlt}
                    label={t("contact.address")}
                    value={t("contact.addressValue")}
                  />
                  <InfoRow
                    icon={FaClock}
                    label={t("contact.hours")}
                    value={t("contact.hoursValue")}
                  />
                </div>

                <div className="my-8 h-px bg-white/15" />

                <h3 className="text-lg font-bold">{t("contact.follow")}</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  {SOCIALS.map(({ name, icon: Icon, href }) => (
                    <a
                      key={name}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={name}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-500/50 text-gold-500 transition-all duration-300 hover:-translate-y-1 hover:bg-gold-500 hover:text-navy-900"
                    >
                      <Icon size={18} />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/*  Form  */}
            <motion.div
              {...revealProps}
              variants={fadeUp}
              custom={1}
              className="bg-white p-8 sm:p-10 lg:col-span-3"
            >
              <h2 className="text-2xl font-bold">{t("contact.formTitle")}</h2>
              <p className="mt-2 text-navy-600">{t("contact.formText")}</p>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="mt-8 space-y-5"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-sm font-semibold"
                    >
                      {t("contact.name")}
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      data-gramm="false"
                      data-gramm_editor="false"
                      value={form.fullName}
                      onChange={handleChange}
                      placeholder={t("contact.namePlaceholder")}
                      className={inputClass(errors.fullName)}
                    />
                    <FieldError message={errors.fullName} />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-semibold"
                    >
                      {t("contact.phone")}
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      dir="ltr"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="01XXXXXXXXX"
                      className={`${inputClass(errors.phone)} text-start`}
                    />
                    <FieldError message={errors.phone} />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    {t("contact.email")}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    data-gramm="false"
                    data-gramm_editor="false"
                    dir="ltr"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@gmail.com"
                    className={`${inputClass(errors.email)} text-start`}
                  />
                  <FieldError message={errors.email} />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-sm font-semibold"
                  >
                    {t("contact.message")}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    data-gramm="false"
                    data-gramm_editor="false"
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder={t("contact.messagePlaceholder")}
                    className={`${inputClass(errors.message)} resize-none`}
                  />
                  <FieldError message={errors.message} />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-gold-500 px-8 py-3.5 text-lg font-extrabold text-navy-900 shadow-lg shadow-gold-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                >
                  {isSubmitting ? t("contact.sending") : t("contact.send")}
                  <FaPaperPlane className="rtl:-scale-x-100" />
                </button>

                {status === "error" && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-semibold text-red-700"
                  >
                    {t("contact.error")}
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
