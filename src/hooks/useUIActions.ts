"use client";

import { useEffect, useCallback } from "react";
import { uiActionBus } from "@/lib/uiActions";
import type { UIAction } from "@/types/book";

/**
 * Hook for subscribing to UI actions from the AI chat
 *
 * @param handler - Function to call when a UI action is dispatched
 */
export function useUIActions(handler: (action: UIAction) => void) {
  useEffect(() => {
    const unsubscribe = uiActionBus.subscribe(handler);
    return unsubscribe;
  }, [handler]);
}

/**
 * Hook for dispatching UI actions
 *
 * @returns dispatch function
 */
export function useUIActionDispatch() {
  const dispatch = useCallback((action: UIAction) => {
    uiActionBus.dispatch(action);
  }, []);

  return dispatch;
}
