import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import {
  FaMoneyBillWave,
  FaBolt,
  FaMobileAlt,
  FaCopy,
  FaCheck,
  FaShoppingCart,
  FaWhatsapp,
  FaLock,
  FaGoogle,
} from "react-icons/fa";
import { db, auth } from "../../firebase";
import useCurrentUser from "../hooks/useCurrentUser";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
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

const CART_KEY = "bgUniform_cart";
const CART_EVENT = "cart:updated";
const PHONE_RE = /^01[0125][0-9]{8}$/;
const TEXT_RE = /^[A-Za-z\u0600-\u06FF\s]+$/;
const AREA_RE = /^[A-Za-z\u0600-\u06FF0-9\s]+$/;
const ADDR_RE = /^[A-Za-z0-9\u0600-\u06FF\s,.-]+$/;

// replace with your real transfer numbers
const ACCOUNTS = { instapay: "01XXXXXXXXX", vodafone: "01XXXXXXXXX" };

// [id, arabic, english, shipping fee]
const CITIES = [
  ["cairo", "القاهرة", "Cairo", 70],
  ["giza", "الجيزة", "Giza", 70],
  ["fayoum", "الفيوم", "Fayoum", 110],
  ["beni-suef", "بني سويف", "Beni Suef", 110],
  ["minya", "المنيا", "Minya", 110],
  ["assiut", "أسيوط", "Assiut", 110],
  ["sohag", "سوهاج", "Sohag", 110],
  ["qena", "قنا", "Qena", 110],
  ["nag-hammadi", "نجع حمادي", "Nag Hammadi", 110],
  ["luxor", "الأقصر", "Luxor", 110],
  ["aswan", "أسوان", "Aswan", 120],
  ["alexandria", "الإسكندرية", "Alexandria", 90],
  ["tanta", "طنطا", "Tanta", 100],
  ["mahalla", "المحلة الكبرى", "El Mahalla", 100],
  ["mansoura", "المنصورة", "Mansoura", 100],
  ["suez", "السويس", "Suez", 100],
  ["beheira", "البحيرة", "Beheira", 100],
  ["sharqia", "الشرقية", "Sharqia", 100],
  ["10th-of-ramadan", "العاشر من رمضان", "10th of Ramadan", 100],
  ["port-said", "بورسعيد", "Port Said", 100],
  ["ismailia", "الإسماعيلية", "Ismailia", 100],
  ["damietta", "دمياط", "Damietta", 100],
  ["kafr-elsheikh", "كفر الشيخ", "Kafr El Sheikh", 100],
  ["qalyubia", "القليوبية", "Qalyubia", 100],
  ["al-gharbia", "الغربية", "Gharbia", 100],
  ["monufia", "المنوفية", "Monufia", 100],
  ["dakahlia", "الدقهلية", "Dakahlia", 100],
  ["north-coast", "الساحل الشمالي", "North Coast", 130],
  ["marsa-matrouh", "مرسى مطروح", "Marsa Matrouh", 130],
  ["hurghada", "الغردقة", "Hurghada", 140],
  ["sharm-el-sheikh", "شرم الشيخ", "Sharm El Sheikh", 140],
  ["marsa-alam", "مرسى علم", "Marsa Alam", 140],
  ["banha", "بنها", "Banha", 85],
  ["badrashin", "البدرشين", "Badrashin", 85],
  ["hawamdeya", "الحوامدية", "Hawamdeya", 85],
  ["saqqara", "سقارة", "Saqqara", 90],
  ["badr-city", "مدينة بدر", "Badr City", 85],
];

const METHODS = [
  { id: "cash", icon: FaMoneyBillWave },
  { id: "instapay", icon: FaBolt },
  { id: "vodafone", icon: FaMobileAlt },
];

/* ─── cart helpers ─── */
const readCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
};
const clearCartStorage = () => {
  try {
    localStorage.setItem(CART_KEY, "[]");
    window.dispatchEvent(new Event(CART_EVENT));
  } catch (e) {
    console.error(e);
  }
};

/* ─── validation (same rules as before, messages via i18n) ─── */
const makeSchema = (t) =>
  z
    .object({
      fullName: z
        .string()
        .min(3, t("checkout.errors.name"))
        .max(40, t("checkout.errors.name"))
        .regex(TEXT_RE, t("checkout.errors.name")),
      phone: z.string().regex(PHONE_RE, t("checkout.errors.phone")),
      whatsapp: z.string().regex(PHONE_RE, t("checkout.errors.whatsapp")),
      city: z.string().min(1, t("checkout.errors.city")),
      area: z
        .string()
        .min(2, t("checkout.errors.area"))
        .max(50, t("checkout.errors.areaLong"))
        .regex(AREA_RE, t("checkout.errors.areaFormat")),
      address: z
        .string()
        .min(1, t("checkout.errors.addressRequired"))
        .min(10, t("checkout.errors.address"))
        .max(200, t("checkout.errors.addressLong"))
        .regex(ADDR_RE, t("checkout.errors.addressFormat")),
      floor: z.string().regex(/^\d*$/, t("checkout.errors.floor")).optional(),
      paymentMethod: z.enum(["cash", "instapay", "vodafone"]),
      referenceNumber: z.string().optional(),
      senderPhone: z.string().optional(),
      vodafoneReference: z.string().optional(),
    })
    .superRefine((d, ctx) => {
      const add = (path, message) =>
        ctx.addIssue({ code: "custom", path: [path], message });

      if (d.paymentMethod === "instapay") {
        const ref = d.referenceNumber?.trim() || "";
        if (!/^\d{8,20}$/.test(ref))
          add("referenceNumber", t("checkout.errors.instapayRef"));
      }
      if (d.paymentMethod !== "cash") {
        if (!PHONE_RE.test(d.senderPhone?.trim() || ""))
          add("senderPhone", t("checkout.errors.senderPhone"));
      }
      if (d.paymentMethod === "vodafone") {
        if (!/^\d{6,20}$/.test(d.vodafoneReference?.trim() || ""))
          add("vodafoneReference", t("checkout.errors.vodafoneRef"));
      }
    });

/* ─── small UI pieces ─── */
const inputCls = (err) =>
  `w-full rounded-xl border bg-cream-50 px-4 py-2.5 text-navy-900 outline-none transition focus:ring-2 ${
    err
      ? "border-red-400 focus:ring-red-400/30"
      : "border-cream-300 focus:border-gold-500 focus:ring-gold-500/40"
  }`;

function Field({ label, error, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-xs font-semibold text-red-500">
          {error.message}
        </span>
      )}
    </label>
  );
}

function Step({ index, title, children }) {
  return (
    <section className="relative ps-14 pb-10 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute start-[19px] top-10 bottom-0 w-px bg-navy-100 last:hidden"
      />
      <span className="absolute start-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-sm font-extrabold text-gold-500">
        {index}
      </span>
      <h3 className="mb-5 flex h-10 items-center text-xl font-extrabold text-navy-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

function TransferBox({ label, number }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user can copy manually */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-navy-900 px-4 py-3 text-white">
      <div>
        <p className="text-xs text-navy-100">{label}</p>
        <p className="text-lg font-bold tracking-wide text-gold-400" dir="ltr">
          {number}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold transition hover:bg-white/20"
      >
        {copied ? <FaCheck size={13} /> : <FaCopy size={13} />}
        {copied ? t("checkout.copied") : t("checkout.copy")}
      </button>
    </div>
  );
}

/* ─── page ─── */
export default function Checkout() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  const user = useCurrentUser();

  const [cart, setCart] = useState(readCart);
  const [placed, setPlaced] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [authError, setAuthError] = useState("");

  const schema = useMemo(() => makeSchema(t), [t, i18n.language]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { paymentMethod: "cash" },
  });

  const method = watch("paymentMethod");
  const cityId = watch("city");

  /* keep cart in sync */
  useEffect(() => {
    const sync = () => setCart(readCart());
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  /* prefill name for signed-in customers */
  useEffect(() => {
    if (user?.displayName && !getValues("fullName"))
      setValue("fullName", user.displayName);
  }, [user, getValues, setValue]);

  const subtotal = cart.reduce((s, i) => s + (Number(i.price) || 0) * i.qty, 0);
  const city = CITIES.find((c) => c[0] === cityId);
  const shipping = city ? city[3] : 0;
  const total = subtotal + shipping;

  const signIn = async () => {
    setAuthError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user")
        setAuthError(t("auth.loginError"));
    }
  };

  const onSubmit = async (data) => {
    setSubmitError("");
    try {
      // re-read prices from Firestore: localStorage can be edited by the customer
      const items = [];
      for (const line of cart) {
        const snap = await getDoc(doc(db, "Products", line.id));
        if (!snap.exists() || snap.data().inStock === false) {
          setSubmitError(
            t("checkout.errors.unavailable", {
              name: isAr ? line.name_ar : line.name_en,
            }),
          );
          return;
        }
        const p = snap.data();
        items.push({
          productId: line.id,
          name_ar: p.name_ar,
          name_en: p.name_en,
          imageUrl: p.imageUrl || "",
          price: Number(p.price),
          size: line.size ?? null,
          color_ar: line.color_ar ?? null,
          color_en: line.color_en ?? null,
          note: line.note || "",
          quantity: line.qty,
          total: Number(p.price) * line.qty,
        });
      }

      const liveSubtotal = items.reduce((s, i) => s + i.total, 0);
      const fee = CITIES.find((c) => c[0] === data.city)?.[3] ?? 0;

      const order = {
        userId: user?.uid || null,
        userEmail: user?.email || null,
        fullName: data.fullName,
        phone: data.phone,
        whatsapp: data.whatsapp,
        city: data.city,
        cityLabel: CITIES.find((c) => c[0] === data.city)?.[1] || "",
        area: data.area,
        address: data.address,
        floor: data.floor || "",
        paymentMethod:
          data.paymentMethod === "vodafone"
            ? "vodafone cash"
            : data.paymentMethod,
        ...(data.paymentMethod === "instapay" && {
          referenceNumber: data.referenceNumber,
          senderPhone: data.senderPhone,
        }),
        ...(data.paymentMethod === "vodafone" && {
          senderPhone: data.senderPhone,
          vodafoneReference: data.vodafoneReference,
        }),
        items,
        subtotal: liveSubtotal,
        shippingFee: fee,
        grandTotal: liveSubtotal + fee,
        status: "pending",
        createdAt: serverTimestamp(),
        orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };

      await addDoc(collection(db, "Orders"), order);
      clearCartStorage();
      setPlaced(order);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error placing order:", err);
      setSubmitError(t("checkout.errors.generic"));
    }
  };

  const cur = t("products.currency");
  const dir = isAr ? "rtl" : "ltr";

  /* ───────── success ───────── */
  if (placed) {
    return (
      <>
        <Navbar />
        <main dir={dir} className="bg-cream-50 px-4 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-lg overflow-hidden rounded-3xl bg-white shadow-xl shadow-navy-900/10"
          >
            <div className="bg-navy-900 px-8 py-10 text-center text-white">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-500 text-navy-900">
                <FaCheck size={26} />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold">
                {t("checkout.success.title")}
              </h2>
              <p className="mt-2 text-navy-100">
                {t("checkout.success.text", {
                  name: placed.fullName.split(" ")[0],
                })}
              </p>
            </div>
            <dl className="space-y-4 p-8 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">
                  {t("checkout.success.orderNo")}
                </dt>
                <dd className="font-bold text-navy-900" dir="ltr">
                  {placed.orderNumber}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">
                  {t("checkout.success.payment")}
                </dt>
                <dd className="font-bold text-navy-900">
                  {t(
                    `checkout.methods.${placed.paymentMethod === "vodafone cash" ? "vodafone" : placed.paymentMethod}`,
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-dashed border-navy-200 pt-4">
                <dt className="font-bold text-navy-900">
                  {t("checkout.total")}
                </dt>
                <dd className="text-2xl font-extrabold text-navy-900">
                  {placed.grandTotal} {cur}
                </dd>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-gold-500/10 p-4 text-navy-700">
                <FaWhatsapp
                  className="mt-0.5 shrink-0 text-gold-600"
                  size={20}
                />
                <p className="leading-relaxed">
                  {t("checkout.success.whatsapp")}{" "}
                  <bdi className="font-bold">{placed.whatsapp}</bdi>
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Link
                  to="/products"
                  className="flex-1 rounded-xl bg-gold-500 py-3 text-center font-extrabold text-navy-900 transition hover:bg-gold-600"
                >
                  {t("checkout.success.continue")}
                </Link>
                <Link
                  to="/"
                  className="flex-1 rounded-xl border border-navy-200 py-3 text-center font-semibold text-navy-700 transition hover:bg-navy-50"
                >
                  {t("checkout.success.home")}
                </Link>
              </div>
            </dl>
          </motion.div>
        </main>
        <Footer />
      </>
    );
  }

  /* ───────── empty cart ───────── */
  if (cart.length === 0) {
    return (
      <>
        <Navbar />
        <main
          dir={dir}
          className="flex min-h-[60vh] items-center justify-center bg-cream-50 px-4 py-16"
        >
          <div className="flex max-w-sm flex-col items-center gap-4 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-gold-500">
              <FaShoppingCart size={22} />
            </span>
            <h2 className="text-xl font-extrabold text-navy-900">
              {t("checkout.empty.title")}
            </h2>
            <p className="text-navy-600">{t("checkout.empty.text")}</p>
            <Link
              to="/products"
              className="rounded-xl bg-navy-900 px-8 py-3 font-extrabold text-white transition hover:bg-navy-800"
            >
              {t("cart.browseProducts")}
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  /* ───────── checkout form ───────── */
  return (
    <>
      <Navbar />
      <main dir={dir} className="overflow-hidden bg-cream-50">
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
              {t("checkout.badge")}
            </motion.span>

            <motion.h2
              {...revealProps}
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl font-extrabold sm:text-4xl lg:text-5xl"
            >
              {t("checkout.title")}
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
              {t("checkout.subtitle")}
            </motion.p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-8 lg:py-24">
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mx-auto grid max-w-6xl items-start gap-8 lg:grid-cols-3"
          >
            <div className="space-y-8 lg:col-span-2">
              {/* optional sign-in */}
              <AnimatePresence>
                {!user && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-500/40 bg-gold-500/10 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-navy-900">
                        {t("checkout.guest.title")}
                      </p>
                      <p className="text-sm text-navy-600">
                        {t("checkout.guest.text")}
                      </p>
                      {authError && (
                        <p className="mt-1 text-xs font-semibold text-red-500">
                          {authError}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={signIn}
                      className="flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800"
                    >
                      <FaGoogle size={13} />
                      {t("auth.continueWithGoogle")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-md shadow-navy-900/5 sm:p-8">
                <Step index={1} title={t("checkout.steps.contact")}>
                  <div className="space-y-4">
                    <Field
                      label={t("checkout.fullName")}
                      error={errors.fullName}
                    >
                      <input
                        {...register("fullName")}
                        placeholder={t("checkout.fullNamePh")}
                        className={inputCls(errors.fullName)}
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("checkout.phone")} error={errors.phone}>
                        <input
                          {...register("phone")}
                          dir="ltr"
                          inputMode="tel"
                          placeholder="01XXXXXXXXX"
                          className={inputCls(errors.phone)}
                        />
                      </Field>
                      <Field
                        label={t("checkout.whatsapp")}
                        error={errors.whatsapp}
                      >
                        <input
                          {...register("whatsapp")}
                          dir="ltr"
                          inputMode="tel"
                          placeholder="01XXXXXXXXX"
                          className={inputCls(errors.whatsapp)}
                        />
                      </Field>
                    </div>
                  </div>
                </Step>

                <Step index={2} title={t("checkout.steps.address")}>
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("checkout.city")} error={errors.city}>
                        <select
                          {...register("city")}
                          className={inputCls(errors.city)}
                        >
                          <option value="">{t("checkout.cityPh")}</option>
                          {CITIES.map(([id, ar, en]) => (
                            <option key={id} value={id}>
                              {isAr ? ar : en}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={t("checkout.area")} error={errors.area}>
                        <input
                          {...register("area")}
                          placeholder={t("checkout.areaPh")}
                          className={inputCls(errors.area)}
                        />
                      </Field>
                    </div>
                    <Field label={t("checkout.address")} error={errors.address}>
                      <textarea
                        {...register("address")}
                        rows={2}
                        placeholder={t("checkout.addressPh")}
                        className={`${inputCls(errors.address)} resize-none`}
                      />
                    </Field>
                    <Field
                      label={t("checkout.floor")}
                      error={errors.floor}
                      className="sm:w-1/2"
                    >
                      <input
                        {...register("floor")}
                        inputMode="numeric"
                        placeholder={t("checkout.floorPh")}
                        className={inputCls(errors.floor)}
                      />
                    </Field>
                  </div>
                </Step>

                <Step index={3} title={t("checkout.steps.payment")}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {METHODS.map(({ id, icon: Icon }) => {
                      const on = method === id;
                      return (
                        <label
                          key={id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${
                            on
                              ? "border-gold-500 bg-gold-500/10"
                              : "border-cream-300 hover:border-gold-400"
                          }`}
                        >
                          <input
                            type="radio"
                            value={id}
                            {...register("paymentMethod")}
                            className="sr-only"
                          />
                          <Icon
                            size={20}
                            className={on ? "text-gold-600" : "text-navy-300"}
                          />
                          <span
                            className={`text-sm font-bold ${on ? "text-navy-900" : "text-navy-600"}`}
                          >
                            {t(`checkout.methods.${id}`)}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {method !== "cash" && (
                      <motion.div
                        key={method}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-5 space-y-4 rounded-2xl bg-cream-100 p-5"
                      >
                        <TransferBox
                          label={t(`checkout.transferTo.${method}`)}
                          number={ACCOUNTS[method]}
                        />
                        <Field
                          label={t("checkout.senderPhone")}
                          error={errors.senderPhone}
                        >
                          <input
                            {...register("senderPhone")}
                            dir="ltr"
                            inputMode="tel"
                            placeholder="01XXXXXXXXX"
                            className={inputCls(errors.senderPhone)}
                          />
                        </Field>
                        {method === "instapay" ? (
                          <Field
                            label={t("checkout.instapayRef")}
                            error={errors.referenceNumber}
                          >
                            <input
                              {...register("referenceNumber")}
                              inputMode="numeric"
                              placeholder={t("checkout.instapayRefPh")}
                              className={inputCls(errors.referenceNumber)}
                            />
                          </Field>
                        ) : (
                          <Field
                            label={t("checkout.vodafoneRef")}
                            error={errors.vodafoneReference}
                          >
                            <input
                              {...register("vodafoneReference")}
                              inputMode="numeric"
                              placeholder={t("checkout.vodafoneRefPh")}
                              className={inputCls(errors.vodafoneReference)}
                            />
                          </Field>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Step>
              </div>
            </div>

            {/* summary */}
            <aside className="rounded-3xl border border-navy-100 bg-white p-6 shadow-md shadow-navy-900/5 lg:sticky lg:top-28">
              <h3 className="text-lg font-extrabold text-navy-900">
                {t("checkout.summary")}
              </h3>

              <ul className="mt-5 max-h-80 space-y-4 overflow-y-auto">
                {cart.map((i) => {
                  const color = isAr ? i.color_ar : i.color_en;
                  return (
                    <li
                      key={`${i.id}|${i.size}|${i.colorIndex}|${i.note}`}
                      className="flex gap-3"
                    >
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                        {i.imageUrl && (
                          <img
                            src={i.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-navy-900">
                          {isAr ? i.name_ar : i.name_en}
                        </p>
                        <p className="text-xs text-navy-500">
                          {[
                            i.size && `${t("cart.size")}: ${i.size}`,
                            color && `${t("cart.color")}: ${color}`,
                            `× ${i.qty}`,
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </p>
                        {i.note && (
                          <p className="truncate text-xs text-navy-400">
                            {t("cart.note")}: {i.note}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm font-bold text-navy-900">
                        {(Number(i.price) || 0) * i.qty} {cur}
                      </p>
                    </li>
                  );
                })}
              </ul>

              <dl className="mt-5 space-y-3 border-t border-navy-100 pt-5 text-sm">
                <div className="flex justify-between text-navy-600">
                  <dt>{t("checkout.subtotal")}</dt>
                  <dd className="font-semibold text-navy-900">
                    {subtotal} {cur}
                  </dd>
                </div>
                <div className="flex justify-between text-navy-600">
                  <dt>{t("checkout.shipping")}</dt>
                  <dd className="font-semibold text-navy-900">
                    {city ? `${shipping} ${cur}` : t("checkout.chooseCity")}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-navy-100 pt-4">
                  <dt className="font-bold text-navy-900">
                    {t("checkout.total")}
                  </dt>
                  <dd className="text-3xl font-extrabold text-navy-900">
                    {total} {cur}
                  </dd>
                </div>
              </dl>

              {submitError && (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3.5 font-extrabold text-navy-900 transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaLock size={13} />
                {isSubmitting ? t("checkout.placing") : t("checkout.confirm")}
              </button>
            </aside>
          </form>
        </section>
      </main>
      <Footer />
    </>
  );
}
