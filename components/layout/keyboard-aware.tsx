"use client";

import { useEffect } from "react";

const TEXT_INPUT = /^(text|number|tel|email|search|url|password|date)$/;

/**
 * On phones, fixed/sticky chrome (bottom nav, sticky action bars) rides up on
 * top of the on-screen keyboard and leaves room for two rows of content. While
 * a text field is focused on a touch device we flag <html data-keyboard="open">
 * so that chrome can step aside (see globals.css).
 */
export function KeyboardAware() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const root = document.documentElement;

    const isTyping = (el: Element | null) => {
      if (!el) return false;
      if (el instanceof HTMLTextAreaElement) return true;
      if (el instanceof HTMLInputElement) return TEXT_INPUT.test(el.type || "text");
      return (el as HTMLElement).isContentEditable === true;
    };

    const onFocusIn = (event: FocusEvent) => {
      if (isTyping(event.target as Element)) root.dataset.keyboard = "open";
    };

    // Focus hops between fields (tally rows) fire out-then-in; wait a tick so
    // the chrome doesn't flicker back in between them.
    const onFocusOut = () => {
      window.setTimeout(() => {
        if (!isTyping(document.activeElement)) delete root.dataset.keyboard;
      }, 80);
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      delete root.dataset.keyboard;
    };
  }, []);

  return null;
}
