import { FC, FormEvent, useState } from "react";
import { useAppSelector, useAppDispatch } from "../redux/hooks";
import { doLogin, updateModal } from "../redux/features/authSlice";
import { addListCart } from "../redux/features/cartSlice";

import { FaUnlock } from "react-icons/fa";
import { RiLockPasswordFill, RiUser3Fill } from "react-icons/ri";
import { GiArchiveRegister } from "react-icons/gi";
import { RxCross1 } from "react-icons/rx";
import { API_ENDPOINTS } from "../api";

const LoginModal: FC = () => {
  const [clicked, setClicked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignUp]: any = useState({
    password: "",
    username: "",
  });

  const dispatch = useAppDispatch();
  const open = useAppSelector((state) => state.authReducer.modalOpen);

  const submitForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetch(`${API_ENDPOINTS.SIGNIN}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    })
      .then((res) => res.json())
      .then(async (rep) => {
        if (rep.username && rep._id) {
          dispatch(addListCart(rep.cart ?? []));
          dispatch(doLogin({ username, password, id: rep._id, userInfo: rep }));
        }
      });
  };
  const signUpForm = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetch(`${API_ENDPOINTS.SIGNUP}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(signup),
    })
      .then((res) => res.json())
      .then((rep) => {
        if (rep) {
          dispatch(
            doLogin({
              username: rep.username,
              password: signup.password,
              id: rep._id,
              userInfo: rep,
            })
          );
        }
      });
  };
  if (open) {
    return (
      <div className="bg-[#0000007d] w-full min-h-screen fixed inset-0 z-30 flex items-center justify-center ">
        <div
          className="relative border shadow rounded p-8 bg-white max-w-md w-full z-40 dark:bg-slate-800 dark:text-white"
          data-test="login-container"
        >
          <RxCross1
            className="absolute cursor-pointer right-5 top-5 hover:opacity-85"
            onClick={() => dispatch(updateModal(false))}
          />
          {clicked ? (
            <>
              <div className="flex mb-2 space-x-2 justify-center items-center">
                <GiArchiveRegister />
                <h3 className="font-bold text-center text-xl">Đăng Ký</h3>
                <GiArchiveRegister />
              </div>
              <form onSubmit={signUpForm} className="flex flex-col space-y-3">
                <div className="relative">
                  <input
                    data-test="input-username"
                    type="text"
                    placeholder="Nhập Username"
                    className="border w-full border-black py-2 px-8 rounded dark:bg-slate-600"
                    value={signup.username}
                    onChange={(e) =>
                      setSignUp({ ...signup, username: e.target.value })
                    }
                  />
                  <RiUser3Fill className="absolute top-3 left-2 text-lg" />
                </div>
                <div className="relative">
                  <input
                    data-test="input-password"
                    value={signup.password}
                    onChange={(e) =>
                      setSignUp({ ...signup, password: e.target.value })
                    }
                    type="password"
                    placeholder="Nhập mật khẩu"
                    className="border w-full border-black py-2 px-8 rounded dark:bg-slate-600"
                  />
                  <RiLockPasswordFill className="absolute top-3 left-2 text-lg" />
                </div>
                <input
                  data-test="input-submit"
                  type="submit"
                  value="Submit"
                  className="bg-blue-500 text-white rounded p-2 hover:bg-blue-700 cursor-pointer"
                />
              </form>
            </>
          ) : (
            <>
              <div className="flex mb-2 space-x-2 justify-center items-center">
                <FaUnlock />
                <h3 className="font-bold text-center text-2xl">Đăng Nhập</h3>
                <FaUnlock />
              </div>
              <form onSubmit={submitForm} className="flex flex-col space-y-3">
                <div className="relative">
                  <input
                    data-test="input-username"
                    type="text"
                    placeholder="Vui lòng nhập username"
                    className="border w-full border-black py-2 px-8 rounded dark:bg-slate-600"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <RiUser3Fill className="absolute top-3 left-2 text-lg" />
                </div>
                <div className="relative">
                  <input
                    data-test="input-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder="Vui lòng nhập mật khẩu"
                    className="border w-full border-black py-2 px-8 rounded dark:bg-slate-600"
                  />
                  <RiLockPasswordFill className="absolute top-3 left-2 text-lg" />
                </div>
                <input
                  data-test="input-submit"
                  type="submit"
                  value="Xác nhận"
                  className="bg-blue-500 text-white rounded p-2 hover:bg-blue-700 cursor-pointer"
                />
              </form>
              <p className="text-center mt-1">
                Chưa có tài khoản?{" "}
                <span
                  className="text-blue-500 cursor-pointer"
                  onClick={() => setClicked(true)}
                >
                  Đăng Ký
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
};

export default LoginModal;
