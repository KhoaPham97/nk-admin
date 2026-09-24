import { FC } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { updateBanner } from "../redux/features/homeSlice";

const BannerPopup: FC = () => {
  const show = useAppSelector((state) => state.homeReducer.isBannerVisible);
  const dispatch = useAppDispatch();

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 transition-opacity duration-300 ${
        show ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="relative">
        <img
          src="/images/51ead272-e1ae-4852-b2ff-0e3f6739b6f5.jpg"
          alt="banner"
          className="w-[50vw] min-w-[300px] m-auto"
        />
        <button
          onClick={() => {
            dispatch(updateBanner(false));
            localStorage.setItem("isBannerVisibleClosed", "true");
          }}
          className="absolute top-0 right-0 m-2 bg-white rounded-full p-2"
        >
          ✖
        </button>
      </div>
    </div>
  );
};

export default BannerPopup;
