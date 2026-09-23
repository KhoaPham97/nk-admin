import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGE_DIR = path.resolve(__dirname, "../public/images");

const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 82;

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

    if (after < before) {
      await fs.promises.rm(filePath);

      await fs.promises.rename(tempPath, filePath);

      console.log(
        `✓ ${path.basename(filePath)} | ` +
          `${(before / 1024).toFixed(1)} KB → ` +
          `${(after / 1024).toFixed(1)} KB`,
      );
    } else {
      await fs.promises.rm(tempPath);

      console.log(`- ${path.basename(filePath)} | giữ nguyên`);
    }
  } catch (error) {
    console.error(`✗ ${filePath}`);
    console.error(error.message);

    try {
      await fs.promises.rm(tempPath);
    } catch {}
  }
}

async function main() {
  console.log("");
  console.log("======================================");
  console.log("     NHAT KHANG BIKE IMAGE OPTIMIZER");
  console.log("======================================");
  console.log("");

  console.log(`Thư mục: ${IMAGE_DIR}`);
  console.log("");

  try {
    await fs.promises.access(IMAGE_DIR);
  } catch {
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
