import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Grid, Stack, TextField, Typography
} from "@mui/material";
import { Refresh, TrendingDown, Replay, ReceiptLong } from "@mui/icons-material";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis
} from "recharts";
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
  const [data, setData] = useState({ totals: {}, provinces: [], cancellationRate: 0, returnRate: 0 });
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
      setData(response.data?.data || { totals: {}, provinces: [] });
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể tải thống kê hủy/trả hàng.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const cancellationRows = useMemo(
    () => [...data.provinces].sort((a, b) => b.cancellationRate - a.cancellationRate).slice(0, 10),
    [data.provinces],
  );
  const returnRows = useMemo(
    () => [...data.provinces].sort((a, b) => b.returnRate - a.returnRate).slice(0, 10),
    [data.provinces],
  );

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

  const ChartCard = ({ title, rows, dataKey, color }) => (
    <Card elevation={0} sx={{ border: "1px solid #e5eaf2", borderRadius: 3, height: "100%" }}>
      <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>{title}</Typography>
        {rows.length ? <Box sx={{ width: "100%", height: 330 }}>
          <ResponsiveContainer>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="province" width={105} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => percent(value)} />
              <Bar dataKey={dataKey} name="Tỷ lệ" fill={color} radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box> : <Typography color="text.secondary" py={5} textAlign="center">Chưa có dữ liệu trong khoảng thời gian này.</Typography>}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, bgcolor: "#f6f8fc", minHeight: "100%" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2.5 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#172033">Thống kê hủy & trả hàng</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
            Thống kê riêng đơn Shopee theo tỉnh/thành phố, tính tỷ lệ trên tổng đơn của từng tỉnh
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
        <Grid item xs={6} md={3}><Summary title="Tỉnh/thành có đơn" value={number(data.provinces.length)} detail="Đã nhận diện từ địa chỉ giao hàng" icon={<ReceiptLong />} color="#0f9b76" /></Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} lg={6}><ChartCard title="Top 10 tỉnh có tỷ lệ hủy cao nhất" rows={cancellationRows} dataKey="cancellationRate" color="#e07a45" /></Grid>
        <Grid item xs={12} lg={6}><ChartCard title="Top 10 tỉnh có tỷ lệ trả hàng cao nhất" rows={returnRows} dataKey="returnRate" color="#7c65cf" /></Grid>
      </Grid>

      <Card elevation={0} sx={{ border: "1px solid #e5eaf2", borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2.5 } }}>
          <Typography fontWeight={800} sx={{ mb: 1.5 }}>Chi tiết theo tỉnh/thành phố</Typography>
          <Box sx={{ overflowX: "auto" }}>
            <Box component="table" sx={{ width: "100%", minWidth: 620, borderCollapse: "collapse", "& th,& td": { p: 1.3, textAlign: "left", borderBottom: "1px solid #edf0f5", fontSize: 13 }, "& th": { color: "text.secondary", fontWeight: 700, whiteSpace: "nowrap" } }}>
              <thead><tr><th>Tỉnh/thành</th><th>Tổng đơn</th><th>Đơn hủy</th><th>Tỷ lệ hủy</th><th>Đơn trả</th><th>Tỷ lệ trả</th></tr></thead>
              <tbody>{data.provinces.map((row) => <tr key={row.province}>
                <td><b>{row.province}</b></td><td>{number(row.totalOrders)}</td><td>{number(row.cancelledOrders)}</td>
                <td><Chip size="small" label={percent(row.cancellationRate)} color={row.cancellationRate >= 10 ? "warning" : "default"} /></td>
                <td>{number(row.returnedOrders)}</td><td><Chip size="small" label={percent(row.returnRate)} color={row.returnRate >= 5 ? "secondary" : "default"} /></td>
              </tr>)}</tbody>
            </Box>
          </Box>
          {!loading && !data.provinces.length && <Typography color="text.secondary" textAlign="center" py={3}>Không có dữ liệu phù hợp.</Typography>}
        </CardContent>
      </Card>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
        Lưu ý: Dữ liệu tỉnh/thành được lấy từ phần cuối địa chỉ người nhận. Đơn Shopee trả hàng được đối chiếu theo mã đơn với phiếu trả hàng đã đồng bộ.
      </Typography>
    </Box>
  );
}
