import { FC, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import axios from "axios";
import { useAppDispatch } from "../redux/hooks";

import {
  AiOutlineArrowLeft,
  AiOutlineUser,
  AiOutlinePhone,
  AiOutlineMail,
  AiOutlineHome,
  AiOutlineLock,
  AiOutlineEye,
  AiOutlineEyeInvisible,
  AiOutlineShopping,
  AiOutlineDollarCircle,
  AiOutlineCreditCard,
  AiOutlineFileText,
  AiOutlineLogout,
  AiOutlineEdit,
  AiOutlineCheck,
  AiOutlineClose,
  AiOutlineReload,
} from "react-icons/ai";
import { AiOutlineUserSwitch } from "react-icons/ai";
import { FaUser } from "react-icons/fa";
import { clearCart } from "../redux/features/cartSlice";
import { API_ENDPOINTS } from "../api";
/* =========================================================
   API
========================================================= */

const API_URL = API_ENDPOINTS.CUSTOMERS;

/* =========================================================
   TYPES
========================================================= */

interface CustomerInfo {
  _id?: string;
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  username?: string;
  status?: string;

  totalOrders?: number;
  totalSpent?: number;
  totalPurchased?: number;
  totalPaid?: number;
  debt?: number;

  note?: string;

  lastLoginAt?: string;
  created_at?: string;
  updated_at?: string;
}

interface OrderItem {
  _id?: string;
  product?: string;
  productId?: string;
  name?: string;
  title?: string;
  variant?: string;
  variantName?: string;
  quantity?: number;
  qty?: number;
  price?: number;
  total?: number;
}

interface CustomerOrder {
  _id?: string;
  orderCode?: string;
  code?: string;

  customer?: string;
  customerId?: string;

  items?: OrderItem[];

  total?: number;
  totalAmount?: number;
  grandTotal?: number;

  subtotal?: number;
  shippingFee?: number;

  status?: string;

  paymentMethod?: string;
  paymentStatus?: string;

  paidAmount?: number;
  debt?: number;

  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerResponse {
  success?: boolean;
  customer?: CustomerInfo;
  data?: CustomerInfo;
  message?: string;
}

interface OrdersResponse {
  success?: boolean;
  orders?: CustomerOrder[];
  data?: CustomerOrder[];
  total?: number;
  message?: string;
}

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (value: number | string | undefined | null) => {
  const numberValue = Number(value || 0);

  return numberValue.toLocaleString("vi-VN") + " ₫";
};

const formatDate = (value: string | undefined | null) => {
  if (!value) {
    return "Chưa cập nhật";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Chưa cập nhật";
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getOrderCode = (order: CustomerOrder) => {
  return order.orderCode || order.code || order._id || "Đơn hàng";
};

const getOrderTotal = (order: CustomerOrder) => {
  return Number(
    order.total ?? order.totalAmount ?? order.grandTotal ?? order.subtotal ?? 0,
  );
};

const getStatusText = (status?: string) => {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "Chờ xác nhận";

    case "confirmed":
      return "Đã xác nhận";

    case "processing":
      return "Đang xử lý";

    case "shipping":
      return "Đang giao hàng";

    case "completed":
      return "Hoàn thành";

    case "cancelled":
      return "Đã hủy";

    default:
      return status || "Chưa xác định";
  }
};

const getStatusClass = (status?: string) => {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";

    case "confirmed":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "processing":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "shipping":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "completed":
      return "bg-green-50 text-green-700 border-green-200";

    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const getPaymentMethodText = (method?: string) => {
  switch (String(method || "").toLowerCase()) {
    case "cash":
      return "Tiền mặt";

    case "transfer":
      return "Chuyển khoản";

    case "cod":
      return "COD";

    case "debt":
      return "Công nợ";

    default:
      return method || "Chưa xác định";
  }
};

/* =========================================================
   COMPONENT
========================================================= */

const Account: FC = () => {
  const navigate = useNavigate();

  /* =======================================================
     CUSTOMER
  ======================================================= */

  const [customer, setCustomer] = useState<CustomerInfo | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  /* =======================================================
     ORDERS
  ======================================================= */

  const [orders, setOrders] = useState<CustomerOrder[]>([]);

  const [ordersLoading, setOrdersLoading] = useState(false);

  /* =======================================================
     EDIT
  ======================================================= */

  const [isEditing, setIsEditing] = useState(false);

  const [savingProfile, setSavingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  /* =======================================================
     PASSWORD
  ======================================================= */

  const [showOldPassword, setShowOldPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [changingPassword, setChangingPassword] = useState(false);

  /* =======================================================
     MESSAGE
  ======================================================= */

  const [message, setMessage] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  /* =======================================================
     PASSWORD SECTION
  ======================================================= */

  const [showPasswordSection, setShowPasswordSection] = useState(false);

  /* =======================================================
     GET TOKEN
  ======================================================= */

  const getToken = () => {
    return (
      localStorage.getItem("customerToken") ||
      localStorage.getItem("customerAccessToken")
    );
  };
  const dispatch = useAppDispatch();

  /* =======================================================
     GET CUSTOMER LOCAL STORAGE
  ======================================================= */

  const loadCustomerFromStorage = () => {
    try {
      const token = getToken();

      const customerData = localStorage.getItem("customer");

      if (!token || !customerData) {
        navigate("/login", {
          replace: true,
          state: {
            from: "/account",
          },
        });

        return null;
      }

      const parsed = JSON.parse(customerData) as CustomerInfo;

      setCustomer(parsed);

      setProfileForm({
        name: parsed.name || "",
        phone: parsed.phone || "",
        email: parsed.email || "",
        address: parsed.address || "",
      });

      return parsed;
    } catch (error) {
      console.error("Không thể đọc customer:", error);

      localStorage.removeItem("customer");

      navigate("/login", {
        replace: true,
        state: {
          from: "/account",
        },
      });

      return null;
    }
  };

  /* =======================================================
     FETCH CUSTOMER
     
     API này hỗ trợ nếu BE đã có.
     Nếu API chưa có thì vẫn sử dụng localStorage.
  ======================================================= */

  const fetchCustomer = async (customerId?: string) => {
    const token = getToken();

    if (!token) {
      return;
    }

    try {
      if (!customerId) {
        return;
      }

      const response = await axios.get<CustomerResponse>(
        `${API_URL}/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const responseCustomer = response.data?.customer || response.data?.data;

      if (!responseCustomer) {
        return;
      }

      setCustomer(responseCustomer);

      setProfileForm({
        name: responseCustomer.name || "",
        phone: responseCustomer.phone || "",
        email: responseCustomer.email || "",
        address: responseCustomer.address || "",
      });

      localStorage.setItem("customer", JSON.stringify(responseCustomer));
    } catch (error) {
      /*
       * Không báo lỗi nếu API chưa được triển khai.
       * Trang vẫn sử dụng dữ liệu localStorage.
       */

      console.warn("Không thể đồng bộ customer từ API:", error);
    }
  };

  /* =======================================================
     FETCH ORDERS
  ======================================================= */

  const fetchOrders = async (customerId?: string) => {
    if (!customerId) {
      return;
    }

    const token = getToken();

    if (!token) {
      return;
    }

    setOrdersLoading(true);

    try {
      const response = await axios.get<OrdersResponse>(
        `${API_URL}/${customerId}/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const responseOrders = response.data?.orders || response.data?.data || [];

      setOrders(Array.isArray(responseOrders) ? responseOrders : []);
    } catch (error) {
      console.warn("Không thể tải đơn hàng:", error);

      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const localCustomer = loadCustomerFromStorage();

      if (localCustomer?._id) {
        await fetchCustomer(localCustomer._id);

        await fetchOrders(localCustomer._id);
      }

      setLoading(false);
    };

    init();
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    if (!customer?._id) {
      return;
    }

    setRefreshing(true);

    setMessage("");
    setErrorMessage("");

    try {
      await fetchCustomer(customer._id);

      await fetchOrders(customer._id);

      setMessage("Đã cập nhật thông tin tài khoản");
    } finally {
      setRefreshing(false);
    }
  };

  /* =======================================================
     STATISTICS
  ======================================================= */

  const statistics = useMemo(() => {
    const totalOrders = Number(customer?.totalOrders || 0);

    const totalSpent = Number(
      customer?.totalSpent ?? customer?.totalPurchased ?? 0,
    );

    const totalPaid = Number(customer?.totalPaid || 0);

    const debt = Number(customer?.debt || 0);

    return {
      totalOrders,
      totalSpent,
      totalPaid,
      debt,
    };
  }, [customer]);

  /* =======================================================
     EDIT PROFILE
  ======================================================= */

  const handleStartEdit = () => {
    if (!customer) {
      return;
    }

    setProfileForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });

    setMessage("");
    setErrorMessage("");

    setIsEditing(true);
  };

  /* =======================================================
     CANCEL EDIT
  ======================================================= */

  const handleCancelEdit = () => {
    if (customer) {
      setProfileForm({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        address: customer.address || "",
      });
    }

    setIsEditing(false);
  };

  /* =======================================================
     PROFILE INPUT
  ======================================================= */

  const handleProfileChange = (
    field: "name" | "phone" | "email" | "address",
    value: string,
  ) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* =======================================================
     SAVE PROFILE
  ======================================================= */

  const handleSaveProfile = async () => {
    if (!customer?._id) {
      return;
    }

    if (!profileForm.name.trim()) {
      setErrorMessage("Vui lòng nhập họ tên");

      return;
    }

    setSavingProfile(true);

    setMessage("");
    setErrorMessage("");

    try {
      const token = getToken();

      const response = await axios.put<CustomerResponse>(
        `${API_URL}/api/customers/${customer._id}`,
        {
          name: profileForm.name.trim(),
          phone: profileForm.phone.trim(),
          email: profileForm.email.trim(),
          address: profileForm.address.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const updatedCustomer = response.data?.customer || response.data?.data;

      if (updatedCustomer) {
        setCustomer(updatedCustomer);

        localStorage.setItem("customer", JSON.stringify(updatedCustomer));
      } else {
        const updated = {
          ...customer,
          ...profileForm,
        };

        setCustomer(updated);

        localStorage.setItem("customer", JSON.stringify(updated));
      }

      setIsEditing(false);

      setMessage("Cập nhật thông tin thành công");
    } catch (error: any) {
      console.error("handleSaveProfile:", error);

      setErrorMessage(
        error?.response?.data?.message || "Không thể cập nhật thông tin",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  /* =======================================================
     PASSWORD INPUT
  ======================================================= */

  const handlePasswordChange = (
    field: "oldPassword" | "newPassword" | "confirmPassword",
    value: string,
  ) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /* =======================================================
     CHANGE PASSWORD
  ======================================================= */

  const handleChangePassword = async () => {
    if (!customer?._id) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    const oldPassword = passwordForm.oldPassword.trim();

    const newPassword = passwordForm.newPassword.trim();

    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!oldPassword) {
      setErrorMessage("Vui lòng nhập mật khẩu hiện tại");

      return;
    }

    if (!newPassword) {
      setErrorMessage("Vui lòng nhập mật khẩu mới");

      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Mật khẩu mới phải có ít nhất 6 ký tự");

      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Mật khẩu xác nhận không khớp");

      return;
    }

    setChangingPassword(true);

    try {
      const token = getToken();

      await axios.put(
        `${API_URL}/api/customers/${customer._id}/password`,
        {
          oldPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswordSection(false);

      setMessage("Đổi mật khẩu thành công");
    } catch (error: any) {
      console.error("handleChangePassword:", error);

      setErrorMessage(
        error?.response?.data?.message || "Không thể đổi mật khẩu",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    localStorage.removeItem("customerToken");

    localStorage.removeItem("customerAccessToken");

    localStorage.removeItem("customer");

    localStorage.removeItem("customerUsername");
    dispatch(clearCart());

    localStorage.removeItem("cartItems");
    localStorage.removeItem("cart");
    navigate("/login", {
      replace: true,
    });
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div
        className="
          min-h-[70vh]
          bg-gray-50
          px-4
          py-10
          dark:bg-slate-950
        "
      >
        <div
          className="
            mx-auto
            max-w-6xl
          "
        >
          <div
            className="
              animate-pulse
              space-y-5
            "
          >
            <div
              className="
                h-32
                rounded-2xl
                bg-gray-200
                dark:bg-slate-800
              "
            />

            <div
              className="
                h-40
                rounded-2xl
                bg-gray-200
                dark:bg-slate-800
              "
            />

            <div
              className="
                h-60
                rounded-2xl
                bg-gray-200
                dark:bg-slate-800
              "
            />
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     NO CUSTOMER
  ======================================================= */

  if (!customer) {
    return (
      <div
        className="
          flex
          min-h-[70vh]
          items-center
          justify-center
          bg-gray-50
          px-4
          dark:bg-slate-950
        "
      >
        <div
          className="
            w-full
            max-w-md
            rounded-2xl
            bg-white
            p-8
            text-center
            shadow-sm
            dark:bg-slate-900
          "
        >
          <div
            className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-full
              bg-blue-50
              text-blue-600
              dark:bg-blue-950
            "
          >
            <FaUser size={25} />
          </div>

          <h2
            className="
              mt-4
              text-lg
              font-bold
              text-gray-900
              dark:text-white
            "
          >
            Chưa đăng nhập
          </h2>

          <p
            className="
              mt-2
              text-sm
              text-gray-500
              dark:text-gray-400
            "
          >
            Vui lòng đăng nhập để xem thông tin tài khoản.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/login", {
                state: {
                  from: "/account",
                },
              })
            }
            className="
              mt-6
              w-full
              rounded-xl
              bg-blue-600
              py-3
              text-sm
              font-bold
              text-white
              hover:bg-blue-700
            "
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <main
      className="
        min-h-screen
        bg-gray-50
        px-4
        py-6
        dark:bg-slate-950
        sm:px-6
        lg:px-8
      "
    >
      <div
        className="
          mx-auto
          max-w-6xl
        "
      >
        {/* ===================================================
            TOP BAR
        =================================================== */}

        <div
          className="
            mb-6
            flex
            flex-wrap
            items-center
            justify-between
            gap-3
          "
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              flex
              items-center
              gap-2
              rounded-xl
              px-3
              py-2
              text-sm
              font-semibold
              text-gray-600
              transition
              hover:bg-white
              hover:text-blue-600
              dark:text-gray-300
              dark:hover:bg-slate-900
            "
          >
            <AiOutlineArrowLeft size={18} />

            <span>Quay lại</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-gray-200
                bg-white
                px-3
                py-2
                text-sm
                font-semibold
                text-gray-700
                transition
                hover:border-blue-200
                hover:text-blue-600
                disabled:cursor-not-allowed
                disabled:opacity-50
                dark:border-slate-700
                dark:bg-slate-900
                dark:text-gray-200
              "
            >
              <AiOutlineReload
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />

              <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-red-200
                bg-white
                px-3
                py-2
                text-sm
                font-semibold
                text-red-500
                transition
                hover:bg-red-50
                dark:border-red-900
                dark:bg-slate-900
              "
            >
              <AiOutlineLogout size={17} />

              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* ===================================================
            MESSAGE
        =================================================== */}

        {message && (
          <div
            className="
              mb-5
              flex
              items-center
              gap-3
              rounded-xl
              border
              border-green-200
              bg-green-50
              px-4
              py-3
              text-sm
              font-medium
              text-green-700
              dark:border-green-900
              dark:bg-green-950/30
              dark:text-green-400
            "
          >
            <AiOutlineCheck size={19} />

            <span>{message}</span>
          </div>
        )}

        {errorMessage && (
          <div
            className="
              mb-5
              flex
              items-center
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              font-medium
              text-red-700
              dark:border-red-900
              dark:bg-red-950/30
              dark:text-red-400
            "
          >
            <AiOutlineClose size={19} />

            <span>{errorMessage}</span>
          </div>
        )}

        {/* ===================================================
            ACCOUNT HEADER
        =================================================== */}

        <section
          className="
            relative
            overflow-hidden
            rounded-3xl
            bg-gradient-to-r
            from-blue-700
            via-blue-600
            to-blue-500
            p-6
            shadow-sm
            sm:p-8
          "
        >
          <div
            className="
              absolute
              -right-16
              -top-20
              h-48
              w-48
              rounded-full
              bg-white/10
            "
          />

          <div
            className="
              absolute
              -bottom-24
              right-20
              h-48
              w-48
              rounded-full
              bg-white/10
            "
          />

          <div
            className="
              relative
              flex
              flex-col
              gap-5
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex items-center gap-4">
              <div
                className="
                  flex
                  h-16
                  w-16
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-white/20
                  text-white
                  ring-1
                  ring-white/30
                  sm:h-20
                  sm:w-20
                "
              >
                <FaUser size={30} />
              </div>

              <div className="min-w-0">
                <p
                  className="
                    text-sm
                    font-medium
                    text-blue-100
                  "
                >
                  Tài khoản khách hàng
                </p>

                <h1
                  className="
                    mt-1
                    truncate
                    text-xl
                    font-black
                    text-white
                    sm:text-2xl
                  "
                >
                  {customer.name || customer.username || "Khách hàng"}
                </h1>

                {customer.username && (
                  <p
                    className="
                      mt-1
                      truncate
                      text-sm
                      text-blue-100
                    "
                  >
                    @{customer.username}
                  </p>
                )}
              </div>
            </div>

            <div
              className="
                rounded-2xl
                bg-white/10
                px-4
                py-3
                backdrop-blur-sm
              "
            >
              <p
                className="
                  text-xs
                  text-blue-100
                "
              >
                Trạng thái tài khoản
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span
                  className="
                    h-2.5
                    w-2.5
                    rounded-full
                    bg-green-300
                  "
                />

                <span
                  className="
                    text-sm
                    font-bold
                    text-white
                  "
                >
                  {customer.status === "blocked" ? "Đã khóa" : "Đang hoạt động"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            STATISTICS
        =================================================== */}

        <section
          className="
            mt-5
            grid
            grid-cols-2
            gap-3
            lg:grid-cols-4
          "
        >
          {/* ORDERS */}

          <div
            className="
              rounded-2xl
              border
              border-gray-100
              bg-white
              p-4
              shadow-sm
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
                dark:bg-blue-950
              "
            >
              <AiOutlineShopping size={21} />
            </div>

            <p
              className="
                mt-3
                text-xs
                text-gray-500
                dark:text-gray-400
              "
            >
              Tổng đơn hàng
            </p>

            <p
              className="
                mt-1
                text-xl
                font-black
                text-gray-900
                dark:text-white
              "
            >
              {statistics.totalOrders}
            </p>
          </div>

          {/* SPENT */}

          <div
            className="
              rounded-2xl
              border
              border-gray-100
              bg-white
              p-4
              shadow-sm
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-purple-50
                text-purple-600
                dark:bg-purple-950
              "
            >
              <AiOutlineDollarCircle size={21} />
            </div>

            <p
              className="
                mt-3
                text-xs
                text-gray-500
                dark:text-gray-400
              "
            >
              Tổng tiền mua
            </p>

            <p
              className="
                mt-1
                truncate
                text-lg
                font-black
                text-gray-900
                dark:text-white
              "
            >
              {formatMoney(statistics.totalSpent)}
            </p>
          </div>

          {/* PAID */}

          <div
            className="
              rounded-2xl
              border
              border-gray-100
              bg-white
              p-4
              shadow-sm
              dark:border-slate-800
              dark:bg-slate-900
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-green-50
                text-green-600
                dark:bg-green-950
              "
            >
              <AiOutlineCreditCard size={21} />
            </div>

            <p
              className="
                mt-3
                text-xs
                text-gray-500
                dark:text-gray-400
              "
            >
              Đã thanh toán
            </p>

            <p
              className="
                mt-1
                truncate
                text-lg
                font-black
                text-green-600
              "
            >
              {formatMoney(statistics.totalPaid)}
            </p>
          </div>

          {/* DEBT */}

          <div
            className="
              rounded-2xl
              border
              border-red-100
              bg-red-50
              p-4
              shadow-sm
              dark:border-red-950
              dark:bg-red-950/20
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-red-100
                text-red-600
                dark:bg-red-950
              "
            >
              <AiOutlineFileText size={21} />
            </div>

            <p
              className="
                mt-3
                text-xs
                text-red-500
              "
            >
              Công nợ
            </p>

            <p
              className="
                mt-1
                truncate
                text-lg
                font-black
                text-red-600
              "
            >
              {formatMoney(statistics.debt)}
            </p>
          </div>
        </section>

        {/* ===================================================
            PERSONAL INFORMATION
        =================================================== */}

        <section
          className="
            mt-5
            rounded-2xl
            border
            border-gray-100
            bg-white
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          {/* HEADER */}

          <div
            className="
              flex
              flex-wrap
              items-center
              justify-between
              gap-3
              border-b
              border-gray-100
              px-5
              py-4
              dark:border-slate-800
            "
          >
            <div>
              <h2
                className="
                  text-base
                  font-bold
                  text-gray-900
                  dark:text-white
                "
              >
                Thông tin cá nhân
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Thông tin sử dụng cho đơn hàng
              </p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="
                  flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  px-3
                  py-2
                  text-sm
                  font-bold
                  text-blue-600
                  hover:bg-blue-100
                  dark:border-blue-900
                  dark:bg-blue-950
                "
              >
                <AiOutlineEdit size={17} />
                Chỉnh sửa
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={savingProfile}
                  className="
                    flex
                    items-center
                    gap-1.5
                    rounded-xl
                    border
                    border-gray-200
                    px-3
                    py-2
                    text-sm
                    font-semibold
                    text-gray-600
                    hover:bg-gray-50
                    dark:border-slate-700
                    dark:text-gray-300
                  "
                >
                  <AiOutlineClose size={16} />
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="
                    flex
                    items-center
                    gap-1.5
                    rounded-xl
                    bg-blue-600
                    px-3
                    py-2
                    text-sm
                    font-bold
                    text-white
                    hover:bg-blue-700
                    disabled:opacity-50
                  "
                >
                  <AiOutlineCheck size={16} />

                  {savingProfile ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            )}
          </div>

          {/* BODY */}

          <div
            className="
              grid
              grid-cols-1
              gap-5
              p-5
              md:grid-cols-2
            "
          >
            {/* NAME */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-gray-500
                "
              >
                Họ và tên
              </label>

              {isEditing ? (
                <input
                  value={profileForm.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    text-sm
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-white
                  "
                  placeholder="Nhập họ và tên"
                />
              ) : (
                <div
                  className="
                    flex
                    min-h-11
                    items-center
                    gap-3
                    rounded-xl
                    bg-gray-50
                    px-4
                    dark:bg-slate-800
                  "
                >
                  <AiOutlineUser className="text-blue-600" size={19} />

                  <span
                    className="
                      text-sm
                      font-semibold
                      text-gray-800
                      dark:text-white
                    "
                  >
                    {customer.name || "Chưa cập nhật"}
                  </span>
                </div>
              )}
            </div>

            {/* USERNAME */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-gray-500
                "
              >
                Username
              </label>

              <div
                className="
                  flex
                  min-h-11
                  items-center
                  gap-3
                  rounded-xl
                  bg-gray-100
                  px-4
                  dark:bg-slate-800
                "
              >
                <AiOutlineUserSwitch className="text-gray-400" size={19} />

                <span
                  className="
                    text-sm
                    font-semibold
                    text-gray-700
                    dark:text-gray-200
                  "
                >
                  {customer.username || "Chưa cập nhật"}
                </span>
              </div>

              <p
                className="
                  mt-1
                  text-[10px]
                  text-gray-400
                "
              >
                Username không thể thay đổi
              </p>
            </div>

            {/* PHONE */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-gray-500
                "
              >
                Số điện thoại
              </label>

              {isEditing ? (
                <input
                  value={profileForm.phone}
                  onChange={(e) => handleProfileChange("phone", e.target.value)}
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    text-sm
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-white
                  "
                  placeholder="Nhập số điện thoại"
                />
              ) : (
                <div
                  className="
                    flex
                    min-h-11
                    items-center
                    gap-3
                    rounded-xl
                    bg-gray-50
                    px-4
                    dark:bg-slate-800
                  "
                >
                  <AiOutlinePhone className="text-blue-600" size={19} />

                  <span
                    className="
                      text-sm
                      font-semibold
                      text-gray-800
                      dark:text-white
                    "
                  >
                    {customer.phone || "Chưa cập nhật"}
                  </span>
                </div>
              )}
            </div>

            {/* EMAIL */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-gray-500
                "
              >
                Email
              </label>

              {isEditing ? (
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                  className="
                    h-11
                    w-full
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    text-sm
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-white
                  "
                  placeholder="Nhập email"
                />
              ) : (
                <div
                  className="
                    flex
                    min-h-11
                    items-center
                    gap-3
                    rounded-xl
                    bg-gray-50
                    px-4
                    dark:bg-slate-800
                  "
                >
                  <AiOutlineMail className="text-blue-600" size={19} />

                  <span
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-gray-800
                      dark:text-white
                    "
                  >
                    {customer.email || "Chưa cập nhật"}
                  </span>
                </div>
              )}
            </div>

            {/* ADDRESS */}

            <div className="md:col-span-2">
              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-semibold
                  text-gray-500
                "
              >
                Địa chỉ
              </label>

              {isEditing ? (
                <textarea
                  value={profileForm.address}
                  onChange={(e) =>
                    handleProfileChange("address", e.target.value)
                  }
                  rows={3}
                  className="
                    w-full
                    resize-none
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    px-4
                    py-3
                    text-sm
                    outline-none
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                    dark:border-slate-700
                    dark:bg-slate-800
                    dark:text-white
                  "
                  placeholder="Nhập địa chỉ"
                />
              ) : (
                <div
                  className="
                    flex
                    min-h-11
                    items-start
                    gap-3
                    rounded-xl
                    bg-gray-50
                    px-4
                    py-3
                    dark:bg-slate-800
                  "
                >
                  <AiOutlineHome
                    className="
                      mt-0.5
                      shrink-0
                      text-blue-600
                    "
                    size={19}
                  />

                  <span
                    className="
                      text-sm
                      font-semibold
                      leading-6
                      text-gray-800
                      dark:text-white
                    "
                  >
                    {customer.address || "Chưa cập nhật"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================
            PASSWORD
        =================================================== */}

        <section
          className="
            mt-5
            rounded-2xl
            border
            border-gray-100
            bg-white
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
              px-5
              py-4
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-50
                  text-orange-600
                  dark:bg-orange-950
                "
              >
                <AiOutlineLock size={20} />
              </div>

              <div>
                <h2
                  className="
                    text-base
                    font-bold
                    text-gray-900
                    dark:text-white
                  "
                >
                  Bảo mật tài khoản
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-gray-500
                    dark:text-gray-400
                  "
                >
                  Thay đổi mật khẩu đăng nhập
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="
                rounded-xl
                bg-orange-50
                px-3
                py-2
                text-sm
                font-bold
                text-orange-600
                hover:bg-orange-100
                dark:bg-orange-950
              "
            >
              {showPasswordSection ? "Đóng" : "Đổi mật khẩu"}
            </button>
          </div>

          {showPasswordSection && (
            <div
              className="
                border-t
                border-gray-100
                p-5
                dark:border-slate-800
              "
            >
              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  md:grid-cols-3
                "
              >
                {/* OLD */}

                <div>
                  <label
                    className="
                      mb-2
                      block
                      text-xs
                      font-semibold
                      text-gray-500
                    "
                  >
                    Mật khẩu hiện tại
                  </label>

                  <div className="relative">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      value={passwordForm.oldPassword}
                      onChange={(e) =>
                        handlePasswordChange("oldPassword", e.target.value)
                      }
                      className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-gray-200
                        bg-white
                        px-4
                        pr-11
                        text-sm
                        outline-none
                        focus:border-blue-500
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-white
                      "
                      placeholder="Mật khẩu hiện tại"
                    />

                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="
                        absolute
                        right-2
                        top-1/2
                        flex
                        h-8
                        w-8
                        -translate-y-1/2
                        items-center
                        justify-center
                        text-gray-400
                      "
                    >
                      {showOldPassword ? (
                        <AiOutlineEyeInvisible size={19} />
                      ) : (
                        <AiOutlineEye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {/* NEW */}

                <div>
                  <label
                    className="
                      mb-2
                      block
                      text-xs
                      font-semibold
                      text-gray-500
                    "
                  >
                    Mật khẩu mới
                  </label>

                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        handlePasswordChange("newPassword", e.target.value)
                      }
                      className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-gray-200
                        bg-white
                        px-4
                        pr-11
                        text-sm
                        outline-none
                        focus:border-blue-500
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-white
                      "
                      placeholder="Mật khẩu mới"
                    />

                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="
                        absolute
                        right-2
                        top-1/2
                        flex
                        h-8
                        w-8
                        -translate-y-1/2
                        items-center
                        justify-center
                        text-gray-400
                      "
                    >
                      {showNewPassword ? (
                        <AiOutlineEyeInvisible size={19} />
                      ) : (
                        <AiOutlineEye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {/* CONFIRM */}

                <div>
                  <label
                    className="
                      mb-2
                      block
                      text-xs
                      font-semibold
                      text-gray-500
                    "
                  >
                    Xác nhận mật khẩu
                  </label>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        handlePasswordChange("confirmPassword", e.target.value)
                      }
                      className="
                        h-11
                        w-full
                        rounded-xl
                        border
                        border-gray-200
                        bg-white
                        px-4
                        pr-11
                        text-sm
                        outline-none
                        focus:border-blue-500
                        dark:border-slate-700
                        dark:bg-slate-800
                        dark:text-white
                      "
                      placeholder="Nhập lại mật khẩu"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="
                        absolute
                        right-2
                        top-1/2
                        flex
                        h-8
                        w-8
                        -translate-y-1/2
                        items-center
                        justify-center
                        text-gray-400
                      "
                    >
                      {showConfirmPassword ? (
                        <AiOutlineEyeInvisible size={19} />
                      ) : (
                        <AiOutlineEye size={19} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="
                  mt-4
                  flex
                  flex-col
                  gap-3
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <p
                  className="
                    text-xs
                    text-gray-400
                  "
                >
                  Mật khẩu phải có ít nhất 6 ký tự.
                </p>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                  className="
                    rounded-xl
                    bg-orange-500
                    px-5
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    hover:bg-orange-600
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {changingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===================================================
            ORDER HISTORY
        =================================================== */}

        <section
          className="
            mt-5
            overflow-hidden
            rounded-2xl
            border
            border-gray-100
            bg-white
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          {/* HEADER */}

          <div
            className="
              flex
              flex-wrap
              items-center
              justify-between
              gap-3
              border-b
              border-gray-100
              px-5
              py-4
              dark:border-slate-800
            "
          >
            <div>
              <h2
                className="
                  text-base
                  font-bold
                  text-gray-900
                  dark:text-white
                "
              >
                Lịch sử đơn hàng
              </h2>

              <p
                className="
                  mt-1
                  text-xs
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Các đơn hàng của bạn
              </p>
            </div>

            <span
              className="
                rounded-full
                bg-blue-50
                px-3
                py-1
                text-xs
                font-bold
                text-blue-600
                dark:bg-blue-950
              "
            >
              {orders.length} đơn
            </span>
          </div>

          {/* LOADING */}

          {ordersLoading ? (
            <div className="p-8">
              <div
                className="
                  flex
                  items-center
                  justify-center
                  gap-3
                  text-sm
                  text-gray-500
                "
              >
                <AiOutlineReload size={19} className="animate-spin" />
                Đang tải đơn hàng...
              </div>
            </div>
          ) : orders.length === 0 ? (
            /* EMPTY */

            <div
              className="
                px-5
                py-12
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-gray-100
                  text-gray-400
                  dark:bg-slate-800
                "
              >
                <AiOutlineShopping size={28} />
              </div>

              <h3
                className="
                  mt-4
                  text-sm
                  font-bold
                  text-gray-800
                  dark:text-white
                "
              >
                Chưa có đơn hàng
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-gray-500
                "
              >
                Bạn chưa có đơn hàng nào.
              </p>

              <button
                type="button"
                onClick={() => navigate("/products")}
                className="
                  mt-5
                  rounded-xl
                  bg-blue-600
                  px-5
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  hover:bg-blue-700
                "
              >
                Xem sản phẩm
              </button>
            </div>
          ) : (
            /* ORDER LIST */

            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {orders.map((order, index) => (
                <div
                  key={order._id || getOrderCode(order) || index}
                  className="
                      p-5
                      transition
                      hover:bg-gray-50
                      dark:hover:bg-slate-800/50
                    "
                >
                  {/* TOP */}

                  <div
                    className="
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                  >
                    <div>
                      <p
                        className="
                            text-sm
                            font-black
                            text-gray-900
                            dark:text-white
                          "
                      >
                        {getOrderCode(order)}
                      </p>

                      <p
                        className="
                            mt-1
                            text-xs
                            text-gray-400
                          "
                      >
                        {formatDate(order.created_at || order.createdAt)}
                      </p>
                    </div>

                    <div
                      className="
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        "
                    >
                      <span
                        className={`
                            rounded-full
                            border
                            px-2.5
                            py-1
                            text-[11px]
                            font-bold
                            ${getStatusClass(order.status)}
                          `}
                      >
                        {getStatusText(order.status)}
                      </span>

                      <span
                        className="
                            rounded-full
                            bg-gray-100
                            px-2.5
                            py-1
                            text-[11px]
                            font-semibold
                            text-gray-600
                            dark:bg-slate-800
                            dark:text-gray-300
                          "
                      >
                        {getPaymentMethodText(order.paymentMethod)}
                      </span>
                    </div>
                  </div>

                  {/* ITEMS */}

                  {order.items && order.items.length > 0 && (
                    <div
                      className="
                            mt-4
                            rounded-xl
                            bg-gray-50
                            p-3
                            dark:bg-slate-800
                          "
                    >
                      <p
                        className="
                              mb-2
                              text-[11px]
                              font-bold
                              uppercase
                              tracking-wide
                              text-gray-400
                            "
                      >
                        Sản phẩm
                      </p>

                      <div className="space-y-2">
                        {order.items.slice(0, 3).map((item, itemIndex) => (
                          <div
                            key={item._id || itemIndex}
                            className="
                                      flex
                                      items-center
                                      justify-between
                                      gap-3
                                      text-xs
                                    "
                          >
                            <div className="min-w-0">
                              <p
                                className="
                                          truncate
                                          font-semibold
                                          text-gray-700
                                          dark:text-gray-200
                                        "
                              >
                                {item.name ||
                                  item.title ||
                                  item.product ||
                                  "Sản phẩm"}
                              </p>

                              {(item.variant || item.variantName) && (
                                <p
                                  className="
                                            mt-0.5
                                            text-[10px]
                                            text-gray-400
                                          "
                                >
                                  {item.variant || item.variantName}
                                </p>
                              )}
                            </div>

                            <span
                              className="
                                        shrink-0
                                        font-semibold
                                        text-gray-600
                                        dark:text-gray-300
                                      "
                            >
                              x{Number(item.quantity ?? item.qty ?? 1)}
                            </span>
                          </div>
                        ))}

                        {order.items.length > 3 && (
                          <p
                            className="
                                  pt-1
                                  text-[10px]
                                  text-gray-400
                                "
                          >
                            +{order.items.length - 3} sản phẩm khác
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* BOTTOM */}

                  <div
                    className="
                        mt-4
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                        sm:items-end
                        sm:justify-between
                      "
                  >
                    <div className="flex gap-5">
                      <div>
                        <p
                          className="
                              text-[10px]
                              text-gray-400
                            "
                        >
                          Tổng đơn
                        </p>

                        <p
                          className="
                              mt-0.5
                              text-sm
                              font-black
                              text-blue-600
                            "
                        >
                          {formatMoney(getOrderTotal(order))}
                        </p>
                      </div>

                      {order.paidAmount !== undefined && (
                        <div>
                          <p
                            className="
                                text-[10px]
                                text-gray-400
                              "
                          >
                            Đã trả
                          </p>

                          <p
                            className="
                                mt-0.5
                                text-sm
                                font-bold
                                text-green-600
                              "
                          >
                            {formatMoney(order.paidAmount)}
                          </p>
                        </div>
                      )}

                      {order.debt !== undefined && (
                        <div>
                          <p
                            className="
                                text-[10px]
                                text-gray-400
                              "
                          >
                            Công nợ
                          </p>

                          <p
                            className="
                                mt-0.5
                                text-sm
                                font-bold
                                text-red-600
                              "
                          >
                            {formatMoney(order.debt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===================================================
            FOOTER INFO
        =================================================== */}

        <div
          className="
            mt-5
            rounded-2xl
            border
            border-blue-100
            bg-blue-50
            p-5
            dark:border-blue-950
            dark:bg-blue-950/20
          "
        >
          <div className="flex gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-blue-600
                text-white
              "
            >
              <AiOutlineFileText size={18} />
            </div>

            <div>
              <p
                className="
                  text-sm
                  font-bold
                  text-gray-800
                  dark:text-white
                "
              >
                Thông tin tài khoản
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-gray-500
                  dark:text-gray-400
                "
              >
                Thông tin mua hàng, tổng tiền và công nợ được cập nhật theo dữ
                liệu của Nhật Khang Bike.
              </p>

              {customer.created_at && (
                <p
                  className="
                    mt-2
                    text-[11px]
                    text-gray-400
                  "
                >
                  Thành viên từ: {formatDate(customer.created_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Account;
