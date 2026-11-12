import React, { useCallback, useEffect, useMemo, useState } from "react";
import JsBarcode from "jsbarcode";
import { shopeeApi } from "../../services/shopeeApi";
import "./style/ShopeeCustomWaybill.css";

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
  const senderPhone = text(sender.phone, sender.phone_number, bill.senderPhone);
  const senderAddress = addressText(sender);
  const recipientName = text(order.recipientName, recipient.name, recipient.recipient_name);
  const recipientPhone = text(order.recipientPhone, recipient.phone, recipient.phone_number);
  const recipientAddress = text(order.recipientAddress, addressText(recipient));
  const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <article className="scw-label">
      <header className="scw-label-head">
        <div className="scw-tracking-number">{bill.trackingNumber}</div>
        <div className="scw-order-number">{order.orderSn || bill.orderSn}</div>
      </header>

      <div className="scw-carrier-line">{text(bill.shippingCarrier, order.shippingCarrier, "SPX EXPRESS")}</div>

      <section className="scw-parties">
        <div className="scw-party scw-sender">
          <b>NGƯỜI GỬI</b>
          <strong>{senderName}</strong>
          {senderPhone && <span>{senderPhone}</span>}
          {senderAddress && <span>{senderAddress}</span>}
        </div>
        <div className="scw-party scw-recipient">
          <b>NGƯỜI NHẬN</b>
          <strong>{recipientName || " "}</strong>
          {recipientPhone && <span>{recipientPhone}</span>}
          <span>{recipientAddress}</span>
        </div>
      </section>

      <section className="scw-sort-codes">
        <div className="scw-primary-sort">
          <small>MÃ PHÂN LOẠI NGƯỜI NHẬN</small>
          <strong>{firstSort || " "}</strong>
        </div>
        <div className="scw-secondary-sort">
          <small>MÃ TUYẾN</small>
          <strong>{secondSort || " "}</strong>
        </div>
      </section>

      <div className="scw-barcode-wrap">
        <Barcode value={bill.trackingNumber} />
      </div>

      <section className="scw-content-qr">
        <div className="scw-items">
          <div className="scw-items-head">
            <b>NỘI DUNG HÀNG</b>
            <strong>TỔNG SL: {itemCount}</strong>
          </div>
          {(order.items || []).map((item, index) => (
            <div className="scw-item" key={index}>
              <span>{index + 1}. {item.itemName}{item.variantName ? " - " + item.variantName : ""}</span>
              <b>x{item.quantity}</b>
            </div>
          ))}
          <div className="scw-weight">
            <span>Khối lượng tối đa</span>
            <b>{bill.orderWeight ? Number(bill.orderWeight).toLocaleString("vi-VN") + " g" : " "}</b>
          </div>
        </div>
        <div className="scw-qr-block">
          {qrValue && <img
            src={"https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&data=" + encodeURIComponent(qrValue)}
            alt="QR mã phân loại vận đơn"
          />}
          <strong>{qrValue}</strong>
          {thirdSort && <b className="scw-third-sort">{thirdSort}</b>}
        </div>
      </section>

      <section className="scw-cod-sign">
        <div className="scw-cod">
          <small>TIỀN THU HỘ (COD)</small>
          <strong>{bill.cod ? money(bill.codAmount) : "0đ"}</strong>
        </div>
        <div className="scw-sign">
          <b>CHỮ KÝ NGƯỜI NHẬN</b>
          <span> </span>
        </div>
      </section>
      <div className="scw-delivery-note">GHI CHÚ GIAO HÀNG: __________________________________</div>
      <footer className="scw-footer">
        <b>SHOPEE</b>
        <span>{bill.createDate || ""}</span>
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
          <p>Mẫu vận đơn cố định theo bố cục SPX Shopee · 100 × 150 mm</p>
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
