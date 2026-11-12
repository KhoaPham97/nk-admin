import React, { useCallback, useEffect, useMemo, useState } from "react";
import { shopeeApi } from "../services/shopeeApi";
import "../styles/ShopeeCustomWaybill.css";

const unwrap = (value) => value?.data?.data || value?.data || value;
const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
const eligibleStatuses = new Set(["PROCESSED", "SHIPPED"]);
const getOrderSn = (order) => String(order?.orderSn || order?.order_sn || "");
const getStatus = (order) => String(order?.orderStatus || order?.order_status || "").toUpperCase();

export default function ShopeeCustomWaybill({ shops = [], selectedShopId = "", onShopChange }) {
  const [shopId, setShopId] = useState(String(selectedShopId || ""));
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [documentType, setDocumentType] = useState("");
  const [created, setCreated] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
    setNotice("");
    setPackages([]);
    setSelectedPackages([]);
    setCreated(false);
    setStatuses([]);
    try {
      const result = await shopeeApi.getOrders({ shopId, page: 1, limit: 100 });
      const data = unwrap(result);
      const list = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [];
      setOrders(list);
      setSelectedOrders([]);
    } catch (err) {
      setError(err.message || "Không tải được danh sách đơn Shopee.");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const readyOrders = useMemo(
    () => orders.filter((order) => eligibleStatuses.has(getStatus(order))),
    [orders],
  );

  const toggleOrder = (orderSn) => {
    setSelectedOrders((current) => current.includes(orderSn)
      ? current.filter((item) => item !== orderSn)
      : [...current, orderSn]);
  };

  const getParameters = async () => {
    if (!selectedOrders.length) {
      setError("Vui lòng chọn ít nhất một đơn hàng.");
      return;
    }
    if (selectedOrders.length > 50) {
      setError("Shopee chỉ hỗ trợ tối đa 50 kiện trong một lần xử lý. Hãy chọn ít hơn.");
      return;
    }
    setWorking("parameters");
    setError("");
    setNotice("");
    setPackages([]);
    setSelectedPackages([]);
    setCreated(false);
    setStatuses([]);
    try {
      const result = await shopeeApi.getOfficialWaybillParameters({
        shopId,
        orderList: selectedOrders.map((orderSn) => ({ orderSn })),
      });
      const list = unwrap(result);
      const rows = Array.isArray(list) ? list : [];
      const valid = rows.filter((item) => !item.fail_error);
      if (!valid.length) {
        throw new Error(rows.map((item) => item.fail_message || item.fail_error).filter(Boolean).join("; ") || "Shopee chưa trả về loại vận đơn khả dụng.");
      }
      const normalized = valid.map((item, index) => ({
        ...item,
        key: String(item.order_sn) + "::" + String(item.package_number || index),
        selectedType: item.suggest_shipping_document_type || item.selectable_shipping_document_type?.[0] || "",
      }));
      setPackages(normalized);
      setSelectedPackages(normalized.map((item) => item.key));
      const commonTypes = normalized.reduce((common, item) => {
        const choices = item.selectable_shipping_document_type || [];
        return common === null ? choices : common.filter((type) => choices.includes(type));
      }, null) || [];
      const suggested = normalized[0]?.suggest_shipping_document_type;
      setDocumentType(commonTypes.includes(suggested) ? suggested : commonTypes[0] || suggested || "");
      setNotice(`Shopee trả về ${normalized.length} kiện hàng có thể in vận đơn.`);
      if (rows.length > valid.length) {
        setError(`${rows.length - valid.length} kiện không đủ điều kiện: ${rows.filter((x) => x.fail_error).map((x) => x.fail_message || x.fail_error).join("; ")}`);
      }
    } catch (err) {
      setError(err.message || "Không lấy được loại vận đơn.");
    } finally {
      setWorking("");
    }
  };

  const selectedRows = packages.filter((item) => selectedPackages.includes(item.key));
  const orderPayload = selectedRows.map((item) => ({
    orderSn: item.order_sn,
    packageNumber: item.package_number,
    shippingDocumentType: documentType || item.selectedType,
  }));

  const createDocuments = async () => {
    if (!orderPayload.length) {
      setError("Vui lòng chọn ít nhất một kiện hàng.");
      return;
    }
    if (orderPayload.some((item) => !item.shippingDocumentType)) {
      setError("Chưa có loại vận đơn phù hợp cho một hoặc nhiều kiện.");
      return;
    }
    setWorking("create");
    setError("");
    setNotice("");
    try {
      const result = await shopeeApi.createOfficialWaybills({ shopId, orderList: orderPayload });
      const list = unwrap(result);
      const resultList = Array.isArray(list) ? list : [];
      const failed = resultList.filter((item) => item.fail_error);
      setCreated(true);
      setNotice(`Đã gửi yêu cầu tạo vận đơn cho Shopee. Thành công: ${resultList.length - failed.length}; lỗi: ${failed.length}. Tiếp theo hãy kiểm tra trạng thái.`);
      if (failed.length) setError(failed.map((item) => `${item.order_sn}: ${item.fail_message || item.fail_error}`).join("\n"));
    } catch (err) {
      setError(err.message || "Không tạo được vận đơn.");
    } finally {
      setWorking("");
    }
  };

  const checkStatus = async () => {
    if (!orderPayload.length) return;
    setWorking("status");
    setError("");
    try {
      const result = await shopeeApi.getOfficialWaybillResult({ shopId, orderList: orderPayload });
      const list = unwrap(result);
      const rows = Array.isArray(list) ? list : [];
      setStatuses(rows);
      const ready = rows.filter((item) => item.status === "READY").length;
      const processing = rows.filter((item) => item.status === "PROCESSING").length;
      const failed = rows.filter((item) => item.status === "FAILED" || item.fail_error).length;
      setNotice(`Trạng thái Shopee: ${ready} sẵn sàng · ${processing} đang tạo · ${failed} lỗi.`);
      if (failed) setError(rows.filter((item) => item.status === "FAILED" || item.fail_error).map((item) => item.fail_message || item.fail_error).filter(Boolean).join("\n"));
    } catch (err) {
      setError(err.message || "Không kiểm tra được trạng thái vận đơn.");
    } finally {
      setWorking("");
    }
  };

  const downloadDocuments = async () => {
    const allReady = statuses.length > 0 && statuses.every((item) => item.status === "READY");
    if (!allReady) {
      setError("Chỉ tải được khi tất cả kiện đã ở trạng thái READY.");
      return;
    }
    setWorking("download");
    setError("");
    try {
      const result = await shopeeApi.downloadOfficialWaybills({ shopId, orderList: orderPayload });
      const url = window.URL.createObjectURL(result.blob);
      const extension = result.contentType.includes("html") ? "html" : "pdf";
      const link = document.createElement("a");
      link.href = url;
      link.download = `shopee-waybills-${new Date().toISOString().slice(0, 10)}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      setNotice("Đã tải file vận đơn gốc từ Shopee. Mở file để in.");
    } catch (err) {
      setError(err.message || "Không tải được file vận đơn.");
    } finally {
      setWorking("");
    }
  };

  return (
    <div className="scw-page">
      <div className="scw-toolbar no-print">
        <div>
          <h2>In vận đơn Shopee</h2>
          <p>Lấy PDF vận đơn gốc trực tiếp từ Shopee Seller Centre · Không tự dựng lại mẫu.</p>
        </div>
        <button className="scw-primary" onClick={downloadDocuments}
          disabled={working !== "" || !statuses.length || !statuses.every((item) => item.status === "READY")}>
          {working === "download" ? "Đang tải PDF..." : "Tải / In vận đơn gốc"}
        </button>
      </div>

      {error && <div className="scw-error no-print" style={{ whiteSpace: "pre-wrap" }}>{error}</div>}
      {notice && <div className="scw-notice no-print">{notice}</div>}

      <section className="scw-panel no-print">
        <div className="scw-panel-heading">
          <div>
            <h3>1. Chọn đơn hàng</h3>
            <small>Chỉ hiển thị đơn đã xác nhận gửi hoặc đang giao; không thay đổi trạng thái đơn hay tồn kho.</small>
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
          <span>Đã chọn <b>{selectedOrders.length}</b> / {readyOrders.length} đơn đủ điều kiện</span>
          <button onClick={() => setSelectedOrders(readyOrders.map(getOrderSn))}>Chọn tất cả</button>
          <button onClick={() => setSelectedOrders([])}>Bỏ chọn</button>
          <button className="scw-primary" onClick={getParameters}
            disabled={working !== "" || !selectedOrders.length}>
            {working === "parameters" ? "Đang kiểm tra..." : "Kiểm tra loại vận đơn"}
          </button>
        </div>

        <div className="scw-order-list">
          {orders.map((order) => {
            const orderSn = getOrderSn(order);
            const eligible = eligibleStatuses.has(getStatus(order));
            return (
              <label className={eligible ? "" : "scw-disabled"} key={orderSn}>
                <input type="checkbox" checked={selectedOrders.includes(orderSn)}
                  disabled={!eligible} onChange={() => toggleOrder(orderSn)} />
                <span className="scw-order-info">
                  <b>{orderSn}</b>
                  <small>{order.recipientName || order.buyerUsername || "Người nhận"} · {order.shippingCarrier || "Chưa rõ ĐVVC"}</small>
                </span>
                <strong>{money(order.totalAmount)}</strong>
                <em>{getStatus(order) || "Chưa rõ trạng thái"}</em>
              </label>
            );
          })}
          {!orders.length && !loading && <div className="scw-empty">Chọn gian hàng và tải đơn hàng.</div>}
        </div>
      </section>

      {packages.length > 0 && (
        <section className="scw-panel no-print">
          <div className="scw-panel-heading">
            <div>
              <h3>2. Chọn kiện hàng và loại vận đơn</h3>
              <small>Loại vận đơn được lấy từ danh sách Shopee cho phép theo từng kiện.</small>
            </div>
            <div className="scw-actions">
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                {[...new Set(packages.flatMap((item) => item.selectable_shipping_document_type || []))].map((type) =>
                  <option key={type} value={type}>{type}</option>
                )}
              </select>
            </div>
          </div>
          <div className="scw-selection-bar">
            <span>Đã chọn <b>{selectedPackages.length}</b> / {packages.length} kiện</span>
            <button onClick={() => setSelectedPackages(packages.map((item) => item.key))}>Chọn tất cả kiện</button>
            <button onClick={() => setSelectedPackages([])}>Bỏ chọn</button>
            <button className="scw-primary" onClick={createDocuments}
              disabled={working !== "" || !selectedPackages.length}>
              {working === "create" ? "Đang gửi Shopee..." : "3. Tạo vận đơn trên Shopee"}
            </button>
          </div>
          <div className="scw-order-list">
            {packages.map((item) => (
              <label key={item.key}>
                <input type="checkbox" checked={selectedPackages.includes(item.key)}
                  onChange={() => setSelectedPackages((current) => current.includes(item.key)
                    ? current.filter((key) => key !== item.key) : [...current, item.key])} />
                <span className="scw-order-info">
                  <b>{item.order_sn}</b>
                  <small>Kiện: {item.package_number || "—"} · Mã vận đơn: {item.tracking_number || "—"}</small>
                </span>
                <strong>{item.suggest_shipping_document_type || "Shopee đề xuất"}</strong>
                <em>{(item.selectable_shipping_document_type || []).join(", ")}</em>
              </label>
            ))}
          </div>
          <div className="scw-selection-bar" style={{ marginTop: 14 }}>
            <span>{created ? "Yêu cầu tạo vận đơn đã gửi." : "Sau khi tạo, chờ Shopee xử lý file."}</span>
            <button onClick={checkStatus} disabled={!created || working !== ""}>
              {working === "status" ? "Đang kiểm tra..." : "4. Kiểm tra trạng thái"}
            </button>
            <button className="scw-primary" onClick={downloadDocuments}
              disabled={!statuses.length || !statuses.every((item) => item.status === "READY") || working !== ""}>
              Tải PDF khi READY
            </button>
          </div>
          {statuses.length > 0 && (
            <div className="scw-order-list">
              {statuses.map((item, index) => (
                <label key={item.order_sn + String(item.package_number || index)}>
                  <span className="scw-order-info"><b>{item.order_sn}</b><small>{item.package_number || ""}</small></span>
                  <strong>{item.status || "Chưa rõ"}</strong>
                  <em>{item.fail_message || item.fail_error || ""}</em>
                </label>
              ))}
            </div>
          )}
        </section>
      )}
      <div className="scw-empty no-print">
        File tải xuống là vận đơn do Shopee tạo. Một số hãng vận chuyển hoặc loại đơn có thể chỉ hỗ trợ in trong Seller Centre.
      </div>
    </div>
  );
}
