// Animation configurations for Framer Motion
// These provide consistent motion across all prototypes

// Spring presets for natural motion
export const springs = {
  gentle: {
    type: "spring",
    stiffness: 200,
    damping: 20,
  },
  bouncy: {
    type: "spring",
    stiffness: 300,
    damping: 25,
  },
  snappy: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  },
};

// Accordion animation variants
export const accordionVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: springs.gentle,
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: springs.gentle,
  },
};

// Card expansion variants
export const cardVariants = {
  collapsed: {
    scale: 1,
    height: "auto",
  },
  expanded: {
    scale: 1.01,
    height: "auto",
    transition: springs.bouncy,
  },
};

// Fade in/out variants
export const fadeVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

// Slide in from side
export const slideVariants = {
  left: {
    hidden: { x: -50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: springs.gentle,
    },
  },
  right: {
    hidden: { x: 50, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: springs.gentle,
    },
  },
  up: {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: springs.gentle,
    },
  },
  down: {
    hidden: { y: -50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: springs.gentle,
    },
  },
};

// Scale animation
export const scaleVariants = {
  hidden: {
    scale: 0.9,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: springs.bouncy,
  },
};

// Stagger children animation
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// Glow effect for new content
export const glowVariants = {
  initial: {
    boxShadow: "0 0 0 0 rgba(59, 130, 246, 0)",
  },
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(59, 130, 246, 0.4)",
      "0 0 20px 10px rgba(59, 130, 246, 0.2)",
      "0 0 0 0 rgba(59, 130, 246, 0)",
    ],
    transition: {
      duration: 2,
      ease: "easeOut",
    },
  },
};

// Depth level transition
export const depthLevelVariants = {
  1: { opacity: 1, x: 0 },
  2: { opacity: 1, x: 20 },
  3: { opacity: 1, x: 40 },
  4: { opacity: 1, x: 60 },
};

// Loading dots animation
export const loadingDotsVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Hover animations
export const hoverVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.02,
    transition: springs.snappy,
  },
  tap: {
    scale: 0.98,
  },
};

// Helper function to create stagger delay
export function getStaggerDelay(index, baseDelay = 0.05) {
  return index * baseDelay;
}

// Helper to get animation config based on user preference
export function getAnimationConfig(reducedMotion = false) {
  if (reducedMotion) {
    return {
      transition: { duration: 0.01 },
      initial: false,
      animate: false,
    };
  }
  return {};
}
