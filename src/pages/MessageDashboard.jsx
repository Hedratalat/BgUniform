import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import {
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaClock,
  FaTrash,
  FaExclamationTriangle,
  FaInbox,
} from "react-icons/fa";
import { db } from "../../firebase";

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

function MessageCard({ msg, onDeleteClick, index }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className="relative overflow-hidden rounded-2xl border border-navy-100 bg-white p-5 shadow-md shadow-navy-900/5 transition hover:shadow-lg hover:shadow-navy-900/10"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gold-500" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-500">
            <FaUser size={16} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-navy-900">{msg.fullName}</h3>
            <p className="flex items-center gap-1 text-xs text-navy-400">
              <FaClock size={11} />
              {formatDate(msg.createdAt)}
            </p>
          </div>
        </div>

        <button
          onClick={() => onDeleteClick(msg.id)}
          aria-label="Delete message"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <FaTrash size={15} />
        </button>
      </div>

      <div className="mt-4 space-y-1.5 text-sm">
        <a
          href={`mailto:${msg.email}`}
          className="flex items-center gap-2 text-navy-600 hover:text-gold-600"
        >
          <FaEnvelope size={13} className="shrink-0" />
          <span dir="ltr" className="truncate">
            {msg.email}
          </span>
        </a>
        <a
          href={`tel:${msg.phone}`}
          className="flex items-center gap-2 text-navy-600 hover:text-gold-600"
        >
          <FaPhoneAlt size={13} className="shrink-0" />
          <span dir="ltr">{msg.phone}</span>
        </a>
      </div>

      <p className="mt-4 rounded-xl bg-cream-100 p-3 text-sm leading-relaxed text-navy-700 whitespace-pre-line">
        {msg.message}
      </p>
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
              Delete this message?
            </h3>
            <p className="mt-2 text-sm text-navy-500">
              This action cannot be undone. The message will be permanently
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

export default function MessageDashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "Messages"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMessages(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        );
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching messages:", err);
        setError("Failed to load messages.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "Messages", deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error("Error deleting message:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
            Messages
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            All messages submitted through the contact form.
          </p>
        </div>

        {!loading && !error && (
          <span className="shrink-0 rounded-full bg-navy-900 px-4 py-1.5 text-sm font-semibold text-gold-500 ">
            {messages.length} total
          </span>
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

      {!loading && !error && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-white py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-navy-300">
            <FaInbox size={26} />
          </span>
          <h3 className="mt-4 font-bold text-navy-700">No messages yet</h3>
          <p className="mt-1 text-sm text-navy-400">
            New messages from the contact form will appear here.
          </p>
        </div>
      )}

      {!loading && !error && messages.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <MessageCard
                key={msg.id}
                msg={msg}
                index={index}
                onDeleteClick={setDeleteId}
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
