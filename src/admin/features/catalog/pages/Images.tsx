import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
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
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { BASE_URL } from "../../../../api";

type MediaItem = {
  _id: string;
  filename: string;
  originalName: string;
  url: string;
  storageKey: string;
  mimeType: string;
  size: number;
  folder: string;
  alt?: string;
  createdAt: string;
};

const MEDIA_API = BASE_URL + "/media";
const getToken = () =>
  localStorage.getItem("adminToken") || localStorage.getItem("accessToken") || "";

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0) + " " + units[index];
};

const panelSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 3,
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)",
};

const Images: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [uploadFolder, setUploadFolder] = useState("products");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSize, setTotalSize] = useState(0);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const authConfig = () => ({
    headers: { Authorization: "Bearer " + getToken() },
  });

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(MEDIA_API, {
        ...authConfig(),
        params: { page, limit: 48, q: search.trim(), ...(folder !== "all" ? { folder } : {}) },
      });
      setItems(response.data?.media || []);
      setTotal(response.data?.pagination?.total || 0);
      setTotalPages(Math.max(1, response.data?.pagination?.totalPages || 1));
      setTotalSize(response.data?.stats?.totalSize || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể tải thư viện ảnh.");
    } finally {
      setLoading(false);
    }
  }, [page, search, folder]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  useEffect(() => {
    setPage(1);
  }, [search, folder]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("images", file));
    form.append("folder", uploadFolder);
    try {
      setUploading(true);
      setError("");
      setNotice("");
      const response = await axios.post(MEDIA_API + "/upload", form, {
        headers: {
          Authorization: "Bearer " + getToken(),
          "Content-Type": "multipart/form-data",
        },
        timeout: 180000,
      });
      setNotice(response.data?.message || "Tải ảnh thành công.");
      setPage(1);
      await loadMedia();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể tải ảnh lên.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Đã sao chép URL hình ảnh.");
    } catch {
      setError("Trình duyệt không cho phép sao chép URL.");
    }
  };

  const deleteItem = async (item: MediaItem) => {
    if (!window.confirm("Xóa ảnh này khỏi thư viện R2? Thao tác này không thể hoàn tác.")) return;
    try {
      setDeletingId(item._id);
      setError("");
      await axios.delete(MEDIA_API + "/" + item._id, authConfig());
      setNotice("Đã xóa ảnh khỏi Cloudflare R2.");
      if (selected?._id === item._id) setSelected(null);
      await loadMedia();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể xóa ảnh.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography sx={{ fontSize: { xs: 23, md: 28 }, fontWeight: 800 }}>
            Thư viện hình ảnh
          </Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>
            Quản lý ảnh tập trung trên Cloudflare R2
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            select
            size="small"
            value={uploadFolder}
            onChange={(event) => setUploadFolder(event.target.value)}
            sx={{ minWidth: 145 }}
          >
            <MenuItem value="products">Sản phẩm</MenuItem>
            <MenuItem value="variants">Biến thể</MenuItem>
            <MenuItem value="categories">Danh mục</MenuItem>
            <MenuItem value="general">Khác</MenuItem>
          </TextField>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(event) => uploadFiles(event.target.files)}
          />
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={17} color="inherit" /> : <CloudUploadOutlinedIcon />}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            sx={{ minHeight: 40, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
          >
            {uploading ? "Đang tải ảnh..." : "Tải ảnh lên"}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1.5, mb: 2 }}>
        <Card variant="outlined" sx={panelSx}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography color="text.secondary" fontSize={12}>Tổng số ảnh</Typography>
          <Typography fontSize={24} fontWeight={800}>{total.toLocaleString("vi-VN")}</Typography>
        </CardContent></Card>
        <Card variant="outlined" sx={panelSx}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography color="text.secondary" fontSize={12}>Dung lượng thư viện</Typography>
          <Typography fontSize={24} fontWeight={800}>{formatBytes(totalSize)}</Typography>
        </CardContent></Card>
        <Card variant="outlined" sx={panelSx}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography color="text.secondary" fontSize={12}>Lưu trữ</Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
            <Chip label="Cloudflare R2" color="success" size="small" />
            <Typography color="text.secondary" fontSize={12}>MongoDB quản lý metadata</Typography>
          </Stack>
        </CardContent></Card>
      </Box>

      <Paper variant="outlined" sx={{ ...panelSx, p: 1.5, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên file hoặc mô tả..."
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField select size="small" value={folder} onChange={(event) => setFolder(event.target.value)} sx={{ minWidth: { xs: "100%", sm: 170 } }}>
            <MenuItem value="all">Tất cả thư mục</MenuItem>
            <MenuItem value="products">Sản phẩm</MenuItem>
            <MenuItem value="variants">Biến thể</MenuItem>
            <MenuItem value="categories">Danh mục</MenuItem>
            <MenuItem value="general">Khác</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={loadMedia} startIcon={<RefreshOutlinedIcon />} sx={{ textTransform: "none", minWidth: 105 }}>
            Làm mới
          </Button>
        </Stack>
      </Paper>

      {loading ? (
        <Paper variant="outlined" sx={{ ...panelSx, minHeight: 260, display: "grid", placeItems: "center" }}>
          <CircularProgress />
        </Paper>
      ) : items.length ? (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))", lg: "repeat(5,minmax(0,1fr))", xl: "repeat(6,minmax(0,1fr))" }, gap: 1.5 }}>
            {items.map((item) => (
              <Card key={item._id} variant="outlined" sx={{ ...panelSx, overflow: "hidden", minWidth: 0 }}>
                <Box
                  onClick={() => setSelected(item)}
                  sx={{ aspectRatio: "1/1", bgcolor: "#f5f6f8", cursor: "pointer", display: "grid", placeItems: "center", overflow: "hidden" }}
                >
                  <Box component="img" src={item.url} alt={item.alt || item.originalName} loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </Box>
                <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                  <Typography fontSize={12} fontWeight={700} noWrap title={item.originalName}>{item.originalName || item.filename}</Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography fontSize={11} color="text.secondary">{formatBytes(item.size)}</Typography>
                    <Chip size="small" label={item.folder} variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                  </Stack>
                  <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ mt: 0.5 }}>
                    <IconButton size="small" title="Copy URL" onClick={() => copyUrl(item.url)}><ContentCopyOutlinedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" title="Xóa ảnh" color="error" disabled={deletingId === item._id} onClick={() => deleteItem(item)}>
                      {deletingId === item._id ? <CircularProgress size={16} /> : <DeleteOutlineOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mt: 3, mb: 2 }}>
            <Button disabled={page <= 1} variant="outlined" onClick={() => setPage((value) => value - 1)} sx={{ textTransform: "none" }}>Trang trước</Button>
            <Typography fontSize={13} color="text.secondary">Trang {page}/{totalPages}</Typography>
            <Button disabled={page >= totalPages} variant="outlined" onClick={() => setPage((value) => value + 1)} sx={{ textTransform: "none" }}>Trang sau</Button>
          </Stack>
        </>
      ) : (
        <Paper variant="outlined" sx={{ ...panelSx, minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3 }}>
          <ImageOutlinedIcon sx={{ fontSize: 54, color: "text.disabled", mb: 1 }} />
          <Typography fontWeight={700}>Chưa có hình ảnh trong thư viện</Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5, textAlign: "center" }}>
            Tải ảnh lên để lưu trữ trên Cloudflare R2.
          </Typography>
          <Button sx={{ mt: 2, textTransform: "none" }} startIcon={<AddPhotoAlternateOutlinedIcon />} onClick={() => fileInputRef.current?.click()}>
            Chọn ảnh
          </Button>
        </Paper>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Chi tiết hình ảnh
          <IconButton onClick={() => setSelected(null)}><CloseOutlinedIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={2}>
              <Box sx={{ bgcolor: "#f5f6f8", borderRadius: 2, minHeight: 260, display: "grid", placeItems: "center", p: 2 }}>
                <Box component="img" src={selected.url} alt={selected.alt || selected.originalName} sx={{ maxWidth: "100%", maxHeight: "60vh", objectFit: "contain" }} />
              </Box>
              <Typography fontSize={13} sx={{ overflowWrap: "anywhere" }}><b>Tên file:</b> {selected.originalName}</Typography>
              <Typography fontSize={13} sx={{ overflowWrap: "anywhere" }}><b>Đường dẫn R2:</b> {selected.storageKey}</Typography>
              <Typography fontSize={13}><b>Định dạng:</b> {selected.mimeType} · {formatBytes(selected.size)}</Typography>
              <TextField size="small" label="URL hình ảnh" value={selected.url} fullWidth InputProps={{ readOnly: true }} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {selected && <Button startIcon={<ContentCopyOutlinedIcon />} onClick={() => copyUrl(selected.url)} sx={{ textTransform: "none" }}>Copy URL</Button>}
          <Button onClick={() => setSelected(null)} sx={{ textTransform: "none" }}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Images;
