import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
  Button,
  Grid,
  Divider,
  Chip,
} from "@mui/material";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { API_ENDPOINTS } from "../../../../api";

// =====================================================
// HELPERS
// =====================================================

const n = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const CNY_VND_RATE = Number(localStorage.getItem("CNY_VND_RATE") || 3650);
const money = (value) => `${Math.round(n(value)).toLocaleString("vi-VN")} đ`;
const moneyCost = (value) =>
  `${Math.round(n(value) * CNY_VND_RATE).toLocaleString("vi-VN")} đ`;
const getToken = () =>
  localStorage.getItem("adminToken") ||
  localStorage.getItem("accessToken") ||
  "";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

const normalizeId = (value) => String(value?._id || value || "");

const normalizeVariant = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getBucketKey = (orderId, productId, variantName) =>
  [
    normalizeId(orderId),
    normalizeId(productId),
    normalizeVariant(variantName),
  ].join("|");

const getDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getItemRevenue = (item) => {
  const qty = Math.abs(n(item.qty));

  if (item.total !== undefined && item.total !== null) {
    return n(item.total);
  }

  return n(item.price) * qty;
};

const getRows = (data, key) => {
  if (Array.isArray(data?.[key])) return data[key];

  if (Array.isArray(data?.data?.[key])) {
    return data.data[key];
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const getBatchKey = (allocation, item) => {
  const batchId = normalizeId(allocation.batchId);
  const batchCode = String(allocation.batchCode || "").trim();

  if (batchId) return `ID-${batchId}`;
  if (batchCode) return `CODE-${batchCode}`;

  return `UNKNOWN-${normalizeId(item.productId)}-${normalizeVariant(
    item.variantName,
  )}`;
};

const getBatchLabel = (allocation) =>
  String(allocation.batchCode || "").trim() ||
  (allocation.batchId
    ? `Lô ${normalizeId(allocation.batchId).slice(-8)}`
    : "Không xác định mã lô");

// =====================================================
// COMPONENT
// =====================================================

const ProfitAnalytics = () => {
  const [orders, setOrders] = useState([]);
  const [histories, setHistories] = useState([]);
  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      // API đơn hàng trả totalPages ở cấp cao nhất, trong khi một số
      // endpoint kho trả pagination.totalPages. Đọc cả hai dạng và tải
      // toàn bộ trang để không bỏ sót đơn/lịch sử khi vượt 100 bản ghi.
      const loadAllPages = async (url, params, key) => {
        const firstResponse = await axios.get(url, {
          ...getAuthConfig(),
          params: { ...params, page: 1, limit: 100 },
        });
        const firstRows = getRows(firstResponse.data, key);
        const totalPages = Math.max(
          1,
          Number(
            firstResponse.data?.pagination?.totalPages ||
              firstResponse.data?.totalPages ||
              firstResponse.data?.data?.pagination?.totalPages ||
              1,
          ),
        );
        const rows = [...firstRows];

        for (let page = 2; page <= totalPages; page += 1) {
          const response = await axios.get(url, {
            ...getAuthConfig(),
            params: { ...params, page, limit: 100 },
          });
          rows.push(...getRows(response.data, key));
        }

        return rows;
      };

      const [allOrders, allHistories, allBatches] = await Promise.all([
        loadAllPages(API_ENDPOINTS.ORDER, {}, "orders"),
        loadAllPages(API_ENDPOINTS.INVENTORY_HISTORY, { type: "order" }, "histories"),
        loadAllPages(
          API_ENDPOINTS.INVENTORY_BATCHES,
          { sort: "created_at", order: "desc" },
          "batches",
        ),
      ]);

      setOrders(allOrders);
      setHistories(allHistories);
      setBatches(allBatches);
    } catch (err) {
      console.error("LOAD PROFIT ANALYTICS:", err);

      setError(
        err?.response?.data?.message ||
          "Không thể tải dữ liệu doanh thu và lợi nhuận.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =====================================================
  // INVENTORY HISTORY MAP
  // =====================================================

  const historyMap = useMemo(() => {
    const map = new Map();

    histories.forEach((history) => {
      if (history.type !== "order") return;
      if (history.rollback === true) return;

      if (history.referenceType && history.referenceType !== "Order") {
        return;
      }

      const key = getBucketKey(
        history.referenceId,
        history.productId,
        history.variantName,
      );

      const current = map.get(key) || [];

      current.push(history);

      map.set(key, current);
    });

    return map;
  }, [histories]);

  const dataQuality = useMemo(() => {
    const result = {
      completedOrders: 0,
      completedLines: 0,
      missingAllocationLines: 0,
      missingBatchLinkLines: 0,
      allocationMismatchLines: 0,
      zeroCostAllocationLines: 0,
      estimatedCostLines: 0,
      unresolvedCostLines: 0,
      missingHistoryLines: 0,
      examples: [],
    };

    orders.forEach((order) => {
      if (order.status !== "completed" || order.stockDeducted !== true) return;
      result.completedOrders += 1;
      (order.items || []).forEach((item) => {
        const qty = Math.abs(n(item.qty));
        if (qty <= 0) return;
        result.completedLines += 1;
        const allocations = Array.isArray(item.batchAllocations) ? item.batchAllocations : [];
        const allocatedQty = allocations.reduce((sum, allocation) => sum + Math.abs(n(allocation.qty)), 0);
        const rows = historyMap.get(getBucketKey(order._id, item.productId, item.variantName)) || [];
        const issues = [];

        if (!allocations.length) {
          result.missingAllocationLines += 1;
          issues.push("Chưa lưu phân bổ lô");
          if (!rows.length) {
            result.missingHistoryLines += 1;
            issues.push("Thiếu lịch sử xuất kho");
          } else if (rows.every((history) => !history.batchId && !String(history.batchCode || "").trim())) {
            result.missingBatchLinkLines += 1;
            issues.push("Lịch sử không có mã lô");
          }
        } else {
          if (allocatedQty !== qty) {
            result.allocationMismatchLines += 1;
            issues.push(`Phân bổ ${allocatedQty}/${qty}`);
          }
          if (allocations.some((allocation) => !(n(allocation.unitCost) > 0))) {
            result.zeroCostAllocationLines += 1;
            const canEstimate =
              allocatedQty === qty &&
              allocations.every((allocation) => !(n(allocation.unitCost) > 0)) &&
              n(item.unitCost) > 0;
            if (canEstimate) result.estimatedCostLines += 1;
            else result.unresolvedCostLines += 1;
            issues.push(canEstimate ? "Giá vốn đang ước tính từ đơn" : "Lô chưa có giá vốn");
          }
        }

        if (issues.length && result.examples.length < 12) {
          result.examples.push({
            code: order.code || normalizeId(order._id),
            product: item.productTitle || "Sản phẩm",
            issue: issues.join(" • "),
          });
        }
      });
    });
    return result;
  }, [orders, historyMap]);

  // =====================================================
  // MONTHLY CHART DATA
  // =====================================================

  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        month: `T${date.getMonth() + 1}/${date.getFullYear()}`,
        revenue: 0,
        profit: 0,
        estimatedProfit: 0,
        missingCost: false,
        hasEstimatedCost: false,
      };
    });
    const monthMap = new Map(months.map((month) => [month.key, month]));

    orders.forEach((order) => {
      if (order.status !== "completed" || order.stockDeducted !== true) return;
      const date = getDate(order.completedAt || order.completed_at || order.updated_at || order.created_at);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const month = monthMap.get(key);
      if (!month) return;

      let revenue = 0;
      let cost = 0;
      let complete = true;
      let estimated = false;

      (Array.isArray(order.items) ? order.items : []).forEach((item) => {
        const qty = Math.abs(n(item.qty));
        if (qty <= 0) return;
        revenue += getItemRevenue(item);

        const allocations = Array.isArray(item.batchAllocations) ? item.batchAllocations : [];
        const allocatedQty = allocations.reduce((sum, allocation) => sum + Math.abs(n(allocation.qty)), 0);
        const qtyMatches = allocations.length > 0 && allocatedQty === qty;
        const costsValid = allocations.length > 0 && allocations.every((allocation) => n(allocation.unitCost) > 0);
        const costsMissing = allocations.length > 0 && allocations.every((allocation) => !(n(allocation.unitCost) > 0));

        if (qtyMatches && costsValid) {
          cost += allocations.reduce((sum, allocation) =>
            sum + Math.abs(n(allocation.qty)) * n(allocation.unitCost) * CNY_VND_RATE, 0);
          return;
        }

        if (qtyMatches && costsMissing && n(item.unitCost) > 0) {
          cost += qty * n(item.unitCost) * CNY_VND_RATE;
          estimated = true;
          return;
        }

        const rows = historyMap.get(getBucketKey(order._id, item.productId, item.variantName)) || [];
        const historyQty = rows.reduce((sum, history) => sum + Math.abs(n(history.qty)), 0);
        const historyCostsValid = rows.length > 0 && rows.every((history) => n(history.unitCost) > 0);

        // Không lấy lịch sử thừa/thiếu số lượng rồi chia tỷ lệ, vì có thể che giấu bản ghi trùng.
        if (historyQty === qty && historyCostsValid) {
          cost += rows.reduce((sum, history) =>
            sum + Math.abs(n(history.qty)) * n(history.unitCost) * CNY_VND_RATE, 0);
          return;
        }

        if (allocations.length === 0 && rows.length === 0 && n(item.unitCost) > 0) {
          cost += qty * n(item.unitCost) * CNY_VND_RATE;
          estimated = true;
          return;
        }

        complete = false;
      });

      month.revenue += revenue;
      if (!complete) month.missingCost = true;
      else {
        month.profit += revenue - cost;
        if (estimated) month.hasEstimatedCost = true;
      }
    });

    return months.map((month) => ({
      ...month,
      profit: month.missingCost || month.hasEstimatedCost ? null : month.profit,
      estimatedProfit: !month.missingCost && month.hasEstimatedCost ? month.profit : null,
    }));
  }, [orders, historyMap]);

  // =====================================================
  // CÁC LÔ NHẬP MỚI TRONG THÁNG HIỆN TẠI
  // Chỉ tính lô nhập thực tế từ phiếu nhập; không lấy tồn đầu kỳ,
  // lô dựng lịch sử hoặc điều chỉnh thủ công.
  // =====================================================

  const currentMonthBatches = useMemo(() => {
    const now = new Date();
    return batches.filter((batch) => {
      // Backend InventoryBatch dùng enum viết HOA: IMPORT / OPENING /
      // ADJUSTMENT / RETURN / OTHER. Dữ liệu receipt là alias cũ.
      const source = String(batch.source || "").trim().toUpperCase();
      const isRealImport =
        source === "IMPORT" ||
        source === "RECEIPT" ||
        Boolean(batch.importReceiptId);

      if (!isRealImport) return false;

      // Ưu tiên ngày nhập; fallback createdAt cho dữ liệu cũ thiếu importDate.
      const importDate = getDate(batch.importDate || batch.createdAt);
      return Boolean(
        importDate &&
          importDate.getFullYear() === now.getFullYear() &&
          importDate.getMonth() === now.getMonth(),
      );
    });
  }, [batches]);

  const currentMonthBatchIds = useMemo(
    () => new Set(currentMonthBatches.map((batch) => normalizeId(batch._id))),
    [currentMonthBatches],
  );

  const currentMonthBatchByCode = useMemo(
    () => new Map(currentMonthBatches.map((batch) => [String(batch.batchCode || "").trim(), batch])),
    [currentMonthBatches],
  );

  const currentMonthLabel = useMemo(
    () =>
      new Date().toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      }),
    [],
  );

  // =====================================================
  // BATCH PROFIT DATA
  // MỖI LÔ HÀNG LÀ MỘT BIỂU ĐỒ RIÊNG
  // =====================================================

  const batchProfitData = useMemo(() => {
    const batchMap = new Map();

    // Khởi tạo trước tất cả lô nhập trong tháng, kể cả lô chưa phát sinh bán.
    currentMonthBatches.forEach((batch) => {
      const key = getBatchKey(
        { batchId: batch._id, batchCode: batch.batchCode },
        batch,
      );
      batchMap.set(key, {
        key,
        batchCode: getBatchLabel({
          batchId: batch._id,
          batchCode: batch.batchCode,
        }),
        batchId: normalizeId(batch._id),
        importDate: batch.importDate,
        importQty: n(batch.importQty),
        remainingQty: n(batch.remainingQty),
        qty: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        missingCost: false,
        estimatedCost: false,
        orderCount: new Set(),
        products: new Set([String(batch.productTitle || "Sản phẩm")]),
      });
    });

    const addBatch = ({
      allocation,
      item,
      order,
      qty,
      revenue,
      unitCost,
      missingCost = false,
      estimatedCost = false,
    }) => {
      if (qty <= 0) return;

      const batchId = normalizeId(allocation.batchId);
      const batchCode = String(allocation.batchCode || "").trim();
      const batchByCode = batchCode ? currentMonthBatchByCode.get(batchCode) : null;

      // Chỉ ghi nhận lô nhập trong tháng; nếu lịch sử chỉ có mã lô thì
      // chuẩn hóa về ID của lô để không tạo hai thẻ cho cùng một lô.
      if (!currentMonthBatchIds.has(batchId) && !batchByCode) return;

      const normalizedAllocation = {
        ...allocation,
        batchId: allocation.batchId || batchByCode?._id,
        batchCode: batchCode || batchByCode?.batchCode || "",
      };
      const key = getBatchKey(normalizedAllocation, item);

      const current = batchMap.get(key) || {
        key,
        batchCode: getBatchLabel(normalizedAllocation),
        batchId: normalizeId(normalizedAllocation.batchId),
        qty: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        missingCost: false,
        estimatedCost: false,
        orderCount: new Set(),
        products: new Set(),
      };

      current.qty += qty;
      current.revenue += revenue;
      current.orderCount.add(normalizeId(order._id));
      current.products.add(
        String(item.productTitle || item.productCode || "Sản phẩm"),
      );

      if (missingCost || !(n(unitCost) > 0)) {
        current.missingCost = true;
      } else {
        current.cost += qty * n(unitCost * CNY_VND_RATE);
        if (estimatedCost) current.estimatedCost = true;
      }

      batchMap.set(key, current);
    };

    orders.forEach((order) => {
      if (order.status !== "completed" || order.stockDeducted !== true) {
        return;
      }

      const items = Array.isArray(order.items) ? order.items : [];

      items.forEach((item) => {
        const itemQty = Math.abs(n(item.qty));

        if (itemQty <= 0) return;

        const itemRevenue = getItemRevenue(item);

        // ---------------------------------------------
        // 1. ƯU TIÊN BATCH ALLOCATIONS TRONG ORDER
        // ---------------------------------------------

        const allocations = Array.isArray(item.batchAllocations)
          ? item.batchAllocations
          : [];

        if (allocations.length > 0) {
          const allocatedQty = allocations.reduce(
            (sum, allocation) => sum + Math.abs(n(allocation.qty)),
            0,
          );
          const allocationQtyMismatch = allocatedQty !== itemQty;
          const canEstimateFromOrder =
            !allocationQtyMismatch &&
            allocations.every((allocation) => !(n(allocation.unitCost) > 0)) &&
            n(item.unitCost) > 0;

          allocations.forEach((allocation) => {
            const qty = Math.abs(n(allocation.qty));
            if (qty <= 0) return;
            const revenue = (itemRevenue / itemQty) * qty;
            const hasBatchCost = n(allocation.unitCost) > 0;

            addBatch({
              allocation,
              item,
              order,
              qty,
              revenue,
              unitCost: hasBatchCost ? allocation.unitCost : canEstimateFromOrder ? item.unitCost : allocation.unitCost,
              estimatedCost: !hasBatchCost && canEstimateFromOrder,
              missingCost: allocationQtyMismatch || (!hasBatchCost && !canEstimateFromOrder),
            });
          });
          return;
        }
        // ---------------------------------------------
        // 2. DỰ PHÒNG: INVENTORY HISTORY
        // ---------------------------------------------

        const historyKey = getBucketKey(
          order._id,
          item.productId,
          item.variantName,
        );

        const historyRows = historyMap.get(historyKey) || [];

        if (historyRows.length === 0) {
          addBatch({
            allocation: {},
            item,
            order,
            qty: itemQty,
            revenue: itemRevenue,
            unitCost: 0,
            missingCost: true,
          });

          return;
        }

        const historyQty = historyRows.reduce(
          (sum, history) => sum + Math.abs(n(history.qty)),
          0,
        );

        const qtyMismatch = historyQty !== itemQty;

        historyRows.forEach((history) => {
          const qty = Math.abs(n(history.qty));

          if (qty <= 0) return;

          const revenue = (itemRevenue / itemQty) * qty;

          addBatch({
            allocation: {
              batchId: history.batchId,
              batchCode: history.batchCode,
            },
            item,
            order,
            qty,
            revenue,
            unitCost: history.unitCost,
            missingCost: !(n(history.unitCost) > 0) || qtyMismatch,
          });
        });
      });
    });

    return Array.from(batchMap.values())
      .map((batch) => {
        const profit = batch.missingCost ? null : batch.revenue - batch.cost;

        const margin =
          !batch.missingCost && batch.revenue > 0
            ? (profit / batch.revenue) * 100
            : null;

        return {
          ...batch,
          profit,
          margin,
          orderCount: batch.orderCount.size,
          products: Array.from(batch.products),
          chartData: [
            {
              name: "Doanh thu",
              amount: batch.revenue,
            },
            {
              name: "Giá vốn",
              amount: batch.missingCost ? 0 : batch.cost,
            },
            {
              name: "Lợi nhuận",
              amount: batch.missingCost ? 0 : profit,
            },
          ],
        };
      })
      .sort((a, b) => {
        if (a.missingCost !== b.missingCost) {
          return a.missingCost ? 1 : -1;
        }

        return n(b.profit) - n(a.profit);
      });
  }, [orders, historyMap, currentMonthBatches, currentMonthBatchIds, currentMonthBatchByCode]);

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalRevenue = useMemo(
    () => chartData.reduce((sum, month) => sum + month.revenue, 0),
    [chartData],
  );

  const totalProfit = useMemo(
    () => chartData.reduce((sum, month) => sum + n(month.profit), 0),
    [chartData],
  );

  const totalEstimatedProfit = useMemo(
    () => chartData.reduce((sum, month) => sum + n(month.estimatedProfit), 0),
    [chartData],
  );

  const missingMonths = chartData.filter((month) => month.missingCost).length;

  const batchSummary = useMemo(() => {
    const verified = batchProfitData.filter((batch) => !batch.missingCost && !batch.estimatedCost);
    const estimated = batchProfitData.filter((batch) => !batch.missingCost && batch.estimatedCost);

    return {
      count: currentMonthBatches.length,
      importQty: currentMonthBatches.reduce((sum, batch) => sum + n(batch.importQty), 0),
      remainingQty: currentMonthBatches.reduce((sum, batch) => sum + n(batch.remainingQty), 0),
      importValue: currentMonthBatches.reduce((sum, batch) =>
        sum + n(batch.importQty) * n(batch.unitCost) * CNY_VND_RATE, 0),
      qty: batchProfitData.reduce((sum, batch) => sum + batch.qty, 0),
      revenue: batchProfitData.reduce((sum, batch) => sum + batch.revenue, 0),
      cost: verified.reduce((sum, batch) => sum + batch.cost, 0),
      profit: verified.reduce((sum, batch) => sum + n(batch.profit), 0),
      estimatedCost: estimated.reduce((sum, batch) => sum + batch.cost, 0),
      estimatedProfit: estimated.reduce((sum, batch) => sum + n(batch.profit), 0),
      missing: batchProfitData.filter((batch) => batch.missingCost).length,
      estimated: estimated.length,
    };
  }, [batchProfitData, currentMonthBatches]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <Box sx={{ mt: 3 }}>
      {/* ============================================= */}
      {/* MONTHLY ANALYTICS */}
      {/* ============================================= */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          mb: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            mb={3}
          >
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Doanh thu & lợi nhuận website
              </Typography>

              <Typography variant="body2" color="text.secondary">
                12 tháng gần nhất • giá vốn theo FIFO
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              disabled={refreshing}
              onClick={() => loadData(true)}
            >
              {refreshing ? <CircularProgress size={18} /> : "Làm mới"}
            </Button>
          </Stack>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {missingMonths > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Có {missingMonths} tháng thiếu dữ liệu giá vốn. Lợi nhuận các
              tháng này được để trống để tránh hiển thị số liệu không chính xác.
            </Alert>
          )}

          {(dataQuality.missingAllocationLines > 0 ||
            dataQuality.allocationMismatchLines > 0 ||
            dataQuality.zeroCostAllocationLines > 0) && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography fontWeight={800} gutterBottom>
                Cảnh báo chất lượng dữ liệu kho
              </Typography>
              <Typography variant="body2">
                {dataQuality.completedOrders} đơn hoàn thành • {dataQuality.completedLines} dòng sản phẩm.
                Thiếu phân bổ lô: {dataQuality.missingAllocationLines};
                lịch sử thiếu mã lô: {dataQuality.missingBatchLinkLines};
                phân bổ lệch số lượng: {dataQuality.allocationMismatchLines};
                lô chưa có giá vốn: {dataQuality.zeroCostAllocationLines}
                (ước tính được {dataQuality.estimatedCostLines}, chưa xác định {dataQuality.unresolvedCostLines}).
              </Typography>
              {dataQuality.examples.map((item) => (
                <Typography key={`${item.code}-${item.product}`} variant="caption" display="block">
                  • {item.code} — {item.product}: {item.issue}
                </Typography>
              ))}
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} mb={3}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Tổng doanh thu
              </Typography>

              <Typography variant="h5" fontWeight={800} color="primary.main">
                {money(totalRevenue)}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Lợi nhuận đã xác minh
              </Typography>
              <Typography variant="h5" fontWeight={800} color="success.main">
                {money(totalProfit)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Lợi nhuận ước tính
              </Typography>
              <Typography variant="h5" fontWeight={800} color="warning.main">
                {money(totalEstimatedProfit)}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              width: "100%",
              height: { xs: 300, md: 380 },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 15,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  width={75}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    if (Math.abs(value) >= 1000000) {
                      return `${(value / 1000000).toFixed(0)}tr`;
                    }

                    if (Math.abs(value) >= 1000) {
                      return `${(value / 1000).toFixed(0)}k`;
                    }

                    return value;
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(value, name) => [
                    value === null || value === undefined
                      ? "Thiếu giá vốn"
                      : money(value),
                    name,
                  ]}
                />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu"
                  stroke="#1976d2"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />

                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Lợi nhuận đã xác minh"
                  stroke="#2e7d32"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="estimatedProfit"
                  name="Lợi nhuận ước tính"
                  stroke="#ed6c02"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Chỉ tính đơn hoàn thành và đã trừ kho. Giá vốn ưu tiên lấy từ phân
            bổ lô nhập trong đơn hàng.
          </Typography>
        </CardContent>
      </Card>

      {/* ============================================= */}
      {/* BATCH SUMMARY */}
      {/* ============================================= */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          mb: 3,
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={800} mb={0.5}>
            Thống kê lợi nhuận theo lô nhập mới
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Chỉ các lô nhập từ phiếu nhập trong {currentMonthLabel}; không tính tồn đầu kỳ hoặc lô lịch sử.
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Số lô nhập mới
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {batchSummary.count}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Tổng số lượng nhập
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {batchSummary.importQty.toLocaleString("vi-VN")}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Giá trị nhập
              </Typography>
              <Typography variant="h6" fontWeight={800} color="primary.main">
                {money(batchSummary.importValue)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Tồn còn trong lô
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {batchSummary.remainingQty.toLocaleString("vi-VN")}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Đã bán từ lô
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {batchSummary.qty.toLocaleString("vi-VN")}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Doanh thu từ lô
              </Typography>
              <Typography variant="h6" fontWeight={800} color="primary.main">
                {money(batchSummary.revenue)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Giá vốn đã bán
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {money(batchSummary.cost)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Lợi nhuận đã xác minh
              </Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">
                {money(batchSummary.profit)}
              </Typography>
            </Grid>
          </Grid>

          {(batchSummary.missing > 0 || batchSummary.estimated > 0) && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Có {batchSummary.estimated} lô dùng giá vốn ước tính từ snapshot đơn hàng
              (giá vốn {money(batchSummary.estimatedCost)}, lợi nhuận {money(batchSummary.estimatedProfit)}).
              Có {batchSummary.missing} lô chưa đủ căn cứ giá vốn nên không tính lợi nhuận.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ============================================= */}
      {/* EACH BATCH HAS ITS OWN CHART */}
      {/* ============================================= */}

      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={800}>
          Biểu đồ chi tiết từng lô nhập trong {currentMonthLabel}
        </Typography>

        {batchProfitData.length === 0 ? (
          <Alert severity="info">
            Tháng này chưa có lô nhập mới hoặc chưa có dữ liệu phân bổ bán hàng từ các lô này.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {batchProfitData.map((batch) => (
              <Grid item xs={12} md={6} xl={4} key={batch.key}>
                <Card
                  elevation={0}
                  sx={{
                    height: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                  }}
                >
                  <CardContent>
                    {/* BATCH HEADER */}

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                      mb={1}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={800} noWrap>
                          {batch.batchCode}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          {batch.orderCount} đơn hàng
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={
                          batch.missingCost
                            ? "Thiếu giá vốn"
                            : batch.estimatedCost
                              ? "Ước tính"
                              : "Đã xác minh"
                        }
                        color={batch.missingCost || batch.estimatedCost ? "warning" : "success"}
                        variant="outlined"
                      />
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    {/* BATCH CHART */}

                    <Box sx={{ width: "100%", height: 230 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={batch.chartData}
                          margin={{
                            top: 10,
                            right: 5,
                            left: 5,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            width={65}
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => {
                              if (Math.abs(value) >= 1000000) {
                                return `${(value / 1000000).toFixed(1)}tr`;
                              }

                              if (Math.abs(value) >= 1000) {
                                return `${(value / 1000).toFixed(0)}k`;
                              }

                              return value;
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            formatter={(value, name) => [money(value), name]}
                          />

                          <Bar
                            dataKey="amount"
                            name="Số tiền"
                            fill="#1976d2"
                            radius={[5, 5, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>

                    {/* BATCH DETAILS */}

                    <Stack spacing={1} mt={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Số lượng đã bán
                        </Typography>

                        <Typography fontWeight={700}>
                          {batch.qty.toLocaleString("vi-VN")}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Doanh thu
                        </Typography>

                        <Typography fontWeight={700}>
                          {money(batch.revenue)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Giá vốn
                        </Typography>

                        <Typography fontWeight={700}>
                          {batch.missingCost
                            ? "Chưa xác định"
                            : money(batch.cost)}
                        </Typography>
                      </Stack>

                      <Divider />

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography fontWeight={700}>
                          {batch.estimatedCost ? "Lợi nhuận ước tính" : "Lợi nhuận"}
                        </Typography>

                        <Typography
                          fontWeight={800}
                          color={
                            batch.missingCost
                              ? "text.secondary"
                              : batch.profit >= 0
                                ? "success.main"
                                : "error.main"
                          }
                        >
                          {batch.missingCost
                            ? "Chưa xác định"
                            : money(batch.profit)}
                        </Typography>
                      </Stack>

                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Tỷ suất lợi nhuận
                        </Typography>

                        <Typography fontWeight={700}>
                          {batch.margin === null
                            ? "--"
                            : `${batch.margin.toFixed(2)}%`}
                        </Typography>
                      </Stack>
                    </Stack>

                    {batch.missingCost && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Lô này thiếu giá vốn hoặc số lượng phân bổ chưa khớp.
                        Vui lòng kiểm tra dữ liệu nhập và xuất kho.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 2 }}
      >
        Hệ thống tải đủ các trang đơn hàng, lịch sử xuất kho và lô nhập.
        Giá vốn theo lô lấy từ batchAllocations hoặc lịch sử có mã lô; snapshot
        giá vốn của đơn chỉ dùng để ước tính và được đánh dấu riêng.
        Chưa phân bổ chiết khấu hoặc phí vận chuyển cấp đơn hàng vào từng lô.
      </Typography>
    </Box>
  );
};

export default ProfitAnalytics;
