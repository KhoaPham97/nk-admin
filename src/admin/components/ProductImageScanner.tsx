import React, { useRef, useState } from "react";
import { createWorker } from "tesseract.js";

const MAX_IMAGE_SIZE = 5000;

// ===============================
// IMAGE SUPPORT
// ===============================

const isImageFile = (file: File) => {
  if (!file) return false;

  if (file.type && file.type.startsWith("image/")) {
    return true;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  return [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "bmp",
    "avif",
    "tif",
    "tiff",
    "ico",
    "heic",
    "heif",
  ].includes(extension || "");
};

// ===============================
// IMAGE → PNG
// ===============================

const convertImageToPng = async (
  file: File,
): Promise<{ blob: Blob; url: string }> => {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (!width || !height) {
          URL.revokeObjectURL(sourceUrl);

          reject(new Error("Không thể đọc kích thước hình ảnh."));

          return;
        }

        // Không thu nhỏ nếu ảnh đang trong giới hạn
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          const ratio = Math.min(
            MAX_IMAGE_SIZE / width,
            MAX_IMAGE_SIZE / height,
          );

          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          URL.revokeObjectURL(sourceUrl);

          reject(new Error("Không thể tạo Canvas."));

          return;
        }

        // Nền trắng
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);

        // Giữ nguyên ảnh
        context.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(sourceUrl);

            if (!blob) {
              reject(new Error("Không thể chuyển hình ảnh."));

              return;
            }

            const url = URL.createObjectURL(blob);

            resolve({
              blob,
              url,
            });
          },
          "image/png",
          1,
        );
      } catch (error) {
        URL.revokeObjectURL(sourceUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(sourceUrl);

      reject(new Error("Trình duyệt không thể đọc định dạng hình ảnh này."));
    };

    img.src = sourceUrl;
  });
};

// ===============================
// TRANSLATE
// ===============================

const translateChunk = async (text: string): Promise<string> => {
  if (!text.trim()) {
    return "";
  }

  const url =
    "https://translate.googleapis.com/translate_a/single" +
    "?client=gtx" +
    "&sl=auto" +
    "&tl=vi" +
    "&dt=t" +
    "&q=" +
    encodeURIComponent(text);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Không thể kết nối dịch thuật.");
  }

  const data = await response.json();

  if (!Array.isArray(data?.[0])) {
    return "";
  }

  return data[0].map((item: any[]) => item?.[0] || "").join("");
};

// Google Translate có giới hạn độ dài query.
// Chia text thành từng đoạn.
const translateText = async (text: string): Promise<string> => {
  if (!text.trim()) {
    return "";
  }

  const lines = text.split("\n");

  const chunks: string[] = [];
  let currentChunk = "";

  for (const line of lines) {
    const next = currentChunk.length > 0 ? `${currentChunk}\n${line}` : line;

    if (next.length > 3500) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk);
      }

      currentChunk = line;
    } else {
      currentChunk = next;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk);
  }

  const translatedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const translated = await translateChunk(chunks[i]);

    translatedChunks.push(translated);
  }

  return translatedChunks.join("\n");
};

// ===============================
// COMPONENT
// ===============================

const ProductImageScanner: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const previewUrlRef = useRef<string>("");

  // Image
  const [image, setImage] = useState("");

  const [fileName, setFileName] = useState("");

  // OCR
  const [scanning, setScanning] = useState(false);

  const [progress, setProgress] = useState(0);

  const [rawText, setRawText] = useState("");

  // Translation
  const [translatedText, setTranslatedText] = useState("");

  const [translating, setTranslating] = useState(false);

  // UI
  const [error, setError] = useState("");

  const [copiedRaw, setCopiedRaw] = useState(false);

  const [copiedVietnamese, setCopiedVietnamese] = useState(false);

  const [copiedAll, setCopiedAll] = useState(false);

  // ===============================
  // OPEN FILE
  // ===============================

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  // ===============================
  // HANDLE FILE
  // ===============================

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setRawText("");
    setTranslatedText("");
    setProgress(0);

    setCopiedRaw(false);
    setCopiedVietnamese(false);
    setCopiedAll(false);

    setFileName(file.name);

    if (!isImageFile(file)) {
      setError("File này không phải định dạng hình ảnh được hỗ trợ.");

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }

    try {
      const converted = await convertImageToPng(file);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = converted.url;

      setImage(converted.url);

      await scanImage(converted.blob);
    } catch (error) {
      console.error("handleFile:", error);

      setError(
        error instanceof Error ? error.message : "Không thể xử lý hình ảnh.",
      );

      setScanning(false);
    }
  };

  // ===============================
  // OCR
  // ===============================

  const scanImage = async (file: Blob) => {
    let worker: Awaited<ReturnType<typeof createWorker>> | null = null;

    try {
      setScanning(true);
      setProgress(0);
      setRawText("");
      setTranslatedText("");

      worker = await createWorker("chi_sim+eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            const value = Math.round((message.progress || 0) * 100);

            setProgress(Math.min(Math.max(value, 0), 100));
          }
        },
      });

      /*
       * PSM 4:
       * Single column.
       *
       * Phù hợp hơn với phiếu,
       * bảng và văn bản nhiều dòng.
       */
      await worker.setParameters({
        tessedit_pageseg_mode: "4",
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
      });

      const result = await worker.recognize(file);

      const text = result?.data?.text || "";

      setRawText(text);

      setProgress(100);

      // ===============================
      // TRANSLATE
      // ===============================

      if (text.trim()) {
        setTranslating(true);

        try {
          const translated = await translateText(text);

          setTranslatedText(translated);
        } catch (translateError) {
          console.error("Translation error:", translateError);

          setError("OCR thành công nhưng không thể dịch sang tiếng Việt.");
        } finally {
          setTranslating(false);
        }
      }
    } catch (error) {
      console.error("OCR error:", error);

      setError(
        error instanceof Error ? error.message : "Không thể đọc hình ảnh.",
      );
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (error) {
          console.error("Terminate worker error:", error);
        }
      }

      setScanning(false);
    }
  };

  // ===============================
  // COPY
  // ===============================

  const copyRawText = async () => {
    if (!rawText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(rawText);

      setCopiedRaw(true);

      setTimeout(() => {
        setCopiedRaw(false);
      }, 2000);
    } catch (error) {
      console.error("Copy raw text:", error);

      setError("Không thể copy text.");
    }
  };

  const copyVietnamese = async () => {
    if (!translatedText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(translatedText);

      setCopiedVietnamese(true);

      setTimeout(() => {
        setCopiedVietnamese(false);
      }, 2000);
    } catch (error) {
      console.error("Copy Vietnamese:", error);

      setError("Không thể copy bản dịch.");
    }
  };

  const copyAll = async () => {
    if (!rawText && !translatedText) {
      return;
    }

    try {
      const content =
        `===== TEXT GỐC =====\n\n` +
        `${rawText}\n\n` +
        `===== TIẾNG VIỆT =====\n\n` +
        `${translatedText}`;

      await navigator.clipboard.writeText(content);

      setCopiedAll(true);

      setTimeout(() => {
        setCopiedAll(false);
      }, 2000);
    } catch (error) {
      console.error("Copy all:", error);

      setError("Không thể copy nội dung.");
    }
  };

  // ===============================
  // RESET
  // ===============================

  const reset = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);

      previewUrlRef.current = "";
    }

    setImage("");
    setFileName("");

    setRawText("");
    setTranslatedText("");

    setProgress(0);

    setScanning(false);
    setTranslating(false);

    setError("");

    setCopiedRaw(false);
    setCopiedVietnamese(false);
    setCopiedAll(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // ===============================
  // UI
  // ===============================

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Scan hình ảnh → Text → Tiếng Việt
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Scan nội dung từ hình ảnh, giữ text gốc và dịch sang tiếng Việt.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* FILE INPUT */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />

      {/* ============================= */}
      {/* NO IMAGE */}
      {/* ============================= */}

      {!image && (
        <div
          onClick={openFilePicker}
          className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white transition hover:border-blue-500 hover:bg-blue-50/30"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl">
            📷
          </div>

          <h3 className="font-semibold text-gray-800">Chọn hình ảnh</h3>

          <p className="mt-1 text-center text-sm text-gray-500">
            JPG, JPEG, PNG, WEBP, GIF, BMP, AVIF, TIFF, HEIC...
          </p>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openFilePicker();
            }}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Chọn hình ảnh
          </button>
        </div>
      )}

      {/* ============================= */}
      {/* IMAGE + RESULT */}
      {/* ============================= */}

      {image && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ========================= */}
          {/* LEFT IMAGE */}
          {/* ========================= */}

          <div>
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <img
                src={image}
                alt="Ảnh scan"
                className="max-h-[800px] w-full object-contain"
              />
            </div>

            {fileName && (
              <div className="mt-2 truncate text-xs text-gray-500">
                File: {fileName}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={openFilePicker}
                disabled={scanning || translating}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Chọn ảnh khác
              </button>

              <button
                type="button"
                onClick={reset}
                disabled={scanning || translating}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Xóa
              </button>
            </div>
          </div>

          {/* ========================= */}
          {/* RIGHT */}
          {/* ========================= */}

          <div>
            {/* OCR LOADING */}
            {scanning && (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />

                  <span className="font-semibold text-gray-800">
                    Đang scan hình ảnh...
                  </span>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <div className="mt-2 text-right text-xs text-gray-500">
                  {progress}%
                </div>
              </div>
            )}

            {/* TRANSLATION LOADING */}
            {!scanning && translating && (
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />

                  <div>
                    <div className="font-semibold text-blue-800">
                      Đang dịch sang tiếng Việt...
                    </div>

                    <div className="mt-1 text-xs text-blue-600">
                      Đang xử lý nội dung OCR
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================= */}
            {/* OCR RESULT */}
            {/* ========================= */}

            {!scanning && rawText && (
              <>
                {/* ORIGINAL */}
                <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b p-4">
                    <div>
                      <h2 className="font-bold text-gray-900">Text gốc</h2>

                      <p className="mt-1 text-xs text-gray-500">
                        Nội dung OCR trực tiếp từ hình ảnh
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={copyRawText}
                      className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
                    >
                      {copiedRaw ? "Đã copy ✓" : "Copy"}
                    </button>
                  </div>

                  <div className="p-4">
                    <textarea
                      value={rawText}
                      onChange={(event) => setRawText(event.target.value)}
                      spellCheck={false}
                      className="min-h-[350px] w-full resize-y rounded-xl border border-gray-200 bg-gray-50 p-4 font-mono text-sm leading-6 text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* VIETNAMESE */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-green-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-green-100 bg-green-50 p-4">
                    <div>
                      <h2 className="font-bold text-gray-900">Tiếng Việt</h2>

                      <p className="mt-1 text-xs text-gray-500">
                        Bản dịch từ nội dung OCR
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={copyVietnamese}
                      disabled={!translatedText || translating}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {copiedVietnamese ? "Đã copy ✓" : "Copy"}
                    </button>
                  </div>

                  <div className="p-4">
                    {translatedText ? (
                      <textarea
                        value={translatedText}
                        onChange={(event) =>
                          setTranslatedText(event.target.value)
                        }
                        spellCheck={false}
                        className="min-h-[350px] w-full resize-y rounded-xl border border-gray-200 bg-green-50/30 p-4 text-sm leading-6 text-gray-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      />
                    ) : (
                      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                        Chưa có bản dịch
                      </div>
                    )}
                  </div>
                </div>

                {/* COPY ALL */}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={copyAll}
                    disabled={!rawText && !translatedText}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copiedAll
                      ? "Đã copy tất cả ✓"
                      : "Copy cả Text + Tiếng Việt"}
                  </button>
                </div>
              </>
            )}

            {/* EMPTY */}
            {!scanning && !rawText && (
              <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
                <div className="text-4xl">📝</div>

                <h3 className="mt-3 font-semibold text-gray-800">
                  Chưa có nội dung
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Hệ thống sẽ OCR hình ảnh và dịch sang tiếng Việt.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImageScanner;
