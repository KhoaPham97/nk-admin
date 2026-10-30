import { useEffect } from "react";

import { logout, getAdminToken, isTokenExpired } from "../utils/authSession";

export const useAuthSession = () => {
  useEffect(() => {
    const token = getAdminToken();

    if (!token) return;

    if (isTokenExpired(token)) {
      logout();
      return;
    }

    let payload: { exp: number };

    try {
      payload = JSON.parse(atob(token.split(".")[1]));
    } catch {
      logout();
      return;
    }

    const remainingTime = payload.exp * 1000 - Date.now();

    const timer = window.setTimeout(
      () => {
        logout();
      },
      Math.max(0, remainingTime),
    );

    const checkSession = () => {
      const currentToken = getAdminToken();

      if (!currentToken || isTokenExpired(currentToken)) {
        logout();
      }
    };

    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", checkSession);

    return () => {
      clearTimeout(timer);

      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", checkSession);
    };
  }, []);
};
