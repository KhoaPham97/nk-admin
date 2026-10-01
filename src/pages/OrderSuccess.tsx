import React from "react";
import { Link, useParams } from "react-router-dom";
import { FiCheck, FiHome, FiPackage } from "react-icons/fi";

const OrderSuccess: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-sm border p-8 md:p-10 text-center">
          {/* SUCCESS ICON */}
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
              <FiCheck className="text-white text-3xl" />
            </div>
          </div>

          {/* TITLE */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-6">
            Đặt hàng thành công!
          </h1>

          <p className="text-gray-500 mt-3 leading-relaxed">
            Cảm ơn bạn đã mua hàng tại{" "}
            <span className="font-semibold text-gray-900">Nhật Khang Bike</span>
            .
            <br />
            Chúng tôi sẽ liên hệ với bạn để xác nhận đơn hàng.
          </p>

          {/* ORDER CODE */}
          {id && (
            <div className="mt-6 bg-gray-50 rounded-xl p-5 border">
              <p className="text-sm text-gray-500">Mã đơn hàng</p>

              <p className="text-xl font-bold text-gray-900 mt-1 break-all">
                {id}
              </p>
            </div>
          )}

          {/* STATUS */}
          <div className="mt-6 text-left space-y-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <FiCheck className="text-green-600" />
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  Đơn hàng đã được tiếp nhận
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Nhật Khang Bike đang xử lý đơn hàng của bạn.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FiPackage className="text-gray-600" />
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  Chuẩn bị giao hàng
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Đơn hàng sẽ được bàn giao cho đơn vị vận chuyển.
                </p>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
            {id && (
              <Link
                to={`/account/orders/${id}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-black text-white py-3.5 font-semibold hover:bg-gray-800 transition"
              >
                <FiPackage />
                Xem đơn hàng
              </Link>
            )}

            <Link
              to="/"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-3.5 font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              <FiHome />
              Về trang chủ
            </Link>
          </div>
        </div>

        {/* SUPPORT */}
        <div className="text-center mt-5 text-sm text-gray-500">
          Cần hỗ trợ? Liên hệ Nhật Khang Bike để được tư vấn.
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
