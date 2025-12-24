// Shared utilities for all prototypes

// Smooth scroll to element
export function scrollToElement(element, offset = 100) {
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: "smooth",
  });
}

// Debounce function for performance
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Generate unique ID
export function generateId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format text with simple markdown
export function formatMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`(.+?)`/g,
      '<code class="px-1 py-0.5 bg-gray-100 rounded">$1</code>',
    );
}

// Check if element is in viewport
export function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Add loading dots animation
export function createLoadingDots() {
  const container = document.createElement("div");
  container.className = "flex items-center gap-1.5 py-2";

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "w-2 h-2 rounded-full bg-blue-500 animate-bounce";
    dot.style.animationDelay = `${i * 150}ms`;
    container.appendChild(dot);
  }

  return container;
}

// Simulate AI thinking delay
export function simulateAIDelay(callback, minDelay = 800, maxDelay = 1500) {
  const delay = Math.random() * (maxDelay - minDelay) + minDelay;
  return new Promise((resolve) => {
    setTimeout(() => {
      const result = callback();
      resolve(result);
    }, delay);
  });
}

// Local storage helpers
export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from localStorage:", error);
    }
  },
};

// Keyboard navigation helper
export function setupKeyboardNav(elements, options = {}) {
  const { onSelect = () => {}, onEscape = () => {}, loop = true } = options;

  let currentIndex = 0;

  function focusElement(index) {
    if (elements[index]) {
      elements[index].focus();
      currentIndex = index;
    }
  }

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        currentIndex = loop
          ? (currentIndex + 1) % elements.length
          : Math.min(currentIndex + 1, elements.length - 1);
        focusElement(currentIndex);
        break;

      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        currentIndex = loop
          ? (currentIndex - 1 + elements.length) % elements.length
          : Math.max(currentIndex - 1, 0);
        focusElement(currentIndex);
        break;

      case "Enter":
      case " ":
        e.preventDefault();
        onSelect(elements[currentIndex], currentIndex);
        break;

      case "Escape":
        e.preventDefault();
        onEscape();
        break;
    }
  });

  return {
    focusFirst: () => focusElement(0),
    focusLast: () => focusElement(elements.length - 1),
    getCurrentIndex: () => currentIndex,
  };
}

// CSS class toggle utility
export function toggleClass(element, className, force) {
  if (force !== undefined) {
    element.classList.toggle(className, force);
  } else {
    element.classList.toggle(className);
  }
}

// Check for reduced motion preference
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Get animation duration based on user preference
export function getAnimationDuration(defaultDuration = 300) {
  return prefersReducedMotion() ? 0 : defaultDuration;
}
