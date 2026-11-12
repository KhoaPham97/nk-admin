import React, { useCallback, useEffect, useMemo, useState } from "react";
import JsBarcode from "jsbarcode";
import { shopeeApi } from "../../services/shopeeApi";
import "./style/ShopeeCustomWaybill.css";

const DEFAULT_TEMPLATE = {
  senderName: "NHẬT KHANG BIKE",
  senderPhone: "",
  senderAddress: "",
  shopLabel: "ĐÃ CHẠY PHẢI CHẤT",
  paper: "100x150",
  showOrderCode: true,
  showItems: true,
  showCod: true,
  showWeight: true,
  showSortCode: true,
  showCarrier: true,
  showQr: true,
  logo: "",
};

const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
const unwrap = (result) => result?.data?.data || result?.data || result;

function Barcode({ value }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (!value) return setSvg("");
    try {
      const node = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(node, String(value), {
        format: "CODE128",
        displayValue: true,
        font: "Arial",
        fontSize: 13,
        height: 54,
        margin: 2,
        width: 1.6,
        background: "#fff",
        lineColor: "#111",
      });
      setSvg(node.outerHTML);
    } catch (error) {
      console.error("Barcode:", error);
      setSvg("");
    }
  }, [value]);
  return <div className="scw-barcode" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function ShopeeCustomWaybill({ shops = [], selectedShopId = "", onShopChange }) {
  const [shopId, setShopId] = useState(selectedShopId || "");
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState([]);
  const [waybills, setWaybills] = useState([]);
  const [template, setTemplate] = useState(() => {
    try {
      return { ...DEFAULT_TEMPLATE, ...JSON.parse(localStorage.getItem("nkb_shopee_waybill_template") || "{}") };
    } catch {
      return DEFAULT_TEMPLATE;
    }
  });
  const [loading, setLoading] = useState(false);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showDesigner, setShowDesigner] = useState(true);

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

  const updateTemplate = (key, value) => {
    setTemplate((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const saveTemplate = () => {
    localStorage.setItem("nkb_shopee_waybill_template", JSON.stringify(template));
    setSaved(true);
  };

  const toggleOrder = (orderSn) => {
    setSelected((current) => current.includes(orderSn)
      ? current.filter((value) => value !== orderSn)
      : [...current, orderSn]);
  };

  const loadSelectedWaybills = async () => {
    if (!selected.length) return setError("Chọn ít nhất một đơn để lấy dữ liệu vận đơn.");
    setLoadingLabels(true);
    setError("");
    const results = [];
    const failures = [];
    for (const orderSn of selected) {
      try {
        const result = await shopeeApi.getWaybillData(orderSn, { shopId });
        const data = unwrap(result);
        if (!data?.trackingNumber) throw new Error("Không có mã vận đơn");
        results.push(data);
      } catch (err) {
        failures.push(orderSn + ": " + (err.message || "Không lấy được dữ liệu"));
      }
    }
    setWaybills(results);
    if (failures.length) setError("Một số đơn chưa lấy được vận đơn:\n" + failures.join("\n"));
    setLoadingLabels(false);
  };

  const handleLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Logo phải là tệp hình ảnh.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("Logo tối đa 1MB để tránh mẫu in quá nặng.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateTemplate("logo", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const paperStyle = template.paper === "100x150"
    ? { width: "100mm", minHeight: "150mm" }
    : { width: "100mm", minHeight: "100mm" };

  return (
    <>
    <style>{`@page { size: ${template.paper === "100x100" ? "100mm 100mm" : "100mm 150mm"}; margin: 0; }`}</style>
    <div className="scw-page">
      <div className="scw-header">
        <div>
          <h2>In vận đơn Shopee – mẫu riêng</h2>
          <p>Lấy mã vận đơn chính thức từ Shopee, tự bố trí và xuất PDF theo mẫu Nhật Khang Bike.</p>
        </div>
        <button className="scw-primary" onClick={() => window.print()} disabled={!waybills.length}>Xuất PDF / In</button>
      </div>

      {error && <div className="scw-error">{error}</div>}

      <section className="scw-panel">
        <div className="scw-panel-title">
          <div><h3>1. Chọn đơn hàng</h3><small>Chỉ hiện đơn đã xác nhận gửi hoặc đã giao; đơn chưa có vận đơn sẽ không thể in.</small></div>
          <div className="scw-actions">
            <select value={shopId} onChange={(event) => { setShopId(event.target.value); onShopChange?.(event.target.value); }}>
              <option value="">Chọn gian hàng</option>
              {shops.map((shop) => {
                const id = String(shop.shopId || shop.shop_id || shop._id || "");
                return <option key={id} value={id}>{shop.shopName || shop.shop_name || id}</option>;
              })}
            </select>
            <button onClick={loadOrders} disabled={loading}>{loading ? "Đang tải..." : "Tải đơn"}</button>
          </div>
        </div>
        <div className="scw-selection-bar">
          <span>Đã chọn <b>{selected.length}</b> / {readyOrders.length} đơn đủ điều kiện</span>
          <button onClick={() => setSelected(readyOrders.map((order) => order.orderSn))}>Chọn tất cả đủ điều kiện</button>
          <button onClick={() => setSelected([])}>Bỏ chọn</button>
          <button className="scw-primary" onClick={loadSelectedWaybills} disabled={loadingLabels || !selected.length}>
            {loadingLabels ? "Đang lấy dữ liệu Shopee..." : "Lấy mã vận đơn"}
          </button>
        </div>
        <div className="scw-order-list">
          {orders.map((order) => {
            const eligible = ["PROCESSED", "SHIPPED", "COMPLETED"].includes(String(order.orderStatus || "").toUpperCase());
            return (
              <label className={eligible ? "" : "scw-disabled"} key={order.orderSn}>
                <input type="checkbox" checked={selected.includes(order.orderSn)} disabled={!eligible} onChange={() => toggleOrder(order.orderSn)} />
                <span><b>{order.orderSn}</b><small>{order.recipientName || order.buyerUsername || "Người nhận"} · {order.shippingCarrier || "Chưa rõ ĐVVC"}</small></span>
                <strong>{money(order.totalAmount)}</strong>
                <em>{eligible ? "Có thể lấy vận đơn" : order.orderStatus || "Chưa sẵn sàng"}</em>
              </label>
            );
          })}
          {!orders.length && !loading && <div className="scw-empty">Chọn shop và tải đơn để bắt đầu.</div>}
        </div>
      </section>

      <section className="scw-panel">
        <div className="scw-panel-title">
          <div><h3>2. Tùy chỉnh mẫu vận đơn</h3><small>Cấu hình được lưu trên trình duyệt đang sử dụng.</small></div>
          <button onClick={() => setShowDesigner((value) => !value)}>{showDesigner ? "Thu gọn" : "Mở tùy chỉnh"}</button>
        </div>
        {showDesigner && <div className="scw-designer">
          <label>Tên người gửi<input value={template.senderName} onChange={(e) => updateTemplate("senderName", e.target.value)} /></label>
          <label>Số điện thoại gửi<input value={template.senderPhone} onChange={(e) => updateTemplate("senderPhone", e.target.value)} /></label>
          <label className="scw-wide">Địa chỉ gửi<input value={template.senderAddress} onChange={(e) => updateTemplate("senderAddress", e.target.value)} /></label>
          <label>Slogan / dòng phụ<input value={template.shopLabel} onChange={(e) => updateTemplate("shopLabel", e.target.value)} /></label>
          <label>Khổ giấy<select value={template.paper} onChange={(e) => updateTemplate("paper", e.target.value)}><option value="100x150">100 × 150 mm</option><option value="100x100">100 × 100 mm</option></select></label>
          <label>Logo cửa hàng<input type="file" accept="image/*" onChange={handleLogo} /></label>
          {template.logo && <div className="scw-logo-preview"><img src={template.logo} alt="Logo cửa hàng" /><button onClick={() => updateTemplate("logo", "")}>Xóa logo</button></div>}
          <div className="scw-toggles">
            {[
              ["showOrderCode", "Hiện mã đơn Shopee"],
              ["showItems", "Hiện danh sách sản phẩm"],
              ["showCod", "Hiện tiền thu hộ COD"],
              ["showWeight", "Hiện khối lượng"],
              ["showSortCode", "Hiện mã phân loại tuyến"],
              ["showCarrier", "Hiện đơn vị vận chuyển"],
              ["showQr", "Hiện QR mã phân loại tuyến"],
            ].map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(template[key])} onChange={(e) => updateTemplate(key, e.target.checked)} />{label}</label>)}
          </div>
          <div className="scw-save-row"><button className="scw-primary" onClick={saveTemplate}>Lưu mẫu này</button>{saved && <span>Đã lưu mẫu trên thiết bị này.</span>}</div>
        </div>}
      </section>

      <section className="scw-panel">
        <div className="scw-panel-title"><div><h3>3. Xem trước vận đơn</h3><small>{waybills.length} vận đơn đã lấy dữ liệu thành công.</small></div></div>
        <div className="scw-preview-list">
          {waybills.map((bill) => {
            const order = bill.order || {};
            const sort = bill.recipientSortCode || {};
            const routeCode = [sort.first_recipient_sort_code, sort.second_recipient_sort_code, sort.third_recipient_sort_code, bill.deliverArea].filter(Boolean).join(" · ");
            const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
            return <article className="scw-label" style={paperStyle} key={bill.orderSn}>
              <div className="scw-label-topline">
                <span className="scw-brand-mark">NK</span>
                <div className="scw-brand-copy"><b>{template.senderName || "NHẬT KHANG BIKE"}</b><small>{template.shopLabel || "ĐÃ CHẠY PHẢI CHẤT"}</small></div>
                <strong className="scw-carrier">{bill.shippingCarrier || order.shippingCarrier || "ĐƠN VỊ VẬN CHUYỂN"}</strong>
              </div>
              <div className="scw-route-block">
                <div><small>MÃ PHÂN LOẠI / TUYẾN GIAO</small><strong>{routeCode || "—"}</strong></div>
                <span>GIAO HÀNG</span>
              </div>
              <div className="scw-address-block">
                <div className="scw-address-title"><b>NGƯỜI GỬI</b><small>{template.senderName}</small></div>
                <div className="scw-sender-detail">{template.senderPhone} {template.senderAddress && " · " + template.senderAddress}</div>
                <div className="scw-recipient-title"><span>NGƯỜI NHẬN</span><strong>{order.recipientName || "Thông tin người nhận"}</strong></div>
                <strong className="scw-recipient-phone">{order.recipientPhone || ""}</strong>
                <div className="scw-recipient-address">{order.recipientAddress || "Chưa có địa chỉ người nhận"}</div>
              </div>
              <div className="scw-waybill-code">
                <div className="scw-waybill-code-head"><span>MÃ VẬN ĐƠN</span>{template.showOrderCode && <b>ĐƠN {bill.orderSn}</b>}</div>
                <strong>{bill.trackingNumber}</strong>
                <Barcode value={bill.trackingNumber} />
              </div>
              <div className="scw-payment-strip">
                {template.showCod && <div className="scw-cod"><small>TIỀN THU NGƯỜI NHẬN (COD)</small><strong>{bill.cod ? money(bill.codAmount) : "0đ"}</strong></div>}
                {template.showWeight && <div className="scw-weight"><small>KHỐI LƯỢNG</small><strong>{bill.orderWeight ? bill.orderWeight + " g" : "—"}</strong></div>}
              </div>
              {(template.showItems || template.showQr) && <div className="scw-content-row">
                {template.showItems && <div className="scw-package-content">
                  <div className="scw-package-heading"><b>NỘI DUNG HÀNG</b><strong>Tổng SL: {itemCount}</strong></div>
                  {(order.items || []).map((item, index) => <div className="scw-package-item" key={index}><span>{index + 1}. {item.itemName}{item.variantName ? ", " + item.variantName : ""}</span><b>SL: {item.quantity}</b></div>)}
                </div>}
                {template.showQr && routeCode && <div className="scw-sort-qr">
                  <img src={"https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=" + encodeURIComponent(routeCode)} alt={"QR mã phân loại " + routeCode} loading="eager" />
                  <strong>{routeCode}</strong>
                </div>}
              </div>}
              <footer className="scw-label-footer">
                <span>{template.senderName || "NHẬT KHANG BIKE"}</span>
                <small>{bill.createDate || new Date().toLocaleDateString("vi-VN")} · Cảm ơn quý khách!</small>
              </footer>
            </article>;
          })}
          {!waybills.length && <div className="scw-empty">Chọn đơn, lấy dữ liệu vận đơn rồi mẫu xem trước sẽ xuất hiện tại đây.</div>}
        </div>
      </section>
    </div>
    </>
  );
}
