import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  doc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { FaHeart, FaSignInAlt, FaBoxOpen } from "react-icons/fa";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";
import ProductCard from "../components/Productcard/Productcard";
import { db } from "../../firebase";
import useCurrentUser from "../hooks/useCurrentUser";

/* ────────────────────────────────────────────────────────────
   نفس الأنيميشن بتاعة صفحة About، بحيث الصفحة تحس إنها جزء
   من نفس الديزاين سيستم.
   ──────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: "easeOut" },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const popIn = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
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

const FAVORITES_COLLECTION = "Favorites";
const PRODUCTS_COLLECTION = "Products"; // غيّر الاسم هنا لو اسم الكولكشن عندك مختلف

/* Firestore 'in' queries بتقبل 10 قيم بالظبط، فلو المفضلة أكتر من
   10 منتج بنقسّمهم على شنكات (chunks) ونعمل كذا query ونجمعهم. */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function Favorites() {
  const { t } = useTranslation();
  const user = useCurrentUser();

  const [productIds, setProductIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingIds, setLoadingIds] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);

  /* لسه بيحدد الـ user لسه بيتحمّل (useCurrentUser بترجع undefined
     الأول وبعدين null أو object). لغاية ما نتأكد نعرض لودينج. */
  const authResolved = user !== undefined;

  /* استماع لايف لقايمة الـ productIds بتاعة اليوزر */
  useEffect(() => {
    if (!user) {
      setProductIds([]);
      setLoadingIds(false);
      return;
    }
    setLoadingIds(true);
    const unsubscribe = onSnapshot(
      doc(db, FAVORITES_COLLECTION, user.uid),
      (snap) => {
        const ids = snap.exists() ? snap.data().productIds || [] : [];
        setProductIds(ids);
        setLoadingIds(false);
      },
      (err) => {
        console.error("Error reading favorites:", err);
        setLoadingIds(false);
      },
    );
    return () => unsubscribe();
  }, [user]);

  /* جلب بيانات المنتجات الفعلية اللي أيديهاتها موجودة في productIds */
  useEffect(() => {
    if (!productIds.length) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);

    (async () => {
      try {
        const chunks = chunk(productIds, 10);
        const results = await Promise.all(
          chunks.map((ids) =>
            getDocs(
              query(
                collection(db, PRODUCTS_COLLECTION),
                where("__name__", "in", ids),
              ),
            ),
          ),
        );
        if (cancelled) return;
        const list = results.flatMap((snap) =>
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
        setProducts(list);
      } catch (err) {
        console.error("Error fetching favorite products:", err);
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productIds]);

  const isLoading = !authResolved || loadingIds || loadingProducts;

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
              {t("favorites.badge")}
            </motion.span>

            <motion.h2
              {...revealProps}
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl font-extrabold sm:text-4xl lg:text-5xl"
            >
              {t("favorites.heroTitle")}
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
              {t("favorites.heroText")}
            </motion.p>
          </div>
        </section>

        {/* ───────── Content ───────── */}
        <section className="px-4 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            {/* مش عامل login */}
            {authResolved && !user && (
              <motion.div
                {...revealProps}
                variants={fadeUp}
                className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-cream-300 bg-cream-50 px-8 py-14 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-gold-500">
                  <FaSignInAlt size={22} />
                </span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  {t("favorites.loginRequiredTitle")}
                </h3>
                <p className="leading-relaxed text-navy-600">
                  {t("favorites.loginRequiredText")}
                </p>
                <Link
                  to="/login"
                  state={{ from: "/favorites" }}
                  className="mt-2 inline-block rounded-xl bg-gold-500 px-8 py-3 font-extrabold text-navy-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-600"
                >
                  {t("favorites.loginButton")}
                </Link>
              </motion.div>
            )}

            {/* لودينج */}
            {user && isLoading && (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cream-300 border-t-gold-500" />
              </div>
            )}

            {/* فاضية */}
            {user && !isLoading && products.length === 0 && (
              <motion.div
                {...revealProps}
                variants={fadeUp}
                className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-cream-300 bg-cream-50 px-8 py-14 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-gold-500">
                  <FaHeart size={22} />
                </span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  {t("favorites.emptyTitle")}
                </h3>
                <p className="leading-relaxed text-navy-600">
                  {t("favorites.emptyText")}
                </p>
                <Link
                  to="/products"
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-8 py-3 font-extrabold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-800"
                >
                  <FaBoxOpen size={15} />
                  {t("favorites.browseProducts")}
                </Link>
              </motion.div>
            )}

            {/* قايمة المنتجات المفضلة - بيستخدم نفس الـ ProductCard */}
            {user && !isLoading && products.length > 0 && (
              <motion.div
                {...revealProps}
                variants={staggerContainer}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {products.map((product) => (
                  <motion.div key={product.id} variants={popIn}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
