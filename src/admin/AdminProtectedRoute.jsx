import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const AdminProtectedRoute = () => {
  const location = useLocation();

  const token = localStorage.getItem("adminToken");

  // Chưa đăng nhập
  if (!token) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
