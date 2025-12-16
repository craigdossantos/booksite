/**
 * UI Actions Bus
 *
 * Enables AI chat to trigger UI navigation and updates.
 * Components subscribe to actions and respond to AI-initiated navigation.
 */

import type { UIAction, DepthLevel } from '@/types/book';

type ActionListener = (action: UIAction) => void;

class UIActionBus {
  private listeners: Set<ActionListener> = new Set();
  private actionHistory: UIAction[] = [];
  private maxHistoryLength = 50;

  /**
   * Subscribe to UI actions
   * @returns Unsubscribe function
   */
  subscribe(listener: ActionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispatch a UI action to all listeners
   */
  dispatch(action: UIAction): void {
    // Add to history
    this.actionHistory.push(action);
    if (this.actionHistory.length > this.maxHistoryLength) {
      this.actionHistory.shift();
    }

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(action);
      } catch (error) {
        console.error('Error in UI action listener:', error);
      }
    });
  }

  /**
   * Get action history for debugging
   */
  getHistory(): UIAction[] {
    return [...this.actionHistory];
  }

  /**
   * Clear all listeners (useful for cleanup)
   */
  clearListeners(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const uiActionBus = new UIActionBus();

// Helper functions for creating actions
export const UIActions = {
  navigate(sectionId: string, highlightText?: string): UIAction {
    return { type: 'navigate', sectionId, highlightText };
  },

  openDepthLevel(nodeId: string, depth: DepthLevel): UIAction {
    return { type: 'openDepthLevel', nodeId, depth };
  },

  showQuiz(conceptId: string): UIAction {
    return { type: 'showQuiz', conceptId };
  },

  highlightConcept(conceptId: string): UIAction {
    return { type: 'highlightConcept', conceptId };
  },

  showRelated(conceptId: string): UIAction {
    return { type: 'showRelated', conceptId };
  },

  expandTreeNode(nodeId: string): UIAction {
    return { type: 'expandTreeNode', nodeId };
  },

  collapseTreeNode(nodeId: string): UIAction {
    return { type: 'collapseTreeNode', nodeId };
  },

  startReview(filter?: 'due' | 'new' | 'all'): UIAction {
    return { type: 'startReview', filter };
  },
};

/**
 * React hook for subscribing to UI actions
 * Use this in components that need to respond to AI navigation
 */
export function useUIActions(handler: ActionListener): void {
  // Note: This is a simple implementation.
  // In a real React app, you'd use useEffect with proper cleanup.
  // The actual hook implementation will be in a separate hooks file.
}
