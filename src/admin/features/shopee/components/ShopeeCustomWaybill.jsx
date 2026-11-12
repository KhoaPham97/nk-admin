import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Printer, FileText, CheckCircle2, Clock3, AlertCircle, Download, Eye } from "lucide-react";
import { shopeeApi } from "../services/shopeeApi";
import "../styles/ShopeeCustomWaybill.css";

const unwrap = (value) => value?.data?.data || value?.data || value;
const eligibleStatuses = new Set(["PROCESSED", "SHIPPED"]);
const getOrderSn = (order) => String(order?.orderSn || order?.order_sn || "");
const getStatus = (order) => String(order?.orderStatus || order?.order_status || "").toUpperCase();
const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
const chunks = (items, size) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

export default function ShopeeCustomWaybill({ shops = [], selectedShopId = "", onShopChange }) {
  const [shopId, setShopId] = useState(String(selectedShopId || ""));
  const [orders, setOrders] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [documentType, setDocumentType] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("printable");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewName, setPreviewName] = useState("");

  useEffect(() => {
    if (selectedShopId) setShopId(String(selectedShopId));
  }, [selectedShopId]);

  useEffect(() => () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const loadOrders = useCallback(async () => {
    if (!shopId) {
      setOrders([]);
      setPackages([]);
      setSelectedPackages([]);
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    setPackages([]);
    setSelectedPackages([]);
    setStatuses([]);
    setPreviewUrl("");
    try {
      const response = await shopeeApi.getOrders({ shopId, page: 1, limit: 100 });
      const data = unwrap(response);
      const list = Array.isArray(data?.orders) ? data.orders : Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setOrders(list);

      const candidates = list.filter((order) => eligibleStatuses.has(getStatus(order)) && getOrderSn(order));
      if (!candidates.length) {
        setNotice("Hiện không có đơn ở trạng thái Shopee cho phép lấy vận đơn.");
        return;
      }

      // Kiểm tra khả năng tạo vận đơn ngay khi tải danh sách, theo giới hạn 50 đơn/lần của Shopee.
      const responses = await Promise.all(chunks(candidates, 50).map((batch) =>
        shopeeApi.getOfficialWaybillParameters({
          shopId,
          orderList: batch.map((order) => ({ orderSn: getOrderSn(order) })),
        })
      ));
      const rows = responses.flatMap((result) => {
        const value = unwrap(result);
        return Array.isArray(value) ? value : [];
      });
      const valid = rows.filter((item) => !item.fail_error && item.order_sn);
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
      const suggested = normalized[0]?.suggest_shipping_document_type || "";
      setDocumentType(commonTypes.includes(suggested) ? suggested : commonTypes[0] || "");

      // Nếu vận đơn đã được tạo từ trước, lấy luôn trạng thái READY để hiện đúng kiện có thể in.
      try {
        const statusResponses = await Promise.all(chunks(normalized, 50).map((batch) =>
          shopeeApi.getOfficialWaybillResult({
            shopId,
            orderList: batch.map((item) => ({
              orderSn: item.order_sn,
              packageNumber: item.package_number,
              shippingDocumentType: item.suggest_shipping_document_type || item.selectedType,
            })),
          })
        ));
        const existingStatuses = statusResponses.flatMap((result) => {
          const value = unwrap(result);
          return Array.isArray(value) ? value : [];
        });
        setStatuses(existingStatuses);
      } catch {
        // Không chặn danh sách đơn nếu Shopee chưa có trạng thái vận đơn để trả về.
      }
      const failedCount = rows.length - valid.length;
      setNotice(`Đã tải ${list.length} đơn · ${normalized.length} kiện đủ điều kiện lấy vận đơn${failedCount ? ` · ${failedCount} kiện Shopee từ chối` : ""}.`);
    } catch (err) {
      setError(err.message || "Không tải được danh sách đơn hoặc kiểm tra điều kiện in.");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const orderMap = useMemo(() => new Map(orders.map((order) => [getOrderSn(order), order])), [orders]);
  const filteredPackages = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return packages.filter((item) => {
      const order = orderMap.get(String(item.order_sn));
      const matchesSearch = !keyword || [item.order_sn, item.tracking_number, item.package_number, order?.recipientName, order?.buyerUsername]
        .some((value) => String(value || "").toLowerCase().includes(keyword));
      const status = statuses.find((row) => String(row.order_sn) === String(item.order_sn) && String(row.package_number || "") === String(item.package_number || ""));
      const matchesFilter = filter === "all" || (filter === "printable" && (!status || status.status === "READY")) ||
        (filter === "processing" && status?.status === "PROCESSING") || (filter === "failed" && (status?.status === "FAILED" || status?.fail_error));
      return matchesSearch && matchesFilter;
    });
  }, [packages, orderMap, search, filter, statuses]);

  const selectedRows = packages.filter((item) => selectedPackages.includes(item.key));
  const orderPayload = selectedRows.map((item) => ({
    orderSn: item.order_sn,
    packageNumber: item.package_number,
    shippingDocumentType: documentType || item.selectedType,
  }));
  const readyCount = statuses.filter((item) => item.status === "READY").length;
  const processingCount = statuses.filter((item) => item.status === "PROCESSING").length;
  const failedCount = statuses.filter((item) => item.status === "FAILED" || item.fail_error).length;

  const togglePackage = (key) => setSelectedPackages((current) =>
    current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
  );

  const createDocuments = async () => {
    if (!orderPayload.length) return setError("Vui lòng chọn ít nhất một kiện hàng.");
    if (orderPayload.some((item) => !item.shippingDocumentType)) return setError("Chưa có loại vận đơn phù hợp.");
    setWorking("create");
    setError("");
    setNotice("");
    try {
      const result = await shopeeApi.createOfficialWaybills({ shopId, orderList: orderPayload });
      const value = unwrap(result);
      const rows = Array.isArray(value) ? value : [];
      const failed = rows.filter((item) => item.fail_error);
      setNotice(`Đã gửi yêu cầu tạo vận đơn · thành công: ${rows.length - failed.length} · lỗi: ${failed.length}. Hãy kiểm tra trạng thái để in.`);
      if (failed.length) setError(failed.map((item) => `${item.order_sn}: ${item.fail_message || item.fail_error}`).join("\n"));
    } catch (err) {
      setError(err.message || "Không tạo được vận đơn.");
    } finally {
      setWorking("");
    }
  };

  const checkStatus = async () => {
    if (!orderPayload.length) return setError("Vui lòng chọn kiện cần kiểm tra.");
    setWorking("status");
    setError("");
    try {
      const result = await shopeeApi.getOfficialWaybillResult({ shopId, orderList: orderPayload });
      const value = unwrap(result);
      const rows = Array.isArray(value) ? value : [];
      setStatuses((current) => {
        const next = new Map(current.map((item) => [String(item.order_sn) + "::" + String(item.package_number || ""), item]));
        rows.forEach((item) => next.set(String(item.order_sn) + "::" + String(item.package_number || ""), item));
        return [...next.values()];
      });
      const ready = rows.filter((item) => item.status === "READY").length;
      const processing = rows.filter((item) => item.status === "PROCESSING").length;
      const failed = rows.filter((item) => item.status === "FAILED" || item.fail_error).length;
      setNotice(`Kết quả kiểm tra: ${ready} sẵn sàng in · ${processing} đang xử lý · ${failed} lỗi.`);
      if (failed) setError(rows.filter((item) => item.status === "FAILED" || item.fail_error).map((item) => item.fail_message || item.fail_error).join("\n"));
    } catch (err) {
      setError(err.message || "Không kiểm tra được trạng thái vận đơn.");
    } finally {
      setWorking("");
    }
  };

  const previewDocuments = async () => {
    const readyRows = selectedRows.filter((item) => statuses.some((status) =>
      String(status.order_sn) === String(item.order_sn) &&
      String(status.package_number || "") === String(item.package_number || "") &&
      status.status === "READY"
    ));
    if (!readyRows.length) return setError("Chọn ít nhất một kiện có trạng thái READY để xem trước.");
    setWorking("preview");
    setError("");
    try {
      const result = await shopeeApi.downloadOfficialWaybills({
        shopId,
        orderList: readyRows.map((item) => ({
          orderSn: item.order_sn,
          packageNumber: item.package_number,
          shippingDocumentType: documentType || item.selectedType,
        })),
      });
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
      const url = window.URL.createObjectURL(result.blob);
      setPreviewUrl(url);
      setPreviewName(`shopee-waybill-${new Date().toISOString().slice(0, 10)}`);
      setNotice("Đã tải dữ liệu vận đơn từ Shopee. Bạn có thể xem trước ngay bên dưới hoặc mở file để in.");
    } catch (err) {
      setError(err.message || "Không lấy được file vận đơn.");
    } finally {
      setWorking("");
    }
  };

  const downloadPreview = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `${previewName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const openPreview = () => {
    if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="scw-page">
      <div className="scw-toolbar no-print">
        <div>
          <h2>Vận đơn Shopee</h2>
          <p>Danh sách tự kiểm tra điều kiện lấy vận đơn khi mở trang. Không tự thay đổi trạng thái đơn hoặc tồn kho.</p>
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
          <button onClick={loadOrders} disabled={loading || working !== ""}>
            <RefreshCw size={15} /> {loading ? "Đang tải..." : "Làm mới đơn"}
          </button>
        </div>
      </div>

      {error && <div className="scw-error no-print"><AlertCircle size={16} /> <span>{error}</span></div>}
      {notice && <div className="scw-notice no-print">{notice}</div>}

      <section className="scw-stats no-print">
        <div><span>Kiện đủ điều kiện</span><b>{packages.length}</b></div>
        <div><span>Sẵn sàng in</span><b>{readyCount}</b></div>
        <div><span>Đang xử lý</span><b>{processingCount}</b></div>
        <div><span>Lỗi vận đơn</span><b>{failedCount}</b></div>
      </section>

      <section className="scw-panel no-print">
        <div className="scw-panel-heading">
          <div><h3>Đơn hàng có thể lấy vận đơn</h3><small>Danh sách được lọc theo phản hồi điều kiện vận đơn của Shopee, không chỉ dựa vào trạng thái đơn.</small></div>
          <div className="scw-actions">
            <label className="scw-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã đơn, mã vận đơn, người nhận..." /></label>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="printable">Có thể in / chưa kiểm tra</option>
              <option value="processing">Đang xử lý</option>
              <option value="failed">Bị lỗi</option>
              <option value="all">Tất cả kiện đủ điều kiện</option>
            </select>
          </div>
        </div>

        <div className="scw-selection-bar">
          <span>Đã chọn <b>{selectedPackages.length}</b> / {packages.length} kiện</span>
          <button onClick={() => setSelectedPackages(filteredPackages.map((item) => item.key))}>Chọn danh sách đang xem</button>
          <button onClick={() => setSelectedPackages([])}>Bỏ chọn</button>
          <label className="scw-type-select">Khổ / loại vận đơn
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {[...new Set(packages.flatMap((item) => item.selectable_shipping_document_type || []))].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
        </div>

        <div className="scw-order-list">
          {filteredPackages.map((item) => {
            const order = orderMap.get(String(item.order_sn));
            const status = statuses.find((row) => String(row.order_sn) === String(item.order_sn) && String(row.package_number || "") === String(item.package_number || ""));
            const isReady = status?.status === "READY";
            return (
              <label className="scw-order-row" key={item.key}>
                <input type="checkbox" checked={selectedPackages.includes(item.key)} onChange={() => togglePackage(item.key)} />
                <span className="scw-order-info">
                  <b>{item.order_sn}</b>
                  <small>{order?.recipientName || order?.buyerUsername || "Người nhận"} · Kiện {item.package_number || "—"} · {order?.shippingCarrier || "Shopee"}</small>
                  <small>Mã vận đơn: {item.tracking_number || order?.trackingNumber || "Chưa có mã"}</small>
                </span>
                <strong>{money(order?.totalAmount || order?.total_amount)}</strong>
                <em className={isReady ? "is-ready" : status?.status === "FAILED" ? "is-failed" : "is-pending"}>
                  {isReady ? "Sẵn sàng in" : status?.status === "FAILED" ? "Lỗi" : status?.status || "Đủ điều kiện"}
                </em>
              </label>
            );
          })}
          {!filteredPackages.length && <div className="scw-empty">{loading ? "Đang kiểm tra đơn hàng..." : packages.length ? "Không có kiện phù hợp bộ lọc." : "Chưa có kiện đủ điều kiện. Hãy chọn shop và bấm Làm mới đơn."}</div>}
        </div>

        <div className="scw-selection-bar scw-bottom-actions">
          <button className="scw-primary" onClick={createDocuments} disabled={working !== "" || !selectedPackages.length}>
            {working === "create" ? "Đang gửi Shopee..." : "Tạo vận đơn đã chọn"}
          </button>
          <button onClick={checkStatus} disabled={working !== "" || !selectedPackages.length}>
            <Clock3 size={15} /> {working === "status" ? "Đang kiểm tra..." : "Kiểm tra trạng thái"}
          </button>
          <button className="scw-primary" onClick={previewDocuments} disabled={working !== "" || !selectedRows.some((item) => statuses.some((status) => String(status.order_sn) === String(item.order_sn) && String(status.package_number || "") === String(item.package_number || "") && status.status === "READY"))}>
            <Eye size={15} /> {working === "preview" ? "Đang lấy PDF..." : "Xem trước vận đơn"}
          </button>
        </div>
      </section>

      {previewUrl && (
        <section className="scw-panel scw-preview-panel">
          <div className="scw-panel-heading">
            <div><h3><FileText size={18} /> Xem trước vận đơn</h3><small>File gốc do Shopee trả về.</small></div>
            <div className="scw-actions">
              <button onClick={downloadPreview}><Download size={15} /> Tải PDF</button>
              <button className="scw-primary" onClick={openPreview}><Printer size={15} /> Mở để in</button>
            </div>
          </div>
          <iframe title="Xem trước vận đơn Shopee" src={previewUrl} className="scw-pdf-frame" />
        </section>
      )}
    </div>
  );
}
