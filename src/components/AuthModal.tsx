import { FC } from "react";
import { useAppSelector } from "../redux/hooks";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

const AuthModal: FC = () => {
  const { isModalOpen, authMode } = useAppSelector(
    (state) => state.authReducer,
  );

  if (!isModalOpen) return null;

  return <>{authMode === "login" ? <LoginForm /> : <RegisterForm />}</>;
};

export default AuthModal;
