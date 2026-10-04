import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  FaUser,
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaBolt,
  FaMobileAlt,
  FaClock,
  FaTrash,
  FaSearch,
  FaInbox,
  FaExclamationTriangle,
  FaImage,
  FaTimes,
  FaCheckCircle,
  FaTruck,
  FaHourglassHalf,
  FaBan,
  FaStickyNote,
} from "react-icons/fa";
import { db } from "../../firebase";

const COLLECTION_NAME = "Orders";

const STATUSES = [
  {
    id: "pending",
    label: "Pending",
    icon: FaHourglassHalf,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    active: "bg-amber-500 text-white border-amber-500",
    border: "border-amber-300",
    bar: "bg-amber-400",
  },
  {
    id: "shipping",
    label: "Shipping",
    icon: FaTruck,
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    active: "bg-blue-500 text-white border-blue-500",
    border: "border-blue-300",
    bar: "bg-blue-400",
  },
  {
    id: "delivered",
    label: "Delivered",
    icon: FaCheckCircle,
    badge: "bg-green-50 text-green-700 border-green-200",
    active: "bg-green-500 text-white border-green-500",
    border: "border-green-300",
    bar: "bg-green-400",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    icon: FaBan,
    badge: "bg-red-50 text-red-600 border-red-200",
    active: "bg-red-500 text-white border-red-500",
    border: "border-red-300",
    bar: "bg-red-400",
  },
];

const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

const PAYMENTS = [
  { id: "cash", label: "Cash on delivery", icon: FaMoneyBillWave },
  { id: "instapay", label: "Instapay", icon: FaBolt },
  { id: "vodafone cash", label: "Vodafone Cash", icon: FaMobileAlt },
];

// [id, arabic, english]
const CITIES = [
  ["cairo", "القاهرة", "Cairo"],
  ["giza", "الجيزة", "Giza"],
  ["fayoum", "الفيوم", "Fayoum"],
  ["beni-suef", "بني سويف", "Beni Suef"],
  ["minya", "المنيا", "Minya"],
  ["assiut", "أسيوط", "Assiut"],
  ["sohag", "سوهاج", "Sohag"],
  ["qena", "قنا", "Qena"],
  ["nag-hammadi", "نجع حمادي", "Nag Hammadi"],
  ["luxor", "الأقصر", "Luxor"],
  ["aswan", "أسوان", "Aswan"],
  ["alexandria", "الإسكندرية", "Alexandria"],
  ["tanta", "طنطا", "Tanta"],
  ["mahalla", "المحلة الكبرى", "El Mahalla"],
  ["mansoura", "المنصورة", "Mansoura"],
  ["suez", "السويس", "Suez"],
  ["beheira", "البحيرة", "Beheira"],
  ["sharqia", "الشرقية", "Sharqia"],
  ["10th-of-ramadan", "العاشر من رمضان", "10th of Ramadan"],
  ["port-said", "بورسعيد", "Port Said"],
  ["ismailia", "الإسماعيلية", "Ismailia"],
  ["damietta", "دمياط", "Damietta"],
  ["kafr-elsheikh", "كفر الشيخ", "Kafr El Sheikh"],
  ["qalyubia", "القليوبية", "Qalyubia"],
  ["al-gharbia", "الغربية", "Gharbia"],
  ["monufia", "المنوفية", "Monufia"],
  ["dakahlia", "الدقهلية", "Dakahlia"],
  ["north-coast", "الساحل الشمالي", "North Coast"],
  ["marsa-matrouh", "مرسى مطروح", "Marsa Matrouh"],
  ["hurghada", "الغردقة", "Hurghada"],
  ["sharm-el-sheikh", "شرم الشيخ", "Sharm El Sheikh"],
  ["marsa-alam", "مرسى علم", "Marsa Alam"],
  ["banha", "بنها", "Banha"],
  ["badrashin", "البدرشين", "Badrashin"],
  ["hawamdeya", "الحوامدية", "Hawamdeya"],
  ["saqqara", "سقارة", "Saqqara"],
  ["badr-city", "مدينة بدر", "Badr City"],
];

const cityName = (id, fallback) => {
  const c = CITIES.find((x) => x[0] === id);
  return c ? `${c[2]} / ${c[1]}` : fallback || id || "—";
};

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const waLink = (num = "") => `https://wa.me/20${num.replace(/^0/, "")}`;

const selectCls =
  "w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-sm text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40";

function InfoBlock({ title, children }) {
  return (
    <div className="rounded-xl bg-cream-50 p-4">
      <p className="mb-3 text-xs font-bold text-navy-500">{title}</p>
      <div className="space-y-2 text-sm text-navy-700">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="mt-1 shrink-0 text-gold-600" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}

/* ─── one big order card ─── */
function OrderCard({ order, index, onStatus, onDelete, updating }) {
  const st = statusOf(order.status);
  const StIcon = st.icon;
  const pay = PAYMENTS.find((p) => p.id === order.paymentMethod);
  const PayIcon = pay?.icon || FaMoneyBillWave;
  const items = order.items || [];
  const pieces = items.reduce((n, i) => n + (i.quantity || 0), 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.04 }}
      className={`relative overflow-hidden rounded-2xl border-2 bg-white shadow-md shadow-navy-900/5 transition-colors ${st.border}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${st.bar}`} />
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 pb-4 pt-6">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-navy-900" dir="ltr">
            {order.orderNumber || order.id}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-navy-400">
            <FaClock size={11} />
            {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!order.userId && (
            <span className="rounded-full border border-navy-200 bg-cream-100 px-3 py-1 text-xs font-semibold text-navy-600">
              Guest
            </span>
          )}
          {order.duplicateAddress && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Duplicate address
            </span>
          )}
          <span
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${st.badge}`}
          >
            <StIcon size={11} />
            {st.label}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* customer / address / payment */}
        <div className="grid gap-4 lg:grid-cols-3">
          <InfoBlock title="Customer">
            <Row icon={FaUser}>
              <span className="font-bold text-navy-900">{order.fullName}</span>
            </Row>
            <Row icon={FaPhoneAlt}>
              <a
                href={`tel:${order.phone}`}
                dir="ltr"
                className="hover:text-gold-600"
              >
                {order.phone}
              </a>
            </Row>
            <Row icon={FaWhatsapp}>
              <a
                href={waLink(order.whatsapp)}
                target="_blank"
                rel="noreferrer"
                dir="ltr"
                className="hover:text-gold-600"
              >
                {order.whatsapp}
              </a>
            </Row>
            {order.userEmail && (
              <Row icon={FaEnvelope}>
                <span dir="ltr">{order.userEmail}</span>
              </Row>
            )}
          </InfoBlock>

          <InfoBlock title="Delivery address">
            <Row icon={FaMapMarkerAlt}>
              <span className="font-bold text-navy-900">
                {cityName(order.city, order.cityLabel)}
              </span>
            </Row>
            <p>
              <span className="font-semibold">Area:</span> {order.area}
            </p>
            <p className="whitespace-pre-line">{order.address}</p>
            {order.floor && (
              <p>
                <span className="font-semibold">Floor:</span> {order.floor}
              </p>
            )}
          </InfoBlock>

          <InfoBlock title="Payment">
            <Row icon={PayIcon}>
              <span className="font-bold text-navy-900">
                {pay?.label || order.paymentMethod}
              </span>
            </Row>
            {order.senderPhone && (
              <p>
                <span className="font-semibold">Sender phone:</span>{" "}
                <span dir="ltr">{order.senderPhone}</span>
              </p>
            )}
            {order.referenceNumber && (
              <p>
                <span className="font-semibold">Reference no.:</span>{" "}
                <span dir="ltr">{order.referenceNumber}</span>
              </p>
            )}
            {order.vodafoneReference && (
              <p>
                <span className="font-semibold">Transaction ref.:</span>{" "}
                <span dir="ltr">{order.vodafoneReference}</span>
              </p>
            )}
          </InfoBlock>
        </div>

        {/* products */}
        <div>
          <p className="mb-3 text-sm font-bold text-navy-900">
            Products ({pieces} {pieces === 1 ? "piece" : "pieces"})
          </p>
          <ul className="divide-y divide-navy-100 rounded-xl border border-navy-100">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-100">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name_en}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-navy-300">
                      <FaImage size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy-900">
                    {item.name_en}{" "}
                    <span className="text-navy-400" dir="rtl">
                      {item.name_ar}
                    </span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {item.size && (
                      <span className="rounded-full bg-cream-100 px-2.5 py-0.5 font-semibold text-navy-600">
                        Size: {item.size}
                      </span>
                    )}
                    {(item.color_en || item.color_ar) && (
                      <span className="rounded-full bg-gold-500/10 px-2.5 py-0.5 font-semibold text-gold-700">
                        Color: {item.color_en} /{" "}
                        <span dir="rtl"> {item.color_ar}</span>
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-cream-50 px-3 py-2 text-xs text-navy-600">
                      <FaStickyNote
                        size={11}
                        className="mt-0.5 shrink-0 text-gold-600"
                      />
                      <span className="whitespace-pre-line">{item.note}</span>
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-xs text-navy-400">
                    {item.price} × {item.quantity}
                  </p>
                  <p className="font-extrabold text-navy-900">
                    {item.total} EGP
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* totals */}
        <div className="ms-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between text-navy-600">
            <span>Subtotal</span>
            <span className="font-semibold text-navy-900">
              {order.subtotal} EGP
            </span>
          </div>
          <div className="flex justify-between text-navy-600">
            <span>Shipping</span>
            <span className="font-semibold text-navy-900">
              {order.shippingFee} EGP
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-navy-100 pt-2">
            <span className="font-bold text-navy-900">Total</span>
            <span className="text-xl font-extrabold text-navy-900">
              {order.grandTotal} EGP
            </span>
          </div>
        </div>
      </div>

      {/* status actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 bg-cream-50 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const Icon = s.icon;
            const isCurrent = order.status === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={updating || isCurrent}
                onClick={() => onStatus(order.id, s.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                  isCurrent
                    ? s.active
                    : "border-navy-200 bg-white text-navy-600 hover:border-gold-400 hover:text-navy-900 disabled:opacity-50"
                }`}
              >
                <Icon size={11} />
                {s.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onDelete(order.id)}
          aria-label="Delete order"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <FaTrash size={15} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── delete confirm modal ─── */
function DeleteConfirmModal({ open, onCancel, onConfirm, isDeleting }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
              <FaExclamationTriangle size={22} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-navy-900">
              Delete this order?
            </h3>
            <p className="mt-2 text-sm text-navy-500">
              This action cannot be undone. The order will be permanently
              removed.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onCancel}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-navy-200 py-2.5 font-semibold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function OrdersDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [updatingId, setUpdatingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc"),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setOrders(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders.");
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    STATUSES.forEach((s) => (c[s.id] = 0));
    orders.forEach((o) => {
      const key = STATUSES.some((s) => s.id === o.status)
        ? o.status
        : "pending";
      c[key] += 1;
    });
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      const status = STATUSES.some((s) => s.id === o.status)
        ? o.status
        : "pending";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (payFilter !== "all" && o.paymentMethod !== payFilter) return false;
      if (cityFilter !== "all" && o.city !== cityFilter) return false;
      if (term) {
        const hay = [
          o.fullName,
          o.phone,
          o.whatsapp,
          o.senderPhone,
          o.orderNumber,
          o.userEmail,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [orders, search, payFilter, cityFilter, statusFilter]);

  const hasFilters =
    search ||
    payFilter !== "all" ||
    cityFilter !== "all" ||
    statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setPayFilter("all");
    setCityFilter("all");
    setStatusFilter("all");
  };

  const handleStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), { status });
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting order:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
            Orders
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            All orders placed through the checkout page.
          </p>
        </div>
        {!loading && !error && (
          <span className="shrink-0 rounded-full bg-navy-900 px-4 py-1.5 text-sm font-semibold text-gold-500">
            {hasFilters
              ? `${filtered.length} of ${orders.length}`
              : `${orders.length} total`}
          </span>
        )}
      </div>

      {/* filters */}
      {!loading && !error && orders.length > 0 && (
        <div className="mb-6 space-y-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-md shadow-navy-900/5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <FaSearch
                className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-navy-300"
                size={13}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, order no..."
                className="w-full rounded-xl border border-cream-300 bg-cream-50 py-2.5 ps-10 pe-4 text-sm text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
              />
            </div>
            <select
              value={payFilter}
              onChange={(e) => setPayFilter(e.target.value)}
              className={selectCls}
            >
              <option value="all">All payment methods</option>
              {PAYMENTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className={selectCls}
            >
              <option value="all">All governorates</option>
              {CITIES.map(([id, ar, en]) => (
                <option key={id} value={id}>
                  {en} / {ar}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[{ id: "all", label: "All" }, ...STATUSES].map((s) => {
              const on = statusFilter === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatusFilter(s.id)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                    on
                      ? "border-navy-900 bg-navy-900 text-gold-500"
                      : "border-navy-200 text-navy-600 hover:border-gold-400"
                  }`}
                >
                  {s.label} ({counts[s.id]})
                </button>
              );
            })}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ms-auto flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600"
              >
                <FaTimes size={11} />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

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

      {!loading && !error && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-navy-300">
            <FaInbox size={26} />
          </span>
          <h3 className="mt-4 font-bold text-navy-700">No orders yet</h3>
          <p className="mt-1 text-sm text-navy-400">
            New orders from the checkout page will appear here.
          </p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-navy-300">
            <FaSearch size={24} />
          </span>
          <h3 className="mt-4 font-bold text-navy-700">No matching orders</h3>
          <p className="mt-1 text-sm text-navy-400">
            Try changing the search or filters.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-5">
          <AnimatePresence>
            {filtered.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                updating={updatingId === order.id}
                onStatus={handleStatus}
                onDelete={setDeleteId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <DeleteConfirmModal
        open={!!deleteId}
        isDeleting={isDeleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
