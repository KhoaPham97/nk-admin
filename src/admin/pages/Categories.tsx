import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";

import {
  getRequest,
  postRequest,
  patchRequest,
  deleteRequest,
} from "../common/ApiMethod";

interface Category {
  _id: string;
  id: number;
  name: string;
  image: string;
  created_at: string;
  updated_at: string;
  type: string;
}

interface CategoryForm {
  id: number;
  name: string;
  image: string;
  type: string;
}

const TYPE_NAME: Record<string, string> = {
  "1": "Phụ tùng xe đạp",
  "2": "Phụ tùng xe điện",
  "3": "Phụ tùng xe ba gác",
};

const emptyForm: CategoryForm = {
  id: 0,
  name: "",
  image: "",
  type: "1",
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [form, setForm] = useState<CategoryForm>(emptyForm);

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadCategories = async () => {
    try {
      setLoading(true);

      const res = await getRequest({
        url: "/categorys",
      });

      console.log("CATEGORY RESPONSE:", res);

      // API:
      // {
      //   categorys: [...]
      // }

      setCategories(Array.isArray(res?.categorys) ? res.categorys : []);
    } catch (error) {
      console.error("LOAD CATEGORY ERROR:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchSearch =
        !keyword || category.name.toLowerCase().includes(keyword);

      const matchType = filterType === "all" || category.type === filterType;

      return matchSearch && matchType;
    });
  }, [categories, search, filterType]);

  // =====================================================
  // ADD
  // =====================================================

  const handleAdd = () => {
    setEditingCategory(null);

    setForm({
      id: 0,
      name: "",
      image: "",
      type: "1",
    });

    setOpenDialog(true);
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (category: Category) => {
    setEditingCategory(category);

    setForm({
      id: category.id,
      name: category.name,
      image: category.image,
      type: category.type,
    });

    setOpenDialog(true);
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setForm(emptyForm);
  };

  // =====================================================
  // SAVE
  // =====================================================

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Vui lòng nhập tên danh mục");
      return;
    }

    try {
      const data = {
        id: form.id,
        name: form.name.trim(),
        image: form.image.trim(),
        type: form.type,
      };

      if (editingCategory) {
        await patchRequest({
          url: `/categorys/${editingCategory._id}`,
          data,
        });
      } else {
        await postRequest({
          url: "/categorys",
          data,
        });
      }

      handleClose();

      await loadCategories();
    } catch (error) {
      console.error("SAVE CATEGORY ERROR:", error);
      alert("Không thể lưu danh mục");
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (category: Category) => {
    const ok = window.confirm(`Bạn có chắc muốn xóa "${category.name}"?`);

    if (!ok) return;

    try {
      await deleteRequest({
        url: `/categorys/${category._id}`,
      });

      await loadCategories();
    } catch (error) {
      console.error("DELETE CATEGORY ERROR:", error);
      alert("Không thể xóa danh mục");
    }
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date?: string) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("vi-VN");
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Danh mục sản phẩm
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {categories.length} danh mục
          </Typography>
        </Box>

        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          Thêm danh mục
        </Button>
      </Box>

      {/* ================================================= */}
      {/* FILTER */}
      {/* ================================================= */}

      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Tìm tên danh mục..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon
                sx={{
                  mr: 1,
                  color: "text.secondary",
                }}
              />
            ),
          }}
          sx={{
            width: 350,
          }}
        />

        <FormControl size="small" sx={{ width: 220 }}>
          <InputLabel>Loại sản phẩm</InputLabel>

          <Select
            value={filterType}
            label="Loại sản phẩm"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">Tất cả</MenuItem>

            <MenuItem value="1">Phụ tùng xe đạp</MenuItem>

            <MenuItem value="2">Phụ tùng xe điện</MenuItem>

            <MenuItem value="3">Phụ tùng xe ba gác</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* ================================================= */}
      {/* TABLE */}
      {/* ================================================= */}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={70}>#</TableCell>

                <TableCell width={90}>Hình ảnh</TableCell>

                <TableCell>Tên danh mục</TableCell>

                <TableCell width={100}>ID</TableCell>

                <TableCell>Loại</TableCell>

                <TableCell>Ngày tạo</TableCell>

                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 5 }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 5 }}>
                      <Typography color="text.secondary">
                        Không có danh mục
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category, index) => (
                  <TableRow key={category._id} hover>
                    {/* STT */}

                    <TableCell>{index + 1}</TableCell>

                    {/* IMAGE */}

                    <TableCell>
                      <Box
                        component="img"
                        src={category.image}
                        alt={category.name}
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 1,
                          objectFit: "cover",
                          display: "block",
                          backgroundColor: "#f5f5f5",
                        }}
                        onError={(e) => {
                          e.currentTarget.src = "/images/no-image.png";
                        }}
                      />
                    </TableCell>

                    {/* NAME */}

                    <TableCell>
                      <Typography fontWeight={600}>{category.name}</Typography>

                      <Typography variant="caption" color="text.secondary">
                        Mongo ID: {category._id}
                      </Typography>
                    </TableCell>

                    {/* ID */}

                    <TableCell>
                      <Chip
                        label={category.id}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>

                    {/* TYPE */}

                    <TableCell>
                      <Chip
                        label={TYPE_NAME[category.type] || category.type}
                        size="small"
                      />
                    </TableCell>

                    {/* DATE */}

                    <TableCell>{formatDate(category.created_at)}</TableCell>

                    {/* ACTION */}

                    <TableCell align="right">
                      <IconButton
                        color="primary"
                        onClick={() => handleEdit(category)}
                      >
                        <EditIcon />
                      </IconButton>

                      <IconButton
                        color="error"
                        onClick={() => handleDelete(category)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* ================================================= */}
      {/* DIALOG */}
      {/* ================================================= */}

      <Dialog open={openDialog} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              label="ID"
              type="number"
              value={form.id}
              onChange={(e) =>
                setForm({
                  ...form,
                  id: Number(e.target.value),
                })
              }
              fullWidth
            />

            <TextField
              label="Tên danh mục"
              value={form.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Loại sản phẩm</InputLabel>

              <Select
                value={form.type}
                label="Loại sản phẩm"
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value,
                  })
                }
              >
                <MenuItem value="1">Phụ tùng xe đạp</MenuItem>

                <MenuItem value="2">Phụ tùng xe điện</MenuItem>

                <MenuItem value="3">Phụ tùng xe ba gác</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="URL hình ảnh"
              value={form.image}
              onChange={(e) =>
                setForm({
                  ...form,
                  image: e.target.value,
                })
              }
              fullWidth
            />

            {/* PREVIEW */}

            {form.image && (
              <Box
                sx={{
                  width: "100%",
                  height: 200,
                  borderRadius: 2,
                  overflow: "hidden",
                  border: "1px solid #ddd",
                }}
              >
                <Box
                  component="img"
                  src={form.image}
                  alt="Preview"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>Hủy</Button>

          <Button variant="contained" onClick={handleSave}>
            {editingCategory ? "Cập nhật" : "Thêm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
