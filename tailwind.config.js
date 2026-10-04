/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // الكحلي
        navy: {
          50: "#EEF1F9",
          100: "#D9DFF0",
          200: "#B3BFE0",
          300: "#8595C8",
          400: "#566FB0",
          500: "#34509A",
          600: "#233B7A",
          700: "#182B5E",
          800: "#112149",
          900: "#0D1B45", // اللون الأساسي للوجو
          950: "#070F2B",
        },
        // الأصفر الذهبي
        gold: {
          50: "#FFFBE6",
          100: "#FFF5BF",
          200: "#FFEC80",
          300: "#FFE24D",
          400: "#FFDB1F",
          500: "#FFD500", // اللون الأساسي للوجو
          600: "#E0B800",
          700: "#B89400",
          800: "#8A6F00",
          900: "#5C4A00",
        },
        cream: {
          50: "#FFFEFB", // أفتح حاجة (للكروت فوق الخلفية)
          100: "#FCFAF3", // خلفية الموقع الأساسية
          200: "#F7F3E6", // أقسام بديلة
          300: "#EFE9D5", // حدود وفواصل
        },

        brand: {
          primary: "#0D1B45", // كحلي
          secondary: "#FFD500", // أصفر
          light: "#FCFAF3", // أبيض
          soft: "#F7F3E6", // خلفية فاتحة للأقسام
        },
        navbar: {
          bg: "#0D1B45",
          text: "#FFFFFF",
          hover: "#FFD500",
        },
        footer: {
          bg: "#070F2B",
          text: "#D9DFF0",
          accent: "#FFD500",
        },
      },
      fontFamily: {
        script: ['"Pacifico"', "cursive"],
        sans: ['"Poppins"', '"Cairo"', "sans-serif"],
        arabic: ['"Cairo"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
