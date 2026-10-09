export const COLORS = [
  { key: "navy", hex: "#0D1B45" },
  { key: "gold", hex: "#FFD500" },
  { key: "white", hex: "#FFFFFF" },
  { key: "black", hex: "#1A1A1A" },
  { key: "gray", hex: "#8A8F9C" },
  { key: "red", hex: "#C62828" },
  { key: "green", hex: "#2E7D32" },
  { key: "sky", hex: "#4A90D9" },
];

export const GARMENTS = {
  shirt: {
    variants: ["polo", "round"],
    defaultColor: "#FFFFFF",
    defaultEnabled: true,
  },
  pants: {
    variants: ["classic", "cargo"],
    defaultColor: "#0D1B45",
    defaultEnabled: true,
  },
  coverall: {
    variants: ["zip", "button"],
    defaultColor: "#0D1B45",
    defaultEnabled: false,
  },
  suit: {
    variants: ["single", "double"],
    defaultColor: "#1A1A1A",
    defaultEnabled: false,
  },
  jacket: {
    variants: ["zip", "bomber"],
    defaultColor: "#0D1B45",
    defaultEnabled: false,
  },
};

// لما تلبس قطعة، القطع اللي بتتعارض معاها بتتشال
export const EXCLUDES = {
  shirt: ["coverall"],
  pants: ["coverall", "suit"],
  coverall: ["shirt", "pants", "suit", "jacket"],
  suit: ["coverall", "jacket", "pants"],
  jacket: ["coverall", "suit"],
};
