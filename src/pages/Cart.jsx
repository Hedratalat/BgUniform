// Suggested location: src/pages/Cart.jsx  (next to Favorites.jsx)
// Adjust the import paths to match your folder structure.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import {
  FaShoppingCart,
  FaTrash,
  FaMinus,
  FaPlus,
  FaBoxOpen,
  FaLock,
} from "react-icons/fa";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../components/Footer/Footer";

/* ─── same animations as the Favorites page ─── */
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

/* ─── cart storage (same key/event used in ProductCard + Navbar) ─── */
const CART_STORAGE_KEY = "bgUniform_cart";
const CART_UPDATED_EVENT = "cart:updated";
const MAX_QTY = 99;

function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  } catch (err) {
    console.error("Error writing cart to localStorage:", err);
  }
}

/* unique key for a cart line: same product + size + color + note */
const lineKey = (item) =>
  `${item.id}|${item.size ?? ""}|${item.colorIndex ?? ""}|${item.note ?? ""}`;

/* ─── one line in the cart ─── */
function CartItem({ item, isAr, onQty, onRemove }) {
  const { t } = useTranslation();

  const name = isAr ? item.name_ar : item.name_en;
  // old items (added before the update) only have `color`
  const color = isAr
    ? (item.color_ar ?? item.color)
    : (item.color_en ?? item.color);
  const lineTotal = (Number(item.price) || 0) * item.qty;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: isAr ? 40 : -40 }}
      transition={{ duration: 0.3 }}
      className="flex gap-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-md shadow-navy-900/5 sm:gap-5 sm:p-5"
    >
      {/* image */}
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-cream-100 sm:h-32 sm:w-32">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-300">
            <FaBoxOpen size={26} />
          </div>
        )}
      </div>

      {/* details */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-navy-900 sm:text-lg">
            {name}
          </h3>
          <button
            onClick={onRemove}
            aria-label={t("cart.remove")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600"
          >
            <FaTrash size={14} />
          </button>
        </div>

        {(item.size || color) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.size && (
              <span className="rounded-full bg-cream-100 px-2.5 py-1 text-xs font-semibold text-navy-600">
                {t("cart.size")}: {item.size}
              </span>
            )}
            {color && (
              <span className="rounded-full bg-gold-500/10 px-2.5 py-1 text-xs font-semibold text-gold-700">
                {t("cart.color")}: {color}
              </span>
            )}
          </div>
        )}

        {item.note && (
          <p className="mt-2 line-clamp-2 rounded-lg bg-cream-50 px-3 py-2 text-xs leading-relaxed text-navy-600">
            <span className="font-bold text-navy-900">{t("cart.note")}: </span>
            {item.note}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
          {/* quantity stepper */}
          <div className="flex items-center overflow-hidden rounded-xl border border-navy-200">
            <button
              onClick={() => onQty(item.qty - 1)}
              disabled={item.qty <= 1}
              aria-label="-"
              className="flex h-9 w-9 items-center justify-center text-navy-700 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FaMinus size={11} />
            </button>
            <span className="min-w-10 text-center text-sm font-bold text-navy-900">
              {item.qty}
            </span>
            <button
              onClick={() => onQty(item.qty + 1)}
              disabled={item.qty >= MAX_QTY}
              aria-label="+"
              className="flex h-9 w-9 items-center justify-center text-navy-700 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <FaPlus size={11} />
            </button>
          </div>

          {/* prices */}
          <div className="text-end">
            {item.qty > 1 && (
              <p className="text-xs text-navy-400">
                {item.price} {t("products.currency")} × {item.qty}
              </p>
            )}
            <p className="text-lg font-extrabold text-navy-900">
              {lineTotal}{" "}
              <span className="text-sm font-semibold text-navy-400">
                {t("products.currency")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Cart() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  const navigate = useNavigate();

  const [cart, setCart] = useState(() => readCart());

  /* stay in sync with ProductCard / other tabs */
  useEffect(() => {
    const sync = () => setCart(readCart());
    window.addEventListener(CART_UPDATED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const updateQty = (key, qty) => {
    if (qty < 1 || qty > MAX_QTY) return;
    writeCart(
      readCart().map((item) =>
        lineKey(item) === key ? { ...item, qty } : item,
      ),
    );
  };

  const removeItem = (key) => {
    writeCart(readCart().filter((item) => lineKey(item) !== key));
  };

  const clearCart = () => writeCart([]);

  const totalItems = cart.reduce((n, i) => n + i.qty, 0);
  const subtotal = cart.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * i.qty,
    0,
  );

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
              {t("cart.badge")}
            </motion.span>

            <motion.h2
              {...revealProps}
              variants={fadeUp}
              custom={1}
              className="mt-5 text-3xl font-extrabold sm:text-4xl lg:text-5xl"
            >
              {t("cart.heroTitle")}
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
              {t("cart.heroText")}
            </motion.p>
          </div>
        </section>

        {/* ───────── Content ───────── */}
        <section className="px-4 py-16 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl">
            {/* empty */}
            {cart.length === 0 && (
              <motion.div
                {...revealProps}
                variants={fadeUp}
                className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-3xl border border-cream-300 bg-cream-50 px-8 py-14 text-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-gold-500">
                  <FaShoppingCart size={22} />
                </span>
                <h3 className="text-xl font-extrabold text-navy-900">
                  {t("cart.emptyTitle")}
                </h3>
                <p className="leading-relaxed text-navy-600">
                  {t("cart.emptyText")}
                </p>
                <Link
                  to="/products"
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-8 py-3 font-extrabold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy-800"
                >
                  <FaBoxOpen size={15} />
                  {t("cart.browseProducts")}
                </Link>
              </motion.div>
            )}

            {/* items + summary */}
            {cart.length > 0 && (
              <div className="grid items-start gap-8 lg:grid-cols-3">
                {/* items list */}
                <div className="space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-3 text-lg font-extrabold text-navy-900">
                      {t("cart.itemsTitle")}
                      <span
                        aria-hidden="true"
                        className="h-5 w-px bg-navy-200"
                      />
                      <span className="text-base font-semibold text-navy-700">
                        {totalItems}
                      </span>
                    </h3>
                    <button
                      onClick={clearCart}
                      className="text-sm font-bold text-red-500 underline-offset-2 transition hover:text-red-600 hover:underline"
                    >
                      {t("cart.clear")}
                    </button>
                  </div>

                  <AnimatePresence>
                    {cart.map((item) => {
                      const key = lineKey(item);
                      return (
                        <CartItem
                          key={key}
                          item={item}
                          isAr={isAr}
                          onQty={(qty) => updateQty(key, qty)}
                          onRemove={() => removeItem(key)}
                        />
                      );
                    })}
                  </AnimatePresence>

                  <Link
                    to="/products"
                    className="inline-block pt-2 text-sm font-bold text-gold-600 underline-offset-2 hover:text-gold-700 hover:underline"
                  >
                    {t("cart.continueShopping")}
                  </Link>
                </div>

                {/* order summary (sticky on desktop) */}
                <aside className="rounded-3xl border border-navy-100 bg-white p-6 shadow-md shadow-navy-900/5 lg:sticky lg:top-28">
                  <h3 className="text-lg font-extrabold text-navy-900">
                    {t("cart.summary")}
                  </h3>

                  <dl className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between text-navy-600">
                      <dt>{t("cart.itemsCount")}</dt>
                      <dd className="font-semibold text-navy-900">
                        {totalItems}
                      </dd>
                    </div>
                    <div className="flex justify-between text-navy-600">
                      <dt>{t("cart.subtotal")}</dt>
                      <dd className="font-semibold text-navy-900">
                        {subtotal} {t("products.currency")}
                      </dd>
                    </div>
                    <div className="flex justify-between text-navy-600">
                      <dt>{t("cart.shipping")}</dt>
                      <dd className="font-semibold text-navy-900">
                        {t("cart.shippingNote")}
                      </dd>
                    </div>
                  </dl>

                  <div className="my-5 h-px bg-navy-100" />

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-900">
                      {t("cart.total")}
                    </span>
                    <span className="text-2xl font-extrabold text-navy-900">
                      {subtotal}{" "}
                      <span className="text-sm font-semibold text-navy-400">
                        {t("products.currency")}
                      </span>
                    </span>
                  </div>

                  <button
                    onClick={() => navigate("/checkout")}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 font-extrabold text-navy-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold-600"
                  >
                    <FaLock size={13} />
                    {t("cart.checkout")}
                  </button>
                </aside>
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
