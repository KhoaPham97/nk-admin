const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMAGE_DIR = path.join(__dirname, "../public/images");

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 82;

// Ảnh nhỏ hơn hoặc bằng mức này sẽ bỏ qua
const MAX_FILE_SIZE = 300 * 1024; // 300 KB

async function getAllFiles(dir) {
  const entries = await fs.promises.readdir(dir, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function optimizeImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext !== ".jpg" && ext !== ".jpeg") {
    return;
  }

  const tempPath = `${filePath}.tmp`;

  try {
    const before = (await fs.promises.stat(filePath)).size;

    // ==========================================
    // 1. ẢNH ĐÃ NHỎ → BỎ QUA NGAY
    // ==========================================
    if (before <= MAX_FILE_SIZE) {
      console.log(
        `○ ${path.basename(filePath)} | ` +
          `${(before / 1024).toFixed(1)} KB | bỏ qua`,
      );

      return;
    }

    // ==========================================
    // 2. ẢNH LỚN → TIẾN HÀNH OPTIMIZE
    // ==========================================
    await sharp(filePath)
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: QUALITY,
        mozjpeg: true,
      })
      .toFile(tempPath);

    const after = (await fs.promises.stat(tempPath)).size;

    // ==========================================
    // 3. FILE MỚI NHỎ HƠN → THAY FILE CŨ
    // ==========================================
    if (after < before) {
      await fs.promises.rm(filePath);

      await fs.promises.rename(tempPath, filePath);

      console.log(
        `✓ ${path.basename(filePath)} | ` +
          `${(before / 1024).toFixed(1)} KB → ` +
          `${(after / 1024).toFixed(1)} KB`,
      );
    } else {
      // File optimize không nhỏ hơn → giữ nguyên
      await fs.promises.rm(tempPath);

      console.log(
        `- ${path.basename(filePath)} | ` +
          `${(before / 1024).toFixed(1)} KB → ` +
          `${(after / 1024).toFixed(1)} KB | giữ nguyên`,
      );
    }
  } catch (error) {
    console.error(`✗ ${path.basename(filePath)}`);
    console.error(error.message);

    if (fs.existsSync(tempPath)) {
      await fs.promises.rm(tempPath);
    }
  }
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log("   NHAT KHANG BIKE IMAGE OPTIMIZER");
  console.log("======================================");
  console.log("");

  console.log(`Thư mục: ${IMAGE_DIR}`);
  console.log(`Bỏ qua ảnh ≤ ${(MAX_FILE_SIZE / 1024).toFixed(0)} KB`);
  console.log(`Max size: ${MAX_WIDTH}x${MAX_HEIGHT}`);
  console.log(`JPEG quality: ${QUALITY}`);

  console.log("");

  if (!fs.existsSync(IMAGE_DIR)) {
    console.error("❌ Không tìm thấy thư mục:");
    console.error(IMAGE_DIR);
    return;
  }

  const allFiles = await getAllFiles(IMAGE_DIR);

  const images = allFiles.filter((file) => {
    const ext = path.extname(file).toLowerCase();

    return ext === ".jpg" || ext === ".jpeg";
  });

  console.log(`Tìm thấy ${images.length} ảnh JPG/JPEG`);
  console.log("");

  for (const image of images) {
    await optimizeImage(image);
  }

  console.log("");
  console.log("======================================");
  console.log("              HOÀN THÀNH");
  console.log("======================================");
  console.log("");
}

main();
