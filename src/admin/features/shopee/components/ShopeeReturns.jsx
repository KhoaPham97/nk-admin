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
  Loader2,
  ChevronDown,
  Image as ImageIcon,
  Video,
  ExternalLink,
} from "lucide-react";
import { shopeeApi } from "../../../services/shopeeApi";
import "../styles/shopee-components.css";

const styles = `
.sr-page{display:flex;flex-direction:column;gap:16px;color:var(--text-color,#222)}
.sr-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.sr-toolbar h3{margin:0;font-size:20px}.sr-toolbar p{margin:5px 0 0;color:#888;font-size:13px}
.sr-actions{display:flex;gap:8px;flex-wrap:wrap}
.sr-btn{border:0;border-radius:8px;padding:10px 14px;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;font-weight:600;font-size:13px}
.sr-btn:disabled{opacity:.5;cursor:not-allowed}
.sr-primary{background:#ee4d2d;color:white}.sr-secondary{background:#f1f2f4;color:#333}
.sr-success{background:#16834a;color:white}.sr-warning{background:#fff2d9;color:#925d00}
.sr-danger{background:#ffe7e7;color:#b42318}
.sr-card{background:var(--card-bg,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:12px;padding:16px}
.sr-filters{display:grid;grid-template-columns:1.5fr 1.5fr 1fr 1fr auto;gap:10px;align-items:end}
.sr-field{display:flex;flex-direction:column;gap:6px;min-width:0}
.sr-field label{font-size:12px;font-weight:600;color:var(--text-secondary,#666)}
.sr-field input,.sr-field select,.sr-field textarea{width:100%;box-sizing:border-box;border:1px solid var(--border-color,#ddd);border-radius:8px;padding:10px 11px;background:var(--input-bg,#fff);color:var(--text-color,inherit);outline:none}
.sr-field input:focus,.sr-field select:focus,.sr-field textarea:focus{border-color:#ee4d2d}
.sr-table-wrap{overflow:auto}.sr-table{width:100%;border-collapse:collapse;min-width:1150px}
.sr-table th,.sr-table td{padding:11px 10px;text-align:left;border-bottom:1px solid var(--border-color,#eee);font-size:13px;vertical-align:middle}
.sr-table th{color:#777;font-weight:600;background:var(--table-head-bg,#fafafa);white-space:nowrap}
.sr-muted{color:#888;font-size:12px;line-height:1.6}
.sr-status{display:inline-flex;padding:5px 9px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;background:#eee;color:#555}
.sr-status.waiting{background:#fff2d9;color:#946200}.sr-status.in_transit{background:#e8f1ff;color:#245bb5}
.sr-status.received{background:#e8f1ff;color:#245bb5}.sr-status.inspected{background:#f0eaff;color:#7041a6}
.sr-status.partially_restocked{background:#fff2d9;color:#946200}.sr-status.restocked{background:#e4f7ec;color:#16834a}
.sr-status.closed{background:#eee;color:#666}
.sr-alert{padding:11px 13px;border-radius:8px;font-size:13px;line-height:1.6}
.sr-alert.error{background:#fff0f0;color:#b42318}.sr-alert.success{background:#e8f8ee;color:#167344}
.sr-empty{padding:35px 15px;text-align:center;color:#888}
.sr-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px}
.sr-modal-backdrop{position:fixed;inset:0;z-index:9999;background:#0009;display:flex;justify-content:center;align-items:center;padding:12px}
.sr-modal{width:min(1100px,100%);max-height:94vh;overflow:auto;background:var(--card-bg,#fff);color:var(--text-color,#222);border-radius:14px;padding:20px;box-shadow:0 15px 60px #0003}
.sr-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;position:sticky;top:-20px;background:var(--card-bg,#fff);z-index:3;padding:8px 0}
.sr-modal-head h3{margin:0;font-size:18px}.sr-icon-btn{border:0;background:transparent;cursor:pointer;padding:6px;color:inherit}
.sr-section{border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:14px;margin:13px 0}
.sr-section h4{margin:0 0 12px;font-size:15px}
.sr-info{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.sr-info>div{background:var(--table-head-bg,#f8f8f8);border-radius:8px;padding:10px;min-width:0}
.sr-info small{display:block;color:#888;margin-bottom:5px;font-size:11px}
.sr-info strong{overflow-wrap:anywhere;font-size:13px}
.sr-items{display:flex;flex-direction:column;gap:12px}
.sr-item{border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:13px}
.sr-item-head{display:flex;gap:12px;align-items:flex-start}
.sr-item-img{width:76px;height:76px;object-fit:contain;border:1px solid #eee;border-radius:8px;background:white;flex-shrink:0}
.sr-item-title{font-weight:700;margin-bottom:5px;line-height:1.5}
.sr-item-meta{color:#888;font-size:12px;line-height:1.7;overflow-wrap:anywhere}
.sr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.sr-grid>div{min-width:0}.sr-grid small{display:block;color:#888;font-size:11px;margin-bottom:4px}
.sr-grid strong{font-size:13px;overflow-wrap:anywhere}
.sr-choice{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.sr-choice label{display:flex;align-items:flex-start;gap:9px;padding:13px;border:1px solid var(--border-color,#ddd);border-radius:10px;cursor:pointer}
.sr-choice input{margin-top:3px}.sr-choice strong{display:block;margin-bottom:4px}.sr-choice small{color:#888;line-height:1.5}
.sr-modal-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:18px}
.sr-link,.sr-order-link{border:0;padding:0;background:transparent;color:#ee4d2d;font-weight:700;cursor:pointer;text-align:left}
.sr-order-link{color:inherit}.sr-detail-loading{min-height:180px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:12px;color:#888}
.sr-spin{animation:sr-spin 1s linear infinite}@keyframes sr-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.sr-code{font-family:monospace;font-size:12px;overflow-wrap:anywhere}
.sr-media{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.sr-media a{display:block}.sr-media img{width:105px;height:105px;object-fit:cover;border-radius:8px;border:1px solid #ddd}
.sr-video{display:flex;align-items:center;gap:7px;padding:9px;border:1px solid #ddd;border-radius:8px;color:#ee4d2d;text-decoration:none;font-size:12px}
.sr-details{border:1px solid var(--border-color,#ddd);border-radius:8px;margin:10px 0;overflow:hidden}
.sr-details summary{padding:11px 13px;cursor:pointer;font-weight:700;font-size:13px;background:var(--table-head-bg,#fafafa)}
.sr-json{padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:450px;overflow:auto;font-size:11px;line-height:1.6;background:#f7f7f7;color:#333;border-radius:0 0 8px 8px}
.sr-kv{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sr-kv>div{padding:9px;background:var(--table-head-bg,#f8f8f8);border-radius:7px;min-width:0}
.sr-kv small{display:block;color:#888;font-size:11px;margin-bottom:4px}
.sr-kv strong{font-size:12px;overflow-wrap:anywhere}
.sr-tag{display:inline-block;padding:3px 7px;border-radius:5px;background:#eee;font-size:11px;margin:2px}
@media(max-width:850px){.sr-filters{grid-template-columns:1fr 1fr}.sr-info{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.sr-grid,.sr-info,.sr-kv,.sr-choice{grid-template-columns:1fr}.sr-card{padding:12px}.sr-modal{padding:13px}.sr-modal-head{top:-13px}}
`;

const STATUS_LABELS = {
  waiting: "Chờ nhận hàng",
  in_transit: "Đang vận chuyển",
  received: "Đã nhận hàng",
  inspected: "Đã kiểm tra",
  partially_restocked: "Đã nhập kho một phần",
  restocked: "Đã nhập kho",
  closed: "Đã hoàn tất",
};

const REASON_LABELS = {
  CHANGE_MIND: "Đổi ý không muốn mua nữa",
  CHANGE_OF_MIND: "Đổi ý không muốn mua nữa",
  DIFFERENT_DESCRIPTION: "Sản phẩm không đúng mô tả",
  FUNCTIONAL_DMG: "Sản phẩm bị lỗi chức năng",
  PHYSICAL_DMG: "Sản phẩm bị hư hỏng vật lý",
  MISSING_ITEM: "Thiếu sản phẩm",
  WRONG_ITEM: "Giao sai sản phẩm",
  ITEM_NOT_RECEIVED: "Chưa nhận được hàng",
  NOT_AS_DESCRIBED: "Không giống mô tả",
  OTHER: "Lý do khác",
};

const SHOPEE_STATUS = {
  PROCESSING: "Đang xử lý",
  ACCEPTED: "Đã chấp nhận",
  CANCELLED: "Đã hủy",
  CLOSED: "Đã đóng",
  JUDGING: "Shopee đang xem xét",
  COMPLETED: "Đã hoàn tất",
  REQUESTED: "Đã gửi yêu cầu",
  REFUND_PAID: "Đã hoàn tiền",
  RETURNED: "Đã trả hàng",
};

const LOGISTICS_STATUS = {
  LOGISTICS_REQUEST_CREATED: "Đã tạo yêu cầu vận chuyển hoàn",
  LOGISTICS_PICKUP_DONE: "Đã lấy hàng hoàn",
  LOGISTICS_DELIVERY_DONE: "Đã giao hàng hoàn",
  LOGISTICS_DELIVERY_FAILED: "Giao hàng hoàn thất bại",
  LOGISTICS_PENDING: "Chờ vận chuyển",
  LOGISTICS_IN_TRANSIT: "Đang vận chuyển",
  "-": "Không có thông tin",
};

const FIELD_LABELS = {
  _id: "Mã bản ghi hệ thống",
  returnSn: "Mã yêu cầu hoàn",
  shopId: "Mã shop",
  orderSn: "Mã đơn hàng Shopee",
  packageNumber: "Mã kiện hàng",
  buyerUsername: "Tên tài khoản người mua",
  returnType: "Loại yêu cầu",
  sourceType: "Nguồn dữ liệu",
  status: "Trạng thái nội bộ",
  warehouseStatus: "Trạng thái xử lý kho",
  shopeeStatus: "Trạng thái Shopee",
  shopeeReturnStatus: "Trạng thái yêu cầu hoàn trên Shopee",
  returnReason: "Mã lý do trả hàng",
  reason: "Mã lý do",
  textReason: "Mô tả lý do từ người mua",
  returnDescription: "Nội dung mô tả",
  refundAmount: "Số tiền hoàn",
  currency: "Đơn vị tiền tệ",
  trackingNumber: "Mã vận đơn hoàn",
  needsLogistics: "Cần vận chuyển hoàn",
  requestType: "Loại yêu cầu Shopee",
  requestedShopeeQty: "Tổng số lượng yêu cầu hoàn",
  totalRequestedQty: "Tổng số lượng yêu cầu",
  totalReceivedQty: "Tổng số lượng thực nhận",
  totalGoodQty: "Tổng số lượng hàng tốt",
  totalDamagedQty: "Tổng số lượng hàng lỗi",
  restockedStockQty: "Số lượng đã nhập kho",
  resolution: "Phương án xử lý",
  resolutionNote: "Ghi chú xử lý",
  resolutionAt: "Thời điểm xử lý",
  resolutionBy: "Người xử lý",
  resolvedAt: "Thời điểm hoàn tất xử lý",
  resolvedBy: "Người hoàn tất xử lý",
  isReceived: "Đã xác nhận nhận hàng",
  receivedAt: "Thời điểm nhận hàng",
  receivedBy: "Người nhận hàng",
  isInspected: "Đã kiểm tra hàng",
  inspectedAt: "Thời điểm kiểm tra",
  inspectedBy: "Người kiểm tra",
  stockProcessed: "Đã xử lý tồn kho",
  stockProcessedAt: "Thời điểm xử lý tồn kho",
  createTime: "Thời điểm tạo yêu cầu trên Shopee",
  updateTime: "Thời điểm cập nhật trên Shopee",
  createdAt: "Ngày tạo bản ghi",
  updatedAt: "Ngày cập nhật bản ghi",
  syncedAt: "Lần đồng bộ gần nhất",
  lastSyncedAt: "Thời điểm đồng bộ cuối",
  lastSyncError: "Lỗi đồng bộ gần nhất",
  returnShipDueDate: "Hạn gửi hàng hoàn",
  returnSellerDueDate: "Hạn người bán xử lý",
  validationType: "Loại xác minh",
  total: "Tổng số",
  itemId: "Mã sản phẩm Shopee",
  modelId: "Mã phân loại Shopee",
  itemName: "Tên sản phẩm",
  modelName: "Tên phân loại",
  itemSku: "SKU sản phẩm",
  variationSku: "SKU phân loại",
  variantCode: "Mã phân loại nội bộ",
  variantName: "Tên phân loại nội bộ",
  productId: "Mã sản phẩm trong kho",
  mappingStatus: "Trạng thái ghép sản phẩm",
  isMapped: "Đã ghép sản phẩm",
  requestedQty: "Số lượng yêu cầu hoàn",
  receivedQty: "Số lượng thực nhận",
  goodQty: "Số lượng hàng tốt",
  damagedQty: "Số lượng hàng lỗi",
  restockedQty: "Số lượng đã nhập kho",
  quantityMultiplier: "Hệ số quy đổi",
  inspectionNote: "Ghi chú kiểm tra",
  stockProcessed: "Đã xử lý tồn kho",
  image: "Ảnh",
  images: "Danh sách ảnh",
  buyer_videos: "Video người mua cung cấp",
  username: "Tài khoản người mua",
  email: "Email người mua",
  portrait: "Ảnh đại diện",
  due_date: "Hạn xử lý yêu cầu",
  create_time: "Thời điểm tạo",
  update_time: "Thời điểm cập nhật",
  refund_amount: "Số tiền hoàn",
  amount_before_discount: "Giá trị trước giảm giá",
  tracking_number: "Mã vận đơn",
  needs_logistics: "Cần đơn vị vận chuyển",
  logistics_status: "Trạng thái vận chuyển",
  reverse_logistics_status: "Trạng thái vận chuyển ngược",
  reverse_logistics_channel_name: "Đơn vị vận chuyển hoàn",
  is_arrived_at_warehouse: "Đã đến kho Shopee",
  return_ship_due_date: "Hạn vận chuyển hàng hoàn",
  return_seller_due_date: "Hạn người bán xử lý",
  latest_solution: "Phương án thương lượng gần nhất",
  latest_offer_amount: "Số tiền đề nghị gần nhất",
  latest_offer_creator: "Người tạo đề nghị",
  negotiation_status: "Trạng thái thương lượng",
  counter_limit: "Số lần thương lượng tối đa",
  offer_due_date: "Hạn phản hồi đề nghị",
  seller_proof_status: "Trạng thái bằng chứng người bán",
  seller_evidence_deadline: "Hạn cung cấp bằng chứng",
  seller_compensation_status: "Trạng thái bồi thường",
  compensation_amount: "Số tiền bồi thường",
  is_partial_quantity_return: "Hoàn một phần số lượng",
  is_refund_amount_adjusted: "Số tiền hoàn đã điều chỉnh",
  return_refund_type: "Loại trả hàng/hoàn tiền",
  return_solution: "Mã phương án giải quyết",
  return_refund_request_type: "Loại yêu cầu trả hàng/hoàn tiền",
  validation_type: "Loại xác minh",
  is_seller_arrange: "Người bán tự sắp xếp vận chuyển",
  is_shipping_proof_mandatory: "Bắt buộc bằng chứng vận chuyển",
  has_uploaded_shipping_proof: "Đã tải bằng chứng vận chuyển",
  is_reverse_logistics_channel_integrated: "Đã tích hợp vận chuyển hoàn",
  reassessed_request_reason: "Lý do đánh giá lại",
  package_query_number: "Mã tra cứu kiện hàng",
  virtual_contact_number: "Số điện thoại liên hệ ảo",
  whs_id: "Mã kho nhận hàng",
  inspectionNote: "Ghi chú kiểm tra",
  batchCode: "Mã lô nhập kho",
  unitCost: "Giá vốn",
  beforeQty: "Tồn trước xử lý",
  afterQty: "Tồn sau xử lý",
};

const money = (value, currency = "VND") => {
  if (value === null || value === undefined || value === "") return "--";
  return `${Number(value).toLocaleString("vi-VN")} ${currency === "VND" ? "đ" : currency}`;
};

const formatDate = (value) => {
  if (!value || value === 0) return "--";
  let date = value;
  if (typeof value === "number") {
    date = new Date(value < 100000000000 ? value * 1000 : value);
  } else {
    date = new Date(value);
  }
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("vi-VN");
};

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
  "Đã xảy ra lỗi. Vui lòng thử lại.";

const translate = (key, value) => {
  if (value === null || value === undefined || value === "") return "--";
  if (key === "returnType" || key === "sourceType") {
    return value === "CUSTOMER_RETURN"
      ? "Khách trả hàng"
      : value === "DELIVERY_FAILED"
        ? "Giao hàng thất bại"
        : value;
  }
  if (key === "reason" || key === "returnReason") {
    return REASON_LABELS[value] || value;
  }
  if (
    key === "shopeeStatus" ||
    key === "shopeeReturnStatus" ||
    key === "status"
  ) {
    return SHOPEE_STATUS[value] || value;
  }
  if (key === "warehouseStatus") return STATUS_LABELS[value] || value;
  if (key === "logistics_status" || key === "reverse_logistics_status") {
    return LOGISTICS_STATUS[value] || value;
  }
  if (key === "mappingStatus") {
    return value === "mapped"
      ? "Đã ghép sản phẩm"
      : value === "unmapped"
        ? "Chưa ghép sản phẩm"
        : value === "ambiguous"
          ? "Có nhiều sản phẩm trùng khớp"
          : value;
  }
  if (key === "resolution") {
    return value === "RESTOCK"
      ? "Nhập lại kho"
      : value === "NO_RESTOCK"
        ? "Không nhập lại kho"
        : value;
  }
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
};

const labelOf = (key) => FIELD_LABELS[key] || key;

const Field = ({ label, value }) => (
  <div>
    <small>{label}</small>
    <strong>
      {value === null || value === undefined || value === "" ? "--" : value}
    </strong>
  </div>
);

function JsonDetails({ title, value, open = false }) {
  if (value === undefined || value === null) return null;
  return (
    <details className="sr-details" open={open}>
      <summary>{title}</summary>
      <pre className="sr-json">
        {JSON.stringify(
          value,
          (key, val) => {
            if (key === "email" && typeof val === "string" && val.includes("@"))
              return val;
            return val;
          },
          2,
        )}
      </pre>
    </details>
  );
}

function MediaGallery({ item, raw }) {
  const images = [
    ...(Array.isArray(item?.images) ? item.images : []),
    ...(item?.image ? [item.image] : []),
    ...(Array.isArray(raw?.image) ? raw.image : []),
  ].filter((url) => typeof url === "string" && /^https?:\/\//i.test(url));

  const videos = Array.isArray(raw?.buyer_videos) ? raw.buyer_videos : [];

  if (!images.length && !videos.length) return null;

  return (
    <div className="sr-media">
      {images.map((url, index) => (
        <a
          key={`${url}-${index}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Mở ảnh gốc"
        >
          <img src={url} alt={`Ảnh sản phẩm ${index + 1}`} loading="lazy" />
        </a>
      ))}
      {videos.map((video, index) =>
        video?.video_url ? (
          <a
            className="sr-video"
            key={index}
            href={video.video_url}
            target="_blank"
            rel="noreferrer"
          >
            <Video size={16} />
            Xem video bằng chứng {index + 1}
            <ExternalLink size={13} />
          </a>
        ) : null,
      )}
    </div>
  );
}

export default function ShopeeReturns() {
  const [returns, setReturns] = useState([]);
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [warehouseStatus, setWarehouseStatus] = useState("");
  const [returnType, setReturnType] = useState("");
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
      if (list.length === 1)
        setShopId(String(list[0].shopId || list[0].shop_id || ""));
    } catch (e) {
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
        returnType,
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
  }, [selectedShopId, page, limit, keyword, warehouseStatus, returnType]);

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
      const res = await shopeeApi.syncReturns({ shopId: selectedShopId });
      const data = getPayload(res);
      setNotice(
        data?.message ||
          res?.message ||
          `Đồng bộ hoàn tất. Đã lưu ${data?.totalSaved ?? data?.synced ?? data?.total ?? 0} yêu cầu.`,
      );
      await loadReturns();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSyncing(false);
    }
  };

  const openDetail = async (doc) => {
    if (!doc?.returnSn) {
      setError("Không tìm thấy mã yêu cầu hoàn.");
      return;
    }
    if (!selectedShopId) {
      setError("Vui lòng chọn shop Shopee.");
      return;
    }
    setSelected(doc);
    setModal("detail");
    setDetailLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await shopeeApi.getReturnDetail(doc.returnSn, {
        shopId: selectedShopId,
      });
      const data = getPayload(res);
      const detail =
        data?.return ||
        data?.returnDoc ||
        data?.data?.return ||
        data?.data ||
        data;
      if (!detail?.returnSn)
        throw new Error("API không trả về thông tin chi tiết.");
      setSelected(detail);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const openReceive = (doc) => {
    setSelected(doc);
    setNote("");
    setModal("receive");
    setError("");
  };

  const openInspect = (doc) => {
    setSelected(doc);
    setNote("");
    setError("");
    setInspectionItems(
      (doc.items || []).map((item) => ({
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

  const openResolve = (doc) => {
    setSelected(doc);
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
          ? { ...item, [field]: value === "" ? "" : Number(value) }
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
        received > Number(selected.items?.find((row) =>
          String(row.itemId) === String(item.itemId) &&
          String(row.modelId || "0") === String(item.modelId || "0")
        )?.requestedQty || 0) ||
        good + damaged !== received
      ) {
        setError(
          "Số lượng phải là số nguyên không âm, không vượt số lượng dự kiến. Phải phân loại đủ số thực nhận thành hàng tốt hoặc hàng hỏng.",
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
    const isFailedDelivery = selected.returnType === "DELIVERY_FAILED";
    const message = isFailedDelivery
      ? "Đơn giao thất bại: hệ thống sẽ giải phóng số lượng đang giữ; hàng hỏng thuộc phần đang giữ sẽ bị ghi giảm khỏi tồn kho. " +
        (resolution === "RESTOCK"
          ? "Chỉ phần hàng tốt đã thực sự xuất kho mới được tạo lô nhập hoàn. Bạn xác nhận?"
          : "Không nhập thêm hàng vào kho. Bạn xác nhận?")
      : resolution === "RESTOCK"
        ? "Hệ thống chỉ nhập lại số lượng hàng tốt thuộc phần đơn đã thực sự xuất kho. Bạn xác nhận?"
        : "Hệ thống sẽ không nhập lại hàng vào kho. Bạn xác nhận?";
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
            ? "Đã xử lý nhập kho hàng hoàn."
            : "Đã xác nhận không nhập lại kho."),
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

  const raw = selected?.rawShopeeData || selected?.rawData || {};
  const rawUser = raw.user || {};
  const rawItems = Array.isArray(raw.item) ? raw.item : [];
  const negotiation = raw.negotiation || {};
  const sellerProof = raw.seller_proof || {};
  const compensation = raw.seller_compensation || {};
  const pickupAddress = raw.return_pickup_address || {};
  const returnAddress = raw.return_address || {};

  return (
    <section className="sc-section sr-page">
      <style>{styles}</style>

      <div className="sr-toolbar">
        <div>
          <h3>Quản lý hàng hoàn Shopee</h3>
          <p>
            Theo dõi yêu cầu trả hàng, hàng giao thất bại, tiếp nhận, kiểm tra
            và xử lý tồn kho.
          </p>
        </div>
        <div className="sr-actions">
          <button
            className="sr-btn sr-secondary"
            onClick={loadReturns}
            disabled={loading || !selectedShopId}
          >
            <RefreshCw size={16} /> Làm mới
          </button>
          <button
            className="sr-btn sr-primary"
            onClick={syncReturns}
            disabled={syncing || !selectedShopId}
          >
            <RotateCcw size={16} />{" "}
            {syncing ? "Đang đồng bộ..." : "Đồng bộ hàng hoàn"}
          </button>
        </div>
      </div>

      {error && <div className="sr-alert error">{error}</div>}
      {notice && <div className="sr-alert success">{notice}</div>}

      <div className="sr-card">
        <div className="sr-filters">
          <div className="sr-field">
            <label>Gian hàng Shopee</label>
            <select
              value={shopId}
              onChange={(e) => {
                setShopId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">-- Chọn gian hàng --</option>
              {shops.map((shop) => {
                const id = String(shop.shopId || shop.shop_id || "");
                return (
                  <option key={id} value={id}>
                    {shop.shopName ||
                      shop.shop_name ||
                      shop.name ||
                      `Gian hàng ${id}`}
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
              placeholder="Mã hoàn, mã đơn, mã vận đơn, tên sản phẩm..."
            />
          </div>
          <div className="sr-field">
            <label>Loại yêu cầu</label>
            <select
              value={returnType}
              onChange={(e) => {
                setReturnType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả loại yêu cầu</option>
              <option value="CUSTOMER_RETURN">Khách trả hàng</option>
              <option value="DELIVERY_FAILED">Giao hàng thất bại</option>
            </select>
          </div>
          <div className="sr-field">
            <label>Trạng thái xử lý kho</label>
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
              setReturnType("");
              setPage(1);
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      </div>

      <div className="sr-card">
        <div className="sr-toolbar" style={{ marginBottom: 12 }}>
          <div>
            <strong>Danh sách yêu cầu hoàn hàng</strong>
            <div className="sr-muted">
              Tổng cộng {total.toLocaleString("vi-VN")} yêu cầu
            </div>
          </div>
        </div>
        <div className="sr-table-wrap">
          <table className="sr-table">
            <thead>
              <tr>
                <th>Loại yêu cầu</th>
                <th>Mã hoàn hàng</th>
                <th>Mã đơn Shopee</th>
                <th>Người mua</th>
                <th>Sản phẩm</th>
                <th>Mã vận đơn hoàn</th>
                <th>Lý do hoàn</th>
                <th>Tiền hoàn</th>
                <th>Trạng thái Shopee</th>
                <th>Trạng thái kho</th>
                <th>Cập nhật lần cuối</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="12" className="sr-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="12" className="sr-empty">
                    <Package size={28} />
                    <div>Chưa có yêu cầu hoàn hàng</div>
                  </td>
                </tr>
              ) : (
                returns.map((item) => (
                  <tr key={`${item.shopId}-${item.returnSn}`}>
                    <td>
                      <span className="sr-tag">
                        {translate(
                          "returnType",
                          item.returnType || item.sourceType,
                        )}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sr-link"
                        onClick={() => openDetail(item)}
                      >
                        {item.returnSn || "--"}
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
                    <td>
                      {item.buyerUsername ||
                        item.rawShopeeData?.user?.username ||
                        "--"}
                    </td>
                    <td>
                      <div style={{ maxWidth: 230, fontWeight: 600 }}>
                        {item.items?.[0]?.itemName || "--"}
                      </div>
                      <div className="sr-muted">
                        {item.items?.length > 1
                          ? `Và ${item.items.length - 1} sản phẩm khác · `
                          : ""}
                        SL yêu cầu:{" "}
                        {item.totalRequestedQty ?? item.requestedShopeeQty ?? 0}
                      </div>
                    </td>
                    <td className="sr-code">{item.trackingNumber || "--"}</td>
                    <td>
                      <div>
                        {translate("reason", item.returnReason || item.reason)}
                      </div>
                      <div className="sr-muted">
                        {item.textReason || item.returnDescription || ""}
                      </div>
                    </td>
                    <td>{money(item.refundAmount, item.currency)}</td>
                    <td>
                      {translate(
                        "shopeeStatus",
                        item.shopeeStatus || item.shopeeReturnStatus,
                      )}
                    </td>
                    <td>{renderStatus(item.warehouseStatus)}</td>
                    <td>
                      {formatDate(
                        item.updateTime || item.updatedAt || item.lastSyncedAt,
                      )}
                    </td>
                    <td>
                      <div className="sr-actions">
                        <button
                          className="sr-btn sr-secondary"
                          title="Xem đầy đủ thông tin"
                          onClick={() => openDetail(item)}
                        >
                          <Eye size={15} />
                        </button>
                        {["waiting", "in_transit"].includes(
                          item.warehouseStatus,
                        ) && (
                          <button
                            className="sr-btn sr-success"
                            title="Xác nhận đã nhận hàng"
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
                            title="Xử lý kho"
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
            Trang {page}/{pageCount} · {total.toLocaleString("vi-VN")} yêu cầu
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
                  {modal === "detail" && "Thông tin chi tiết yêu cầu hoàn"}
                  {modal === "receive" && "Xác nhận tiếp nhận hàng hoàn"}
                  {modal === "inspect" && "Kiểm tra tình trạng hàng hoàn"}
                  {modal === "resolve" && "Xử lý hàng hoàn và tồn kho"}
                </h3>
                <div className="sr-muted">
                  Mã yêu cầu: <strong>{selected.returnSn}</strong>
                </div>
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
                <div>Đang tải toàn bộ thông tin...</div>
              </div>
            ) : (
              <>
                <div className="sr-section">
                  <h4>1. Thông tin yêu cầu hoàn</h4>
                  <div className="sr-info">
                    <Field
                      label="Loại yêu cầu"
                      value={translate(
                        "returnType",
                        selected.returnType || selected.sourceType,
                      )}
                    />
                    <Field label="Mã yêu cầu hoàn" value={selected.returnSn} />
                    <Field label="Mã shop Shopee" value={selected.shopId} />
                    <Field label="Mã đơn Shopee" value={selected.orderSn} />
                    <Field
                      label="Mã kiện hàng"
                      value={selected.packageNumber}
                    />
                    <Field
                      label="Người mua"
                      value={selected.buyerUsername || rawUser.username}
                    />
                    <Field
                      label="Trạng thái Shopee"
                      value={translate(
                        "shopeeStatus",
                        selected.shopeeStatus || selected.shopeeReturnStatus,
                      )}
                    />
                    <Field
                      label="Trạng thái xử lý kho"
                      value={
                        STATUS_LABELS[selected.warehouseStatus] ||
                        selected.warehouseStatus
                      }
                    />
                    <Field
                      label="Trạng thái nội bộ"
                      value={translate("status", selected.status)}
                    />
                    <Field
                      label="Loại yêu cầu Shopee"
                      value={selected.requestType}
                    />
                    <Field
                      label="Mã vận đơn hoàn"
                      value={selected.trackingNumber || raw.tracking_number}
                    />
                    <Field
                      label="Đơn vị vận chuyển hoàn"
                      value={raw.reverse_logistics_channel_name}
                    />
                    <Field
                      label="Cần vận chuyển hoàn"
                      value={translate(
                        "needsLogistics",
                        selected.needsLogistics ?? raw.needs_logistics,
                      )}
                    />
                    <Field
                      label="Lý do hoàn"
                      value={translate(
                        "reason",
                        selected.returnReason || selected.reason || raw.reason,
                      )}
                    />
                    <Field
                      label="Nội dung người mua"
                      value={
                        selected.textReason ||
                        selected.returnDescription ||
                        raw.text_reason
                      }
                    />
                    <Field
                      label="Ngày tạo yêu cầu"
                      value={formatDate(selected.createTime || raw.create_time)}
                    />
                    <Field
                      label="Ngày cập nhật Shopee"
                      value={formatDate(selected.updateTime || raw.update_time)}
                    />
                    <Field
                      label="Ngày tạo bản ghi"
                      value={formatDate(selected.createdAt)}
                    />
                    <Field
                      label="Cập nhật hệ thống"
                      value={formatDate(selected.updatedAt)}
                    />
                    <Field
                      label="Đồng bộ gần nhất"
                      value={formatDate(
                        selected.lastSyncedAt || selected.syncedAt,
                      )}
                    />
                    <Field
                      label="Hạn xử lý yêu cầu"
                      value={formatDate(raw.due_date)}
                    />
                    <Field
                      label="Hạn gửi hàng hoàn"
                      value={formatDate(
                        selected.returnShipDueDate || raw.return_ship_due_date,
                      )}
                    />
                    <Field
                      label="Hạn người bán xử lý"
                      value={formatDate(
                        selected.returnSellerDueDate ||
                          raw.return_seller_due_date,
                      )}
                    />
                  </div>
                </div>

                <div className="sr-section">
                  <h4>2. Thông tin tiền hoàn và tài chính</h4>
                  <div className="sr-info">
                    <Field
                      label="Số tiền hoàn"
                      value={money(
                        selected.refundAmount ?? raw.refund_amount,
                        selected.currency || raw.currency,
                      )}
                    />
                    <Field
                      label="Tiền tệ"
                      value={selected.currency || raw.currency}
                    />
                    <Field
                      label="Giá trị trước giảm giá"
                      value={money(
                        raw.amount_before_discount,
                        selected.currency || raw.currency,
                      )}
                    />
                    <Field
                      label="Số tiền đề nghị gần nhất"
                      value={money(
                        negotiation.latest_offer_amount,
                        selected.currency || raw.currency,
                      )}
                    />
                    <Field
                      label="Số tiền bồi thường"
                      value={money(
                        compensation.compensation_amount,
                        selected.currency || raw.currency,
                      )}
                    />
                    <Field
                      label="Số tiền hoàn đã điều chỉnh"
                      value={translate(
                        "is_refund_amount_adjusted",
                        raw.is_refund_amount_adjusted,
                      )}
                    />
                    <Field
                      label="Loại trả hàng/hoàn tiền"
                      value={raw.return_refund_type}
                    />
                    <Field
                      label="Mã phương án giải quyết"
                      value={raw.return_solution}
                    />
                    <Field
                      label="Loại yêu cầu trả hàng/hoàn tiền"
                      value={raw.return_refund_request_type}
                    />
                  </div>
                </div>

                <div className="sr-section">
                  <h4>3. Thông tin người mua</h4>
                  <div className="sr-info">
                    <Field
                      label="Tên tài khoản"
                      value={rawUser.username || selected.buyerUsername}
                    />
                    <Field label="Email đã che" value={rawUser.email} />
                    <Field
                      label="Ảnh đại diện"
                      value={rawUser.portrait ? "Có ảnh đại diện" : "Không có"}
                    />
                  </div>
                  {rawUser.portrait && (
                    <div className="sr-media">
                      <a
                        href={rawUser.portrait}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={rawUser.portrait}
                          alt="Ảnh đại diện người mua"
                        />
                      </a>
                    </div>
                  )}
                </div>

                <div className="sr-section">
                  <h4>4. Danh sách sản phẩm trả hàng</h4>
                  <div className="sr-items">
                    {(selected.items || []).map((item, index) => {
                      const rawItem =
                        rawItems.find(
                          (r) =>
                            String(r.item_id) === String(item.itemId) &&
                            String(r.model_id ?? 0) ===
                              String(item.modelId ?? 0),
                        ) ||
                        rawItems[index] ||
                        {};
                      const imageList = rawItem.images || [];
                      const mediaItem = {
                        ...item,
                        images: imageList,
                        image: item.image,
                      };
                      return (
                        <div className="sr-item" key={item._id || index}>
                          <div className="sr-item-head">
                            {(imageList[0] || item.image) && (
                              <img
                                className="sr-item-img"
                                src={imageList[0] || item.image}
                                alt={item.itemName}
                              />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div className="sr-item-title">
                                {item.itemName ||
                                  rawItem.name ||
                                  `Sản phẩm ${index + 1}`}
                              </div>
                              <div className="sr-item-meta">
                                Mã sản phẩm Shopee: {item.itemId || "--"} · Mã
                                phân loại Shopee: {item.modelId || "0"}
                                <br />
                                SKU sản phẩm:{" "}
                                {item.itemSku || rawItem.item_sku || "--"} · SKU
                                phân loại:{" "}
                                {item.variationSku ||
                                  rawItem.variation_sku ||
                                  "--"}
                                <br />
                                Mã sản phẩm nội bộ:{" "}
                                {item.productId || "Chưa ghép"} · Mã phân loại
                                nội bộ: {item.variantCode || "--"}
                                <br />
                                Tên phân loại nội bộ: {item.variantName ||
                                  "--"}{" "}
                                · Trạng thái ghép:{" "}
                                {translate(
                                  "mappingStatus",
                                  item.mappingStatus ||
                                    (item.isMapped ? "mapped" : "unmapped"),
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="sr-grid">
                            <Field
                              label="Số lượng Shopee yêu cầu"
                              value={item.requestedQty ?? rawItem.amount ?? 0}
                            />
                            <Field
                              label="Hệ số quy đổi"
                              value={item.quantityMultiplier ?? 1}
                            />
                            <Field
                              label="Số lượng thực nhận"
                              value={item.receivedQty ?? 0}
                            />
                            <Field
                              label="Số lượng hàng tốt"
                              value={item.goodQty ?? 0}
                            />
                            <Field
                              label="Số lượng hàng lỗi"
                              value={item.damagedQty ?? 0}
                            />
                            <Field
                              label="Số lượng đã nhập kho"
                              value={item.restockedQty ?? 0}
                            />
                            <Field
                              label="Giá bán từng sản phẩm"
                              value={money(
                                rawItem.item_price,
                                selected.currency || raw.currency,
                              )}
                            />
                            <Field
                              label="Tiền hoàn sản phẩm"
                              value={money(
                                rawItem.refund_amount,
                                selected.currency || raw.currency,
                              )}
                            />
                            <Field
                              label="Sản phẩm mua kèm"
                              value={translate(
                                "is_add_on_deal",
                                rawItem.is_add_on_deal,
                              )}
                            />
                            <Field
                              label="Sản phẩm chính"
                              value={translate(
                                "is_main_item",
                                rawItem.is_main_item,
                              )}
                            />
                            <Field
                              label="Đã xử lý tồn kho"
                              value={translate(
                                "stockProcessed",
                                item.stockProcessed,
                              )}
                            />
                            <Field
                              label="Thời điểm xử lý tồn kho"
                              value={formatDate(item.stockProcessedAt)}
                            />
                          </div>
                          {item.inspectionNote && (
                            <div className="sr-muted" style={{ marginTop: 8 }}>
                              Ghi chú kiểm tra: {item.inspectionNote}
                            </div>
                          )}
                          <MediaGallery
                            item={mediaItem}
                            raw={{ image: imageList }}
                          />
                          <JsonDetails
                            title="Dữ liệu sản phẩm từ Shopee"
                            value={rawItem}
                          />
                        </div>
                      );
                    })}
                    {(!selected.items || selected.items.length === 0) && (
                      <div className="sr-empty">Không có dữ liệu sản phẩm.</div>
                    )}
                  </div>
                  <div className="sr-info" style={{ marginTop: 12 }}>
                    <Field
                      label="Tổng số lượng yêu cầu"
                      value={
                        selected.totalRequestedQty ??
                        selected.requestedShopeeQty ??
                        0
                      }
                    />
                    <Field
                      label="Tổng số lượng thực nhận"
                      value={selected.totalReceivedQty ?? 0}
                    />
                    <Field
                      label="Tổng hàng tốt"
                      value={selected.totalGoodQty ?? 0}
                    />
                    <Field
                      label="Tổng hàng lỗi"
                      value={selected.totalDamagedQty ?? 0}
                    />
                    <Field
                      label="Tổng đã nhập kho"
                      value={selected.restockedStockQty ?? 0}
                    />
                  </div>
                </div>

                <div className="sr-section">
                  <h4>5. Vận chuyển và trạng thái giao nhận</h4>
                  <div className="sr-info">
                    <Field
                      label="Mã vận đơn"
                      value={selected.trackingNumber || raw.tracking_number}
                    />
                    <Field
                      label="Trạng thái vận chuyển"
                      value={translate(
                        "logistics_status",
                        raw.logistics_status,
                      )}
                    />
                    <Field
                      label="Trạng thái vận chuyển ngược"
                      value={translate(
                        "reverse_logistics_status",
                        raw.reverse_logistics_status,
                      )}
                    />
                    <Field
                      label="Đơn vị vận chuyển"
                      value={raw.reverse_logistics_channel_name}
                    />
                    <Field
                      label="Đã đến kho Shopee"
                      value={translate(
                        "is_arrived_at_warehouse",
                        raw.is_arrived_at_warehouse,
                      )}
                    />
                    <Field
                      label="Tích hợp vận chuyển hoàn"
                      value={translate(
                        "is_reverse_logistics_channel_integrated",
                        raw.is_reverse_logistics_channel_integrated,
                      )}
                    />
                    <Field
                      label="Mã tra cứu kiện hàng"
                      value={raw.package_query_number}
                    />
                    <Field
                      label="Số điện thoại liên hệ ảo"
                      value={raw.virtual_contact_number}
                    />
                    <Field
                      label="Người bán tự sắp xếp vận chuyển"
                      value={translate(
                        "is_seller_arrange",
                        raw.is_seller_arrange,
                      )}
                    />
                    <Field
                      label="Bắt buộc bằng chứng vận chuyển"
                      value={translate(
                        "is_shipping_proof_mandatory",
                        raw.is_shipping_proof_mandatory,
                      )}
                    />
                    <Field
                      label="Đã tải bằng chứng vận chuyển"
                      value={translate(
                        "has_uploaded_shipping_proof",
                        raw.has_uploaded_shipping_proof,
                      )}
                    />
                  </div>
                </div>

                <div className="sr-section">
                  <h4>6. Thông tin thương lượng với người mua</h4>
                  <div className="sr-info">
                    <Field
                      label="Trạng thái thương lượng"
                      value={negotiation.negotiation_status}
                    />
                    <Field
                      label="Phương án gần nhất"
                      value={negotiation.latest_solution}
                    />
                    <Field
                      label="Số tiền đề nghị"
                      value={money(
                        negotiation.latest_offer_amount,
                        selected.currency || raw.currency,
                      )}
                    />
                    <Field
                      label="Người tạo đề nghị"
                      value={negotiation.latest_offer_creator}
                    />
                    <Field
                      label="Số lần thương lượng tối đa"
                      value={negotiation.counter_limit}
                    />
                    <Field
                      label="Hạn phản hồi đề nghị"
                      value={formatDate(negotiation.offer_due_date)}
                    />
                  </div>
                </div>

                <div className="sr-section">
                  <h4>7. Bằng chứng và bồi thường người bán</h4>
                  <div className="sr-info">
                    <Field
                      label="Trạng thái bằng chứng"
                      value={sellerProof.seller_proof_status}
                    />
                    <Field
                      label="Hạn cung cấp bằng chứng"
                      value={formatDate(sellerProof.seller_evidence_deadline)}
                    />
                    <Field
                      label="Trạng thái bồi thường"
                      value={compensation.seller_compensation_status}
                    />
                    <Field
                      label="Hạn bồi thường"
                      value={formatDate(
                        compensation.seller_compensation_due_date,
                      )}
                    />
                    <Field
                      label="Số tiền bồi thường"
                      value={money(
                        compensation.compensation_amount,
                        selected.currency || raw.currency,
                      )}
                    />
                    <Field
                      label="Lý do đánh giá lại"
                      value={raw.reassessed_request_reason}
                    />
                    <Field
                      label="Xác minh yêu cầu"
                      value={selected.validationType || raw.validation_type}
                    />
                  </div>
                  {Array.isArray(compensation.compensation_amount_list) &&
                    compensation.compensation_amount_list.length > 0 && (
                      <JsonDetails
                        title="Chi tiết danh sách bồi thường"
                        value={compensation.compensation_amount_list}
                      />
                    )}
                </div>

                <div className="sr-section">
                  <h4>8. Địa chỉ nhận/trả hàng</h4>
                  <div className="sr-muted">
                    Shopee có thể che thông tin cá nhân hoặc không trả về địa
                    chỉ đầy đủ.
                  </div>
                  <div className="sr-info" style={{ marginTop: 10 }}>
                    <Field
                      label="Tên người nhận hàng hoàn"
                      value={pickupAddress.name}
                    />
                    <Field label="Số điện thoại" value={pickupAddress.phone} />
                    <Field label="Địa chỉ" value={pickupAddress.address} />
                    <Field label="Phường/xã" value={pickupAddress.town} />
                    <Field label="Quận/huyện" value={pickupAddress.district} />
                    <Field label="Thành phố" value={pickupAddress.city} />
                    <Field label="Tỉnh/bang" value={pickupAddress.state} />
                    <Field label="Khu vực" value={pickupAddress.region} />
                    <Field label="Mã bưu chính" value={pickupAddress.zipcode} />
                    <Field
                      label="Mã kho nhận hàng Shopee"
                      value={returnAddress.whs_id}
                    />
                  </div>
                </div>

                <div className="sr-section">
                  <h4>9. Tiến trình xử lý tại Nhật Khang Bike</h4>
                  <div className="sr-info">
                    <Field
                      label="Đã nhận hàng"
                      value={translate("isReceived", selected.isReceived)}
                    />
                    <Field label="Người nhận" value={selected.receivedBy} />
                    <Field
                      label="Thời điểm nhận"
                      value={formatDate(selected.receivedAt)}
                    />
                    <Field
                      label="Đã kiểm tra"
                      value={translate("isInspected", selected.isInspected)}
                    />
                    <Field
                      label="Người kiểm tra"
                      value={selected.inspectedBy}
                    />
                    <Field
                      label="Thời điểm kiểm tra"
                      value={formatDate(selected.inspectedAt)}
                    />
                    <Field
                      label="Phương án xử lý"
                      value={translate("resolution", selected.resolution)}
                    />
                    <Field
                      label="Ghi chú xử lý"
                      value={selected.resolutionNote}
                    />
                    <Field
                      label="Người xử lý"
                      value={selected.resolutionBy || selected.resolvedBy}
                    />
                    <Field
                      label="Thời điểm xử lý"
                      value={formatDate(
                        selected.resolutionAt || selected.resolvedAt,
                      )}
                    />
                    <Field
                      label="Đã xử lý tồn kho"
                      value={translate(
                        "stockProcessed",
                        selected.stockProcessed,
                      )}
                    />
                    <Field
                      label="Thời điểm xử lý tồn kho"
                      value={formatDate(selected.stockProcessedAt)}
                    />
                    <Field label="Ghi chú nội bộ" value={selected.note} />
                    <Field
                      label="Lỗi đồng bộ gần nhất"
                      value={selected.lastSyncError}
                    />
                  </div>
                </div>

                <div className="sr-section">
                  <h4>10. Hình ảnh và video bằng chứng từ Shopee</h4>
                  <MediaGallery item={{ images: raw.image || [] }} raw={raw} />
                  {Array.isArray(raw.buyer_videos) &&
                    raw.buyer_videos.map((video, index) => (
                      <div
                        key={index}
                        className="sr-item"
                        style={{ marginTop: 8 }}
                      >
                        {video.thumbnail_url && (
                          <img
                            className="sr-item-img"
                            src={video.thumbnail_url}
                            alt="Ảnh xem trước video"
                          />
                        )}
                        {video.video_url && (
                          <a
                            className="sr-video"
                            href={video.video_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Video size={16} /> Mở video bằng chứng {index + 1}
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    ))}
                  {!raw.image?.length && !raw.buyer_videos?.length && (
                    <div className="sr-muted">
                      Shopee không cung cấp ảnh hoặc video cho yêu cầu này.
                    </div>
                  )}
                </div>

                <JsonDetails
                  title="11. Toàn bộ dữ liệu Shopee gốc (rawShopeeData / rawData)"
                  value={raw}
                />
                <JsonDetails
                  title="12. Toàn bộ bản ghi hệ thống (các trường gốc)"
                  value={{
                    ...selected,
                    rawShopeeData: undefined,
                    rawData: undefined,
                  }}
                />
              </>
            )}

            {modal === "receive" && (
              <>
                <div className="sr-alert success">
                  Xác nhận tiếp nhận chỉ ghi nhận kiện hàng đã về kho. Chưa thay
                  đổi tồn kho. Sau đó cần kiểm tra hàng thực tế.
                </div>
                <div className="sr-field" style={{ marginTop: 14 }}>
                  <label>Ghi chú khi nhận hàng</label>
                  <textarea
                    rows="3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ví dụ: Đã nhận đủ kiện, bao bì còn nguyên..."
                  />
                </div>
                <div className="sr-modal-actions">
                  <button className="sr-btn sr-secondary" onClick={closeModal}>
                    Hủy
                  </button>
                  <button
                    className="sr-btn sr-success"
                    disabled={processing}
                    onClick={receiveReturn}
                  >
                    <PackageCheck size={16} />{" "}
                    {processing ? "Đang xử lý..." : "Xác nhận đã nhận hàng"}
                  </button>
                </div>
              </>
            )}

            {modal === "inspect" && (
              <>
                <div className="sr-alert">
                  Nhập số lượng thực tế đã nhận, số lượng hàng tốt và hàng lỗi.
                  Tổng hàng tốt + hàng lỗi không được vượt quá số lượng thực
                  nhận.
                </div>
                <div className="sr-items" style={{ marginTop: 14 }}>
                  {inspectionItems.map((item, index) => {
                    const original = selected.items?.[index] || {};
                    return (
                      <div className="sr-item" key={index}>
                        <div className="sr-item-title">
                          {original.itemName || `Sản phẩm ${index + 1}`}
                        </div>
                        <div className="sr-item-meta">
                          SKU: {original.itemSku || "--"} · Mã phân loại:{" "}
                          {item.variantCode || "--"} · Yêu cầu:{" "}
                          {original.requestedQty ?? 0}
                        </div>
                        <div className="sr-grid">
                          {[
                            ["receivedQty", "Số lượng thực nhận"],
                            ["goodQty", "Số lượng hàng tốt"],
                            ["damagedQty", "Số lượng hàng lỗi"],
                          ].map(([field, label]) => (
                            <div className="sr-field" key={field}>
                              <label>{label}</label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item[field]}
                                onChange={(e) =>
                                  updateInspection(index, field, e.target.value)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="sr-field" style={{ marginTop: 14 }}>
                  <label>Ghi chú kiểm tra</label>
                  <textarea
                    rows="3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Mô tả tình trạng sản phẩm, phụ kiện thiếu, dấu hiệu hư hỏng..."
                  />
                </div>
                <div className="sr-modal-actions">
                  <button className="sr-btn sr-secondary" onClick={closeModal}>
                    Hủy
                  </button>
                  <button
                    className="sr-btn sr-success"
                    disabled={processing}
                    onClick={inspectReturn}
                  >
                    <Save size={16} />{" "}
                    {processing ? "Đang lưu..." : "Lưu kết quả kiểm tra"}
                  </button>
                </div>
              </>
            )}

            {modal === "resolve" && (
              <>
                <div className="sr-alert">
                  Chỉ xử lý sau khi đã kiểm tra hàng. Đối với khách trả hàng sau
                  giao thành công, hàng lỗi không được cộng lại kho. Đối với
                  giao thất bại, cần giải phóng hàng đang giữ và xử lý hàng lỗi
                  theo luồng kho tương ứng.
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
                        Nhập lại kho
                      </strong>
                      <small>
                        Nhập số lượng hàng tốt đã kiểm tra vào kho và tạo lô
                        nhập hoàn nguồn RETURN. Hàng lỗi không được nhập.
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
                        Không nhập lại kho
                      </strong>
                      <small>
                        Không cộng hàng vào tồn kho bán được. Dùng cho hàng lỗi
                        hoặc hàng không đủ điều kiện bán lại.
                      </small>
                    </span>
                  </label>
                </div>
                <div className="sr-field" style={{ marginTop: 14 }}>
                  <label>Ghi chú xử lý</label>
                  <textarea
                    rows="3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú nội bộ về quyết định nhập kho hoặc không nhập kho..."
                  />
                </div>
                <div className="sr-modal-actions">
                  <button className="sr-btn sr-secondary" onClick={closeModal}>
                    Hủy
                  </button>
                  <button
                    className="sr-btn sr-primary"
                    disabled={processing}
                    onClick={resolveStock}
                  >
                    <Warehouse size={16} />{" "}
                    {processing ? "Đang xử lý..." : "Xác nhận xử lý"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
