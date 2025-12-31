import { FC } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";

const ProtectedRoute: FC = () => {
  const checkLogin = useAppSelector((state) => state.authReducer.userInfo);
  const isLoggedin = Object.keys(checkLogin).length > 0;
  return isLoggedin ? <Outlet /> : <Navigate to="/" />;
};

export default ProtectedRoute;
