import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Grid, Stack, TextField, Typography
} from "@mui/material";
import { Refresh, TrendingDown, Replay, ReceiptLong, Person, Inventory2 } from "@mui/icons-material";
import { BASE_URL } from "../../../../api";

const API_URL = `${BASE_URL}/admin/order-outcomes`;
const getToken = () => localStorage.getItem("adminToken") || localStorage.getItem("accessToken") || "";
const number = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const percent = (value) => `${(Number(value) || 0).toFixed(2)}%`;

export default function OrderOutcomeStats() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const toInput = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const [fromDate, setFromDate] = useState(toInput(firstDay));
  const [toDate, setToDate] = useState(toInput(today));
  const [data, setData] = useState({
    totals: {}, buyerStats: [], productStats: [], cancellationRate: 0, returnRate: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(API_URL, {
        params: { fromDate, toDate },
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setData(response.data?.data || {
        totals: {}, buyerStats: [], productStats: [], cancellationRate: 0, returnRate: 0,
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể tải thống kê hủy/trả hàng.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const Summary = ({ title, value, detail, icon, color }) => (
    <Card elevation={0} sx={{ height: "100%", border: "1px solid #e5eaf2", borderRadius: 3 }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography color="text.secondary" fontSize={13} fontWeight={600}>{title}</Typography>
          <Box sx={{ color, bgcolor: `${color}14`, borderRadius: 2, p: 1 }}>{icon}</Box>
        </Stack>
        <Typography variant="h4" fontWeight={800} sx={{ mt: 1, color: "#172033" }}>{value}</Typography>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>{detail}</Typography>
      </CardContent>
    </Card>
  );

  const SectionTitle = ({ icon, title, subtitle }) => (
    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1.8 }}>
      <Box sx={{ display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 2, bgcolor: "#eaf1ff", color: "#2563eb" }}>{icon}</Box>
      <Box>
        <Typography fontWeight={800} color="#172033">{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Box>
    </Stack>
  );

  const BuyerCard = ({ row, index }) => (
    <Box sx={{ p: 1.5, border: "1px solid #e8edf4", borderRadius: 2, bgcolor: "#fff" }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800} color="#172033" sx={{ overflowWrap: "anywhere" }}>
            {index + 1}. {row.buyerUsername || "Không xác định"}
          </Typography>
          {row.buyerUserId && <Typography variant="caption" color="text.secondary">User ID: {row.buyerUserId}</Typography>}
        </Box>
        <Chip size="small" color={row.returnRate >= 20 || row.cancellationRate >= 20 ? "error" : "default"}
          label={`Hủy + trả ${percent(row.cancellationRate + row.returnRate)}`} />
      </Stack>
      <Grid container spacing={1} sx={{ mt: .5 }}>
        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Tổng đơn</Typography><Typography fontWeight={700}>{number(row.totalOrders)}</Typography></Grid>
        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Đơn hủy</Typography><Typography fontWeight={700}>{number(row.cancelledOrders)} · {percent(row.cancellationRate)}</Typography></Grid>
        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Đơn trả</Typography><Typography fontWeight={700}>{number(row.returnedOrders)} · {percent(row.returnRate)}</Typography></Grid>
      </Grid>
      {!!row.orderSns?.length && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Mã đơn Shopee: </Typography>
          <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>{row.orderSns.join(", ")}</Typography>
        </Box>
      )}
    </Box>
  );

  const ProductCard = ({ row, index }) => (
    <Box sx={{ p: 1.5, border: "1px solid #e8edf4", borderRadius: 2, bgcolor: "#fff" }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800} color="#172033" sx={{ overflowWrap: "anywhere" }}>
            {index + 1}. {row.productName || "Sản phẩm chưa có tên"}
          </Typography>
          {(row.modelName || row.itemSku) && <Typography variant="caption" color="text.secondary">{[row.modelName, row.itemSku].filter(Boolean).join(" · ")}</Typography>}
        </Box>
        <Chip size="small" color={row.returnRate >= 10 ? "error" : row.returnRate > 0 ? "warning" : "default"}
          label={percent(row.returnRate)} />
      </Stack>
      <Grid container spacing={1} sx={{ mt: .5 }}>
        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Đã bán</Typography><Typography fontWeight={700}>{number(row.soldQty)}</Typography></Grid>
        <Grid item xs={4}><Typography variant="caption" color="text.secondary">SL hoàn</Typography><Typography fontWeight={700}>{number(row.returnedQty)}</Typography></Grid>
        <Grid item xs={4}><Typography variant="caption" color="text.secondary">Đơn có hoàn</Typography><Typography fontWeight={700}>{number(row.returnedOrderCount)}</Typography></Grid>
      </Grid>
      {!!row.orderSns?.length && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Mã đơn liên quan: </Typography>
          <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>{row.orderSns.join(", ")}</Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f6f8fc", minHeight: "100%" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#172033">Thống kê hủy & trả hàng</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
            Chỉ thống kê đơn Shopee · Theo dõi khách hàng và sản phẩm có tỷ lệ hủy/hoàn cao
          </Typography>
        </Box>
        <Button startIcon={<Refresh />} variant="outlined" onClick={load} disabled={loading}>Làm mới</Button>
      </Stack>

      <Card elevation={0} sx={{ border: "1px solid #e5eaf2", borderRadius: 3, mb: 2.5 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
            <TextField size="small" label="Từ ngày" type="date" value={fromDate}
              onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField size="small" label="Đến ngày" type="date" value={toDate}
              onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <Button variant="contained" onClick={load} disabled={loading} sx={{ minWidth: 110 }}>Áp dụng</Button>
          </Stack>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={28} /></Box>}

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} md={3}><Summary title="Tổng đơn Shopee" value={number(data.totals.totalOrders)} detail="Trong khoảng thời gian lọc" icon={<ReceiptLong />} color="#2563eb" /></Grid>
        <Grid item xs={6} md={3}><Summary title="Đơn hủy" value={number(data.totals.cancelledOrders)} detail={`Tỷ lệ ${percent(data.cancellationRate)}`} icon={<TrendingDown />} color="#dc6b35" /></Grid>
        <Grid item xs={6} md={3}><Summary title="Đơn trả hàng" value={number(data.totals.returnedOrders)} detail={`Tỷ lệ ${percent(data.returnRate)}`} icon={<Replay />} color="#7c3aed" /></Grid>
        <Grid item xs={6} md={3}><Summary title="Số lượng sản phẩm hoàn" value={number(data.totals.returnedQty)} detail={`Đã bán ${number(data.totals.soldQty)} sản phẩm`} icon={<Inventory2 />} color="#0f9b76" /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Card elevation={0} sx={{ border: "1px solid #e5eaf2", borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
              <SectionTitle icon={<Person />} title="Khách hàng hủy / trả nhiều nhất" subtitle="Xếp theo tỷ lệ hủy và trả hàng trên tổng đơn của từng user" />
              <Stack spacing={1}>
                {(data.buyerStats || []).slice(0, 10).map((row, index) => <BuyerCard key={row.key || row.buyerUserId || row.buyerUsername || index} row={row} index={index} />)}
                {!loading && !data.buyerStats?.length && <Typography color="text.secondary" textAlign="center" py={4}>Chưa có dữ liệu khách hàng.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Card elevation={0} sx={{ border: "1px solid #e5eaf2", borderRadius: 3, height: "100%" }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
              <SectionTitle icon={<Inventory2 />} title="Sản phẩm có tỷ lệ hoàn cao nhất" subtitle="Tỷ lệ hoàn = số lượng nhận hoàn / số lượng bán × 100%" />
              <Stack spacing={1}>
                {(data.productStats || []).slice(0, 10).map((row, index) => <ProductCard key={row.key || row.itemId || index} row={row} index={index} />)}
                {!loading && !data.productStats?.length && <Typography color="text.secondary" textAlign="center" py={4}>Chưa có dữ liệu sản phẩm.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
        Lưu ý: Thống kê khách hàng dùng buyerUserId / buyerUsername; đơn không có thông tin định danh được gom vào nhóm Không xác định. Số lượng hoàn sản phẩm ưu tiên số lượng Shopee đã ghi nhận nhận hàng hoàn (receivedQty), đối chiếu số liệu returnedQty đã ghi nhận trên đơn khi cần.
      </Typography>
    </Box>
  );
}
