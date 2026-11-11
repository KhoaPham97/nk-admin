import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  RotateCcw,
  PackageCheck,
  Package,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Warehouse,
  ClipboardCheck,
  Save,
  Search,
  Loader2,
} from "lucide-react";
import { shopeeApi } from "../../services/shopeeApi";
import "./style/shopee-components.css";

const styles = `
.sr-page { display:flex; flex-direction:column; gap:16px; }
.sr-toolbar { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; }
.sr-toolbar h3 { margin:0; font-size:20px; }
.sr-toolbar p { margin:5px 0 0; color:#777; font-size:13px; }
.sr-actions { display:flex; gap:8px; flex-wrap:wrap; }
.sr-btn { border:0; border-radius:8px; padding:10px 14px; display:inline-flex; align-items:center; justify-content:center; gap:7px; cursor:pointer; font-weight:600; font-size:13px; }
.sr-btn:disabled { opacity:.55; cursor:not-allowed; }
.sr-primary { background:#ee4d2d; color:white; }
.sr-secondary { background:#f1f2f4; color:#333; }
.sr-success { background:#16834a; color:white; }
.sr-warning { background:#fff2d9; color:#925d00; }
.sr-danger { background:#ffe7e7; color:#b42318; }
.sr-card { background:var(--card-bg,#fff); border:1px solid var(--border-color,#e5e7eb); border-radius:12px; padding:16px; }
.sr-filters { display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:10px; align-items:end; }
.sr-field { display:flex; flex-direction:column; gap:6px; min-width:0; }
.sr-field label { font-size:12px; font-weight:600; color:var(--text-secondary,#666); }
.sr-field input,.sr-field select,.sr-field textarea { width:100%; box-sizing:border-box; border:1px solid var(--border-color,#ddd); border-radius:8px; padding:10px 11px; background:var(--input-bg,#fff); color:var(--text-color,inherit); outline:none; }
.sr-field input:focus,.sr-field select:focus,.sr-field textarea:focus { border-color:#ee4d2d; }
.sr-table-wrap { overflow:auto; }
.sr-table { width:100%; border-collapse:collapse; min-width:850px; }
.sr-table th,.sr-table td { padding:12px 10px; text-align:left; border-bottom:1px solid var(--border-color,#eee); font-size:13px; vertical-align:middle; }
.sr-table th { color:#777; font-weight:600; background:var(--table-head-bg,#fafafa); }
.sr-muted { color:#888; font-size:12px; }
.sr-status { display:inline-flex; padding:5px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
.sr-status.waiting { background:#fff2d9;color:#946200; }
.sr-status.in_transit { background:#e8f1ff;color:#245bb5; }
.sr-status.received { background:#e8f1ff;color:#245bb5; }
.sr-status.inspected { background:#f0eaff;color:#7041a6; }
.sr-status.partially_restocked { background:#fff2d9;color:#946200; }
.sr-status.restocked { background:#e4f7ec;color:#16834a; }
.sr-status.closed { background:#eee;color:#666; }
.sr-alert { padding:11px 13px; border-radius:8px; font-size:13px; line-height:1.6; }
.sr-alert.error { background:#fff0f0;color:#b42318; }
.sr-alert.success { background:#e8f8ee;color:#167344; }
.sr-empty { padding:35px 15px; text-align:center; color:#888; }
.sr-pagination { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:14px; }
.sr-modal-backdrop { position:fixed; inset:0; z-index:9999; background:#0008; display:flex; justify-content:center; align-items:center; padding:15px; }
.sr-modal { width:min(850px,100%); max-height:90vh; overflow:auto; background:var(--card-bg,#fff); color:var(--text-color,#222); border-radius:14px; padding:20px; box-shadow:0 15px 60px #0003; }
.sr-modal-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:16px; }
.sr-modal-head h3 { margin:0; font-size:18px; }
.sr-icon-btn { border:0; background:transparent; cursor:pointer; padding:6px; color:inherit; }
.sr-items { display:flex; flex-direction:column; gap:12px; }
.sr-item { border:1px solid var(--border-color,#e5e7eb); border-radius:10px; padding:13px; }
.sr-item-title { font-weight:700; margin-bottom:5px; }
.sr-item-meta { color:#888; font-size:12px; margin-bottom:12px; }
.sr-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.sr-info { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-bottom:16px; }
.sr-info > div { background:var(--table-head-bg,#f8f8f8); border-radius:8px; padding:10px; min-width:0; }
.sr-info small { display:block; color:#888; margin-bottom:5px; }
.sr-info strong { overflow-wrap:anywhere; }
.sr-choice { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.sr-choice label { display:flex; align-items:flex-start; gap:9px; padding:13px; border:1px solid var(--border-color,#ddd); border-radius:10px; cursor:pointer; }
.sr-choice input { margin-top:3px; }
.sr-choice strong { display:block; margin-bottom:4px; }
.sr-choice small { color:#888; line-height:1.5; }
.sr-modal-actions { display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap; margin-top:18px; }
.sr-link { border:0; padding:0; background:transparent; color:#ee4d2d; font-weight:700; cursor:pointer; text-align:left; }
.sr-link:hover { text-decoration:underline; }
.sr-order-link { border:0; padding:0; background:transparent; color:inherit; cursor:pointer; text-align:left; }
.sr-order-link:hover { color:#ee4d2d; text-decoration:underline; }
.sr-detail-loading { min-height:180px; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:12px; color:#888; }
.sr-spin { animation:sr-spin 1s linear infinite; }
@keyframes sr-spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
@media(max-width:750px) {
 .sr-filters { grid-template-columns:1fr 1fr; }
 .sr-grid,.sr-info { grid-template-columns:1fr; }
}
@media(max-width:480px) {
 .sr-filters,.sr-choice { grid-template-columns:1fr; }
 .sr-card { padding:12px; }
 .sr-modal { padding:14px; }
}
`;

const STATUS_LABELS = {
  waiting: "Chờ nhận hàng",
  in_transit: "Đang vận chuyển",
  received: "Đã nhận hàng",
  inspected: "Đã kiểm tra",
  partially_restocked: "Đã lưu kho một phần",
  restocked: "Đã lưu kho",
  closed: "Đã đóng",
};

const money = (value) => Number(value || 0).toLocaleString("vi-VN") + " đ";

const getPayload = (res) => res?.data?.data ?? res?.data ?? res?.result ?? res;

const getList = (res) => {
  const data = getPayload(res);
  if (Array.isArray(data)) return data;
  return data?.returns || data?.items || data?.results || data?.list || [];
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.data?.message ||
  error?.message ||
  "Có lỗi xảy ra.";

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString("vi-VN");
};

export default function ShopeeReturns() {
  const [returns, setReturns] = useState([]);
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [warehouseStatus, setWarehouseStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState("");
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("RESTOCK");
  const [inspectionItems, setInspectionItems] = useState([]);

  const selectedShopId = useMemo(() => {
    if (shopId) return shopId;

    return shops.length === 1
      ? String(shops[0].shopId || shops[0].shop_id || "")
      : "";
  }, [shopId, shops]);

  const loadShops = useCallback(async () => {
    try {
      const res = await shopeeApi.getShops();
      const data = getPayload(res);

      const list = Array.isArray(data)
        ? data
        : data?.shops || data?.items || [];

      setShops(list);

      if (list.length === 1) {
        setShopId(String(list[0].shopId || list[0].shop_id || ""));
      }
    } catch (e) {
      console.error("Load Shopee shops:", e);
      setError(getErrorMessage(e));
    }
  }, []);

  const loadReturns = useCallback(async () => {
    if (!selectedShopId) {
      setReturns([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await shopeeApi.getReturns({
        shopId: selectedShopId,
        page,
        limit,
        keyword,
        warehouseStatus,
      });

      const data = getPayload(res);
      const list = getList(res);

      setReturns(list);
      setTotal(Number(data?.total ?? data?.pagination?.total ?? list.length));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [selectedShopId, page, limit, keyword, warehouseStatus]);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const syncReturns = async () => {
    if (!selectedShopId) {
      setError("Vui lòng chọn shop Shopee trước khi đồng bộ.");
      return;
    }

    setSyncing(true);
    setError("");
    setNotice("");

    try {
      const res = await shopeeApi.syncReturns({
        shopId: selectedShopId,
      });

      const data = getPayload(res);

      setNotice(
        data?.message ||
          res?.message ||
          `Đồng bộ hoàn tất. Đã lưu ${data?.totalSaved ?? data?.synced ?? data?.total ?? 0} yêu cầu trả hàng.`,
      );

      await loadReturns();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSyncing(false);
    }
  };

  // Bấm mã hoàn, mã đơn hoặc nút xem đều gọi API chi tiết.
  const openDetail = async (returnDoc) => {
    if (!returnDoc?.returnSn) {
      setError("Không tìm thấy mã trả hàng.");
      return;
    }

    if (!selectedShopId) {
      setError("Vui lòng chọn shop Shopee.");
      return;
    }

    setSelected(returnDoc);
    setModal("detail");
    setDetailLoading(true);
    setError("");
    setNotice("");

    try {
      const res = await shopeeApi.getReturnDetail(returnDoc.returnSn, {
        shopId: selectedShopId,
      });

      const data = getPayload(res);
      const detail =
        data?.return ||
        data?.returnDoc ||
        data?.data?.return ||
        data?.data ||
        data;

      if (!detail?.returnSn) {
        throw new Error("API không trả về thông tin chi tiết đơn hoàn.");
      }

      setSelected(detail);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const openReceive = (returnDoc) => {
    setSelected(returnDoc);
    setNote("");
    setModal("receive");
    setError("");
  };

  const openInspect = (returnDoc) => {
    setSelected(returnDoc);
    setNote("");
    setError("");

    setInspectionItems(
      (returnDoc.items || []).map((item) => ({
        itemId: item.itemId,
        modelId: item.modelId,
        variantCode: item.variantCode || "",
        receivedQty: Number(item.receivedQty || 0),
        goodQty: Number(item.goodQty || 0),
        damagedQty: Number(item.damagedQty || 0),
      })),
    );

    setModal("inspect");
  };

  const openResolve = (returnDoc) => {
    setSelected(returnDoc);
    setResolution("RESTOCK");
    setNote("");
    setError("");
    setModal("resolve");
  };

  const closeModal = () => {
    if (processing || detailLoading) return;

    setModal("");
    setSelected(null);
  };

  const updateInspection = (index, field, value) => {
    setInspectionItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value === "" ? "" : Number(value),
            }
          : item,
      ),
    );
  };

  const receiveReturn = async () => {
    if (!selected) return;

    setProcessing(true);
    setError("");

    try {
      await shopeeApi.receiveShopeeReturn(selected.returnSn, {
        shopId: selectedShopId,
        note,
      });

      setNotice("Đã xác nhận tiếp nhận hàng hoàn. Tồn kho chưa thay đổi.");

      setModal("");
      setSelected(null);
      await loadReturns();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  const inspectReturn = async () => {
    if (!selected) return;

    for (const item of inspectionItems) {
      const received = Number(item.receivedQty);
      const good = Number(item.goodQty);
      const damaged = Number(item.damagedQty);

      if (
        !Number.isInteger(received) ||
        !Number.isInteger(good) ||
        !Number.isInteger(damaged) ||
        received < 0 ||
        good < 0 ||
        damaged < 0 ||
        good + damaged > received
      ) {
        setError(
          "Số lượng phải là số nguyên không âm và hàng tốt + hàng hỏng không được vượt quá số lượng thực nhận.",
        );
        return;
      }
    }

    setProcessing(true);
    setError("");

    try {
      await shopeeApi.inspectShopeeReturn(selected.returnSn, {
        shopId: selectedShopId,
        items: inspectionItems,
        note,
      });

      setNotice("Đã lưu kết quả kiểm tra hàng hoàn.");
      setModal("");
      setSelected(null);
      await loadReturns();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  const resolveStock = async () => {
    if (!selected) return;

    const message =
      resolution === "RESTOCK"
        ? "Chỉ cộng số lượng hàng tốt vào tồn kho và tạo InventoryBatch nguồn RETURN. Bạn xác nhận?"
        : "Không cộng lại bất kỳ số lượng nào vào tồn kho. Bạn xác nhận?";

    if (!window.confirm(message)) return;

    setProcessing(true);
    setError("");

    try {
      const res = await shopeeApi.resolveShopeeReturn(selected.returnSn, {
        shopId: selectedShopId,
        resolution,
        note,
      });

      const data = getPayload(res);

      setNotice(
        data?.message ||
          res?.message ||
          (resolution === "RESTOCK"
            ? "Đã xử lý lưu kho hàng hoàn."
            : "Đã xác nhận không lưu kho."),
      );

      setModal("");
      setSelected(null);
      await loadReturns();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  const renderStatus = (status) => (
    <span className={`sr-status ${status || "waiting"}`}>
      {STATUS_LABELS[status] || status || "Chưa xác định"}
    </span>
  );

  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <section className="sc-section sr-page">
      <style>{styles}</style>

      <div className="sr-toolbar">
        <div>
          <h3>Quản lý hàng hoàn Shopee</h3>
          <p>
            Đồng bộ yêu cầu trả hàng, kiểm tra hàng thực tế và xử lý tồn kho.
          </p>
        </div>

        <div className="sr-actions">
          <button
            className="sr-btn sr-secondary"
            onClick={loadReturns}
            disabled={loading || !selectedShopId}
          >
            <RefreshCw size={16} />
            Làm mới
          </button>

          <button
            className="sr-btn sr-primary"
            onClick={syncReturns}
            disabled={syncing || !selectedShopId}
          >
            <RotateCcw size={16} />
            {syncing ? "Đang đồng bộ..." : "Đồng bộ hàng hoàn"}
          </button>
        </div>
      </div>

      {error && <div className="sr-alert error">{error}</div>}
      {notice && <div className="sr-alert success">{notice}</div>}

      <div className="sr-card">
        <div className="sr-filters">
          <div className="sr-field">
            <label>Shop Shopee</label>
            <select
              value={shopId}
              onChange={(e) => {
                setShopId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">-- Chọn shop --</option>
              {shops.map((shop) => {
                const id = String(shop.shopId || shop.shop_id || "");

                return (
                  <option key={id} value={id}>
                    {shop.shopName ||
                      shop.shop_name ||
                      shop.name ||
                      `Shop ${id}`}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="sr-field">
            <label>Tìm kiếm</label>
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="Mã hoàn / mã đơn..."
            />
          </div>

          <div className="sr-field">
            <label>Trạng thái kho</label>
            <select
              value={warehouseStatus}
              onChange={(e) => {
                setWarehouseStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="sr-btn sr-secondary"
            onClick={() => {
              setKeyword("");
              setWarehouseStatus("");
              setPage(1);
            }}
          >
            Xóa lọc
          </button>
        </div>
      </div>

      <div className="sr-card">
        <div className="sr-toolbar" style={{ marginBottom: 12 }}>
          <div>
            <strong>Danh sách yêu cầu trả hàng</strong>
            <div className="sr-muted">
              Tổng cộng {total.toLocaleString("vi-VN")} yêu cầu
            </div>
          </div>
        </div>

        <div className="sr-table-wrap">
          <table className="sr-table">
            <thead>
              <tr>
                <th>Mã trả hàng</th>
                <th>Mã đơn Shopee</th>
                <th>Lý do</th>
                <th>Trạng thái Shopee</th>
                <th>Trạng thái kho</th>
                <th>Ngày cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="sr-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="sr-empty">
                    <Package size={28} />
                    <div>Chưa có yêu cầu trả hàng</div>
                  </td>
                </tr>
              ) : (
                returns.map((item) => (
                  <tr key={`${item.shopId}-${item.returnSn}`}>
                    <td>
                      <button
                        type="button"
                        className="sr-link"
                        onClick={() => openDetail(item)}
                      >
                        {item.returnSn}
                      </button>

                      <div className="sr-muted">
                        {item.items?.length || 0} sản phẩm
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="sr-order-link"
                        onClick={() => openDetail(item)}
                      >
                        {item.orderSn || "--"}
                      </button>
                    </td>

                    <td>{item.textReason || item.reason || "--"}</td>

                    <td>{item.shopeeStatus || "--"}</td>

                    <td>{renderStatus(item.warehouseStatus)}</td>

                    <td>{formatDate(item.updateTime || item.updatedAt)}</td>

                    <td>
                      <div className="sr-actions">
                        <button
                          className="sr-btn sr-secondary"
                          title="Xem chi tiết"
                          onClick={() => openDetail(item)}
                        >
                          <Eye size={15} />
                        </button>

                        {["waiting", "in_transit"].includes(
                          item.warehouseStatus,
                        ) && (
                          <button
                            className="sr-btn sr-success"
                            title="Xác nhận nhận hàng"
                            onClick={() => openReceive(item)}
                          >
                            <PackageCheck size={15} />
                          </button>
                        )}

                        {item.warehouseStatus === "received" && (
                          <button
                            className="sr-btn sr-warning"
                            title="Kiểm tra hàng"
                            onClick={() => openInspect(item)}
                          >
                            <ClipboardCheck size={15} />
                          </button>
                        )}

                        {item.warehouseStatus === "inspected" && (
                          <button
                            className="sr-btn sr-primary"
                            title="Xử lý tồn kho"
                            onClick={() => openResolve(item)}
                          >
                            <Warehouse size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="sr-pagination">
          <span className="sr-muted">
            Trang {page}/{pageCount}
          </span>

          <div className="sr-actions">
            <button
              className="sr-btn sr-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trang trước
            </button>

            <button
              className="sr-btn sr-secondary"
              disabled={page >= pageCount || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

      {modal && selected && (
        <div
          className="sr-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="sr-modal">
            <div className="sr-modal-head">
              <div>
                <h3>
                  {modal === "detail" && "Chi tiết hàng hoàn"}
                  {modal === "receive" && "Xác nhận nhận hàng"}
                  {modal === "inspect" && "Kiểm tra hàng hoàn"}
                  {modal === "resolve" && "Xử lý tồn kho hàng hoàn"}
                </h3>

                <div className="sr-muted">Mã hoàn: {selected.returnSn}</div>
              </div>

              <button
                className="sr-icon-btn"
                onClick={closeModal}
                title="Đóng"
                disabled={processing || detailLoading}
              >
                <XCircle size={22} />
              </button>
            </div>

            {modal === "detail" && detailLoading ? (
              <div className="sr-detail-loading">
                <Loader2 size={32} className="sr-spin" />
                <div>Đang tải chi tiết đơn hoàn...</div>
              </div>
            ) : (
              <>
                <div className="sr-info">
                  <div>
                    <small>Mã đơn Shopee</small>
                    <strong>{selected.orderSn || "--"}</strong>
                  </div>

                  <div>
                    <small>Trạng thái kho</small>
                    {renderStatus(selected.warehouseStatus)}
                  </div>

                  <div>
                    <small>Lý do trả hàng</small>
                    <strong>
                      {selected.textReason || selected.reason || "--"}
                    </strong>
                  </div>

                  <div>
                    <small>Tiền hoàn</small>
                    <strong>{money(selected.refundAmount)}</strong>
                  </div>
                </div>

                {modal === "detail" && (
                  <>
                    <h4>Sản phẩm trong yêu cầu hoàn</h4>

                    <div className="sr-items">
                      {(selected.items || []).map((item, index) => (
                        <div className="sr-item" key={index}>
                          <div className="sr-item-title">
                            {item.itemName ||
                              item.variantName ||
                              `Sản phẩm ${index + 1}`}
                          </div>

                          <div className="sr-item-meta">
                            SKU: {item.variationSku || item.itemSku || "--"}
                            {" · "}
                            Mã phân loại: {item.variantCode || "--"}
                          </div>

                          <div className="sr-grid">
                            <div>
                              <small>Yêu cầu hoàn</small>
                              <strong>{item.requestedQty ?? 0}</strong>
                            </div>

                            <div>
                              <small>Thực nhận</small>
                              <strong>{item.receivedQty ?? 0}</strong>
                            </div>

                            <div>
                              <small>Hàng tốt</small>
                              <strong>{item.goodQty ?? 0}</strong>
                            </div>

                            <div>
                              <small>Hàng hỏng</small>
                              <strong>{item.damagedQty ?? 0}</strong>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(selected.items || []).length === 0 && (
                        <div className="sr-empty">
                          API chưa trả về sản phẩm trong yêu cầu hoàn.
                        </div>
                      )}
                    </div>
                  </>
                )}

                {modal === "receive" && (
                  <>
                    <div className="sr-alert success">
                      Xác nhận này chỉ ghi nhận hàng đã về kho. Chưa cộng tồn
                      kho. Bạn cần kiểm tra hàng trước khi chọn phương án xử lý.
                    </div>

                    <div className="sr-field" style={{ marginTop: 14 }}>
                      <label>Ghi chú nhận hàng</label>
                      <textarea
                        rows="3"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ví dụ: Đã nhận đủ kiện, bao bì còn nguyên..."
                      />
                    </div>

                    <div className="sr-modal-actions">
                      <button
                        className="sr-btn sr-secondary"
                        onClick={closeModal}
                      >
                        Hủy
                      </button>

                      <button
                        className="sr-btn sr-success"
                        disabled={processing}
                        onClick={receiveReturn}
                      >
                        <PackageCheck size={16} />
                        {processing ? "Đang xử lý..." : "Xác nhận đã nhận"}
                      </button>
                    </div>
                  </>
                )}

                {modal === "inspect" && (
                  <>
                    <div className="sr-alert">
                      Nhập số lượng thực tế đã nhận, số lượng hàng tốt và hàng
                      hỏng. Hàng hỏng sẽ không được cộng vào tồn kho bán được.
                    </div>

                    <div className="sr-items" style={{ marginTop: 14 }}>
                      {inspectionItems.map((item, index) => {
                        const original = selected.items?.[index] || {};

                        return (
                          <div className="sr-item" key={index}>
                            <div className="sr-item-title">
                              {original.itemName ||
                                original.variantName ||
                                `Sản phẩm ${index + 1}`}
                            </div>

                            <div className="sr-item-meta">
                              Mã phân loại: {item.variantCode || "--"}
                            </div>

                            <div className="sr-grid">
                              <div className="sr-field">
                                <label>Số lượng thực nhận</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.receivedQty}
                                  onChange={(e) =>
                                    updateInspection(
                                      index,
                                      "receivedQty",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>

                              <div className="sr-field">
                                <label>Hàng tốt</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.goodQty}
                                  onChange={(e) =>
                                    updateInspection(
                                      index,
                                      "goodQty",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>

                              <div className="sr-field">
                                <label>Hàng hỏng</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={item.damagedQty}
                                  onChange={(e) =>
                                    updateInspection(
                                      index,
                                      "damagedQty",
                                      e.target.value,
                                    )
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="sr-field" style={{ marginTop: 14 }}>
                      <label>Ghi chú kiểm tra</label>
                      <textarea
                        rows="2"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Mô tả tình trạng sản phẩm..."
                      />
                    </div>

                    <div className="sr-modal-actions">
                      <button
                        className="sr-btn sr-secondary"
                        onClick={closeModal}
                      >
                        Hủy
                      </button>

                      <button
                        className="sr-btn sr-success"
                        disabled={processing}
                        onClick={inspectReturn}
                      >
                        <Save size={16} />
                        {processing ? "Đang lưu..." : "Lưu kết quả kiểm tra"}
                      </button>
                    </div>
                  </>
                )}

                {modal === "resolve" && (
                  <>
                    <div className="sr-alert">
                      Chỉ xử lý sau khi đã kiểm tra hàng. Nếu chọn lưu kho, hệ
                      thống chỉ cộng số lượng hàng tốt đã kiểm tra.
                    </div>

                    <div className="sr-choice" style={{ marginTop: 14 }}>
                      <label>
                        <input
                          type="radio"
                          name="returnResolution"
                          value="RESTOCK"
                          checked={resolution === "RESTOCK"}
                          onChange={(e) => setResolution(e.target.value)}
                        />

                        <span>
                          <strong>
                            <CheckCircle2
                              size={16}
                              style={{ verticalAlign: "middle" }}
                            />{" "}
                            Lưu kho
                          </strong>

                          <small>
                            Cộng hàng tốt trở lại tồn kho và tạo lô nhập hoàn
                            nguồn RETURN. Hàng hỏng không được cộng.
                          </small>
                        </span>
                      </label>

                      <label>
                        <input
                          type="radio"
                          name="returnResolution"
                          value="NO_RESTOCK"
                          checked={resolution === "NO_RESTOCK"}
                          onChange={(e) => setResolution(e.target.value)}
                        />

                        <span>
                          <strong>
                            <AlertTriangle
                              size={16}
                              style={{ verticalAlign: "middle" }}
                            />{" "}
                            Không lưu kho
                          </strong>

                          <small>
                            Không cộng lại tồn kho. Dùng khi hàng không nhập lại
                            kho bán hoặc đã xử lý riêng.
                          </small>
                        </span>
                      </label>
                    </div>

                    <div className="sr-field" style={{ marginTop: 14 }}>
                      <label>Ghi chú xử lý</label>
                      <textarea
                        rows="2"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ghi chú nội bộ..."
                      />
                    </div>

                    <div className="sr-modal-actions">
                      <button
                        className="sr-btn sr-secondary"
                        onClick={closeModal}
                      >
                        Hủy
                      </button>

                      <button
                        className="sr-btn sr-primary"
                        disabled={processing}
                        onClick={resolveStock}
                      >
                        <Warehouse size={16} />
                        {processing ? "Đang xử lý..." : "Xác nhận xử lý"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
