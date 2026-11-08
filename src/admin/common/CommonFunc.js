/* eslint-disable @typescript-eslint/no-unused-vars */
export const getProductPriceRange = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const prices = variants
    .map((variant) => Number(variant?.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  // Không có variant hợp lệ -> dùng price của product
  if (prices.length === 0) {
    const price = Number(product?.price);

    if (Number.isFinite(price)) {
      return {
        min: price,
        max: price,
      };
    }

    return {
      min: 0,
      max: 0,
    };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    min,
    max,
  };
};
const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
export const getStatusLabel = (status) => {
  const statuses = {
    UNPAID: "Chưa thanh toán",
    READY_TO_SHIP: "Chờ lấy hàng",
    PROCESSED: "Đã chuẩn bị hàng",
    SHIPPED: "Đang vận chuyển",
    TO_CONFIRM_RECEIVE: "Chờ khách xác nhận nhận hàng",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    IN_CANCEL: "Đang yêu cầu hủy",
    TO_RETURN: "Yêu cầu trả hàng",
    RETRY_SHIP: "Đang giao lại",
    TO_SHIP: "Chờ bàn giao vận chuyển",
    INVOICE_PENDING: "Chờ xử lý hóa đơn",
  };

  const normalized = normalizeStatus(status);

  return (
    statuses[normalized] ||
    (status ? `Trạng thái khác (${status})` : "Không xác định")
  );
};

export const getStockLabel = (status) => {
  const statuses = {
    PENDING: "Chưa xử lý kho",
    RESERVED: "Đã giữ hàng",
    DEDUCTED: "Đã xuất kho",
    RELEASED: "Đã hoàn giữ hàng",
    PARTIAL: "Đã xuất kho một phần",
    RETURNED: "Đã nhận hàng hoàn",
    FAILED: "Lỗi xuất kho",
    READY: "Sẵn sàng xuất kho",
    UNMAPPED: "Chưa ánh xạ sản phẩm",
    PROCESSING: "Đang xử lý xuất kho",
    WAITING: "Chờ xử lý xuất kho",
    CANCELLED: "Đã hủy xử lý kho",
    SKIPPED: "Đã bỏ qua xuất kho",
    NOT_PROCESSED: "Chưa xử lý kho",
    NOT_DEDUCTED: "Chưa xuất kho",
    PARTIALLY_DEDUCTED: "Đã xuất kho một phần",
    DEDUCTION_FAILED: "Xuất kho thất bại",
    STOCK_DEDUCTED: "Đã xuất kho",
    STOCK_RESERVED: "Đã giữ hàng",
    STOCK_RELEASED: "Đã hoàn giữ hàng",
  };

  const normalized = normalizeStatus(status);

  return (
    statuses[normalized] ||
    (status ? `Trạng thái kho khác (${status})` : "Chưa xử lý")
  );
};
