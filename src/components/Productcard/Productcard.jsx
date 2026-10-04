// Suggested location: src/components/Product/ProductCard.jsx
// Adjust the import paths below ("../../../firebase" and
// "../../hooks/useCurrentUser" or your AuthContext) to match your
// actual folder structure.
//
// Usage:
//   import ProductCard from "../components/Product/ProductCard";
//   <ProductCard product={product} />
//
// The card itself stays short and simple (image, badges, name, short
// description, price, Add to Cart). Size, color and the customer's
// special-request note are only chosen inside the details popup — if
// the product has sizes/colors and the user hasn't picked them yet,
// "Add to Cart" (from the card OR the popup) shows an error instead
// of adding an incomplete item.

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  doc,
  onSnapshot,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  FaHeart,
  FaRegHeart,
  FaShoppingCart,
  FaTimes,
  FaCheck,
  FaTag,
  FaLayerGroup,
  FaPalette,
  FaTshirt,
  FaPen,
  FaTh,
} from "react-icons/fa";
import { db } from "../../../firebase";
import useCurrentUser from "../../hooks/useCurrentUser";

const CART_STORAGE_KEY = "bgUniform_cart";
const FAVORITES_COLLECTION = "Favorites";

/* ─── helpers ─── */
function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

const CART_UPDATED_EVENT = "cart:updated";

function writeCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  } catch (err) {
    console.error("Error writing cart to localStorage:", err);
  }
}
/* ─── selectable size / color chips, used only inside the modal ─── */
function OptionPicker({ label, icon: Icon, options, value, onChange }) {
  if (!options?.length) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-500">
        {Icon && <Icon size={12} />}
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
              value === opt
                ? "border-gold-500 bg-gold-500 text-navy-900"
                : "border-navy-200 text-navy-600 hover:border-gold-400 hover:text-navy-900"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── product details popup ─── */
function ProductDetailsModal({
  open,
  product,
  isAr,
  isFav,
  showLoginNotice,

  onToggleFav,
  sizes,
  colors,
  selectedSize,
  setSelectedSize,
  selectedColor,
  setSelectedColor,
  specialRequest,
  setSpecialRequest,
  onAddToCart,
  addedToCart,
  cartLabel,
  selectionError,
  onClose,
}) {
  const { t } = useTranslation();
  if (!open || !product) return null;

  const name = isAr ? product.name_ar : product.name_en;
  const description = isAr ? product.description_ar : product.description_en;
  const category = isAr ? product.category_ar : product.category_en;
  const sector = isAr ? product.sector_ar : product.sector_en;
  const fabric = isAr ? product.fabric_ar : product.fabric_en;
  const features = isAr ? product.features_ar : product.features_en;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between bg-navy-900 px-6 py-5 text-white">
            <h3 className="text-lg font-bold">{name}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <FaTimes size={16} />
            </button>
          </div>

          <div className="space-y-6 p-6">
            <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-cream-100 sm:h-72">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              )}
              {!product.inStock && (
                <span className="absolute top-3 start-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                  {t("products.outOfStock")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1 text-xs font-semibold text-navy-600">
                  <FaTag size={11} />
                  {category}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-700">
                  <FaLayerGroup size={11} />
                  {sector}
                </span>
              </div>
              <span className="text-2xl font-extrabold text-navy-900">
                {product.price}{" "}
                <span className="text-sm font-semibold text-navy-400">
                  {t("products.currency")}
                </span>
              </span>
            </div>

            <p className="leading-relaxed text-navy-700">{description}</p>

            {fabric && (
              <div className="flex items-start gap-3 rounded-xl bg-cream-50 p-4">
                <FaTshirt className="mt-0.5 shrink-0 text-gold-600" size={16} />
                <div>
                  <p className="text-sm font-bold text-navy-900">
                    {t("products.fabric")}
                  </p>
                  <p className="mt-0.5 text-sm text-navy-600">{fabric}</p>
                </div>
              </div>
            )}

            {/* size / color are chosen here, inside the popup only */}
            <div className="grid gap-5 sm:grid-cols-2">
              <OptionPicker
                label={t("products.sizes")}
                icon={FaTh}
                options={sizes}
                value={selectedSize}
                onChange={setSelectedSize}
              />
              <OptionPicker
                label={t("products.colors")}
                icon={FaPalette}
                options={colors}
                value={selectedColor}
                onChange={setSelectedColor}
              />
            </div>
            {selectionError && (
              <p className="text-sm font-semibold text-red-500">
                {selectionError}
              </p>
            )}

            {features?.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-bold text-navy-900">
                  {t("products.features")}
                </p>
                <ul className="space-y-1.5">
                  {features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-navy-600"
                    >
                      <FaCheck
                        className="mt-0.5 shrink-0 text-gold-600"
                        size={12}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {product.customization && (
              <div className="p-3 text-sm text-navy-700">
                <strong>{t("products.customization")}:</strong>{" "}
                {product.customization}
              </div>
            )}

            {/* customer's own special request / note to the seller */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-navy-900">
                <FaPen size={12} />
                {t("products.specialRequest")}
              </label>
              <textarea
                rows={3}
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder={t("products.specialRequestPlaceholder")}
                className="w-full resize-none rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
              />
            </div>

            {showLoginNotice && (
              <p className="text-sm font-semibold text-red-600">
                {t("products.loginRequiredFav")}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onToggleFav}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-navy-200 py-3 font-bold text-navy-700 transition hover:bg-navy-50"
              >
                {isFav ? (
                  <FaHeart className="text-red-500" size={16} />
                ) : (
                  <FaRegHeart size={16} />
                )}
                {isFav ? t("products.removeFav") : t("products.addFav")}
              </button>
              <button
                onClick={onAddToCart}
                disabled={!product.inStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-500 py-3 font-bold text-navy-900 transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaShoppingCart size={15} />
                {cartLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── main (compact) card ─── */
export default function ProductCard({ product }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  const user = useCurrentUser();

  const sizes = product.sizes || [];
  const colors = (isAr ? product.colors_ar : product.colors_en) || [];
  const needsVariant = sizes.length > 0 || colors.length > 0;

  const [isFav, setIsFav] = useState(false);
  // where to show the "please log in" notice: 'card', 'popup', or null.
  // Only the place the favorite button was pressed from shows it.
  const [favNoticeSource, setFavNoticeSource] = useState(null);
  // toast shown right after a successful favorite toggle: which side
  // triggered it ('card' | 'popup') and whether it was an add or a
  // remove, so we can show the matching translated message.
  const [favToast, setFavToast] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [inCartQty, setInCartQty] = useState(0);
  const [selectionError, setSelectionError] = useState("");

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(null);
  const [specialRequest, setSpecialRequest] = useState("");

  const name = isAr ? product.name_ar : product.name_en;
  const short = isAr ? product.short_ar : product.short_en;
  const category = isAr ? product.category_ar : product.category_en;
  const sector = isAr ? product.sector_ar : product.sector_en;

  const variantChosen =
    (sizes.length === 0 || selectedSize) &&
    (colors.length === 0 || selectedColorIdx !== null);

  /* keep this card's favorite state in sync with Firestore */
  useEffect(() => {
    if (!user) {
      setIsFav(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, FAVORITES_COLLECTION, user.uid),
      (snap) => {
        const ids = snap.exists() ? snap.data().productIds || [] : [];
        setIsFav(ids.includes(product.id));
      },
      (err) => console.error("Error reading favorites:", err),
    );
    return () => unsubscribe();
  }, [user, product.id]);

  /* how many pieces of THIS product are in the cart right now */
  useEffect(() => {
    const update = () =>
      setInCartQty(
        readCart()
          .filter((i) => i.id === product.id)
          .reduce((n, i) => n + i.qty, 0),
      );
    update();
    window.addEventListener(CART_UPDATED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [product.id]);

  const handleToggleFav = async (source = "card") => {
    if (!user) {
      setFavNoticeSource(source);
      setTimeout(() => setFavNoticeSource(null), 2500);
      return;
    }
    try {
      const ref = doc(db, FAVORITES_COLLECTION, user.uid);
      const wasFav = isFav;
      await setDoc(
        ref,
        {
          productIds: wasFav ? arrayRemove(product.id) : arrayUnion(product.id),
        },
        { merge: true },
      );
      setFavToast({ source, adding: !wasFav });
      setTimeout(() => setFavToast(null), 1800);
    } catch (err) {
      console.error("Error updating favorites:", err);
    }
  };

  const addToCartNow = () => {
    const size = selectedSize || null;
    const colorIndex = selectedColorIdx;
    const color_ar =
      colorIndex !== null ? (product.colors_ar?.[colorIndex] ?? null) : null;
    const color_en =
      colorIndex !== null ? (product.colors_en?.[colorIndex] ?? null) : null;
    const note = specialRequest.trim();

    const cart = readCart();
    const existing = cart.find(
      (item) =>
        item.id === product.id &&
        (item.size ?? null) === size &&
        (item.colorIndex ?? null) === colorIndex &&
        (item.note || "") === note,
    );

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        id: product.id,
        name_ar: product.name_ar,
        name_en: product.name_en,
        price: product.price,
        imageUrl: product.imageUrl,
        size,
        colorIndex,
        color_ar,
        color_en,
        note,
        qty: 1,
      });
    }

    writeCart(cart);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 1500);
  };

  /* Shared handler for both the card and the popup: if the product
     needs a size or color and one hasn't been chosen yet, show the
     selection error instead of adding an incomplete item. */
  const handleAddToCart = () => {
    if (needsVariant && !variantChosen) {
      setSelectionError(t("products.chooseInDetails"));
      setShowDetails(true);
      return;
    }
    addToCartNow();
  };
  const cartLabel = addedToCart
    ? t("products.added")
    : inCartQty > 0
      ? t("products.addAgain", { count: inCartQty })
      : t("products.addToCart");
  return (
    <>
      <AnimatePresence>
        {favToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-0 top-5 z-[9999] mx-auto w-fit rounded-xl bg-gold-500 px-5 py-3 text-sm font-bold text-navy-900 shadow-2xl"
          >
            {favToast.adding
              ? t("products.addedToFav")
              : t("products.removedFromFav")}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        onClick={() => setShowDetails(true)}
        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-md shadow-navy-900/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      >
        <div className="relative h-56 w-full overflow-hidden bg-cream-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-navy-300">
              <FaTshirt size={30} />
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFav("card");
            }}
            aria-label="Toggle favorite"
            className="absolute top-3 end-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow-md transition hover:bg-white"
          >
            {isFav ? (
              <FaHeart className="text-red-500" size={17} />
            ) : (
              <FaRegHeart size={17} />
            )}
          </button>

          <AnimatePresence>
            {favNoticeSource === "card" && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute top-14 end-3 z-10 w-48 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
              >
                {t("products.loginRequiredFav")}
              </motion.div>
            )}
          </AnimatePresence>

          {!product.inStock && (
            <span className="absolute top-3 start-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
              {t("products.outOfStock")}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-cream-100 px-2.5 py-1 text-xs font-semibold text-navy-600">
              {category}
            </span>
            <span className="rounded-full bg-gold-500/10 px-2.5 py-1 text-xs font-semibold text-gold-700">
              {sector}
            </span>
          </div>

          <h3 className="text-lg font-bold text-navy-900">{name}</h3>
          <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-navy-500">
            {short}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xl font-extrabold text-navy-900">
              {product.price}{" "}
              <span className="text-sm font-semibold text-navy-400">
                {t("products.currency")}
              </span>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(true);
              }}
              className="text-sm font-bold text-gold-600 underline-offset-2 hover:text-gold-700 hover:underline"
            >
              {t("products.details")}
            </button>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCart();
            }}
            disabled={!product.inStock}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaShoppingCart size={14} />
            {cartLabel}
          </button>
        </div>
      </motion.div>
      <ProductDetailsModal
        open={showDetails}
        product={product}
        isAr={isAr}
        isFav={isFav}
        showLoginNotice={favNoticeSource === "popup"}
        onToggleFav={() => handleToggleFav("popup")}
        sizes={sizes}
        colors={colors}
        selectedSize={selectedSize}
        setSelectedSize={(val) => {
          setSelectedSize(val);
          setSelectionError("");
        }}
        selectedColor={colors[selectedColorIdx] ?? ""}
        setSelectedColor={(label) => {
          setSelectedColorIdx(colors.indexOf(label));
          setSelectionError("");
        }}
        specialRequest={specialRequest}
        setSpecialRequest={setSpecialRequest}
        onAddToCart={handleAddToCart}
        addedToCart={addedToCart}
        cartLabel={cartLabel}
        selectionError={selectionError}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
}
