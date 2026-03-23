"use client";

import { useState, useEffect, useRef } from "react";
import { X, MessageSquare } from "lucide-react";

export default function PollWidget() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const scriptLoaded = useRef(false);

  // Auto-open on first visit
  useEffect(() => {
    setReady(true);
    const seen = sessionStorage.getItem("poll-seen");
    if (!seen) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem("poll-seen", "1");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Load OpinionStage SDK once (using the same insertion method as the official embed)
  useEffect(() => {
    if (!ready || scriptLoaded.current) return;
    scriptLoaded.current = true;

    if (document.getElementById("os-widget-jssdk")) return;

    const js = document.createElement("script");
    js.id = "os-widget-jssdk";
    js.async = true;
    js.src =
      "https://www.opinionstage.com/assets/loader.js?" +
      Math.floor(new Date().getTime() / 1000000);
    const sjs = document.getElementsByTagName("script")[0];
    sjs.parentNode!.insertBefore(js, sjs);
  }, [ready]);

  // Re-init SDK when widget opens so it finds the freshly mounted div
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const os = (window as unknown as Record<string, { init?: () => void }>).OpinionStage;
      try {
        os?.init?.();
      } catch {
        /* ignore */
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [open]);

  if (!ready) return null;

  return (
    <>
      {/* Widget panel — only mounted when open so the SDK always finds a fresh div */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="w-[380px] rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between bg-primary px-4 py-2.5">
              <span className="text-sm font-semibold text-white">Quick Poll</span>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Close poll"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "540px" }}>
              <div
                id="os-widget-1537678"
                data-opinionstage-widget="b169f2b9-2923-4d81-a14d-5bd1eb04fc0c"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating button when closed */}
      {!open && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition-colors"
            aria-label="Open poll"
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
