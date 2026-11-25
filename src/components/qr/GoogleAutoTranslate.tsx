"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: { translate?: { TranslateElement?: new (options: Record<string, unknown>, elementId: string) => unknown } };
  }
}

export default function GoogleAutoTranslate() {
  useEffect(() => {
    const style = document.createElement("style");
    style.dataset.googleTranslateSuppression = "true";
    style.textContent = `
      .goog-te-banner-frame, iframe.goog-te-banner-frame, .goog-te-banner,
      .goog-te-spinner-pos, .goog-te-gadget,
      #google_translate_element, #goog-gt-tt, .goog-te-balloon-frame,
      .goog-tooltip, .goog-tooltip:hover, body > .skiptranslate {
        display:none !important; visibility:hidden !important; height:0 !important;
        max-height:0 !important; min-height:0 !important; overflow:hidden !important;
      }
      body { top:0 !important; position:static !important; margin-top:0 !important; }
      html, html.translated-ltr, html.translated-rtl { margin-top:0 !important; top:0 !important; }
    `;
    document.head.appendChild(style);
    const removeGoogleChrome = () => {
      document.querySelectorAll<HTMLElement>(
        ".goog-te-banner-frame, iframe.goog-te-banner-frame, .goog-te-banner, #goog-gt-tt, .goog-te-balloon-frame, body > .skiptranslate",
      ).forEach((element) => { element.style.setProperty("display", "none", "important"); element.style.setProperty("visibility", "hidden", "important"); });
      document.body.style.setProperty("top", "0px", "important");
      document.body.style.setProperty("margin-top", "0px", "important");
      document.documentElement.style.setProperty("margin-top", "0px", "important");
    };
    removeGoogleChrome();
    const chromeObserver = new MutationObserver(removeGoogleChrome);
    chromeObserver.observe(document.documentElement, { childList: true, subtree: true });
    const mount = document.createElement("div");
    mount.id = "google_translate_element";
    mount.setAttribute("aria-hidden", "true");
    document.body.appendChild(mount);
    window.googleTranslateElementInit = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      if (TranslateElement) new TranslateElement({ pageLanguage: "en", autoDisplay: false, multilanguagePage: true }, "google_translate_element");
    };
    if (!document.querySelector('script[data-google-translate="true"]')) {
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.dataset.googleTranslate = "true";
      document.head.appendChild(script);
    } else {
      window.googleTranslateElementInit();
    }
    return () => {
      chromeObserver.disconnect();
      style.remove();
      mount.remove();
      delete window.googleTranslateElementInit;
    };
  }, []);

  return null;
}
