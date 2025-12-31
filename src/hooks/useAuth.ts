import { updateModal } from "../redux/features/authSlice";
import { useAppSelector, useAppDispatch } from "../redux/hooks";

const useAuth = () => {
  const dispatch = useAppDispatch();
  const checkLogin = useAppSelector((state) => state.authReducer.userInfo);
  const isLoggedIn = Object.keys(checkLogin).length > 0;

  const requireAuth = (action: () => void) => {
    if (!isLoggedIn) {
      dispatch(updateModal(true));
    } else {
      action();
    }
  };

  return { requireAuth };
};

export default useAuth;
