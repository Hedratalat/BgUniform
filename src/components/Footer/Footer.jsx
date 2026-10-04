import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaWhatsapp,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaClock,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const FOOTER_LINKS = [
  { key: "home", to: "/" },
  { key: "about", to: "/about" },
  { key: "products", to: "/products" },
  { key: "materials", to: "/materials" },
  { key: "myOrders", to: "/myorders" },
  { key: "contact", to: "/contact" },
];

const SOCIAL_LINKS = [
  { icon: FaFacebookF, href: "#", label: "Facebook" },
  { icon: FaInstagram, href: "#", label: "Instagram" },
  { icon: FaTwitter, href: "#", label: "Twitter" },
  { icon: FaWhatsapp, href: "#", label: "WhatsApp" },
];

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative bg-footer-bg text-footer-text overflow-hidden">
      {/* Decorative top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold-500 to-transparent" />

      {/* Soft glow shapes */}
      <div className="pointer-events-none absolute -top-24 start-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 end-1/4 w-96 h-96 bg-navy-500/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* 1. Brand */}
          <div>
            <h2 className="font-sans font-extrabold text-xl sm:text-2xl text-gold-500 mb-4 tracking-wide">
              {t("footer.brand", "BG Uniform")}
            </h2>
            <p className="text-sm sm:text-base text-navy-200/80 leading-relaxed">
              {t(
                "footer.description",
                "يونيفورم ينور مكانك، زي موحد يريح جسمك ويعبر عن شغلك، بأعلى جودة وأنسب سعر.",
              )}
            </p>
          </div>

          {/* 2. Quick links */}
          <div>
            <h3 className="text-gold-500 font-bold text-lg mb-5 tracking-wide">
              {t("footer.quickLinks", "روابط سريعة")}
            </h3>
            <ul className="space-y-3 text-sm sm:text-base">
              {FOOTER_LINKS.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    className="text-navy-200 transition-colors duration-300 hover:text-gold-500 hover:ps-1"
                  >
                    {t(`nav.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 3. Contact info */}
          <div>
            <h3 className="text-gold-500 font-bold text-lg mb-5 tracking-wide">
              {t("footer.contactUs", "تواصل معنا")}
            </h3>
            <ul className="space-y-4 text-sm sm:text-base text-navy-200">
              <li className="flex items-start gap-3">
                <FaMapMarkerAlt
                  className="text-gold-500 mt-1 shrink-0"
                  size={16}
                />
                <span>{t("footer.address", "أسيوط، مصر")}</span>
              </li>
              <li className="flex items-center gap-3">
                <FaPhoneAlt className="text-gold-500 shrink-0" size={15} />
                <span dir="ltr">+20 100 000 0000</span>
              </li>
              <li className="flex items-center gap-3">
                <FaEnvelope className="text-gold-500 shrink-0" size={15} />
                <span dir="ltr">info@example.com</span>
              </li>
            </ul>
          </div>

          {/* 4. Working hours + Social */}
          <div>
            <h3 className="text-gold-500 font-bold text-lg mb-5 tracking-wide">
              {t("footer.workingHours", "مواعيد العمل")}
            </h3>
            <div className="flex items-start gap-3 text-sm sm:text-base text-navy-200 mb-6">
              <FaClock className="text-gold-500 mt-1 shrink-0" size={16} />
              <span>
                {t("footer.hoursDaily", "24 ساعة يوميًا")} -{" "}
                {t("footer.hoursWeekly", "7 أيام في الأسبوع")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-11 h-11 rounded-full bg-navy-800/60 border border-gold-500/30 flex items-center justify-center text-gold-500 transition-all duration-300 hover:bg-gold-500 hover:text-navy-900 hover:-translate-y-1"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar - single centered line */}
      <div className="relative border-t border-navy-800/60">
        <div className="max-w-7xl mx-auto px-6 py-5 text-center">
          <p className="text-sm text-navy-300">
            {t("footer.brand", "BG Uniform")}،{" "}
            {t("footer.rights", "جميع الحقوق محفوظة")} © 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
