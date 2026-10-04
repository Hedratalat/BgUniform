import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  FaUser,
  FaClock,
  FaTrash,
  FaExclamationTriangle,
  FaInbox,
  FaStar,
  FaCheckCircle,
  FaHourglassHalf,
} from "react-icons/fa";
import { db } from "../../firebase";

const COLLECTION_NAME = "Feedbacks";

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

function StarsReadOnly({ value }) {
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          size={13}
          className={star <= value ? "text-gold-500" : "text-navy-100"}
        />
      ))}
    </div>
  );
}

function FeedbackCard({ item, onDeleteClick, onApprove, isApproving, index }) {
  const approved = !!item.approved;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="relative overflow-hidden rounded-2xl border border-navy-100 bg-white p-5 shadow-md shadow-navy-900/5 transition hover:shadow-lg hover:shadow-navy-900/10"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          approved ? "bg-gold-500" : "bg-navy-300"
        }`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
            <FaUser size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-navy-900">{item.name}</h3>
            <p className="flex items-center gap-1 text-xs text-navy-400">
              <FaClock size={11} />
              {formatDate(item.createdAt)}
            </p>
          </div>
        </div>

        <button
          onClick={() => onDeleteClick(item.id)}
          aria-label="Delete feedback"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <FaTrash size={15} />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <StarsReadOnly value={item.rating} />

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            approved
              ? "bg-gold-500/15 text-gold-700"
              : "bg-navy-100 text-navy-500"
          }`}
        >
          {approved ? (
            <>
              <FaCheckCircle size={11} />
              Approved
            </>
          ) : (
            <>
              <FaHourglassHalf size={11} />
              Pending
            </>
          )}
        </span>
      </div>

      <p className="mt-4 rounded-xl bg-cream-100 p-3 text-sm leading-relaxed text-navy-700 whitespace-pre-line">
        {item.message}
      </p>

      {!approved && (
        <button
          onClick={() => onApprove(item.id)}
          disabled={isApproving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-gold-500 transition hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaCheckCircle size={14} />
          {isApproving ? "Approving..." : "Approve & Publish"}
        </button>
      )}
    </motion.div>
  );
}

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
              Delete this feedback?
            </h3>
            <p className="mt-2 text-sm text-navy-500">
              This action cannot be undone. The feedback will be permanently
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

export default function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFeedbacks(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching feedbacks:", err);
        setError("Failed to load feedback.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting feedback:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApprove = async (id) => {
    setApprovingId(id);
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), { approved: true });
    } catch (err) {
      console.error("Error approving feedback:", err);
    } finally {
      setApprovingId(null);
    }
  };

  const pendingCount = feedbacks.filter((f) => !f.approved).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-navy-900 sm:text-3xl">
            Feedback
          </h2>
          <p className="mt-1 text-xs text-navy-500 sm:text-sm">
            Reviews submitted by customers.
          </p>
        </div>

        {!loading && !error && (
          <div className="flex shrink-0 items-center gap-2">
            {pendingCount > 0 && (
              <span className="rounded-full bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-600">
                {pendingCount} pending
              </span>
            )}
            <span className="rounded-full bg-navy-900 px-4 py-1.5 text-sm font-semibold text-gold-500">
              {feedbacks.length} total
            </span>
          </div>
        )}
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

      {!loading && !error && feedbacks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-navy-300">
            <FaInbox size={26} />
          </span>
          <h3 className="mt-4 font-bold text-navy-700">No feedback yet</h3>
          <p className="mt-1 text-sm text-navy-400">
            New feedback submitted by customers will appear here.
          </p>
        </div>
      )}

      {!loading && !error && feedbacks.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {feedbacks.map((item, index) => (
              <FeedbackCard
                key={item.id}
                item={item}
                index={index}
                onDeleteClick={setDeleteId}
                onApprove={handleApprove}
                isApproving={approvingId === item.id}
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
