import {
  FaHeart,
  FaShoppingCart,
  FaUser,
  FaBars,
  FaTimes,
  FaGlobe,
} from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../../firebase";
import { useLang } from "../../context/LangContext";

const NAV_ITEMS = [
  { key: "home", to: "/" },
  { key: "about", to: "/about" },
  { key: "products", to: "/products" },
  { key: "customize", to: "/customize" },
  { key: "materials", to: "/materials" },
  { key: "myOrders", to: "/myorders" },
  { key: "contact", to: "/contact" },
];

const FAVORITES_COLLECTION = "Favorites";

function CountBadge({ count }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -top-2 -end-1 bg-gold-500 text-navy-900 text-xs font-extrabold min-w-4 h-4 px-1 rounded-full 
    flex items-center justify-center ring-2 ring-navy-900"
    >
      {count}
    </span>
  );
}

function LangButton({ className = "" }) {
  const { lang, toggleLang } = useLang();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleLang}
      aria-label={t("nav.language")}
      className={`flex items-center gap-2 rounded-full border border-gold-500/60 text-gold-500 px-3 py-1.5 text-sm font-bold transition-colors duration-300 hover:bg-gold-500 hover:text-navy-900 ${className}`}
    >
      <FaGlobe size={16} />
      <span>{lang === "ar" ? "EN" : "عربي"}</span>
    </button>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await signOut(auth);
    setIsUserOpen(false);
    setMenuOpen(false);
    navigate("/login");
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Shrink navbar on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const onClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsub();
  }, []);

  /* Live favorites counter: listens to the same Favorites/{uid} doc
     that the favorite button (in ProductCard / Favorites page)
     writes to, so the badge goes up/down the moment productIds
     changes — no matter which page the user added/removed it from. */
  useEffect(() => {
    if (!user) {
      setFavoritesCount(0);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, FAVORITES_COLLECTION, user.uid),
      (snap) => {
        const ids = snap.exists() ? snap.data().productIds || [] : [];
        setFavoritesCount(ids.length);
      },
      (err) => {
        console.error("Error reading favorites count:", err);
      },
    );
    return () => unsubscribe();
  }, [user]);

  /* Live cart counter: reads the cart from localStorage and updates
   the moment ProductCard / the Cart page changes it. */
  useEffect(() => {
    const update = () => {
      try {
        const raw = localStorage.getItem("bgUniform_cart");
        const cart = raw ? JSON.parse(raw) : [];
        setCartCount(cart.reduce((n, i) => n + (i.qty || 0), 0));
      } catch {
        setCartCount(0);
      }
    };
    update();
    window.addEventListener("cart:updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cart:updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-navbar-bg/95 text-navbar-text backdrop-blur-md border-b-4 border-gold-500 transition-shadow duration-300 ${
        scrolled ? "shadow-lg shadow-navy-950/30" : ""
      }`}
    >
      <nav className="max-w-7xl mx-auto px-3 sm:px-8 lg:px-12">
        <div
          className={`flex items-center gap-4 transition-all duration-300 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
          {/* Burger - Mobile (start side) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t("nav.menu")}
            aria-expanded={menuOpen}
            className="lg:hidden p-1 text-white transition-colors hover:text-gold-500"
          >
            {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>

          {/* Links - Desktop (start side) */}
          <ul className="hidden lg:flex items-center gap-8 text-base xl:text-lg font-semibold">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={scrollTop}
                  className={({ isActive }) =>
                    `relative py-1 transition-colors duration-300 hover:text-gold-500
                     after:absolute after:-bottom-1 after:start-0 after:h-0.5 after:bg-gold-500 after:transition-all after:duration-300
                     ${
                       isActive
                         ? "text-gold-500 after:w-full"
                         : "text-navbar-text after:w-0 hover:after:w-full"
                     }`
                  }
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Actions (end side) */}
          <div className="ms-auto flex items-center gap-3 sm:gap-4">
            <LangButton />

            <button
              onClick={() => navigate("/favorites")}
              aria-label={t("nav.favorites")}
              className="relative text-white transition-all duration-300 hover:text-red-400 hover:scale-110"
            >
              <FaHeart size={22} />
              <CountBadge count={favoritesCount} />
            </button>

            <button
              onClick={() => navigate("/cart")}
              aria-label={t("nav.cart")}
              className="relative text-white transition-all duration-300 hover:text-gold-500 hover:scale-110"
            >
              <FaShoppingCart size={22} />
              <CountBadge count={cartCount} />
            </button>

            {/* User */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserOpen(!isUserOpen)}
                aria-label={t("nav.account")}
                className="w-9 h-9 rounded-full bg-gold-500 text-navy-900 flex items-center justify-center font-extrabold text-lg transition-transform duration-300 hover:scale-105"
              >
                {user ? (
                  user.displayName.charAt(0).toUpperCase()
                ) : (
                  <FaUser size={16} />
                )}
              </button>

              <div
                className={`absolute end-0 mt-3 w-44 bg-cream-50 text-navy-900 rounded-xl shadow-xl border border-cream-300 py-2 ltr:origin-top-right rtl:origin-top-left transition-all duration-200 ${
                  isUserOpen
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-95 pointer-events-none"
                }`}
              >
                {!user && (
                  <Link
                    to="/login"
                    className="block px-4 py-2 text-start font-semibold hover:bg-gold-100 transition-colors"
                    onClick={() => setIsUserOpen(false)}
                  >
                    {t("nav.login")}
                  </Link>
                )}

                {user && (
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-start font-semibold hover:bg-gold-100 transition-colors"
                  >
                    {t("nav.logout")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu (slide-down) */}
        <div
          className={`lg:hidden grid transition-all duration-300 ease-in-out ${
            menuOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <ul className="flex flex-col gap-1 pb-4 pt-2 text-lg font-semibold">
              {NAV_ITEMS.map((item) => (
                <li key={item.key}>
                  <NavLink
                    to={item.to}
                    end={item.to === "/"}
                    onClick={() => {
                      setMenuOpen(false);
                      scrollTop();
                    }}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 text-start border-s-4 transition-colors ${
                        isActive
                          ? "bg-navy-800 border-gold-500 text-gold-500"
                          : "border-transparent hover:bg-navy-800 hover:text-gold-500"
                      }`
                    }
                  >
                    {t(`nav.${item.key}`)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
