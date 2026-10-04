import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase";

const USERS_COLLECTION = "Users";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const redirectTo = location.state?.from || "/";

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, USERS_COLLECTION, user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          name: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
        });
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error("Error signing in with Google:", err);
      setError(t("auth.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-900 px-4 py-12">
      <div className="pointer-events-none absolute -top-24 -end-24 h-72 w-72 rounded-full bg-gold-500/10" />
      <div className="pointer-events-none absolute -bottom-24 -start-24 h-72 w-72 rounded-full border-2 border-gold-500/15" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md rounded-3xl border border-gold-500/20 bg-cream-50 p-8 shadow-2xl sm:p-10"
      >
        <div className="text-center">
          <h2 className="mt-5 text-2xl font-extrabold text-navy-900">
            {t("auth.loginTitle")}
          </h2>
          <p className="mt-2 text-sm text-navy-500">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        {error && (
          <p className="mt-6 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-navy-200 bg-white py-3.5 font-bold text-navy-900 shadow-sm transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy-200 border-t-navy-900" />
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.57-5.17 3.57-8.64Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.07 7.93-2.89l-3.87-3c-1.07.72-2.43 1.15-4.06 1.15-3.13 0-5.79-2.11-6.74-4.96H1.26v3.09A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.26 14.3A7.2 7.2 0 0 1 4.88 12c0-.8.14-1.58.38-2.3V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4-3.09Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.74c1.77 0 3.36.61 4.61 1.8l3.45-3.45C17.95 1.14 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4 3.09C6.21 6.85 8.87 4.74 12 4.74Z"
              />
            </svg>
          )}
          {loading ? t("auth.loggingIn") : t("auth.continueWithGoogle")}
        </button>

        <p className="mt-8 text-center text-xs leading-relaxed text-navy-400">
          {t("auth.termsNotice")}
        </p>
      </motion.div>
    </div>
  );
}
