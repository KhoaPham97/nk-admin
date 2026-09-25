import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { API_ENDPOINTS } from "../api";

const SESSION_KEY = "nhatkhang_analytics_session";

const getSessionId = () => {
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2)}`;

    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
};

// =====================================================
// DEVICE
// =====================================================

const getDevice = () => {
  const width = window.innerWidth;

  if (width < 768) return "mobile";

  if (width < 1024) return "tablet";

  return "desktop";
};

// =====================================================
// BROWSER
// =====================================================

const getBrowserInfo = () => {
  const ua = navigator.userAgent;

  let browser = "Other";
  let version = "";

  if (ua.includes("Edg/")) {
    browser = "Edge";
    version = ua.match(/Edg\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("OPR/")) {
    browser = "Opera";
    version = ua.match(/OPR\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
    version = ua.match(/Chrome\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Firefox/")) {
    browser = "Firefox";
    version = ua.match(/Firefox\/([\d.]+)/)?.[1] || "";
  } else if (ua.includes("Safari/")) {
    browser = "Safari";
    version = ua.match(/Version\/([\d.]+)/)?.[1] || "";
  }

  return {
    browser,
    version,
  };
};

// =====================================================
// OS
// =====================================================

const getOSInfo = () => {
  const ua = navigator.userAgent;

  if (ua.includes("Windows")) {
    return {
      os: "Windows",
      version: "",
    };
  }

  if (ua.includes("Android")) {
    return {
      os: "Android",
      version: ua.match(/Android\s([\d.]+)/)?.[1] || "",
    };
  }

  if (ua.includes("iPhone") || ua.includes("iPad") || ua.includes("iPod")) {
    return {
      os: "iOS",
      version: "",
    };
  }

  if (ua.includes("Mac OS")) {
    return {
      os: "macOS",
      version: "",
    };
  }

  if (ua.includes("Linux")) {
    return {
      os: "Linux",
      version: "",
    };
  }

  return {
    os: "Other",
    version: "",
  };
};

// =====================================================
// UTM / SOURCE
// =====================================================

const getTrafficSource = () => {
  const params = new URLSearchParams(window.location.search);

  const utmSource = params.get("utm_source") || "";

  const utmMedium = params.get("utm_medium") || "";

  const utmCampaign = params.get("utm_campaign") || "";

  const referrer = document.referrer || "";

  let source = utmSource;

  if (!source && referrer) {
    try {
      const url = new URL(referrer);

      source = url.hostname;
    } catch {
      source = referrer;
    }
  }

  if (!source) {
    source = "direct";
  }

  return {
    source,
    medium: utmMedium,
    campaign: utmCampaign,
  };
};

// =====================================================
// TRACK
// =====================================================

const AnalyticsTracker = () => {
  const location = useLocation();

  const previousPath = useRef<string>("");

  const sessionId = useRef<string>(getSessionId());

  const sendTracking = async (event = "page_view", extra = {}) => {
    try {
      const browser = getBrowserInfo();

      const os = getOSInfo();

      const traffic = getTrafficSource();

      const data = {
        // =================================================
        // SESSION
        // =================================================

        sessionId: sessionId.current,

        // =================================================
        // EVENT
        // =================================================

        event,

        // =================================================
        // PAGE
        // =================================================

        path: location.pathname,

        previousPath: previousPath.current,

        // =================================================
        // SOURCE
        // =================================================

        referrer: document.referrer || "",

        source: traffic.source,

        medium: traffic.medium,

        campaign: traffic.campaign,

        // =================================================
        // DEVICE
        // =================================================

        device: getDevice(),

        browser: browser.browser,

        browserVersion: browser.version,

        os: os.os,

        osVersion: os.version,

        platform: navigator.platform || "",

        // =================================================
        // SCREEN
        // =================================================

        screenWidth: window.screen.width,

        screenHeight: window.screen.height,

        viewportWidth: window.innerWidth,

        viewportHeight: window.innerHeight,

        pixelRatio: window.devicePixelRatio || 1,

        touchSupport: "ontouchstart" in window || navigator.maxTouchPoints > 0,

        // =================================================
        // LANGUAGE
        // =================================================

        language: navigator.language || "",

        languages: navigator.languages ? Array.from(navigator.languages) : [],

        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",

        // =================================================
        // EXTRA
        // =================================================

        ...extra,
      };

      const response = await fetch(API_ENDPOINTS.ANALYTICS_TRACK, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(data),

        keepalive: true,
      });

      if (!response.ok) {
        console.error("Analytics error:", response.status);

        return;
      }

      const result = await response.json();

      console.log("📊 Analytics:", event, result);
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  // =====================================================
  // PAGE VIEW
  // =====================================================

  useEffect(() => {
    sendTracking("page_view");

    previousPath.current = location.pathname;
  }, [location.pathname]);

  // =====================================================
  // HEARTBEAT
  // MỖI 60 GIÂY
  // =====================================================

  useEffect(() => {
    const interval = setInterval(() => {
      sendTracking("heartbeat");
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [location.pathname]);

  return null;
};

export default AnalyticsTracker;
