import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  FaStar,
  FaQuoteRight,
  FaPaperPlane,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { db } from "../../../firebase";

const COLLECTION_NAME = "Feedbacks";

/* ─── validation schema ─── */
const feedbackSchema = z.object({
  name: z
    .string()
    .nonempty("من فضلك املأ جميع الحقول")
    .min(3, "الاسم يجب أن يكون 3 أحرف على الأقل")
    .max(30)
    .regex(/^[a-zA-Z\u0600-\u06FF\s]+$/, "حروف ومسافات فقط"),
  rating: z.number().min(1, "من فضلك اختار تقييم بالنجوم").max(5),
  message: z
    .string()
    .nonempty("من فضلك املأ جميع الحقول")
    .min(10, "الرأي يجب أن يكون 10 أحرف على الأقل")
    .max(400),
});

/* subtle alternating rotation for the pinboard look */
const ROTATIONS = [
  "-rotate-2",
  "rotate-1",
  "-rotate-1",
  "rotate-2",
  "rotate-0",
  "-rotate-1",
];

/* how many cards to show per breakpoint */
function useVisibleCount() {
  const [count, setCount] = useState(2);

  useEffect(() => {
    function update() {
      if (window.innerWidth >= 1024) setCount(6);
      else if (window.innerWidth >= 640) setCount(4);
      else setCount(2);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return count;
}

function StarRating({ value, onChange, size = 22, readOnly = false }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = readOnly ? star <= value : star <= (hover || value);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(star)}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(0)}
            className={`transition-transform duration-150 ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-125"
            }`}
            aria-label={`${star} star`}
          >
            <FaStar
              size={size}
              className={active ? "text-gold-500" : "text-navy-100"}
            />
          </button>
        );
      })}
    </div>
  );
}

function FeedbackCard({ item, index }) {
  const rotation = ROTATIONS[index % ROTATIONS.length];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 25, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, delay: (index % 6) * 0.06, ease: "easeOut" }}
      whileHover={{ rotate: 0, scale: 1.03 }}
      className={`group relative flex h-full flex-col rounded-2xl bg-white p-6 shadow-lg shadow-navy-900/10 ${rotation} transition-transform duration-300`}
    >
      {/* pin */}
      <span className="absolute -top-3 start-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-4 border-white bg-gold-500 shadow-md" />

      <FaQuoteRight className="mb-3 text-2xl text-gold-500/30" />

      <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-navy-700">
        {item.message}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-cream-200 pt-4">
        <p className="font-bold text-navy-900">{item.name}</p>
        <StarRating value={item.rating} readOnly size={14} />
      </div>
    </motion.div>
  );
}

function FeedbackWall({ feedbacks, lang }) {
  const visibleCount = useVisibleCount();
  const [activeIndex, setActiveIndex] = useState(0);

  const sliderActive = feedbacks.length > visibleCount;

  useEffect(() => {
    if (activeIndex >= feedbacks.length) setActiveIndex(0);
  }, [feedbacks.length, activeIndex]);

  useEffect(() => {
    setActiveIndex(0);
  }, [visibleCount]);

  useEffect(() => {
    if (!sliderActive) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + visibleCount) % feedbacks.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [sliderActive, feedbacks.length, visibleCount]);

  const goPrev = () => {
    setActiveIndex((prev) => {
      const next = prev - visibleCount;
      return next < 0 ? Math.max(0, feedbacks.length - visibleCount) : next;
    });
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + visibleCount) % feedbacks.length);
  };

  const visibleItems = Array.from(
    { length: Math.min(visibleCount, feedbacks.length) },
    (_, i) => feedbacks[(activeIndex + i) % feedbacks.length],
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, i) => (
            <FeedbackCard key={item.id} item={item} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {sliderActive && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={goPrev}
            aria-label={lang === "ar" ? "السابق" : "Previous"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-gold-500 transition hover:bg-navy-800"
          >
            <FaChevronRight className="rtl:hidden" size={16} />
            <FaChevronLeft className="hidden rtl:block" size={16} />
          </button>

          <button
            onClick={goNext}
            aria-label={lang === "ar" ? "التالي" : "Next"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-gold-500 transition hover:bg-navy-800"
          >
            <FaChevronLeft className="rtl:hidden" size={16} />
            <FaChevronRight className="hidden rtl:block" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function FeedbackForm({ lang }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [status, setStatus] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(feedbackSchema),
    mode: "onChange",
    defaultValues: { name: "", rating: 0, message: "" },
  });

  const currentRating = watch("rating");

  const t = {
    badge: lang === "ar" ? "رأيك يهمنا" : "Your Opinion Matters",
    title: lang === "ar" ? "شاركنا تجربتك" : "Share Your Experience",
    name: lang === "ar" ? "الاسم" : "Name",
    namePh: lang === "ar" ? "اكتب اسمك" : "Your name",
    message: lang === "ar" ? "رأيك" : "Your Feedback",
    messagePh:
      lang === "ar"
        ? "احكيلنا عن تجربتك معانا..."
        : "Tell us about your experience...",
    rating: lang === "ar" ? "تقييمك" : "Your Rating",
    send: lang === "ar" ? "إرسال" : "Submit",
    sending: lang === "ar" ? "جاري الإرسال..." : "Sending...",
    success:
      lang === "ar"
        ? "شكراً لك! تم إرسال رأيك وسيظهر بعد المراجعة."
        : "Thank you! Your feedback will appear after review.",
    error:
      lang === "ar"
        ? "حدث خطأ، حاول مرة أخرى."
        : "Something went wrong, please try again.",
  };

  const onSubmit = async (data) => {
    setStatus(null);
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        name: data.name,
        rating: data.rating,
        message: data.message,
        approved: false,
        createdAt: serverTimestamp(),
      });
      reset({ name: "", rating: 0, message: "" });
      setHoverRating(0);
      setStatus({ type: "success", text: t.success });
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setStatus({ type: "error", text: t.error });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto max-w-xl overflow-hidden rounded-3xl bg-navy-900 p-8 text-white shadow-2xl sm:p-10"
    >
      <div className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-gold-500/15" />
      <div className="pointer-events-none absolute -bottom-20 -start-20 h-64 w-64 rounded-full border-2 border-gold-500/20" />

      <div className="relative text-center">
        <span className="inline-block rounded-full bg-gold-500/20 px-4 py-1 text-sm font-bold text-gold-400">
          {t.badge}
        </span>
        <h3 className="mt-4 text-2xl font-extrabold sm:text-3xl">{t.title}</h3>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative mt-8 space-y-5"
      >
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-200">
            {t.name}
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder={t.namePh}
            className={`w-full rounded-xl border bg-white/10 px-4 py-3 text-white placeholder:text-navy-300 outline-none transition focus:bg-white/15 focus:ring-2 ${
              errors.name
                ? "border-red-400 focus:ring-red-400/40"
                : "border-white/15 focus:border-gold-500 focus:ring-gold-500/40"
            }`}
          />
          {errors.name && (
            <p className="mt-1.5 text-xs font-semibold text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-navy-200">
            {t.message}
          </label>
          <textarea
            rows={4}
            {...register("message")}
            placeholder={t.messagePh}
            className={`w-full resize-none rounded-xl border bg-white/10 px-4 py-3 text-white placeholder:text-navy-300 outline-none transition focus:bg-white/15 focus:ring-2 ${
              errors.message
                ? "border-red-400 focus:ring-red-400/40"
                : "border-white/15 focus:border-gold-500 focus:ring-gold-500/40"
            }`}
          />
          {errors.message && (
            <p className="mt-1.5 text-xs font-semibold text-red-400">
              {errors.message.message}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 pt-1">
          <label className="text-sm font-semibold text-navy-200">
            {t.rating}
          </label>
          <div className="flex items-center gap-1" dir="ltr">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= (hoverRating || currentRating);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() =>
                    setValue("rating", star, { shouldValidate: true })
                  }
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform duration-150 hover:scale-125"
                  aria-label={`${star} star`}
                >
                  <FaStar
                    size={30}
                    className={filled ? "text-gold-500" : "text-white/20"}
                  />
                </button>
              );
            })}
          </div>
          {errors.rating && (
            <p className="text-xs font-semibold text-red-400">
              {errors.rating.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-gold-500 px-8 py-3.5 text-lg font-extrabold text-navy-900 shadow-lg shadow-gold-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? t.sending : t.send}
          <FaPaperPlane className="rtl:-scale-x-100" />
        </button>

        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              role="status"
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                status.type === "success"
                  ? "bg-gold-500/15 text-gold-400"
                  : "bg-red-500/15 text-red-400"
              }`}
            >
              {status.type === "success" && <FaCheckCircle />}
              {status.text}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}

export default function Feedback() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("approved", "==", true),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        list.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
        );
        setFeedbacks(list);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching feedbacks:", err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <section className="bg-cream-100 px-4 py-14 sm:px-8 lg:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="inline-block rounded-full bg-gold-500/20 px-4 py-1 text-sm font-bold text-gold-800">
            {lang === "ar" ? "حائط الآراء" : "Wall of Love"}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-navy-900 sm:text-4xl">
            {lang === "ar" ? "ماذا يقول عملاؤنا؟" : "What Our Clients Say"}
          </h2>
          <div className="mx-auto mt-4 h-1 w-20 rounded-full bg-gold-500" />
        </div>

        <div className="mb-16">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-100 border-t-gold-500" />
            </div>
          )}

          {!loading && feedbacks.length === 0 && (
            <p className="text-center text-navy-400">
              {lang === "ar"
                ? "كن أول من يشاركنا رأيه"
                : "Be the first to share your feedback"}
            </p>
          )}

          {!loading && feedbacks.length > 0 && (
            <FeedbackWall feedbacks={feedbacks} lang={lang} />
          )}
        </div>

        <FeedbackForm lang={lang} />
      </div>
    </section>
  );
}
