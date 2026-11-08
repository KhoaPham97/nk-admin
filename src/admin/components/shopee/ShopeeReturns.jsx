import React, { useState } from "react";
import { PackageCheck, Search, RotateCcw } from "lucide-react";
import { shopeeApi } from "../../services/shopeeApi";
import "./style/shopee-components.css";

export default function ShopeeReturns() {
  const [orderSn, setOrderSn] = useState("");
  const [shopId, setShopId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [itemIndex, setItemIndex] = useState("0");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const searchOrder = async () => {
    if (!orderSn.trim()) {
      setError("Vui lòng nhập mã đơn Shopee.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const res = await shopeeApi.getOrderDetail(orderSn.trim());
      setOrder(res?.order || res?.data?.order || res?.data || res);
    } catch (e) {
      setError(e.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const receive = async (e) => {
    e.preventDefault();
    if (!order) return;

    const items = order.items || [];
    const selectedItem = items[Number(itemIndex)];

    if (!selectedItem) {
      setError("Không tìm thấy sản phẩm trong đơn.");
      return;
    }

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Số lượng nhận phải là số nguyên lớn hơn 0.");
      return;
    }

    if (!window.confirm(`Xác nhận đã nhận thực tế ${qty} sản phẩm hoàn?`))
      return;

    setProcessing(true);
    setError("");
    setNotice("");

    try {
      const res = await shopeeApi.receiveReturn(orderSn.trim(), {
        shopId: shopId || order.shopId || order.shop_id,
        itemId: selectedItem.itemId || selectedItem.item_id,
        modelId: selectedItem.modelId || selectedItem.model_id,
        variantCode: selectedItem.variantCode,
        quantity: qty,
        note,
      });

      setNotice(res?.message || "Đã gửi yêu cầu tiếp nhận hàng hoàn.");
      setQuantity("");
      setNote("");
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section className="sc-section">
      <div className="sc-toolbar">
        <div>
          <h3>Tiếp nhận hàng hoàn</h3>
          <p>Chỉ cộng lại tồn kho sau khi đã nhận và kiểm tra hàng thực tế.</p>
        </div>
        <div className="sc-title-icon">
          <RotateCcw size={23} />
        </div>
      </div>

      {error && <div className="sc-alert sc-alert-error">{error}</div>}
      {notice && <div className="sc-alert sc-alert-success">{notice}</div>}

      <div className="sc-return-search">
        <label>
          Mã đơn Shopee
          <div className="sc-input-icon">
            <Search size={16} />
            <input
              value={orderSn}
              onChange={(e) => setOrderSn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchOrder()}
              placeholder="Nhập mã đơn..."
            />
          </div>
        </label>
        <label>
          Shop ID (nếu cần)
          <input
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            placeholder="Shop ID"
          />
        </label>
        <button
          className="sc-btn sc-btn-primary"
          onClick={searchOrder}
          disabled={loading}
        >
          <Search size={16} /> {loading ? "Đang tìm..." : "Tìm đơn"}
        </button>
      </div>

      {order && (
        <form className="sc-return-form" onSubmit={receive}>
          <div className="sc-info-banner">
            <PackageCheck size={18} />
            <span>
              Kiểm tra đúng mã đơn, sản phẩm và số lượng trước khi xác nhận nhận
              hàng.
            </span>
          </div>

          <div className="sc-form-grid">
            <label>
              Đơn hàng
              <input
                value={order.orderSn || order.order_sn || orderSn}
                readOnly
              />
            </label>
            <label>
              Trạng thái đơn
              <input
                value={
                  order.orderStatus ||
                  order.order_status ||
                  order.status ||
                  "--"
                }
                readOnly
              />
            </label>
            <label className="sc-full-width">
              Sản phẩm hoàn
              <select
                value={itemIndex}
                onChange={(e) => setItemIndex(e.target.value)}
              >
                {(order.items || []).map((item, index) => (
                  <option
                    value={index}
                    key={item.itemId || item.item_id || index}
                  >
                    {item.productTitle ||
                      item.itemName ||
                      item.item_name ||
                      item.variantName ||
                      `Sản phẩm ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Số lượng thực nhận
              <input
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Nhập số lượng"
              />
            </label>
            <label>
              Ghi chú
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tình trạng hàng hoàn..."
              />
            </label>
          </div>

          <div className="sc-form-actions">
            <button
              className="sc-btn sc-btn-primary"
              type="submit"
              disabled={processing}
            >
              <PackageCheck size={16} />
              {processing ? "Đang tiếp nhận..." : "Xác nhận đã nhận hàng"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
