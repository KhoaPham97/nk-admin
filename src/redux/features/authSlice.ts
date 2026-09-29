import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthSlice } from "../../models/AuthSlice";

export type AuthMode = "login" | "register";

interface LoginProps {
  username: string;
  password: string;
  id: string;
  userInfo: any[];
}

interface AuthState extends AuthSlice {
  authMode: AuthMode;
}

const initialState: AuthState = {
  modalOpen: false,
  authMode: "login",
  username: localStorage.getItem("username") ?? "",
  userInfo: (() => {
    try {
      const userInfo = localStorage.getItem("userInfo");
      return userInfo ? JSON.parse(userInfo) : [];
    } catch {
      return [];
    }
  })(),
};

export const authSlice = createSlice({
  name: "authSlice",

  initialState,

  reducers: {
    /**
     * Mở / đóng Auth Modal
     */
    updateModal: (state, action: PayloadAction<boolean>) => {
      state.modalOpen = action.payload;
    },

    /**
     * Chuyển giữa Login / Register
     */
    setAuthMode: (state, action: PayloadAction<AuthMode>) => {
      state.authMode = action.payload;
    },

    /**
     * Đăng nhập thành công
     */
    doLogin: (state, action: PayloadAction<LoginProps>) => {
      if (action.payload.userInfo) {
        localStorage.setItem(
          "userInfo",
          JSON.stringify(action.payload.userInfo),
        );

        return {
          ...state,
          modalOpen: false,
          authMode: "login",
          userInfo: action.payload.userInfo,
        };
      }

      return state;
    },

    /**
     * Đăng xuất
     */
    doLogout: (state) => {
      localStorage.removeItem("userInfo");
      localStorage.removeItem("username");

      return {
        ...state,
        userInfo: [],
        username: "",
        modalOpen: false,
        authMode: "login",
      };
    },

    /**
     * Lấy thông tin user hiện tại
     */
    getUserInfo: (state) => {
      return { ...state };
    },
  },
});

export const { updateModal, setAuthMode, doLogin, doLogout, getUserInfo } =
  authSlice.actions;

export default authSlice.reducer;
