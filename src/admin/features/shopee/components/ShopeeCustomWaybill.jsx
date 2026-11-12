import React, { useCallback, useEffect, useMemo, useState } from "react";
import JsBarcode from "jsbarcode";
import { shopeeApi } from "../services/shopeeApi";
import "../styles/ShopeeCustomWaybill.css";

const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
const unwrap = (result) => result?.data?.data || result?.data || result;
const text = (...values) => values.map((value) => String(value ?? "").trim()).find(Boolean) || "";
const addressText = (info) => {
  if (!info) return "";
  if (typeof info === "string") return info;
  return [
    info.full_address,
    info.address,
    info.district,
    info.city,
    info.state,
    info.region,
    info.zipcode,
  ].filter(Boolean).join(", ");
};

function Barcode({ value }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!value) {
      setSvg("");
      return;
    }
    try {
      const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(node, String(value), {
        format: "CODE128",
        displayValue: true,
        font: "Arial",
        fontSize: 13,
        height: 52,
        margin: 1,
        width: 1.55,
        background: "#fff",
        lineColor: "#111",
      });
      setSvg(node.outerHTML);
    } catch (error) {
      console.error("Shopee barcode:", error);
      setSvg("");
    }
  }, [value]);
  return <div className="scw-barcode" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Waybill({ bill }) {
  const order = bill.order || {};
  const sort = bill.recipientSortCode || {};
  const firstSort = text(sort.first_recipient_sort_code, bill.firstRecipientSortCode);
  const secondSort = text(sort.second_recipient_sort_code, bill.secondRecipientSortCode);
  const thirdSort = text(sort.third_recipient_sort_code, bill.thirdRecipientSortCode);
  const qrValue = thirdSort || text(bill.deliverArea, firstSort, secondSort);
  const sender = bill.senderAddressInfo || bill.sender_address_info || {};
  const recipient = bill.recipientAddressInfo || bill.recipient_address_info || {};
  const senderName = text(sender.name, sender.sender_name, bill.senderName, "Xe điện NK");
  const senderAddress = addressText(sender);
  const recipientName = text(order.recipientName, recipient.name, recipient.recipient_name);
  const recipientAddress = text(order.recipientAddress, addressText(recipient));
  const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const dateText = text(bill.createDate, new Date().toLocaleDateString("vi-VN"));

  return (
    <article className="scw-label">
      <header className="scw-top">
        <div className="scw-brand">
          <div className="scw-bag-mark">S</div>
          <div className="scw-brand-name">Shopee</div>
          <div className="scw-spx-word">SPX<small> EXPRESS</small></div>
        </div>
        <div className="scw-top-right">
          <Barcode value={bill.trackingNumber} />
          <div><span>Mã vận đơn:</span> <b>{bill.trackingNumber}</b></div>
          <div><span>Mã đơn hàng:</span> <b>{order.orderSn || bill.orderSn}</b></div>
        </div>
      </header>
      <section className="scw-addresses">
        <div className="scw-address sender">
          <b>Từ:</b><strong>{senderName}</strong>
          {senderAddress && <span>{senderAddress}</span>}
        </div>
        <div className="scw-address recipient">
          <b>Đến:</b><strong>{recipientName}</strong><span>{recipientAddress}</span>
        </div>
      </section>
      <section className="scw-route">
        <div className="scw-route-first"><strong>{firstSort}</strong></div>
        <div className="scw-route-second"><strong>{secondSort}</strong></div>
      </section>
      <section className="scw-content-qr">
        <div className="scw-items">
          <div className="scw-items-head"><b>Nội dung hàng (Tổng SL sản phẩm: {itemCount})</b></div>
          {(order.items || []).map((item, index) => (
            <div className="scw-item" key={index}>
              <span>{index + 1}. {item.itemName}{item.variantName ? " " + item.variantName : ""}, SL: {item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="scw-qr-block">
          {qrValue && <img src={"https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=1&data=" + encodeURIComponent(qrValue)} alt="QR mã phân loại" />}
          {thirdSort && <strong>{thirdSort}</strong>}
          <small>Ngày đặt hàng:</small><b>{dateText}</b>
        </div>
      </section>
      <div className="scw-policy">
        Người gửi phải cam kết hàng hóa có đầy đủ các hóa đơn, chứng từ, giấy phép cần thiết theo quy định của pháp luật và đính kèm theo bên trong gói hàng này (Lưu ý: Một số sản phẩm có thể bị ẩn do danh sách cấm của sàn).
      </div>
      <div className="scw-cod-weight">
        <span>Tiền thu Người nhận:</span>
        <strong>{bill.cod ? money(bill.codAmount).replace("đ"," VND") : "0 VND"}</strong>
        <span>Khối lượng tối đa: {bill.orderWeight ? Number(bill.orderWeight).toLocaleString("vi-VN") + " g" : "—"}</span>
      </div>
      <section className="scw-signature-row">
        <div className="scw-cod-large">{bill.cod ? money(bill.codAmount).replace("đ"," VND") : "0 VND"}</div>
        <div className="scw-signature"><b>Chữ ký người nhận</b><span>Xác nhận hàng nguyên vẹn, không móp/méo, bể/vỡ</span></div>
      </section>
      <section className="scw-delivery">
        <b>Chỉ dẫn giao hàng: <strong>Được đồng kiểm</strong></b>
        <span>Chuyển hoàn sau 3 lần phát; Lưu kho tối đa 5 ngày</span>
      </section>
      <footer className="scw-footer">
        <b>Gọi 1900 6885</b>
        <div>
          <span>✓ Giao hàng toàn quốc / Chuyển phát nhanh chỉ từ 11.000 VND (*)</span>
          <span>✓ Tuyến NV Giao hàng / NV Bưu cục thu nhập đến 20.000.000 VND</span>
          <small>(*) Theo điều kiện điều khoản áp dụng</small>
        </div>
      </footer>
    </article>
  );
}
export default function ShopeeCustomWaybill({ shops = [], selectedShopId = "", onShopChange }) {
  const [shopId, setShopId] = useState(selectedShopId || "");
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState([]);
  const [waybills, setWaybills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedShopId) setShopId(String(selectedShopId));
  }, [selectedShopId]);

  const loadOrders = useCallback(async () => {
    if (!shopId) {
      setOrders([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await shopeeApi.getOrders({ shopId, page: 1, limit: 100 });
      const data = result?.data || result;
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
      setSelected([]);
      setWaybills([]);
    } catch (err) {
      setError(err.message || "Không tải được đơn Shopee");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const readyOrders = useMemo(
    () => orders.filter((order) => ["PROCESSED", "SHIPPED", "COMPLETED"].includes(String(order.orderStatus || "").toUpperCase())),
    [orders],
  );

  const toggleOrder = (orderSn) => {
    setSelected((current) => current.includes(orderSn)
      ? current.filter((value) => value !== orderSn)
      : [...current, orderSn]);
  };

  const loadSelectedWaybills = async () => {
    if (!selected.length) {
      setError("Vui lòng chọn ít nhất một đơn hàng.");
      return;
    }
    setLoadingLabels(true);
    setError("");
    const results = [];
    const failures = [];
    for (const orderSn of selected) {
      try {
        const result = await shopeeApi.getWaybillData(orderSn, { shopId });
        const data = unwrap(result);
        if (!data?.trackingNumber) throw new Error("Shopee chưa trả về mã vận đơn.");
        results.push(data);
      } catch (err) {
        failures.push(orderSn + ": " + (err.message || "Không lấy được dữ liệu"));
      }
    }
    setWaybills(results);
    if (failures.length) setError("Không lấy được vận đơn cho một số đơn:\n" + failures.join("\n"));
    setLoadingLabels(false);
  };

  return (
    <div className="scw-page">
      <div className="scw-toolbar no-print">
        <div>
          <h2>In vận đơn Shopee</h2>
          <p>Mẫu vận đơn Shopee SPX theo đúng mẫu gốc · khổ 105 × 148 mm</p>
        </div>
        <button className="scw-primary" onClick={() => window.print()} disabled={!waybills.length}>
          <span>In vận đơn / Lưu PDF</span>
        </button>
      </div>

      {error && <div className="scw-error no-print">{error}</div>}

      <section className="scw-panel no-print">
        <div className="scw-panel-heading">
          <div>
            <h3>Chọn đơn hàng cần in</h3>
            <small>Chỉ chọn đơn đã có trạng thái cho phép lấy vận đơn trên Shopee.</small>
          </div>
          <div className="scw-actions">
            <select value={shopId} onChange={(event) => {
              setShopId(event.target.value);
              onShopChange?.(event.target.value);
            }}>
              <option value="">Chọn gian hàng</option>
              {shops.map((shop) => {
                const id = String(shop.shopId || shop.shop_id || shop._id || "");
                return <option key={id} value={id}>{shop.shopName || shop.shop_name || id}</option>;
              })}
            </select>
            <button onClick={loadOrders} disabled={loading}>{loading ? "Đang tải..." : "Tải đơn hàng"}</button>
          </div>
        </div>
        <div className="scw-selection-bar">
          <span>Đã chọn <b>{selected.length}</b> / {readyOrders.length} đơn đủ điều kiện</span>
          <button onClick={() => setSelected(readyOrders.map((order) => order.orderSn))}>Chọn tất cả</button>
          <button onClick={() => setSelected([])}>Bỏ chọn</button>
          <button className="scw-primary" onClick={loadSelectedWaybills} disabled={loadingLabels || !selected.length}>
            {loadingLabels ? "Đang lấy dữ liệu..." : "Lấy vận đơn Shopee"}
          </button>
        </div>
        <div className="scw-order-list">
          {orders.map((order) => {
            const eligible = ["PROCESSED", "SHIPPED", "COMPLETED"].includes(String(order.orderStatus || "").toUpperCase());
            return (
              <label className={eligible ? "" : "scw-disabled"} key={order.orderSn}>
                <input type="checkbox" checked={selected.includes(order.orderSn)} disabled={!eligible} onChange={() => toggleOrder(order.orderSn)} />
                <span className="scw-order-info"><b>{order.orderSn}</b><small>{order.recipientName || order.buyerUsername || "Người nhận"} · {order.shippingCarrier || "Chưa rõ ĐVVC"}</small></span>
                <strong>{money(order.totalAmount)}</strong>
                <em>{eligible ? "Đủ điều kiện" : order.orderStatus || "Chưa sẵn sàng"}</em>
              </label>
            );
          })}
          {!orders.length && !loading && <div className="scw-empty">Chọn gian hàng và tải đơn hàng.</div>}
        </div>
      </section>

      <div className="scw-print-list">
        {waybills.map((bill) => <Waybill key={bill.orderSn + (bill.packageNumber || "")} bill={bill} />)}
        {!waybills.length && <div className="scw-empty no-print">Chọn đơn hàng và lấy dữ liệu để xem trước vận đơn.</div>}
      </div>
    </div>
  );
}
