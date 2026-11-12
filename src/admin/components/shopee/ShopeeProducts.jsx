import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Refresh,
  Search,
  Edit,
  Storefront,
  Inventory2,
  Close,
  Save,
  CloudUpload,
  Sync,
  History,
  PowerSettingsNew,
  ExpandMore,
  ExpandLess,
  CheckCircle,
  ErrorOutline,
  Schedule,
  PlayArrow,
} from "@mui/icons-material";

import toast from "react-hot-toast";

import shopeeApi from "../../services/shopeeApi";
import shopeeStockSyncApi from "../../services/shopeeStockSyncApi";

// =====================================================
// HELPERS
// =====================================================

const formatVND = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatNumber = (value) => Number(value || 0).toLocaleString("vi-VN");

const formatDate = (value) => {
  if (!value) return "Chưa có";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
};

const statusMap = {
  NORMAL: { label: "Đang bán", color: "success" },
  UNLIST: { label: "Đang ẩn", color: "default" },
  BANNED: { label: "Vi phạm", color: "error" },
  REVIEWING: { label: "Đang xét duyệt", color: "warning" },
  SELLER_DELETE: { label: "Người bán đã xóa", color: "default" },
  SHOPEE_DELETE: { label: "Shopee đã xóa", color: "error" },
};

const syncStatusMap = {
  running: { label: "Đang chạy", color: "info" },
  completed: { label: "Hoàn tất", color: "success" },
  success: { label: "Thành công", color: "success" },
  partial: { label: "Hoàn thành một phần", color: "warning" },
  failed: { label: "Thất bại", color: "error" },
  skipped: { label: "Đã bỏ qua", color: "default" },
  pending: { label: "Đang chờ", color: "default" },
};

const getErrorMessage = (error) =>
  error?.data?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Có lỗi xảy ra.";

const getSyncStatusInfo = (status) => {
  const key = String(status || "").toLowerCase();

  return (
    syncStatusMap[key] || {
      label: status || "Chưa có dữ liệu",
      color: "default",
    }
  );
};

const emptyDimension = {
  package_length: "",
  package_width: "",
  package_height: "",
};

function normalizeDetail(data) {
  return {
    ...data,
    dimension: {
      package_length: data?.dimension?.package_length ?? "",
      package_width: data?.dimension?.package_width ?? "",
      package_height: data?.dimension?.package_height ?? "",
    },
    models: Array.isArray(data?.models)
      ? data.models.map((model) => ({
          ...model,
          originalPrice: Number(model.originalPrice || 0),
          stock: Number(model.stock || 0),
          sellerStock: Array.isArray(model.sellerStock)
            ? model.sellerStock
            : [],
        }))
      : [],
    sellerStock: Array.isArray(data?.sellerStock) ? data.sellerStock : [],
  };
}

// =====================================================
// PAGE
// =====================================================

export default function ShopeeProducts() {
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");

  const [products, setProducts] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [checkingEditable, setCheckingEditable] = useState(false);
  const [editableDialogOpen, setEditableDialogOpen] = useState(false);
  const [editableResults, setEditableResults] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [status, setStatus] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [shopLoading, setShopLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [openDetail, setOpenDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [savingStock, setSavingStock] = useState(false);

  // ===================================================
  // AUTO STOCK SYNC STATES
  // ===================================================

  const [stockSyncSettings, setStockSyncSettings] = useState({
    enabled: false,
    intervalMinutes: 5,
    safetyBuffer: 0,
    maxRetries: 3,
  });

  const [stockSyncStatus, setStockSyncStatus] = useState(null);
  const [stockSyncHistory, setStockSyncHistory] = useState([]);

  const [stockSyncLoading, setStockSyncLoading] = useState(false);
  const [stockSyncSaving, setStockSyncSaving] = useState(false);
  const [stockSyncRunning, setStockSyncRunning] = useState(false);

  const [showStockSyncHistory, setShowStockSyncHistory] = useState(false);

  const selectedShop = useMemo(
    () => shops.find((shop) => String(shop.shopId) === String(shopId)),
    [shops, shopId],
  );

  // ===================================================
  // PRODUCT STATISTICS
  // ===================================================

  const pageStats = useMemo(() => {
    const rows = Array.isArray(products) ? products : [];

    return {
      active: rows.filter((item) => item.itemStatus === "NORMAL").length,

      outOfStock: rows.filter(
        (item) => !item.hasModel && Number(item.stock || 0) <= 0,
      ).length,

      variants: rows.filter((item) => item.hasModel).length,

      reserved: rows.reduce(
        (sum, item) => sum + Number(item.reservedStock || 0),
        0,
      ),
    };
  }, [products]);

  // ===================================================
  // STOCK SYNC HELPERS
  // ===================================================

  const syncSummary = useMemo(() => {
    const counts = stockSyncStatus?.counts || {};

    return {
      total: Number(
        counts.total ??
          stockSyncStatus?.total ??
          stockSyncStatus?.totalItems ??
          0,
      ),

      success: Number(
        counts.success ??
          counts.synced ??
          stockSyncStatus?.success ??
          stockSyncStatus?.successCount ??
          0,
      ),

      failed: Number(
        counts.failed ??
          stockSyncStatus?.failed ??
          stockSyncStatus?.failedCount ??
          0,
      ),

      skipped: Number(
        counts.skipped ??
          stockSyncStatus?.skipped ??
          stockSyncStatus?.skippedCount ??
          0,
      ),

      updated: Number(
        counts.updated ??
          stockSyncStatus?.updated ??
          stockSyncStatus?.updatedCount ??
          0,
      ),
    };
  }, [stockSyncStatus]);

  const currentSyncStatus = stockSyncStatus?.lastRunStatus || "pending";

  const currentSyncStatusInfo = getSyncStatusInfo(currentSyncStatus);

  // ===================================================
  // LOAD STOCK SYNC DATA
  // ===================================================

  const loadStockSyncData = useCallback(async () => {
    setStockSyncLoading(true);

    try {
      const [settingsRes, statusRes, historyRes] = await Promise.all([
        shopeeStockSyncApi.getSettings(),
        shopeeStockSyncApi.getStatus(),
        shopeeStockSyncApi.getHistory({
          page: 1,
          limit: 10,
        }),
      ]);

      const settingsData = settingsRes?.data || {};

      setStockSyncSettings({
        enabled: Boolean(settingsData.enabled),
        intervalMinutes: Number(settingsData.intervalMinutes || 5),
        safetyBuffer: Number(settingsData.safetyBuffer || 0),
        maxRetries: Number(settingsData.maxRetries || 3),
      });

      setStockSyncStatus(statusRes?.data || null);

      const historyData = historyRes?.data || {};

      const historyList = Array.isArray(historyData)
        ? historyData
        : historyData.history ||
          historyData.logs ||
          historyData.items ||
          historyData.results ||
          [];

      setStockSyncHistory(Array.isArray(historyList) ? historyList : []);
    } catch (error) {
      console.error("[Shopee Stock Sync]", error);
      toast.error(getErrorMessage(error));
    } finally {
      setStockSyncLoading(false);
    }
  }, []);

  // ===================================================
  // TOGGLE STOCK SYNC
  // ===================================================

  const handleToggleStockSync = async (enabled) => {
    if (stockSyncSaving) return;

    setStockSyncSaving(true);

    try {
      const result = await shopeeStockSyncApi.updateSettings({
        enabled,
      });

      if (!result.success) {
        throw new Error(
          result.message || "Không thể cập nhật cấu hình đồng bộ.",
        );
      }

      setStockSyncSettings((current) => ({
        ...current,
        enabled,
      }));

      toast.success(
        enabled
          ? "Đã bật tự động đồng bộ tồn kho Shopee."
          : "Đã tắt tự động đồng bộ tồn kho Shopee.",
      );

      await loadStockSyncData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setStockSyncSaving(false);
    }
  };

  // ===================================================
  // RUN STOCK SYNC MANUALLY
  // ===================================================

  const handleRunStockSync = async () => {
    if (stockSyncRunning) return;

    const confirmed = window.confirm(
      "Bạn muốn đồng bộ tồn kho Nhật Khang Bike lên tất cả gian hàng Shopee đang kết nối?",
    );

    if (!confirmed) return;

    setStockSyncRunning(true);

    try {
      const result = await shopeeStockSyncApi.runNow();

      if (!result.success) {
        throw new Error(result.message || "Không thể chạy đồng bộ tồn kho.");
      }

      if (result.data?.skipped) {
        toast("Đang có một phiên đồng bộ khác chạy.", {
          icon: "⏳",
        });
      } else {
        toast.success("Đã thực hiện yêu cầu đồng bộ tồn kho.");
      }

      await loadStockSyncData();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setStockSyncRunning(false);
    }
  };

  // ===================================================
  // REFRESH STOCK SYNC
  // ===================================================

  const handleRefreshStockSync = async () => {
    await loadStockSyncData();
    toast.success("Đã làm mới dữ liệu đồng bộ.");
  };

  // ===================================================
  // LOAD SHOPS
  // ===================================================

  const loadShops = useCallback(async () => {
    setShopLoading(true);

    try {
      const result = await shopeeApi.getShops();

      const list = result.shops || result.data || [];

      const connected = list.filter((shop) => shop.status === "connected");

      setShops(connected);

      setShopId((current) => {
        const exists = connected.some(
          (shop) => String(shop.shopId) === String(current),
        );

        return exists
          ? current
          : connected.length
            ? String(connected[0].shopId)
            : "";
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setShopLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  useEffect(() => {
    loadStockSyncData();
  }, [loadStockSyncData]);

  // ===================================================
  // LOAD PRODUCTS
  // ===================================================

  const loadProducts = useCallback(
    async (targetPage = 1) => {
      if (!shopId) {
        setProducts([]);

        setPagination((current) => ({
          ...current,
          page: 1,
          total: 0,
          totalPages: 0,
        }));

        return;
      }

      setLoading(true);

      try {
        const result = await shopeeApi.getManagedProducts({
          shopId,
          page: targetPage,
          pageSize: pagination.pageSize,
          status: status === "ALL" ? "" : status,
          keyword,
        });

        if (!result.success) {
          throw new Error(result.message || "Không tải được sản phẩm Shopee.");
        }

        setProducts(result.data || []);

        setPagination((current) => ({
          ...current,
          ...(result.pagination || {}),
          page: targetPage,
        }));
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [shopId, status, keyword, pagination.pageSize],
  );

  useEffect(() => {
    if (shopId) {
      loadProducts(1);
    }
  }, [shopId, status, keyword, loadProducts]);

  // ===================================================
  // CHỌN SẢN PHẨM & KIỂM TRA QUYỀN SỬA SKU
  // ===================================================

  const visibleItemIds = products.map((item) => String(item.itemId));
  const allVisibleSelected =
    visibleItemIds.length > 0 &&
    visibleItemIds.every((id) => selectedItemIds.includes(id));

  const handleToggleProduct = (itemId) => {
    const id = String(itemId);
    setSelectedItemIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const handleToggleVisibleProducts = () => {
    setSelectedItemIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleItemIds.includes(id))
        : [...new Set([...current, ...visibleItemIds])],
    );
  };

  const handleCheckSelectedEditable = async () => {
    if (!shopId || selectedItemIds.length === 0 || checkingEditable) return;
    if (selectedItemIds.length > 50) {
      toast.error("Mỗi lần chỉ kiểm tra tối đa 50 sản phẩm.");
      return;
    }
    setCheckingEditable(true);
    setEditableResults([]);
    setEditableDialogOpen(true);
    try {
      const result = await shopeeApi.checkManagedProductsEditable({
        shopId,
        itemIds: selectedItemIds,
      });
      if (!result.success) {
        throw new Error(result.message || "Không kiểm tra được quyền chỉnh sửa SKU.");
      }
      setEditableResults(result.data?.results || []);
      if (result.note) toast(result.note, { icon: "ℹ️", duration: 6000 });
    } catch (error) {
      toast.error(getErrorMessage(error));
      setEditableDialogOpen(false);
    } finally {
      setCheckingEditable(false);
    }
  };

  // ===================================================
  // SEARCH
  // ===================================================

  const handleSearch = () => {
    setKeyword(searchInput.trim());
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // ===================================================
  // DETAIL
  // ===================================================

  const handleOpenDetail = async (itemId) => {
    setOpenDetail(true);
    setDetail(null);
    setDetailLoading(true);

    try {
      const result = await shopeeApi.getManagedProductDetail(itemId, {
        shopId,
      });

      if (!result.success || !result.data) {
        throw new Error(result.message || "Không tải được chi tiết sản phẩm.");
      }

      setDetail(normalizeDetail(result.data));
    } catch (error) {
      toast.error(getErrorMessage(error));
      setOpenDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateDetailField = (field, value) => {
    setDetail((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateDimension = (field, value) => {
    setDetail((current) => ({
      ...current,
      dimension: {
        ...current.dimension,
        [field]: value,
      },
    }));
  };

  const updateModelField = (index, field, value) => {
    setDetail((current) => ({
      ...current,
      models: current.models.map((model, modelIndex) =>
        modelIndex === index ? { ...model, [field]: value } : model,
      ),
    }));
  };

  // ===================================================
  // SAVE BASIC INFORMATION
  // ===================================================

  const handleSaveInfo = async () => {
    if (!detail) return;

    setSavingInfo(true);

    try {
      const changes = {
        shopId,
        itemName: detail.itemName,
      };

      if (
        String(detail.descriptionType || "normal").toLowerCase() !== "extended"
      ) {
        changes.description = detail.description || "";
      }

      if (Number(detail.weight) > 0) {
        changes.weight = Number(detail.weight);
      }

      const dimension = detail.dimension || {};

      const dimensions = [
        Number(dimension.package_length),
        Number(dimension.package_width),
        Number(dimension.package_height),
      ];

      if (dimensions.every((value) => value > 0)) {
        changes.dimension = {
          package_length: dimensions[0],
          package_width: dimensions[1],
          package_height: dimensions[2],
        };
      }

      const result = await shopeeApi.updateManagedProduct(
        detail.itemId,
        changes,
      );

      if (!result.success) {
        throw new Error(result.message || "Shopee chưa xác nhận cập nhật.");
      }

      toast.success("Đã gửi cập nhật thông tin lên Shopee.");

      await handleOpenDetail(detail.itemId);
      await loadProducts(pagination.page);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingInfo(false);
    }
  };

  // ===================================================
  // SAVE PRICE
  // ===================================================

  const handleSavePrices = async () => {
    if (!detail) return;

    if (detail.hasModel && (!detail.models || detail.models.length === 0)) {
      toast.error(
        "Shopee chưa trả về danh sách phân loại. Không thể cập nhật giá.",
      );

      return;
    }

    setSavingPrices(true);

    try {
      const priceList = detail.hasModel
        ? detail.models.map((model) => ({
            modelId: model.modelId,
            originalPrice: Number(model.originalPrice),
          }))
        : [
            {
              modelId: "0",
              originalPrice: Number(detail.originalPrice),
            },
          ];

      if (
        priceList.some(
          (item) =>
            !Number.isFinite(item.originalPrice) || item.originalPrice <= 0,
        )
      ) {
        throw new Error("Tất cả giá bán phải lớn hơn 0.");
      }

      const result = await shopeeApi.updateManagedProductPrices(detail.itemId, {
        shopId,
        priceList,
      });

      if (!result.success) {
        const failure = result.data?.failureList?.[0];

        throw new Error(
          failure?.failed_reason ||
            result.message ||
            "Một số giá chưa được cập nhật.",
        );
      }

      toast.success("Cập nhật giá Shopee thành công.");

      await handleOpenDetail(detail.itemId);
      await loadProducts(pagination.page);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingPrices(false);
    }
  };

  // ===================================================
  // SAVE STOCK
  // ===================================================

  const handleSaveStock = async () => {
    if (!detail) return;

    if (detail.hasModel && (!detail.models || detail.models.length === 0)) {
      toast.error(
        "Shopee chưa trả về danh sách phân loại. Không thể cập nhật tồn kho.",
      );

      return;
    }

    setSavingStock(true);

    try {
      const makeStockItem = (item) => {
        const sellerStock = (item.sellerStock || []).map((warehouse) => ({
          locationId: warehouse.locationId,
          stock: Number(warehouse.stock || 0),
        }));

        return {
          modelId: item.modelId || "0",
          stock: Number(item.stock || 0),
          sellerStock,
        };
      };

      const stockList = detail.hasModel
        ? detail.models.map(makeStockItem)
        : [
            makeStockItem({
              modelId: "0",
              stock: detail.stock,
              sellerStock: detail.sellerStock,
            }),
          ];

      if (
        stockList.some(
          (item) => !Number.isInteger(item.stock) || item.stock < 0,
        )
      ) {
        throw new Error("Tồn kho phải là số nguyên không âm.");
      }

      const result = await shopeeApi.updateManagedProductStock(detail.itemId, {
        shopId,
        stockList,
      });

      if (!result.success) {
        const failure = result.data?.failureList?.[0];

        throw new Error(
          failure?.failed_reason ||
            result.message ||
            "Một số tồn kho chưa được cập nhật.",
        );
      }

      toast.success("Cập nhật tồn kho Shopee thành công.");

      await handleOpenDetail(detail.itemId);
      await loadProducts(pagination.page);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSavingStock(false);
    }
  };

  // ===================================================
  // RENDER
  // ===================================================

  if (shopLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", maxWidth: "100%" }}>
      {/* HEADER */}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Quản lý sản phẩm Shopee
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Quản lý trực tiếp trên gian hàng Shopee
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => loadProducts(pagination.page)}
          disabled={loading || !shopId}
        >
          Làm mới
        </Button>
      </Stack>

      {/* SHOP */}

      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={5}>
              <FormControl fullWidth size="small">
                <InputLabel>Gian hàng Shopee</InputLabel>

                <Select
                  value={shopId}
                  label="Gian hàng Shopee"
                  onChange={(event) => setShopId(event.target.value)}
                >
                  {shops.map((shop) => (
                    <MenuItem key={shop.shopId} value={String(shop.shopId)}>
                      Shop ID: {shop.shopId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={7}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Storefront color="action" />

                <Typography variant="body2">
                  {selectedShop
                    ? `Đã kết nối shop ${selectedShop.shopId}`
                    : "Chưa chọn gian hàng"}
                </Typography>

                {selectedShop && (
                  <Chip size="small" label="Đã kết nối" color="success" />
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* =================================================
          AUTO STOCK SYNC
      ================================================= */}

      <Card
        sx={{
          mb: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: stockSyncSettings.enabled ? "success.light" : "divider",
        }}
      >
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={2}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Sync color="primary" />

                <Typography variant="h6" fontWeight={800}>
                  Đồng bộ tồn kho Nhật Khang Bike ↔ Shopee
                </Typography>
              </Stack>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Tự động cập nhật tồn kho Shopee theo tồn kho thực tế trong hệ
                thống Nhật Khang Bike.
              </Typography>
            </Box>

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Chip
                icon={
                  stockSyncSettings.enabled ? (
                    <CheckCircle />
                  ) : (
                    <PowerSettingsNew />
                  )
                }
                color={stockSyncSettings.enabled ? "success" : "default"}
                label={
                  stockSyncSettings.enabled
                    ? "Đang bật tự động"
                    : "Đang tắt tự động"
                }
              />

              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    checked={stockSyncSettings.enabled}
                    onChange={(event) =>
                      handleToggleStockSync(event.target.checked)
                    }
                    disabled={stockSyncSaving || stockSyncLoading}
                    color="success"
                  />
                }
                label={
                  stockSyncSaving
                    ? "Đang lưu..."
                    : stockSyncSettings.enabled
                      ? "Bật"
                      : "Tắt"
                }
              />
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Schedule color="action" />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Chu kỳ tự động
                  </Typography>

                  <Typography fontWeight={700}>
                    Mỗi {stockSyncSettings.intervalMinutes || 5} phút
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Sync color="action" />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Lần đồng bộ gần nhất
                  </Typography>

                  <Typography fontWeight={700}>
                    {formatDate(
                      stockSyncStatus?.lastRunAt || stockSyncStatus?.updatedAt,
                    )}
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircle color="success" />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Trạng thái gần nhất
                  </Typography>

                  <Box>
                    <Chip
                      size="small"
                      color={currentSyncStatusInfo.color}
                      label={currentSyncStatusInfo.label}
                    />
                  </Box>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Inventory2 color="action" />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Số lần thử lại tối đa
                  </Typography>

                  <Typography fontWeight={700}>
                    {stockSyncSettings.maxRetries || 3} lần
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>

          {stockSyncLoading && (
            <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            Công thức đồng bộ: tồn kho Shopee = tồn thực tế Nhật Khang Bike - số
            lượng đã đặt trước. Mức dự phòng hiện tại là{" "}
            {formatNumber(stockSyncSettings.safetyBuffer)} sản phẩm.
          </Alert>

          {stockSyncStatus?.lastError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography fontWeight={700}>Lỗi đồng bộ gần nhất</Typography>

              {stockSyncStatus.lastError}
            </Alert>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ mt: 2 }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={
                stockSyncRunning ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <PlayArrow />
                )
              }
              onClick={handleRunStockSync}
              disabled={stockSyncRunning || stockSyncLoading}
            >
              {stockSyncRunning ? "Đang đồng bộ..." : "Đồng bộ ngay"}
            </Button>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefreshStockSync}
              disabled={stockSyncLoading}
            >
              Làm mới trạng thái
            </Button>

            <Button
              variant="outlined"
              startIcon={<History />}
              endIcon={showStockSyncHistory ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setShowStockSyncHistory((current) => !current)}
            >
              {showStockSyncHistory ? "Ẩn lịch sử" : "Lịch sử đồng bộ"}
            </Button>
          </Stack>

          {/* SYNC SUMMARY */}

          <Grid container spacing={1.5} sx={{ mt: 1 }}>
            {[
              {
                label: "Tổng xử lý",
                value: syncSummary.total,
                color: "text.primary",
              },
              {
                label: "Thành công",
                value: syncSummary.success,
                color: "success.main",
              },
              {
                label: "Thất bại",
                value: syncSummary.failed,
                color: "error.main",
              },
              {
                label: "Bỏ qua",
                value: syncSummary.skipped,
                color: "text.secondary",
              },
              {
                label: "Đã cập nhật",
                value: syncSummary.updated,
                color: "primary.main",
              },
            ].map((item) => (
              <Grid item xs={6} sm={4} md={2.4} key={item.label}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    height: "100%",
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>

                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: item.color }}
                  >
                    {formatNumber(item.value)}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* HISTORY */}

          <Collapse in={showStockSyncHistory}>
            <Divider sx={{ my: 2 }} />

            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={1.5}
            >
              <Typography fontWeight={800}>
                Lịch sử 10 lần đồng bộ gần nhất
              </Typography>

              <Button
                size="small"
                startIcon={<Refresh />}
                onClick={loadStockSyncData}
                disabled={stockSyncLoading}
              >
                Tải lại
              </Button>
            </Stack>

            {stockSyncHistory.length === 0 ? (
              <Alert severity="info">Chưa có lịch sử đồng bộ tồn kho.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Thời gian</TableCell>
                      <TableCell>Kích hoạt</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell align="right">Tổng</TableCell>
                      <TableCell align="right">Thành công</TableCell>
                      <TableCell align="right">Thất bại</TableCell>
                      <TableCell>Lỗi</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {stockSyncHistory.map((item, index) => {
                      const itemStatus = getSyncStatusInfo(item.status);

                      const counts = item.counts || {};

                      return (
                        <TableRow key={item._id || item.id || index} hover>
                          <TableCell>
                            {formatDate(
                              item.startedAt ||
                                item.createdAt ||
                                item.processedAt,
                            )}
                          </TableCell>

                          <TableCell>
                            {item.trigger === "manual"
                              ? "Thủ công"
                              : item.trigger === "cron"
                                ? "Tự động"
                                : item.trigger || "—"}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              color={itemStatus.color}
                              label={itemStatus.label}
                            />
                          </TableCell>

                          <TableCell align="right">
                            {formatNumber(counts.total ?? item.total)}
                          </TableCell>

                          <TableCell align="right">
                            {formatNumber(
                              counts.success ?? counts.synced ?? item.success,
                            )}
                          </TableCell>

                          <TableCell align="right">
                            {formatNumber(counts.failed ?? item.failed)}
                          </TableCell>

                          <TableCell sx={{ minWidth: 160, maxWidth: 260 }}>
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{
                                display: "block",
                                whiteSpace: "normal",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {item.error || item.lastError || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Collapse>
        </CardContent>
      </Card>

      {/* FILTER */}

      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                placeholder="Tên sản phẩm, SKU hoặc Item ID..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Trạng thái</InputLabel>

                <Select
                  value={status}
                  label="Trạng thái"
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
                  <MenuItem value="NORMAL">Đang bán</MenuItem>
                  <MenuItem value="UNLIST">Đang ẩn</MenuItem>
                  <MenuItem value="BANNED">Vi phạm</MenuItem>
                  <MenuItem value="REVIEWING">Đang xét duyệt</MenuItem>
                  <MenuItem value="SELLER_DELETE">Người bán đã xóa</MenuItem>
                  <MenuItem value="SHOPEE_DELETE">Shopee đã xóa</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Search />}
                onClick={handleSearch}
                disabled={!shopId}
              >
                Tìm kiếm
              </Button>
            </Grid>

            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchInput("");
                  setKeyword("");
                }}
              >
                Xóa lọc
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* PRODUCT STATISTICS */}

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          {
            label: "Đang bán (trang này)",
            value: pageStats.active,
            color: "success.main",
          },
          {
            label: "Hết hàng đơn giản (trang này)",
            value: pageStats.outOfStock,
            color: "error.main",
          },
          {
            label: "Có phân loại (trang này)",
            value: pageStats.variants,
            color: "primary.main",
          },
          {
            label: "Tồn đã đặt trước",
            value: pageStats.reserved.toLocaleString("vi-VN"),
            color: "warning.main",
          },
        ].map((item) => (
          <Grid item xs={6} md={3} key={item.label}>
            <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>

                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{ color: item.color }}
                >
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Alert severity="info" sx={{ mb: 2 }}>
        Dữ liệu lấy trực tiếp từ Shopee. Thao tác cập nhật giá và tồn kho chỉ
        tác động đến Shopee, không tự động thay đổi kho Nhật Khang Bike. Thống
        kê phía trên tính trên trang hiện tại; tổng số sản phẩm lấy theo phân
        trang Shopee.
      </Alert>

      {/* PRODUCT TABLE */}

      <Card sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} justifyContent="space-between">
            <Box>
              <Typography fontWeight={700}>Đã chọn {selectedItemIds.length} sản phẩm</Typography>
              <Typography variant="caption" color="text.secondary">Chọn sản phẩm cần cập nhật. Mỗi lần kiểm tra tối đa 50 sản phẩm.</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setSelectedItemIds([])} disabled={!selectedItemIds.length}>Bỏ chọn</Button>
              <Button size="small" variant="contained" startIcon={checkingEditable ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />} onClick={handleCheckSelectedEditable} disabled={!selectedItemIds.length || checkingEditable || !shopId || selectedItemIds.length > 50}>Kiểm tra quyền sửa SKU</Button>
            </Stack>
          </Stack>
          {selectedItemIds.length > 50 && <Alert severity="warning" sx={{ mt: 1 }}>Đang chọn {selectedItemIds.length} sản phẩm. Vui lòng giảm xuống tối đa 50 sản phẩm mỗi lần kiểm tra.</Alert>}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 2 }}>
        <Box
          px={2}
          py={1.5}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Inventory2 color="action" />

            <Typography fontWeight={700}>Danh sách sản phẩm</Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {Number(pagination.total || 0).toLocaleString("vi-VN")} sản phẩm
          </Typography>
        </Box>

        <Divider />

        {loading ? (
          <Box py={8} display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        ) : !shopId ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              Chưa có shop Shopee được kết nối.
            </Typography>
          </Box>
        ) : products.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography color="text.secondary">
              Không tìm thấy sản phẩm.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 680 }}>
              <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={selectedItemIds.some((id) => visibleItemIds.includes(id)) && !allVisibleSelected}
                        onChange={handleToggleVisibleProducts}
                        inputProps={{ "aria-label": "Chọn tất cả sản phẩm trang này" }}
                      />
                    </TableCell>
                    <TableCell width={70}>Ảnh</TableCell>
                    <TableCell>Sản phẩm</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Item ID</TableCell>
                    <TableCell>Danh mục</TableCell>
                    <TableCell>Giá</TableCell>
                    <TableCell>Tồn kho</TableCell>
                    <TableCell>Đã đặt</TableCell>
                    <TableCell>Trạng thái</TableCell>
                    <TableCell align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {products.map((product) => {
                    const statusInfo = statusMap[product.itemStatus] || {
                      label: product.itemStatus || "Không rõ",
                      color: "default",
                    };

                    return (
                      <TableRow key={product.itemId} hover selected={selectedItemIds.includes(String(product.itemId))}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedItemIds.includes(String(product.itemId))}
                            onChange={() => handleToggleProduct(product.itemId)}
                            inputProps={{ "aria-label": "Chọn " + product.itemName }}
                          />
                        </TableCell>
                        <TableCell>
                          <Avatar
                            variant="rounded"
                            src={product.image}
                            sx={{
                              width: 48,
                              height: 48,
                              bgcolor: "#f3f4f6",
                            }}
                          >
                            <Inventory2 />
                          </Avatar>
                        </TableCell>

                        <TableCell sx={{ minWidth: 220 }}>
                          <Typography fontWeight={600} fontSize={13}>
                            {product.itemName}
                          </Typography>

                          <Stack
                            direction="row"
                            spacing={0.5}
                            mt={0.5}
                            flexWrap="wrap"
                          >
                            {product.hasModel && (
                              <Chip size="small" label="Có phân loại" />
                            )}

                            {Array.isArray(product.images) &&
                              product.images.length > 0 && (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`${product.images.length} ảnh`}
                                />
                              )}
                          </Stack>
                        </TableCell>

                        <TableCell>{product.itemSku || "—"}</TableCell>

                        <TableCell>{product.itemId}</TableCell>

                        <TableCell>{product.categoryId || "—"}</TableCell>

                        <TableCell>
                          {product.hasModel
                            ? "Theo phân loại"
                            : formatVND(
                                product.currentPrice ?? product.originalPrice,
                              )}
                        </TableCell>

                        <TableCell>
                          {product.hasModel
                            ? "Theo phân loại"
                            : Number(product.stock || 0).toLocaleString(
                                "vi-VN",
                              )}
                        </TableCell>

                        <TableCell>
                          {Number(product.reservedStock || 0).toLocaleString(
                            "vi-VN",
                          )}
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={statusInfo.label}
                            color={statusInfo.color}
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="Xem và chỉnh sửa">
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenDetail(product.itemId)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Divider />

            <Box
              p={2}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <Typography variant="body2" color="text.secondary">
                Trang {pagination.page} /{" "}
                {Math.max(pagination.totalPages || 1, 1)}
              </Typography>

              <Pagination
                color="primary"
                page={pagination.page}
                count={Math.max(pagination.totalPages || 1, 1)}
                onChange={(_, value) => loadProducts(value)}
                disabled={loading}
              />
            </Box>
          </>
        )}
      </Card>

      {/* KIỂM TRA QUYỀN CHỈNH SỬA SKU */}
      <Dialog open={editableDialogOpen} onClose={() => setEditableDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Kiểm tra quyền chỉnh sửa sản phẩm / SKU</DialogTitle>
        <DialogContent dividers>
          {checkingEditable ? (
            <Box py={5} display="flex" justifyContent="center"><CircularProgress /></Box>
          ) : editableResults.length === 0 ? (
            <Alert severity="info">Không có kết quả kiểm tra.</Alert>
          ) : (
            <Stack spacing={2}>
              {editableResults.map((item) => (
                <Paper key={item.itemId} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Box>
                      <Typography fontWeight={700}>{item.itemName || ("Sản phẩm " + item.itemId)}</Typography>
                      <Typography variant="caption" color="text.secondary">Item ID: {item.itemId} · Trạng thái: {item.itemStatus}</Typography>
                    </Box>
                    <Chip size="small" color={item.editable ? "success" : "error"} label={item.editable ? "Có thể chỉnh sửa" : "Không thể chỉnh sửa"} />
                  </Stack>
                  {item.reason && <Alert severity="warning" sx={{ mt: 1 }}>{item.reason}</Alert>}
                  <Table size="small" sx={{ mt: 1 }}>
                    <TableHead><TableRow><TableCell>SKU</TableCell><TableCell>Phân loại</TableCell><TableCell>Trạng thái</TableCell><TableCell>Quyền sửa</TableCell></TableRow></TableHead>
                    <TableBody>
                      {(item.skus || []).map((sku) => (
                        <TableRow key={sku.modelId}>
                          <TableCell>{sku.sku || "Chưa có SKU"}</TableCell>
                          <TableCell>{sku.name || sku.modelId}</TableCell>
                          <TableCell>{sku.status}</TableCell>
                          <TableCell>
                            <Chip size="small" color={sku.editable ? "success" : "error"} label={sku.editable ? "Được phép" : "Bị khóa"} />
                            {!sku.editable && sku.reason && <Typography variant="caption" display="block" color="error">{sku.reason}</Typography>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              ))}
              <Alert severity="info">Kết quả này kiểm tra trạng thái sản phẩm và phân loại trước khi cập nhật. Shopee vẫn có thể từ chối SKU do khuyến mãi, giới hạn kho hoặc quyền riêng; lỗi thực tế khi ghi sẽ được giữ lại theo từng SKU.</Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setEditableDialogOpen(false)}>Đóng</Button></DialogActions>
      </Dialog>

      {/* DETAIL DIALOG */}

      <Dialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        fullWidth
        maxWidth="md"
        scroll="paper"
      >
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography fontWeight={800}>Chi tiết sản phẩm Shopee</Typography>

              {detail && (
                <Typography variant="caption" color="text.secondary">
                  Item ID: {detail.itemId}
                </Typography>
              )}
            </Box>

            <IconButton onClick={() => setOpenDetail(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <Divider />

        <DialogContent>
          {detailLoading || !detail ? (
            <Box py={8} display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={3}>
              {/* PRODUCT INFO */}

              <Box>
                <Typography fontWeight={800} mb={2}>
                  1. Thông tin sản phẩm
                </Typography>

                <Stack spacing={2}>
                  {detail.images?.length > 0 && (
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      {detail.images.map((url, index) => (
                        <Avatar
                          key={`${url}-${index}`}
                          variant="rounded"
                          src={url}
                          sx={{
                            width: 76,
                            height: 76,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        />
                      ))}
                    </Stack>
                  )}

                  <TextField
                    fullWidth
                    label="Tên sản phẩm"
                    value={detail.itemName || ""}
                    onChange={(event) =>
                      updateDetailField("itemName", event.target.value)
                    }
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={5}
                    label="Mô tả"
                    value={detail.description || ""}
                    disabled={
                      String(
                        detail.descriptionType || "normal",
                      ).toLowerCase() === "extended"
                    }
                    onChange={(event) =>
                      updateDetailField("description", event.target.value)
                    }
                  />

                  {String(detail.descriptionType || "normal").toLowerCase() ===
                    "extended" && (
                    <Alert severity="info">
                      Sản phẩm dùng mô tả mở rộng có hình ảnh. Hệ thống bảo toàn
                      nội dung này và chưa cho phép ghi đè bằng mô tả văn bản
                      thông thường.
                    </Alert>
                  )}

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Cân nặng (kg)"
                        value={detail.weight ?? ""}
                        onChange={(event) =>
                          updateDetailField("weight", event.target.value)
                        }
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Dài (cm)"
                        value={detail.dimension.package_length}
                        onChange={(event) =>
                          updateDimension("package_length", event.target.value)
                        }
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Rộng (cm)"
                        value={detail.dimension.package_width}
                        onChange={(event) =>
                          updateDimension("package_width", event.target.value)
                        }
                      />
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Cao (cm)"
                        value={detail.dimension.package_height}
                        onChange={(event) =>
                          updateDimension("package_height", event.target.value)
                        }
                      />
                    </Grid>
                  </Grid>

                  <Button
                    variant="contained"
                    startIcon={
                      savingInfo ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <Save />
                      )
                    }
                    disabled={savingInfo}
                    onClick={handleSaveInfo}
                  >
                    Lưu thông tin lên Shopee
                  </Button>
                </Stack>
              </Box>

              <Divider />

              {/* PRICES */}

              <Box>
                <Typography fontWeight={800} mb={2}>
                  2. Giá bán Shopee
                </Typography>

                {detail.hasModel &&
                  (!detail.models || detail.models.length === 0) && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Sản phẩm được đánh dấu có phân loại nhưng API chi tiết
                      chưa trả về model nào. Hãy tải lại chi tiết hoặc kiểm tra
                      dữ liệu API. Để tránh ghi đè nhầm giá/tồn kho, thao tác
                      cập nhật đang bị khóa.
                    </Alert>
                  )}

                {!detail.hasModel ? (
                  <TextField
                    fullWidth
                    type="number"
                    label="Giá bán (VND)"
                    value={detail.originalPrice ?? ""}
                    onChange={(event) =>
                      updateDetailField("originalPrice", event.target.value)
                    }
                  />
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Phân loại</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell>Giá hiện tại</TableCell>
                          <TableCell>Giá mới (VND)</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {detail.models.map((model, index) => (
                          <TableRow key={model.modelId}>
                            <TableCell>
                              {model.modelName || model.modelId}
                            </TableCell>

                            <TableCell>{model.modelSku || "—"}</TableCell>

                            <TableCell>
                              {formatVND(model.originalPrice)}
                            </TableCell>

                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={model.originalPrice ?? ""}
                                onChange={(event) =>
                                  updateModelField(
                                    index,
                                    "originalPrice",
                                    event.target.value,
                                  )
                                }
                                sx={{ minWidth: 130 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                <Button
                  sx={{ mt: 2 }}
                  variant="contained"
                  startIcon={
                    savingPrices ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <CloudUpload />
                    )
                  }
                  disabled={
                    savingPrices ||
                    (detail.hasModel &&
                      (!detail.models || detail.models.length === 0))
                  }
                  onClick={handleSavePrices}
                >
                  Cập nhật giá lên Shopee
                </Button>
              </Box>

              <Divider />

              {/* STOCK */}

              <Box>
                <Typography fontWeight={800} mb={2}>
                  3. Tồn kho Shopee
                </Typography>

                {detail.hasModel &&
                  (!detail.models || detail.models.length === 0) && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Chưa có dữ liệu phân loại từ Shopee. Không thể cập nhật
                      tồn kho cho đến khi tải được đầy đủ danh sách model.
                    </Alert>
                  )}

                {!detail.hasModel ? (
                  <TextField
                    fullWidth
                    type="number"
                    label="Số lượng tồn"
                    value={detail.stock ?? ""}
                    onChange={(event) =>
                      updateDetailField("stock", event.target.value)
                    }
                  />
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Phân loại</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell>Tồn hiện tại</TableCell>
                          <TableCell>Tồn mới</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {detail.models.map((model, index) => (
                          <TableRow key={model.modelId}>
                            <TableCell>
                              {model.modelName || model.modelId}
                            </TableCell>

                            <TableCell>{model.modelSku || "—"}</TableCell>

                            <TableCell>{model.stock}</TableCell>

                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={model.stock ?? ""}
                                onChange={(event) =>
                                  updateModelField(
                                    index,
                                    "stock",
                                    event.target.value,
                                  )
                                }
                                sx={{ minWidth: 100 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                <Alert severity="warning" sx={{ mt: 2 }}>
                  Cập nhật tồn kho sẽ thay đổi số tồn người bán trên Shopee. Hãy
                  kiểm tra tồn kho kho hàng trước khi lưu.
                </Alert>

                <Button
                  sx={{ mt: 2 }}
                  variant="contained"
                  color="warning"
                  startIcon={
                    savingStock ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <CloudUpload />
                    )
                  }
                  disabled={
                    savingStock ||
                    (detail.hasModel &&
                      (!detail.models || detail.models.length === 0))
                  }
                  onClick={handleSaveStock}
                >
                  Cập nhật tồn kho Shopee
                </Button>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenDetail(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
