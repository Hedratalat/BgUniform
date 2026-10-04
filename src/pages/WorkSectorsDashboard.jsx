import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  FaPlus,
  FaTrash,
  FaEdit,
  FaTimes,
  FaExclamationTriangle,
  FaImage,
  FaPlusCircle,
  FaMinusCircle,
  FaInbox,
  FaLink,
} from "react-icons/fa";
import { db } from "../../firebase";

const COLLECTION_NAME = "WorkSectors";

const emptySector = () => ({
  id: null,
  title_ar: "",
  title_en: "",
  short_ar: "",
  short_en: "",
  overview_ar: "",
  overview_en: "",
  items_ar: [""],
  items_en: [""],
  features_ar: [""],
  features_en: [""],
  imageUrl: "",
});

function ListInput({ label, values, onChange }) {
  const updateAt = (i, val) => {
    const next = [...values];
    next[i] = val;
    onChange(next);
  };
  const addRow = () => onChange([...values, ""]);
  const removeRow = (i) => onChange(values.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label}
      </label>
      <div className="space-y-2">
        {values.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={val}
              onChange={(e) => updateAt(i, e.target.value)}
              className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
            />
            <button
              type="button"
              onClick={() => removeRow(i)}
              disabled={values.length === 1}
              className="shrink-0 text-red-500 hover:text-red-600 disabled:opacity-30"
              aria-label="Remove"
            >
              <FaMinusCircle size={18} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-gold-600 hover:text-gold-700"
      >
        <FaPlusCircle size={14} />
        Add item
      </button>
    </div>
  );
}

/* ─── add / edit form modal ─── */
function SectorFormModal({ open, initialData, onCancel, onSave, isSaving }) {
  const [form, setForm] = useState(emptySector());

  useEffect(() => {
    if (open) {
      setForm(initialData || emptySector());
    }
  }, [open, initialData]);

  if (!open) return null;

  const handleField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      items_ar: form.items_ar.filter((v) => v.trim() !== ""),
      items_en: form.items_en.filter((v) => v.trim() !== ""),
      features_ar: form.features_ar.filter((v) => v.trim() !== ""),
      features_en: form.features_en.filter((v) => v.trim() !== ""),
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        onClick={onCancel}
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
            <h3 className="text-lg font-bold">
              {form.id ? "Edit Sector" : "Add New Sector"}
            </h3>
            <button
              onClick={onCancel}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <FaTimes size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* image url */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                Sector Image URL
              </label>
              <div className="relative">
                <FaLink
                  className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-navy-300"
                  size={14}
                />
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://example.com/image.jpg"
                  value={form.imageUrl}
                  onChange={(e) => handleField("imageUrl", e.target.value)}
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 py-2.5 ps-10 pe-4 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                />
              </div>

              <div className="mt-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-navy-200 bg-cream-50 text-navy-400">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className={`flex-col items-center justify-center gap-2 ${
                    form.imageUrl ? "hidden" : "flex"
                  }`}
                >
                  <FaImage size={26} />
                  <span className="text-sm font-medium">
                    Image preview will appear here
                  </span>
                </div>
              </div>
            </div>

            {/* title */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                  Title (Arabic)
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={form.title_ar}
                  onChange={(e) => handleField("title_ar", e.target.value)}
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                  Title (English)
                </label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={form.title_en}
                  onChange={(e) => handleField("title_en", e.target.value)}
                  className="w-full rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
            </div>

            {/* short description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                  Short Description (Arabic)
                </label>
                <textarea
                  required
                  rows={2}
                  dir="rtl"
                  value={form.short_ar}
                  onChange={(e) => handleField("short_ar", e.target.value)}
                  className="w-full resize-none rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                  Short Description (English)
                </label>
                <textarea
                  required
                  rows={2}
                  dir="ltr"
                  value={form.short_en}
                  onChange={(e) => handleField("short_en", e.target.value)}
                  className="w-full resize-none rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
            </div>

            {/* overview */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                  Overview (Arabic)
                </label>
                <textarea
                  required
                  rows={3}
                  dir="rtl"
                  value={form.overview_ar}
                  onChange={(e) => handleField("overview_ar", e.target.value)}
                  className="w-full resize-none rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-navy-900">
                  Overview (English)
                </label>
                <textarea
                  required
                  rows={3}
                  dir="ltr"
                  value={form.overview_en}
                  onChange={(e) => handleField("overview_en", e.target.value)}
                  className="w-full resize-none rounded-xl border border-cream-300 bg-cream-50 px-4 py-2.5 text-navy-900 outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/40"
                />
              </div>
            </div>

            {/* items */}
            <div className="grid gap-4 sm:grid-cols-2">
              <ListInput
                label="What We Offer (Arabic)"
                values={form.items_ar}
                onChange={(vals) => handleField("items_ar", vals)}
              />
              <ListInput
                label="What We Offer (English)"
                values={form.items_en}
                onChange={(vals) => handleField("items_en", vals)}
              />
            </div>

            {/* features */}
            <div className="grid gap-4 sm:grid-cols-2">
              <ListInput
                label="Features (Arabic)"
                values={form.features_ar}
                onChange={(vals) => handleField("features_ar", vals)}
              />
              <ListInput
                label="Features (English)"
                values={form.features_en}
                onChange={(vals) => handleField("features_en", vals)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSaving}
                className="flex-1 rounded-xl border border-navy-200 py-2.5 font-semibold text-navy-700 transition hover:bg-navy-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-xl bg-gold-500 py-2.5 font-bold text-navy-900 transition hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
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
              Delete this sector?
            </h3>
            <p className="mt-2 text-sm text-navy-500">
              This action cannot be undone. The sector will be permanently
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

/* ─── sector row in the dashboard list ─── */
function SectorRow({ sector, onEdit, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-4 rounded-2xl border border-navy-100 bg-white p-4 shadow-md shadow-navy-900/5"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream-100">
        {sector.imageUrl ? (
          <img
            src={sector.imageUrl}
            alt={sector.title_en}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy-300">
            <FaImage size={20} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold text-navy-900">
          {sector.title_en}{" "}
          <span className="text-navy-400" dir="rtl">
            {sector.title_ar}/
          </span>
        </h3>
        <p className="truncate text-sm text-navy-500">{sector.short_en}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => onEdit(sector)}
          aria-label="Edit"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 transition hover:bg-navy-50 hover:text-gold-600"
        >
          <FaEdit size={15} />
        </button>
        <button
          onClick={() => onDelete(sector)}
          aria-label="Delete"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <FaTrash size={15} />
        </button>
      </div>
    </motion.div>
  );
}

export default function WorkSectorDashboard() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formState, setFormState] = useState({ open: false, data: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSectors(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching sectors:", err);
        setError("Failed to load sectors.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const openAddForm = () => setFormState({ open: true, data: null });
  const openEditForm = (sector) => setFormState({ open: true, data: sector });
  const closeForm = () => setFormState({ open: false, data: null });

  const handleSave = async (data) => {
    setIsSaving(true);
    try {
      const payload = {
        title_ar: data.title_ar,
        title_en: data.title_en,
        short_ar: data.short_ar,
        short_en: data.short_en,
        overview_ar: data.overview_ar,
        overview_en: data.overview_en,
        items_ar: data.items_ar,
        items_en: data.items_en,
        features_ar: data.features_ar,
        features_en: data.features_en,
        imageUrl: data.imageUrl || "",
      };

      if (data.id) {
        await updateDoc(doc(db, COLLECTION_NAME, data.id), payload);
      } else {
        await addDoc(collection(db, COLLECTION_NAME), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      closeForm();
    } catch (err) {
      console.error("Error saving sector:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting sector:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy-900 sm:text-3xl">
            Work Sectors
          </h2>
          <p className="mt-1 text-xs text-navy-500 sm:text-sm">
            Manage the sectors shown on the home page.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-navy-900 transition hover:bg-gold-600"
        >
          <FaPlus size={14} />
          Add Sector
        </button>
      </div>

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

      {!loading && !error && sectors.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-navy-300">
            <FaInbox size={26} />
          </span>
          <h3 className="mt-4 font-bold text-navy-700">No sectors yet</h3>
          <p className="mt-1 text-sm text-navy-400">
            Click "Add Sector" to create your first one.
          </p>
        </div>
      )}

      {!loading && !error && sectors.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {sectors.map((sector) => (
              <SectorRow
                key={sector.id}
                sector={sector}
                onEdit={openEditForm}
                onDelete={setDeleteTarget}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <SectorFormModal
        open={formState.open}
        initialData={formState.data}
        onCancel={closeForm}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
