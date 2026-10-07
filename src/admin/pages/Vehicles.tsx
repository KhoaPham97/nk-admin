import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import { Add, Delete, Edit, Refresh, Search } from "@mui/icons-material";

import axios from "axios";

import { API_ENDPOINTS } from "../../api";

interface Vehicle {
  _id: string;
  name: string;
  brand?: string;
  type: "1" | "2" | "3";
  image?: string;
  description?: string;
  isVisible: boolean;
  created_at?: string;
  updated_at?: string;
}

interface VehicleForm {
  name: string;
  brand: string;
  type: "1" | "2" | "3";
  image: string;
  description: string;
  isVisible: boolean;
}

const EMPTY_FORM: VehicleForm = {
  name: "",
  brand: "",
  type: "2",
  image: "",
  description: "",
  isVisible: true,
};

const TYPE_OPTIONS = [
  {
    value: "1",
    label: "Xe đạp",
  },
  {
    value: "2",
    label: "Xe điện",
  },
  {
    value: "3",
    label: "Xe ba gác",
  },
];

const getTypeLabel = (type: string) => {
  return (
    TYPE_OPTIONS.find((item) => item.value === type)?.label || "Không xác định"
  );
};

const getImageUrl = (image?: string) => {
  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  if (image.startsWith("/")) {
    return image;
  }

  return `${window.location.origin}/${image}`;
};

const Vehicles: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [total, setTotal] = useState(0);

  const [brands, setBrands] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [form, setForm] = useState<VehicleForm>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const loadBrands = useCallback(async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.VEHICLE_BRANDS, {
        params: {
          type: typeFilter || undefined,
        },
      });

      if (response.data?.success) {
        setBrands(response.data.brands || []);
      } else if (Array.isArray(response.data?.brands)) {
        setBrands(response.data.brands);
      } else {
        setBrands([]);
      }
    } catch (err) {
      console.error("Load vehicle brands error:", err);
      setBrands([]);
    }
  }, [typeFilter]);

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(API_ENDPOINTS.VEHICLES, {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: search.trim() || undefined,
          type: typeFilter || undefined,
          brand: brandFilter || undefined,
        },
      });

      const data = response.data;

      if (data?.success === false) {
        throw new Error(data?.message || "Không thể tải danh sách xe");
      }

      setVehicles(Array.isArray(data?.vehicles) ? data.vehicles : []);

      const pagination = data?.pagination;

      setTotal(
        Number(pagination?.total ?? pagination?.totalItems ?? data?.total ?? 0),
      );
    } catch (err: any) {
      console.error("Load vehicles error:", err);

      setVehicles([]);
      setTotal(0);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể tải danh sách xe",
      );
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, typeFilter, brandFilter]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    setPage(0);
  }, [search, typeFilter, brandFilter]);

  const filteredBrands = useMemo(() => {
    return brands.filter((brand) => brand && brand.trim().length > 0);
  }, [brands]);

  const handleOpenCreate = () => {
    setEditingVehicle(null);

    setForm({
      ...EMPTY_FORM,
      type: (typeFilter || "2") as "1" | "2" | "3",
    });

    setDialogOpen(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);

    setForm({
      name: vehicle.name || "",
      brand: vehicle.brand || "",
      type: vehicle.type || "2",
      image: vehicle.image || "",
      description: vehicle.description || "",
      isVisible: vehicle.isVisible !== false,
    });

    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) {
      return;
    }

    setDialogOpen(false);
    setEditingVehicle(null);
    setForm(EMPTY_FORM);
  };

  const handleChangeForm = (
    field: keyof VehicleForm,
    value: string | boolean,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const brand = form.brand.trim();
    const image = form.image.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Vui lòng nhập tên xe");
      return;
    }

    if (!form.type) {
      setError("Vui lòng chọn loại xe");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name,
        brand,
        type: form.type,
        image,
        description,
        isVisible: form.isVisible,
      };

      if (editingVehicle) {
        await axios.put(
          API_ENDPOINTS.VEHICLE_ID.replace(":id", editingVehicle._id),
          payload,
        );

        setSuccess("Cập nhật xe thành công");
      } else {
        await axios.post(API_ENDPOINTS.VEHICLES, payload);

        setSuccess("Thêm xe thành công");
      }

      handleCloseDialog();

      await loadVehicles();
      await loadBrands();
    } catch (err: any) {
      console.error("Save vehicle error:", err);

      setError(
        err?.response?.data?.message || err?.message || "Không thể lưu xe",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisible = async (vehicle: Vehicle) => {
    try {
      setError("");

      await axios.put(API_ENDPOINTS.VEHICLE_ID.replace(":id", vehicle._id), {
        isVisible: !vehicle.isVisible,
      });

      setVehicles((prev) =>
        prev.map((item) =>
          item._id === vehicle._id
            ? {
                ...item,
                isVisible: !vehicle.isVisible,
              }
            : item,
        ),
      );

      setSuccess(!vehicle.isVisible ? "Đã hiển thị xe" : "Đã ẩn xe");
    } catch (err: any) {
      console.error("Toggle vehicle visibility error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể thay đổi trạng thái xe",
      );
    }
  };

  const handleOpenDelete = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleCloseDelete = () => {
    if (saving) {
      return;
    }

    setDeleteDialogOpen(false);
    setVehicleToDelete(null);
  };

  const handleDelete = async () => {
    if (!vehicleToDelete) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      await axios.delete(
        API_ENDPOINTS.VEHICLE_ID.replace(":id", vehicleToDelete._id),
      );

      setSuccess("Xóa xe thành công");

      setDeleteDialogOpen(false);
      setVehicleToDelete(null);

      if (vehicles.length === 1 && page > 0) {
        setPage((prev) => prev - 1);
      } else {
        await loadVehicles();
      }

      await loadBrands();
    } catch (err: any) {
      console.error("Delete vehicle error:", err);

      const status = err?.response?.status;

      if (status === 409) {
        setError(
          err?.response?.data?.message ||
            "Không thể xóa xe vì đang có sản phẩm liên kết.",
        );
      } else {
        setError(
          err?.response?.data?.message || err?.message || "Không thể xóa xe",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          flexDirection: {
            xs: "column",
            md: "row",
          },
          justifyContent: "space-between",
          alignItems: {
            xs: "stretch",
            md: "center",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Quản lý xe
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Quản lý các mẫu xe để liên kết với sản phẩm
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadVehicles}
            disabled={loading}
          >
            Làm mới
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenCreate}
          >
            Thêm xe
          </Button>
        </Box>
      </Box>

      {/* FILTER */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                label="Tìm kiếm"
                placeholder="Tên xe hoặc hãng xe..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <Search
                      sx={{
                        mr: 1,
                        color: "text.secondary",
                      }}
                    />
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Loại xe</InputLabel>

                <Select
                  value={typeFilter}
                  label="Loại xe"
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setBrandFilter("");
                  }}
                >
                  <MenuItem value="">Tất cả</MenuItem>

                  {TYPE_OPTIONS.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Hãng xe</InputLabel>

                <Select
                  value={brandFilter}
                  label="Hãng xe"
                  onChange={(event) => setBrandFilter(event.target.value)}
                >
                  <MenuItem value="">Tất cả hãng</MenuItem>

                  {filteredBrands.map((brand) => (
                    <MenuItem key={brand} value={brand}>
                      {brand}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* TABLE */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={80}>Hình</TableCell>

                <TableCell>Tên xe</TableCell>

                <TableCell>Hãng</TableCell>

                <TableCell>Loại</TableCell>

                <TableCell align="center">Hiển thị</TableCell>

                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      Không có xe nào
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((vehicle) => {
                  const imageUrl = getImageUrl(vehicle.image);

                  return (
                    <TableRow key={vehicle._id} hover>
                      <TableCell>
                        {imageUrl ? (
                          <Box
                            component="img"
                            src={imageUrl}
                            alt={vehicle.name}
                            sx={{
                              width: 56,
                              height: 56,
                              objectFit: "contain",
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: "divider",
                              backgroundColor: "#fff",
                            }}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 56,
                              height: 56,
                              borderRadius: 1,
                              border: "1px dashed",
                              borderColor: "divider",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "text.secondary",
                              fontSize: 11,
                            }}
                          >
                            No image
                          </Box>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={600}>{vehicle.name}</Typography>

                        {vehicle.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              maxWidth: 400,
                            }}
                          >
                            {vehicle.description}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>{vehicle.brand || "—"}</TableCell>

                      <TableCell>
                        <Chip size="small" label={getTypeLabel(vehicle.type)} />
                      </TableCell>

                      <TableCell align="center">
                        <Switch
                          checked={vehicle.isVisible !== false}
                          onChange={() => handleToggleVisible(vehicle)}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="Sửa">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEdit(vehicle)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Xóa">
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDelete(vehicle)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 30, 50, 100]}
          labelRowsPerPage="Số dòng:"
        />
      </Card>

      {/* CREATE / EDIT DIALOG */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingVehicle ? "Chỉnh sửa xe" : "Thêm xe"}</DialogTitle>

        <DialogContent>
          <Box
            sx={{
              pt: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              label="Tên xe"
              required
              value={form.name}
              onChange={(event) => handleChangeForm("name", event.target.value)}
              placeholder="Ví dụ: M133, M133S, VC 2021..."
            />

            <TextField
              fullWidth
              label="Hãng xe"
              value={form.brand}
              onChange={(event) =>
                handleChangeForm("brand", event.target.value)
              }
              placeholder="Ví dụ: Yadea, VC, Liwei..."
            />

            <FormControl fullWidth>
              <InputLabel>Loại xe</InputLabel>

              <Select
                value={form.type}
                label="Loại xe"
                onChange={(event) =>
                  handleChangeForm(
                    "type",
                    event.target.value as "1" | "2" | "3",
                  )
                }
              >
                {TYPE_OPTIONS.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Hình ảnh"
              value={form.image}
              onChange={(event) =>
                handleChangeForm("image", event.target.value)
              }
              placeholder="URL hình ảnh hoặc đường dẫn hình"
            />

            {form.image && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  p: 2,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Box
                  component="img"
                  src={getImageUrl(form.image)}
                  alt={form.name}
                  sx={{
                    maxWidth: "100%",
                    width: 180,
                    height: 140,
                    objectFit: "contain",
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </Box>
            )}

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Mô tả"
              value={form.description}
              onChange={(event) =>
                handleChangeForm("description", event.target.value)
              }
              placeholder="Mô tả thêm về mẫu xe..."
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                px: 2,
                py: 1,
              }}
            >
              <Box>
                <Typography fontWeight={600}>Hiển thị xe</Typography>

                <Typography variant="caption" color="text.secondary">
                  Cho phép khách hàng nhìn thấy mẫu xe này
                </Typography>
              </Box>

              <Switch
                checked={form.isVisible}
                onChange={(event) =>
                  handleChangeForm("isVisible", event.target.checked)
                }
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Hủy
          </Button>

          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? (
              <CircularProgress size={22} color="inherit" />
            ) : editingVehicle ? (
              "Lưu thay đổi"
            ) : (
              "Thêm xe"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDelete}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Xác nhận xóa xe</DialogTitle>

        <DialogContent>
          <Typography>
            Bạn có chắc muốn xóa xe <strong>{vehicleToDelete?.name}</strong>?
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Nếu xe đang được liên kết với sản phẩm, hệ thống sẽ không cho phép
            xóa.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDelete} disabled={saving}>
            Hủy
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleDelete}
            disabled={saving}
          >
            {saving ? <CircularProgress size={22} color="inherit" /> : "Xóa"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ERROR */}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError("")}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert severity="error" onClose={() => setError("")} variant="filled">
          {error}
        </Alert>
      </Snackbar>

      {/* SUCCESS */}
      <Snackbar
        open={Boolean(success)}
        autoHideDuration={3000}
        onClose={() => setSuccess("")}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          onClose={() => setSuccess("")}
          variant="filled"
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Vehicles;
