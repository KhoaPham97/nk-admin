import React, { useState } from "react";
import {
  Alert, Box, Button, Chip, LinearProgress, Paper, Stack, Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { BASE_URL } from "../../../../api";
import PUBLIC_IMAGE_MANIFEST from "./publicImageManifest";

const getToken = () => localStorage.getItem("adminToken") || localStorage.getItem("accessToken") || "";

const normalizeName = (value) =>
  String(value || "")
    .split("/").pop()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "image";

const folderFor = (path) => path.includes("/categories/") ? "categories" : "products";

const mimeFor = (path, blobType) => {
  if (blobType && blobType.startsWith("image/")) return blobType;
  const ext = path.split(".").pop().toLowerCase();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" })[ext] || "application/octet-stream";
};

async function fetchExisting(folder, token) {
  let page = 1;
  const found = new Set();
  while (true) {
    const url = BASE_URL + "/media?folder=" + encodeURIComponent(folder) + "&page=" + page + "&limit=100";
    const response = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Không đọc được thư viện ảnh (" + response.status + ")");
    (data.media || []).forEach((item) => found.add(normalizeName(item.originalName || item.filename)));
    if (!data.pagination?.hasMore) break;
    page += 1;
  }
  return found;
}

export default function CloudinarySync() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [failed, setFailed] = useState([]);
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);

  const total = PUBLIC_IMAGE_MANIFEST.length;
  const percent = total ? Math.round((progress / total) * 100) : 0;

  const migrateUrls = async () => {
    if (migrationRunning) return;
    const token = getToken();
    if (!token) { setMessage("Không tìm thấy phiên đăng nhập admin. Vui lòng đăng nhập lại."); return; }
    setMigrationRunning(true);
    setMigrationResult(null);
    try {
      const response = await fetch(BASE_URL + "/media/migrate-cloudinary-urls?apply=1", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ apply: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || "Không thể chuyển URL ảnh");
      setMigrationResult(result);
    } catch (error) {
      setMessage(error.message || "Lỗi chuyển URL ảnh");
    } finally {
      setMigrationRunning(false);
    }
  };

  const startSync = async () => {
    if (running) return;
    const token = getToken();
    if (!token) {
      setMessage("Không tìm thấy phiên đăng nhập admin. Vui lòng đăng nhập lại.");
      return;
    }

    setRunning(true);
    setFinished(false);
    setProgress(0);
    setDone(0);
    setSkipped(0);
    setFailed([]);
    setMessage("Đang kiểm tra ảnh đã có trên Cloudinary…");

    try {
      const existingProducts = await fetchExisting("products", token);
      const existingCategories = await fetchExisting("categories", token);
      let uploadedCount = 0;
      let skippedCount = 0;
      const errors = [];

      for (let index = 0; index < PUBLIC_IMAGE_MANIFEST.length; index += 1) {
        const assetPath = PUBLIC_IMAGE_MANIFEST[index];
        const folder = folderFor(assetPath);
        const filename = normalizeName(assetPath);
        const existing = folder === "categories" ? existingCategories : existingProducts;
        setCurrent(filename);

        if (existing.has(filename)) {
          skippedCount += 1;
          setSkipped(skippedCount);
          setProgress(index + 1);
          continue;
        }

        try {
          const assetResponse = await fetch(assetPath, { cache: "no-cache" });
          if (!assetResponse.ok) throw new Error("Không đọc được file nguồn (" + assetResponse.status + ")");
          const blob = await assetResponse.blob();
          if (!blob.size) throw new Error("File ảnh rỗng");
          if (blob.size > 12 * 1024 * 1024) throw new Error("Ảnh vượt giới hạn 12 MB");

          const formData = new FormData();
          formData.append("folder", folder);
          formData.append("images", new File([blob], filename, { type: mimeFor(assetPath, blob.type) }));

          const uploadResponse = await fetch(BASE_URL + "/media/upload", {
            method: "POST",
            headers: { Authorization: "Bearer " + token },
            body: formData,
          });
          const result = await uploadResponse.json().catch(() => ({}));
          if (!uploadResponse.ok || !result.success) throw new Error(result.message || "Upload lỗi (" + uploadResponse.status + ")");

          uploadedCount += 1;
          existing.add(filename);
          setDone(uploadedCount);
        } catch (error) {
          errors.push({ file: filename, message: error.message || "Lỗi không xác định" });
          setFailed([...errors]);
        }

        setProgress(index + 1);
      }

      setFailed(errors);
      setMessage("Hoàn tất: tải lên " + uploadedCount + " ảnh, bỏ qua " + skippedCount + " ảnh đã có, lỗi " + errors.length + " ảnh.");
      setFinished(true);
    } catch (error) {
      setMessage(error.message || "Không thể bắt đầu đồng bộ.");
      setFinished(true);
    } finally {
      setRunning(false);
      setCurrent("");
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Đồng bộ ảnh lên Cloudinary</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Tự quét ảnh trong public/images của website, tải lên backend và lưu thông tin vào thư viện ảnh.
          </Typography>
        </Box>

        <Alert severity="info">
          Đồng bộ {total} ảnh. Ảnh được giữ nguyên tên file; ảnh danh mục vào thư mục categories, ảnh còn lại vào products.
          Ảnh đã tồn tại theo tên file sẽ được bỏ qua để hạn chế tải trùng. Không thay đổi dữ liệu ảnh trong sản phẩm.
        </Alert>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={total + " ảnh nguồn"} />
              <Chip color="success" label={"Đã tải: " + done} />
              <Chip label={"Đã có: " + skipped} />
              <Chip color={failed.length ? "error" : "default"} label={"Lỗi: " + failed.length} />
            </Stack>

            <Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.8 }}>
                <Typography variant="body2" fontWeight={700}>Tiến độ</Typography>
                <Typography variant="body2" color="text.secondary">{progress}/{total} · {percent}%</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={percent} sx={{ height: 10, borderRadius: 10 }} />
            </Box>

            {current && <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>Đang xử lý: {current}</Typography>}
            {message && <Alert severity={failed.length ? "warning" : finished ? "success" : "info"}>{message}</Alert>}

            <Button
              variant="contained"
              size="large"
              startIcon={finished && !failed.length ? <CheckCircleOutlineIcon /> : <CloudUploadOutlinedIcon />}
              onClick={startSync}
              disabled={running}
              sx={{ alignSelf: "flex-start", minHeight: 46, px: 3, borderRadius: 2, fontWeight: 700 }}
            >
              {running ? "Đang đồng bộ…" : finished ? "Chạy đồng bộ lại / kiểm tra ảnh mới" : "Bắt đầu tải ảnh lên Cloudinary"}
            </Button>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Typography fontWeight={800}>Chuyển đường dẫn ảnh sang Cloudinary</Typography>
            <Typography variant="body2" color="text.secondary">
              Sau khi tải ảnh lên, nhấn nút này để cập nhật URL trong sản phẩm: ảnh đại diện, ảnh chi tiết và ảnh từng phân loại; đồng thời cập nhật ảnh danh mục. Chỉ thay những ảnh có tên khớp với thư viện Cloudinary, ảnh chưa tải lên sẽ được giữ nguyên.
            </Typography>
            <Button variant="contained" color="success" onClick={migrateUrls} disabled={migrationRunning} sx={{ alignSelf: "flex-start", minHeight: 44, borderRadius: 2, fontWeight: 700 }}>
              {migrationRunning ? "Đang chuyển đường dẫn…" : "Chuyển toàn bộ đường dẫn ảnh sang Cloudinary"}
            </Button>
            {migrationResult && (
              <Alert severity="success">
                {migrationResult.message} Sản phẩm: {migrationResult.products.updated}/{migrationResult.products.scanned}; danh mục: {migrationResult.categories.updated}/{migrationResult.categories.scanned}; số trường ảnh đã đổi: {migrationResult.products.fieldsChanged + migrationResult.categories.fieldsChanged}. Ảnh chưa khớp: {migrationResult.missingCount}; tên bị trùng: {migrationResult.ambiguousCount}.
              </Alert>
            )}
            {migrationResult?.missing?.length > 0 && (
              <Alert severity="warning">
                Một số ảnh chưa có trên Cloudinary (hiển thị tối đa 100 mục): {migrationResult.missing.map((item) => item.image).join(", ")}
              </Alert>
            )}
            {migrationResult?.ambiguous?.length > 0 && (
              <Alert severity="warning">
                Một số tên ảnh bị trùng nên hệ thống không tự đổi để tránh gắn nhầm: {migrationResult.ambiguous.map((item) => item.image).join(", ")}
              </Alert>
            )}
          </Stack>
        </Paper>

        {failed.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <ErrorOutlineIcon color="error" />
              <Typography fontWeight={800}>Ảnh chưa tải được ({failed.length})</Typography>
            </Stack>
            <Stack spacing={1} sx={{ maxHeight: 320, overflow: "auto" }}>
              {failed.map((item) => (
                <Box key={item.file} sx={{ p: 1, bgcolor: "action.hover", borderRadius: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{item.file}</Typography>
                  <Typography variant="caption" color="error.main">{item.message}</Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
