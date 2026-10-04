import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
  FaSearch,
  FaFilter,
  FaInbox,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import Navbar from "../components/Navbar/Navbar";
import { db } from "../../firebase";
import ProductCard from "../components/Productcard/Productcard";
import Footer from "../components/Footer/Footer";

const COLLECTION_NAME = "Products";

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
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const popIn = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const revealProps = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, amount: 0.2 },
};

const PAGE_SIZE = 9;

export default function Products() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setProducts(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching products:", err);
        setError(t("products.loadError"));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [t]);

  /* unique category options, built from the products actually in the DB */
  const categoryOptions = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      const cat = isAr ? p.category_ar : p.category_en;
      if (cat) set.add(cat);
    });
    return Array.from(set);
  }, [products, isAr]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return products.filter((p) => {
      const name = (isAr ? p.name_ar : p.name_en) || "";
      const category = isAr ? p.category_ar : p.category_en;

      const matchesSearch = !term || name.toLowerCase().includes(term);
      const matchesCategory =
        !selectedCategory || category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory, isAr]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
  };

  // whenever the filters change, go back to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  const hasActiveFilters = searchTerm || selectedCategory;

  return (
    <>
      <Navbar />

      <div className="overflow-hidden">
        {/* ───────── Hero ───────── */}
        <section className="relative bg-navy-900 px-4 py-16 text-white sm:px-8 lg:py-20">
          <div className="pointer-events-none absolute -top-20 -end-20 h-72 w-72 rounded-full bg-gold-500/10" />
          <div className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full border-2 border-gold-500/15" />

          <div className="relative mx-auto max-w-3xl text-center">
            <motion.span
              {...revealProps}
              variants={fadeUp}
              custom={0}
              className="inline-block rounded-full bg-gold-500/15 px-4 py-1 text-sm font-bold text-gold-400"
            >
              {t("products.badge")}
            </motion.span>

            <motion.h2
              {...revealProps}
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl font-extrabold sm:text-4xl lg:text-5xl"
            >
              {t("products.pageTitle")}
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
              {t("products.pageSubtitle")}
            </motion.p>
          </div>
        </section>

        {/* ───────── Search + Filters ───────── */}
        <section className="px-4 pt-10 sm:px-8">
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="mx-auto max-w-6xl rounded-2xl border border-cream-300 bg-white p-4 shadow-md shadow-navy-900/5 sm:p-6"
          >
            <div className="grid gap-4 lg:grid-cols-[2fr_1.4fr_auto]">
              {/* search */}
              <div className="relative">
                <FaSearch
                  className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-navy-300"
                  size={14}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("products.searchPlaceholder")}
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 py-2.5 ps-10 pe-4 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                />
              </div>

              {/* category */}
              <div className="relative">
                <FaFilter
                  className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-navy-300"
                  size={13}
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-cream-300 bg-cream-50 py-2.5 ps-10 pe-4 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                >
                  <option value="">{t("products.allCategories")}</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* clear */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-2 rounded-xl border border-navy-200 px-4 py-2.5 text-sm font-semibold text-navy-600 transition hover:bg-navy-50"
                >
                  <FaTimes size={12} />
                  {t("products.clearFilters")}
                </button>
              )}
            </div>
          </motion.div>
        </section>

        {/* ───────── Products grid ─────────
            NOTE: this section is intentionally NOT driven by
            `whileInView`/`once`. It used to be, but since its content
            re-renders every time the search term or category changes,
            a fresh "hidden" (opacity: 0) instance was mounted each
            time the result count crossed 0 — and because the grid was
            already on screen (not freshly scrolled into view), the
            intersection observer wouldn't reliably replay the
            "visible" animation, so everything looked like it vanished.
            Using a plain mount-triggered animation instead means it
            always ends up visible, filter after filter. */}
        <section className="px-4 py-12 sm:px-8 lg:py-16">
          <div className="mx-auto max-w-6xl">
            {loading && (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-100 border-t-gold-500" />
              </div>
            )}

            {!loading && error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center font-semibold text-red-600">
                {error}
              </div>
            )}

            {!loading && !error && filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-20 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-navy-300">
                  <FaInbox size={26} />
                </span>
                <h3 className="mt-4 font-bold text-navy-700">
                  {t("products.noResultsTitle")}
                </h3>
                <p className="mt-1 text-sm text-navy-400">
                  {t("products.noResultsText")}
                </p>
              </div>
            )}

            {!loading && !error && filteredProducts.length > 0 && (
              <>
                <motion.div
                  key={`${searchTerm}-${selectedCategory}`}
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                  className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {visibleProducts.map((product) => (
                    <motion.div key={product.id} variants={popIn}>
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>

                {totalPages > 1 && (
                  <div className="mt-10 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-navy-200 bg-white text-navy-700 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaChevronLeft size={13} />
                    </button>

                    {pageNumbers.map((num) => (
                      <button
                        key={num}
                        onClick={() => setCurrentPage(num)}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition ${
                          currentPage === num
                            ? "bg-gold-500 text-navy-900"
                            : "border border-navy-200 bg-white text-navy-700 hover:bg-navy-50"
                        }`}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-navy-200 bg-white text-navy-700 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaChevronRight size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
