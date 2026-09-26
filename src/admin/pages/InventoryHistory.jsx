import React, { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import {
  AddCircleOutline,
  ArrowDownward,
  ArrowUpward,
  History,
  Refresh,
  Search,
  Undo,
} from "@mui/icons-material";

import axios from "axios";
import { API_ENDPOINTS } from "../../api";
import { useNavigate } from "react-router-dom";

const InventoryHistory = () => {
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [histories, setHistories] = useState([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [type, setType] = useState("all");

  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(20);

  const [total, setTotal] = useState(0);

  const [totalPages, setTotalPages] = useState(1);

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return (
      localStorage.getItem("adminToken") || localStorage.getItem("accessToken")
    );
  };

  // =====================================================
  // AUTH CONFIG
  // =====================================================

  const getAuthConfig = () => {
    const token = getToken();

    return {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
  };

  // =====================================================
  // AUTH ERROR
  // =====================================================

  const handleAuthError = (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("accessToken");

      localStorage.removeItem("adminToken");

      navigate("/admin/login");

      return true;
    }

    return false;
  };

  // =====================================================
  // LOAD HISTORY
  // =====================================================

  const loadHistory = async () => {
    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const params = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (type !== "all") {
        params.type = type;
      }

      const response = await axios.get(API_ENDPOINTS.INVENTORY_HISTORY, {
        ...getAuthConfig(),
        params,
      });

      const data = response?.data || {};

      const list = data.histories || data.data || [];

      setHistories(Array.isArray(list) ? list : []);

      setTotal(Number(data.total) || 0);

      setTotalPages(Number(data.totalPages) || 1);
    } catch (error) {
      console.error("LOAD INVENTORY HISTORY ERROR:", error);

      if (handleAuthError(error)) {
        return;
      }

      console.error(
        error?.response?.data?.message || "Không thể tải lịch sử kho",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // EFFECT
  // =====================================================

  useEffect(() => {
    loadHistory();
  }, [page, limit, type]);

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = () => {
    setPage(1);
    loadHistory();
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // =====================================================
  // CLEAR FILTER
  // =====================================================

  const handleReset = () => {
    setSearch("");
    setType("all");
    setPage(1);

    setTimeout(() => {
      loadHistory();
    }, 0);
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =====================================================
  // FORMAT NUMBER
  // =====================================================

  const formatNumber = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0";
    }

    return number.toLocaleString("vi-VN");
  };

  // =====================================================
  // TYPE LABEL
  // =====================================================

  const getTypeLabel = (historyType) => {
    switch (historyType) {
      case "import":
        return "Nhập kho";

      case "export":
        return "Xuất kho";

      case "order":
        return "Xuất theo đơn";

      case "adjustment":
        return "Điều chỉnh";

      case "cancel":
        return "Rollback";

      default:
        return historyType || "-";
    }
  };

  // =====================================================
  // TYPE COLOR
  // =====================================================

  const getTypeColor = (historyType) => {
    switch (historyType) {
      case "import":
        return "success";

      case "export":
        return "error";

      case "order":
        return "warning";

      case "adjustment":
        return "info";

      case "cancel":
        return "secondary";

      default:
        return "default";
    }
  };

  // =====================================================
  // TYPE ICON
  // =====================================================

  const getTypeIcon = (historyType) => {
    switch (historyType) {
      case "import":
        return <AddCircleOutline fontSize="small" />;

      case "cancel":
        return <Undo fontSize="small" />;

      case "order":
      case "export":
        return <ArrowDownward fontSize="small" />;

      case "adjustment":
      default:
        return <History fontSize="small" />;
    }
  };

  // =====================================================
  // QUANTITY
  // =====================================================

  const renderQuantity = (qty) => {
    const number = Number(qty);

    if (!Number.isFinite(number)) {
      return "-";
    }

    if (number > 0) {
      return (
        <Typography color="success.main" fontWeight={700}>
          +{formatNumber(number)}
        </Typography>
      );
    }

    if (number < 0) {
      return (
        <Typography color="error.main" fontWeight={700}>
          {formatNumber(number)}
        </Typography>
      );
    }

    return <Typography fontWeight={600}>0</Typography>;
  };

  // =====================================================
  // REFERENCE
  // =====================================================

  const renderReference = (history) => {
    if (history.referenceCode) {
      return (
        <Typography fontWeight={600} variant="body2">
          {history.referenceCode}
        </Typography>
      );
    }

    if (history.referenceId) {
      return (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            wordBreak: "break-all",
          }}
        >
          {history.referenceId}
        </Typography>
      );
    }

    return "-";
  };

  // =====================================================
  // PAGINATION
  // =====================================================

  const handlePageChange = (_event, value) => {
    setPage(value);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box
      sx={{
        p: {
          xs: 1,
          md: 2,
        },
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        justifyContent="space-between"
        alignItems={{
          xs: "stretch",
          md: "center",
        }}
        spacing={2}
        sx={{
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Lịch sử kho
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
            }}
          >
            Theo dõi toàn bộ biến động nhập xuất tồn kho
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={18} /> : <Refresh />}
          disabled={loading}
          onClick={loadHistory}
        >
          Làm mới
        </Button>
      </Stack>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <Grid
        container
        spacing={2}
        sx={{
          mb: 2,
        }}
      >
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <History />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Tổng giao dịch
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {formatNumber(total)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <ArrowDownward />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Đang hiển thị
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {formatNumber(histories.length)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <History />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Trang
                  </Typography>

                  <Typography variant="h6" fontWeight={700}>
                    {page} / {totalPages}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* =================================================
          FILTER
      ================================================= */}

      <Card
        sx={{
          mb: 2,
        }}
      >
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Tìm sản phẩm, mã sản phẩm, mã đơn..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="all">Tất cả giao dịch</MenuItem>

                  <MenuItem value="import">Nhập kho</MenuItem>

                  <MenuItem value="export">Xuất kho</MenuItem>

                  <MenuItem value="order">Xuất theo đơn</MenuItem>

                  <MenuItem value="adjustment">Điều chỉnh</MenuItem>

                  <MenuItem value="cancel">Rollback</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));

                    setPage(1);
                  }}
                >
                  <MenuItem value={20}>20 giao dịch</MenuItem>

                  <MenuItem value={40}>40 giao dịch</MenuItem>

                  <MenuItem value={100}>100 giao dịch</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleSearch}
                >
                  Tìm kiếm
                </Button>

                <Button variant="outlined" onClick={handleReset}>
                  Xóa bộ lọc
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* =================================================
          TABLE
      ================================================= */}

      <Card>
        <TableContainer>
          <Table
            size="small"
            sx={{
              minWidth: 1250,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Thời gian</strong>
                </TableCell>

                <TableCell>
                  <strong>Loại</strong>
                </TableCell>

                <TableCell>
                  <strong>Sản phẩm</strong>
                </TableCell>

                <TableCell>
                  <strong>Phân loại</strong>
                </TableCell>

                <TableCell>
                  <strong>Mã sản phẩm</strong>
                </TableCell>

                <TableCell>
                  <strong>Tham chiếu</strong>
                </TableCell>

                <TableCell align="right">
                  <strong>Số lượng</strong>
                </TableCell>

                <TableCell align="right">
                  <strong>Trước</strong>
                </TableCell>

                <TableCell align="right">
                  <strong>Sau</strong>
                </TableCell>

                <TableCell>
                  <strong>Ghi chú</strong>
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    sx={{
                      py: 6,
                    }}
                  >
                    <CircularProgress />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 1,
                      }}
                    >
                      Đang tải lịch sử kho...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : histories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    sx={{
                      py: 6,
                    }}
                  >
                    <Typography color="text.secondary">
                      Chưa có lịch sử kho
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                histories.map((history) => (
                  <TableRow key={history._id} hover>
                    {/* DATE */}

                    <TableCell
                      sx={{
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Typography variant="body2">
                        {formatDate(history.created_at || history.createdAt)}
                      </Typography>
                    </TableCell>

                    {/* TYPE */}

                    <TableCell>
                      <Chip
                        size="small"
                        color={getTypeColor(history.type)}
                        icon={getTypeIcon(history.type)}
                        label={getTypeLabel(history.type)}
                      />
                    </TableCell>

                    {/* PRODUCT */}

                    <TableCell>
                      <Typography fontWeight={600}>
                        {history.productTitle || "-"}
                      </Typography>

                      {history.productId && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            display: "block",
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ID: {history.productId}
                        </Typography>
                      )}
                    </TableCell>

                    {/* VARIANT */}

                    <TableCell>
                      {history.variantName ? (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={history.variantName}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* PRODUCT CODE */}

                    <TableCell>
                      <Typography variant="body2">
                        {history.productCode || "-"}
                      </Typography>
                    </TableCell>

                    {/* REFERENCE */}

                    <TableCell>{renderReference(history)}</TableCell>

                    {/* QTY */}

                    <TableCell align="right">
                      {renderQuantity(history.qty)}
                    </TableCell>

                    {/* BEFORE */}

                    <TableCell align="right">
                      <Typography>{formatNumber(history.beforeQty)}</Typography>
                    </TableCell>

                    {/* AFTER */}

                    <TableCell align="right">
                      <Typography fontWeight={700}>
                        {formatNumber(history.afterQty)}
                      </Typography>
                    </TableCell>

                    {/* NOTE */}

                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 280,
                        }}
                      >
                        {history.note || "-"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider />

        {/* =================================================
            PAGINATION
        ================================================= */}

        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Tổng cộng: <strong>{formatNumber(total)}</strong> giao dịch
          </Typography>

          <Pagination
            color="primary"
            page={page}
            count={Math.max(totalPages, 1)}
            onChange={handlePageChange}
            showFirstButton
            showLastButton
          />
        </Box>
      </Card>
    </Box>
  );
};

export default InventoryHistory;
