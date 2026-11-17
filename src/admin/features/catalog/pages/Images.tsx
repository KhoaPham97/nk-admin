import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip,
  CircularProgress, IconButton, MenuItem, Paper, Stack, TextField,
  Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import { API_ENDPOINTS } from "../../../../api";
import { getRequest, patchRequest } from "../../../common/ApiMethod";

type MediaItem = {
  _id: string; filename: string; originalName: string; url: string;
  storageKey: string; mimeType: string; size: number; folder: string;
  alt?: string; createdAt: string;
};
type ProductOption = {
  _id: string; title: string; code?: string; type?: string;
  thumbnail?: string; images?: string[]; [key: string]: any;
};

const MEDIA_API = API_ENDPOINTS.MEDIA;
const getToken = () => localStorage.getItem("adminToken") || localStorage.getItem("accessToken") || "";
const authConfig = () => ({ headers: { Authorization: "Bearer " + getToken() } });
const panelSx = { border: "1px solid", borderColor: "divider", borderRadius: 3, boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)" };
const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0) + " " + units[index];
};
const prepareImageForUpload = async (file: File): Promise<File> => {
  if (file.type === "image/gif" || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) { bitmap.close(); return file; }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.84));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp", lastModified: Date.now() });
  } catch { return file; }
};

const Images: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [targets, setTargets] = useState<Record<string, "thumbnail" | "gallery">>({});
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [uploadFolder, setUploadFolder] = useState("products");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSize, setTotalSize] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true); setError("");
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
    } finally { setLoading(false); }
  }, [page, search, folder]);

  const loadProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      const first = await getRequest({ url: "/products", params: { type: "all", page: 1, limit: 100 } });
      const all: ProductOption[] = Array.isArray(first?.products) ? [...first.products] : [];
      const totalPages = Math.min(200, Number(first?.pagination?.totalPages) || 1);
      for (let current = 2; current <= totalPages; current++) {
        const response = await getRequest({ url: "/products", params: { type: "all", page: current, limit: 100 } });
        if (Array.isArray(response?.products)) all.push(...response.products);
      }
      setProducts(all);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể tải danh sách sản phẩm.");
    } finally { setProductsLoading(false); }
  }, []);

  useEffect(() => { loadMedia(); }, [loadMedia]);
  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { setPage(1); }, [search, folder]);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const form = new FormData();
    const prepared = await Promise.all(Array.from(files).map(prepareImageForUpload));
    prepared.forEach((file) => form.append("images", file));
    form.append("folder", uploadFolder);
    try {
      setUploading(true); setError(""); setNotice("");
      const response = await axios.post(MEDIA_API + "/upload", form, {
        headers: { Authorization: "Bearer " + getToken() }, timeout: 180000,
      });
      setNotice(response.data?.message || "Tải ảnh thành công.");
      setPage(1); await loadMedia();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể tải ảnh lên.");
    } finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const copyUrl = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setNotice("Đã sao chép URL hình ảnh."); }
    catch { setError("Trình duyệt không cho phép sao chép URL."); }
  };

  const deleteItem = async (item: MediaItem) => {
    if (!window.confirm("Xóa ảnh này khỏi thư viện Cloudinary? Thao tác này không thể hoàn tác.")) return;
    try {
      setDeletingId(item._id); setError("");
      await axios.delete(MEDIA_API + "/" + item._id, authConfig());
      setNotice("Đã xóa ảnh khỏi Cloudinary."); await loadMedia();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể xóa ảnh.");
    } finally { setDeletingId(""); }
  };

  const assignImage = async (item: MediaItem) => {
    const productId = assignments[item._id];
    const product = products.find((entry) => entry._id === productId);
    if (!product) { setError("Vui lòng chọn sản phẩm trước khi cập nhật ảnh."); return; }
    const target = targets[item._id] || "thumbnail";
    const updated: ProductOption = { ...product };
    if (target === "thumbnail") updated.thumbnail = item.url;
    else updated.images = Array.from(new Set([...(Array.isArray(product.images) ? product.images : []), item.url]));
    try {
      setSavingIds((current) => [...current, item._id]); setError(""); setNotice("");
      await patchRequest({ url: "/products", data: [updated] });
      setProducts((current) => current.map((entry) => entry._id === updated._id ? updated : entry));
      setNotice(target === "thumbnail"
        ? `Đã cập nhật ảnh đại diện cho “${product.title}”.`
        : `Đã thêm ảnh vào bộ sưu tập của “${product.title}”.`);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Không thể cập nhật hình ảnh sản phẩm.");
    } finally { setSavingIds((current) => current.filter((id) => id !== item._id)); }
  };

  const filteredProducts = products.filter((product) => {
    const keyword = productSearch.trim().toLocaleLowerCase("vi");
    return !keyword || [product.title, product.code, product._id].some((value) => String(value || "").toLocaleLowerCase("vi").includes(keyword));
  });

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 23, md: 28 }, fontWeight: 800 }}>Thư viện hình ảnh</Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>Tải ảnh lên Cloudinary và gắn trực tiếp vào sản phẩm</Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField select size="small" value={uploadFolder} onChange={(event) => setUploadFolder(event.target.value)} sx={{ minWidth: 145 }}>
            <MenuItem value="products">Sản phẩm</MenuItem><MenuItem value="variants">Biến thể</MenuItem><MenuItem value="categories">Danh mục</MenuItem><MenuItem value="general">Khác</MenuItem>
          </TextField>
          <input ref={fileInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => uploadFiles(event.target.files)} />
          <Button variant="contained" startIcon={uploading ? <CircularProgress size={17} color="inherit" /> : <CloudUploadOutlinedIcon />} disabled={uploading} onClick={() => fileInputRef.current?.click()} sx={{ minHeight: 40, borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
            {uploading ? "Đang tải ảnh..." : "Tải ảnh lên"}
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice("")} sx={{ mb: 2 }}>{notice}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 1.5, mb: 2 }}>
        <Card variant="outlined" sx={panelSx}><CardContent><Typography color="text.secondary" fontSize={12}>Tổng số ảnh</Typography><Typography fontSize={24} fontWeight={800}>{total.toLocaleString("vi-VN")}</Typography></CardContent></Card>
        <Card variant="outlined" sx={panelSx}><CardContent><Typography color="text.secondary" fontSize={12}>Dung lượng thư viện</Typography><Typography fontSize={24} fontWeight={800}>{formatBytes(totalSize)}</Typography></CardContent></Card>
        <Card variant="outlined" sx={panelSx}><CardContent><Typography color="text.secondary" fontSize={12}>Danh sách sản phẩm</Typography><Typography fontSize={24} fontWeight={800}>{productsLoading ? "…" : products.length.toLocaleString("vi-VN")}</Typography></CardContent></Card>
      </Box>

      <Paper variant="outlined" sx={{ ...panelSx, p: 1.5, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
          <TextField fullWidth size="small" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên file..." />
          <TextField select size="small" value={folder} onChange={(event) => setFolder(event.target.value)} sx={{ minWidth: { xs: "100%", sm: 170 } }}>
            <MenuItem value="all">Tất cả thư mục</MenuItem><MenuItem value="products">Sản phẩm</MenuItem><MenuItem value="variants">Biến thể</MenuItem><MenuItem value="categories">Danh mục</MenuItem><MenuItem value="general">Khác</MenuItem>
          </TextField>
          <Button variant="outlined" onClick={() => { loadMedia(); loadProducts(); }} startIcon={<RefreshOutlinedIcon />} sx={{ textTransform: "none", minWidth: 105 }}>Làm mới</Button>
        </Stack>
      </Paper>

      {loading ? <Paper variant="outlined" sx={{ ...panelSx, minHeight: 260, display: "grid", placeItems: "center" }}><CircularProgress /></Paper>
      : items.length ? <>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,minmax(0,1fr))", sm: "repeat(3,minmax(0,1fr))", md: "repeat(4,minmax(0,1fr))", lg: "repeat(5,minmax(0,1fr))", xl: "repeat(6,minmax(0,1fr))" }, gap: 1.5 }}>
          {items.map((item) => {
            const chosen = products.find((product) => product._id === assignments[item._id]) || null;
            const saving = savingIds.includes(item._id);
            return <Card key={item._id} variant="outlined" sx={{ ...panelSx, overflow: "hidden", minWidth: 0 }}>
              <Box sx={{ aspectRatio: "1/1", bgcolor: "#f5f6f8", display: "grid", placeItems: "center", overflow: "hidden" }}>
                <Box component="img" src={item.url} alt={item.alt || item.originalName} loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </Box>
              <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                <Typography fontSize={12} fontWeight={700} noWrap title={item.originalName}>{item.originalName || item.filename}</Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                  <Typography fontSize={11} color="text.secondary">{formatBytes(item.size)}</Typography>
                  <Chip size="small" label={item.folder} variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                </Stack>
                <Stack direction="row" justifyContent="flex-end" spacing={0.5} sx={{ mt: 0.3 }}>
                  <IconButton size="small" title="Copy URL" onClick={() => copyUrl(item.url)}><ContentCopyOutlinedIcon fontSize="small" /></IconButton>
                  <IconButton size="small" title="Xóa ảnh" color="error" disabled={deletingId === item._id} onClick={() => deleteItem(item)}>{deletingId === item._id ? <CircularProgress size={16} /> : <DeleteOutlineOutlinedIcon fontSize="small" />}</IconButton>
                </Stack>
                <Box sx={{ borderTop: "1px solid", borderColor: "divider", mt: 1, pt: 1.2 }}>
                  <Typography fontSize={12} fontWeight={800} sx={{ mb: 0.8 }}>Gắn ảnh vào sản phẩm</Typography>
                  <Autocomplete
                    size="small"
                    options={filteredProducts}
                    value={chosen}
                    loading={productsLoading}
                    getOptionLabel={(option) => `${option.title || "Sản phẩm"}${option.code ? " · " + option.code : ""}`}
                    isOptionEqualToValue={(option, value) => option._id === value._id}
                    onInputChange={(_, value) => setProductSearch(value)}
                    onChange={(_, value) => setAssignments((current) => ({ ...current, [item._id]: value?._id || "" }))}
                    renderInput={(params) => <TextField {...params} placeholder={productsLoading ? "Đang tải sản phẩm..." : "Chọn sản phẩm"} />}
                    noOptionsText="Không tìm thấy sản phẩm"
                  />
                  <TextField select fullWidth size="small" value={targets[item._id] || "thumbnail"} onChange={(event) => setTargets((current) => ({ ...current, [item._id]: event.target.value as "thumbnail" | "gallery" }))} sx={{ mt: 1 }}>
                    <MenuItem value="thumbnail">Đặt làm ảnh đại diện</MenuItem>
                    <MenuItem value="gallery">Thêm vào bộ sưu tập</MenuItem>
                  </TextField>
                  <Button fullWidth size="small" variant="contained" disabled={!chosen || saving || productsLoading} onClick={() => assignImage(item)} sx={{ mt: 1, borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
                    {saving ? <CircularProgress size={17} color="inherit" /> : "Cập nhật ảnh"}
                  </Button>
                </Box>
              </CardContent>
            </Card>;
          })}
        </Box>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mt: 3, mb: 2 }}>
          <Button disabled={page <= 1} variant="outlined" onClick={() => setPage((value) => value - 1)} sx={{ textTransform: "none" }}>Trang trước</Button>
          <Typography fontSize={13} color="text.secondary">Trang {page}/{totalPages}</Typography>
          <Button disabled={page >= totalPages} variant="outlined" onClick={() => setPage((value) => value + 1)} sx={{ textTransform: "none" }}>Trang sau</Button>
        </Stack>
      </> : <Paper variant="outlined" sx={{ ...panelSx, minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3 }}>
        <ImageOutlinedIcon sx={{ fontSize: 54, color: "text.disabled", mb: 1 }} />
        <Typography fontWeight={700}>Chưa có hình ảnh trong thư viện</Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5, textAlign: "center" }}>Tải ảnh lên để lưu trữ trên Cloudinary.</Typography>
        <Button sx={{ mt: 2, textTransform: "none" }} startIcon={<CloudUploadOutlinedIcon />} onClick={() => fileInputRef.current?.click()}>Chọn ảnh</Button>
      </Paper>}
    </Box>
  );
};
export default Images;
