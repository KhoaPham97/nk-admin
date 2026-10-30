export const logout = () => {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("accessToken");

  window.location.replace("/admin/login");
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));

    if (!payload.exp) return true;

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
};

export const getAdminToken = () => {
  return (
    localStorage.getItem("adminToken") || localStorage.getItem("accessToken")
  );
};
