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

import { API_ENDPOINTS } from "../../api";

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

      const [orderRes, historyRes] = await Promise.all([
        axios.get(API_ENDPOINTS.ORDER, {
          ...getAuthConfig(),
          params: {
            page: 1,
            limit: 100,
          },
        }),

        axios.get(API_ENDPOINTS.INVENTORY_HISTORY, {
          ...getAuthConfig(),
          params: {
            page: 1,
            limit: 100,
            type: "order",
          },
        }),
      ]);

      setOrders(getRows(orderRes.data, "orders"));
      setHistories(getRows(historyRes.data, "histories"));
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

  // =====================================================
  // MONTHLY CHART DATA
  // =====================================================

  const chartData = useMemo(() => {
    const now = new Date();

    const months = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}`;

      return {
        key,
        month: `T${date.getMonth() + 1}/${date.getFullYear()}`,
        revenue: 0,
        profit: 0,
        missingCost: false,
      };
    });

    const monthMap = new Map(months.map((month) => [month.key, month]));

    orders.forEach((order) => {
      if (order.status !== "completed" || order.stockDeducted !== true) {
        return;
      }

      const date = getDate(
        order.completed_at || order.updated_at || order.created_at,
      );

      if (!date) return;

      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;

      const month = monthMap.get(monthKey);

      if (!month) return;

      const items = Array.isArray(order.items) ? order.items : [];

      let orderRevenue = 0;
      let orderCost = 0;
      let orderComplete = true;

      items.forEach((item) => {
        const qty = Math.abs(n(item.qty));

        if (qty <= 0) return;

        orderRevenue += getItemRevenue(item);

        const allocations = Array.isArray(item.batchAllocations)
          ? item.batchAllocations
          : [];

        if (allocations.length > 0) {
          const allocatedQty = allocations.reduce(
            (sum, allocation) => sum + Math.abs(n(allocation.qty)),
            0,
          );

          const validCost = allocations.every(
            (allocation) => n(allocation.unitCost) > 0,
          );

          if (allocatedQty === qty && validCost) {
            orderCost += allocations.reduce(
              (sum, allocation) =>
                sum + Math.abs(n(allocation.qty)) * n(allocation.unitCost),
              0,
            );
            return;
          }
        }

        const key = getBucketKey(order._id, item.productId, item.variantName);

        const rows = historyMap.get(key) || [];

        const historyQty = rows.reduce(
          (sum, history) => sum + Math.abs(n(history.qty)),
          0,
        );

        const hasMissingCost = rows.some(
          (history) => !(n(history.unitCost) > 0),
        );

        if (rows.length > 0 && historyQty >= qty && !hasMissingCost) {
          const historyCost = rows.reduce(
            (sum, history) =>
              sum + Math.abs(n(history.qty)) * n(history.unitCost),
            0,
          );

          orderCost += historyCost * (qty / historyQty);
        } else {
          orderComplete = false;
        }
      });

      month.revenue += orderRevenue;

      if (orderComplete) {
        month.profit += orderRevenue - orderCost;
      } else {
        month.missingCost = true;
      }
    });

    return months.map((month) => ({
      ...month,
      profit: month.missingCost ? null : month.profit,
    }));
  }, [orders, historyMap]);

  // =====================================================
  // BATCH PROFIT DATA
  // MỖI LÔ HÀNG LÀ MỘT BIỂU ĐỒ RIÊNG
  // =====================================================

  const batchProfitData = useMemo(() => {
    const batchMap = new Map();

    const addBatch = ({
      allocation,
      item,
      order,
      qty,
      revenue,
      unitCost,
      missingCost = false,
    }) => {
      if (qty <= 0) return;

      const key = getBatchKey(allocation, item);

      const current = batchMap.get(key) || {
        key,
        batchCode: getBatchLabel(allocation),
        batchId: normalizeId(allocation.batchId),
        qty: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        missingCost: false,
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
        current.cost += qty * n(unitCost);
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

          allocations.forEach((allocation) => {
            const qty = Math.abs(n(allocation.qty));

            if (qty <= 0) return;

            const revenue = (itemRevenue / itemQty) * qty;

            addBatch({
              allocation,
              item,
              order,
              qty,
              revenue,
              unitCost: allocation.unitCost,
              missingCost:
                !(n(allocation.unitCost) > 0) || allocationQtyMismatch,
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
  }, [orders, historyMap]);

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

  const missingMonths = chartData.filter((month) => month.missingCost).length;

  const batchSummary = useMemo(() => {
    const completeBatches = batchProfitData.filter(
      (batch) => !batch.missingCost,
    );

    return {
      count: batchProfitData.length,
      qty: batchProfitData.reduce((sum, batch) => sum + batch.qty, 0),
      revenue: batchProfitData.reduce((sum, batch) => sum + batch.revenue, 0),
      cost: completeBatches.reduce((sum, batch) => sum + batch.cost, 0),
      profit: completeBatches.reduce((sum, batch) => sum + n(batch.profit), 0),
      missing: batchProfitData.filter((batch) => batch.missingCost).length,
    };
  }, [batchProfitData]);

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
                Doanh thu và lợi nhuận
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Thống kê 12 tháng gần nhất
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
                  name="Lợi nhuận"
                  stroke="#2e7d32"
                  strokeWidth={3}
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
          <Typography variant="h6" fontWeight={800} mb={2}>
            Thống kê lợi nhuận theo lô hàng
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Tổng số lô
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {batchSummary.count}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Đã bán
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {batchSummary.qty.toLocaleString("vi-VN")}
              </Typography>
            </Grid>

            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Doanh thu các lô
              </Typography>
              <Typography variant="h6" fontWeight={800} color="primary.main">
                {money(batchSummary.revenue)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={2}>
              <Typography variant="body2" color="text.secondary">
                Giá vốn
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {moneyCost(batchSummary.cost)}
              </Typography>
            </Grid>

            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Lợi nhuận đã xác minh
              </Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">
                {money(batchSummary.profit)}
              </Typography>
            </Grid>
          </Grid>

          {batchSummary.missing > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Có {batchSummary.missing} lô thiếu hoặc chưa đủ dữ liệu giá vốn.
              Những lô này vẫn hiển thị doanh thu nhưng không tính lợi nhuận.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ============================================= */}
      {/* EACH BATCH HAS ITS OWN CHART */}
      {/* ============================================= */}

      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={800}>
          Biểu đồ chi tiết từng lô hàng
        </Typography>

        {batchProfitData.length === 0 ? (
          <Alert severity="info">
            Chưa tìm thấy dữ liệu lô hàng từ các đơn hoàn thành và đã trừ kho.
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
                          batch.missingCost ? "Thiếu giá vốn" : "Đã xác minh"
                        }
                        color={batch.missingCost ? "warning" : "success"}
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
                        <Typography fontWeight={700}>Lợi nhuận</Typography>

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
        Dữ liệu hiện tại lấy tối đa 100 đơn hàng và 100 lịch sử xuất kho gần
        nhất. Doanh thu theo lô được phân bổ theo số lượng xuất bán từ từng lô.
        Chưa phân bổ chiết khấu hoặc phí vận chuyển cấp đơn hàng vào từng lô.
      </Typography>
    </Box>
  );
};

export default ProfitAnalytics;
