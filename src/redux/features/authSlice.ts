import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AuthSlice } from "../../models/AuthSlice";

interface LoginProps {
  username: string;
  password: string;
  id: string;
  userInfo: any[];
}

const initialState: AuthSlice = {
  modalOpen: false,
  username: localStorage.getItem("username") ?? "",
  userInfo: [],
};

export const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    updateModal: (state, action: PayloadAction<boolean>) => {
      return { ...state, modalOpen: action.payload };
    },
    doLogin: (state, action: PayloadAction<LoginProps>) => {
      if (action.payload.userInfo) {
        return {
          ...state,
          modalOpen: false,
          userInfo: action.payload.userInfo,
        };
      } else {
        return state;
      }
    },
    doLogout: (state) => {
      return { ...state, userInfo: [] };
    },
    getUserInfo: (state) => {
      return { ...state };
    },
  },
});

export const { updateModal, doLogin, doLogout, getUserInfo } =
  authSlice.actions;
export default authSlice.reducer;
