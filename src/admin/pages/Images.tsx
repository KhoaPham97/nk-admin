import { FC, useEffect, useMemo, useState } from "react";

import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";

import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ImageIcon from "@mui/icons-material/Image";

import { API_ENDPOINTS } from "../../api";

// =====================================================
// TYPES
// =====================================================

interface Product {
  _id: string;
  name: string;
  thumbnail?: string;
  images?: string[];
  code?: string;
}

interface ProductImage {
  id: string;
  url: string;
  name: string;
  productId: string;
  productName: string;
  type: "thumbnail" | "image";
}

// =====================================================
// API
// =====================================================

// Nếu API_ENDPOINTS của bạn đã có PRODUCTS thì dùng:
// const PRODUCT_API = API_ENDPOINTS.PRODUCTS;

const PRODUCT_API = API_ENDPOINTS.PRODUCTS;

// =====================================================
// IMAGE URL
// =====================================================

const getImageUrl = (image?: string): string => {
  if (!image) {
    return "";
  }

  // URL đầy đủ
  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:")
  ) {
    return image;
  }

  // Đã có /images/
  if (image.startsWith("/images/")) {
    return image;
  }

  // Đường dẫn bắt đầu bằng /
  if (image.startsWith("/")) {
    return image;
  }

  // Tên file trong public/images
  return `/images/${image}`;
};

// =====================================================
// COMPONENT
// =====================================================

const Images: FC = () => {
  // ===================================================
  // STATE
  // ===================================================

  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [selectedImage, setSelectedImage] = useState<ProductImage | null>(null);

  // ===================================================
  // LOAD PRODUCTS
  // ===================================================

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(PRODUCT_API, {
        params: {
          type: "all",
          limit: 999,
        },
      });

      const data = response?.data;

      /*
       * Hỗ trợ nhiều kiểu response:
       *
       * 1. { products: [...] }
       * 2. { data: [...] }
       * 3. [...]
       */

      let productList: Product[] = [];

      if (Array.isArray(data)) {
        productList = data;
      } else if (Array.isArray(data.products)) {
        productList = data.products;
      } else if (Array.isArray(data.data)) {
        productList = data.data;
      }

      setProducts(productList);
    } catch (err) {
      console.error("Load products error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải danh sách sản phẩm.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // ===================================================
  // CREATE IMAGE LIST
  // ===================================================

  const productImages = useMemo<ProductImage[]>(() => {
    const result: ProductImage[] = [];

    const usedUrls = new Set<string>();

    products.forEach((product) => {
      // ===============================================
      // THUMBNAIL
      // ===============================================

      if (product.thumbnail) {
        const url = getImageUrl(product.thumbnail);

        if (url && !usedUrls.has(url)) {
          usedUrls.add(url);

          result.push({
            id: `${product._id}-thumbnail-${product.thumbnail}`,
            url,
            name: product.thumbnail,
            productId: product._id,
            productName: product.name,
            type: "thumbnail",
          });
        }
      }

      // ===============================================
      // IMAGES
      // ===============================================

      if (Array.isArray(product.images)) {
        product.images.forEach((image, index) => {
          if (!image) {
            return;
          }

          const url = getImageUrl(image);

          if (!url || usedUrls.has(url)) {
            return;
          }

          usedUrls.add(url);

          result.push({
            id: `${product._id}-image-${index}-${image}`,
            url,
            name: image,
            productId: product._id,
            productName: product.name,
            type: "image",
          });
        });
      }
    });

    return result;
  }, [products]);

  // ===================================================
  // FILTER
  // ===================================================

  const filteredImages = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return productImages;
    }

    return productImages.filter((image) => {
      return (
        image.name.toLowerCase().includes(keyword) ||
        image.productName?.toLowerCase()?.includes(keyword)
      );
    });
  }, [productImages, search]);

  // ===================================================
  // COPY URL
  // ===================================================

  const copyImageUrl = async (imageUrl: string) => {
    try {
      const fullUrl =
        imageUrl.startsWith("http://") || imageUrl.startsWith("https://")
          ? imageUrl
          : `${window.location.origin}${imageUrl}`;

      await navigator.clipboard.writeText(fullUrl);

      alert("Đã copy URL hình ảnh.");
    } catch (error) {
      console.error("Copy URL error:", error);

      alert("Không thể copy URL.");
    }
  };

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <Box
      sx={{
        p: {
          xs: 2,
          md: 3,
        },
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <Box
        sx={{
          mb: 3,
        }}
      >
        <Typography
          sx={{
            fontSize: {
              xs: 24,
              md: 28,
            },
            fontWeight: 700,
            color: "text.primary",
          }}
        >
          Hình ảnh
        </Typography>

        <Typography
          sx={{
            mt: 0.5,
            fontSize: 14,
            color: "text.secondary",
          }}
        >
          Hình ảnh được lấy từ sản phẩm
        </Typography>
      </Box>

      {/* =================================================
          SEARCH
      ================================================= */}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo tên hình ảnh hoặc tên sản phẩm..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon
                  sx={{
                    color: "text.secondary",
                  }}
                />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* =================================================
          COUNT
      ================================================= */}

      {!loading && !error && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              color: "text.secondary",
            }}
          >
            {filteredImages.length} hình ảnh
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: "text.secondary",
            }}
          >
            {products.length} sản phẩm
          </Typography>
        </Box>
      )}

      {/* =================================================
          LOADING
      ================================================= */}

      {loading && (
        <Paper
          elevation={0}
          sx={{
            minHeight: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <CircularProgress />

          <Typography
            sx={{
              mt: 2,
              fontSize: 14,
              color: "text.secondary",
            }}
          >
            Đang tải hình ảnh...
          </Typography>
        </Paper>
      )}

      {/* =================================================
          ERROR
      ================================================= */}

      {!loading && error && (
        <Paper
          elevation={0}
          sx={{
            minHeight: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            border: "1px solid",
            borderColor: "error.light",
            borderRadius: 3,
            p: 3,
          }}
        >
          <ImageIcon
            sx={{
              fontSize: 64,
              color: "error.light",
              mb: 1,
            }}
          />

          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Không thể tải hình ảnh
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "text.secondary",
              textAlign: "center",
            }}
          >
            {error}
          </Typography>
        </Paper>
      )}

      {/* =================================================
          IMAGE GRID
      ================================================= */}

      {!loading && !error && filteredImages.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
              lg: "repeat(5, minmax(0, 1fr))",
              xl: "repeat(6, minmax(0, 1fr))",
            },
            gap: 2,
          }}
        >
          {filteredImages.map((image) => (
            <Paper
              key={image.id}
              elevation={0}
              sx={{
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                backgroundColor: "background.paper",
              }}
            >
              {/* =========================================
                  IMAGE
              ========================================= */}

              <Box
                onClick={() => setSelectedImage(image)}
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  backgroundColor: "#f7f7f7",
                  cursor: "pointer",
                  overflow: "hidden",

                  "& img": {
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transition: "transform .25s ease",
                  },

                  "&:hover img": {
                    transform: "scale(1.06)",
                  },
                }}
              >
                <img src={image.url} alt={image.productName} loading="lazy" />
              </Box>

              {/* =========================================
                  INFO
              ========================================= */}

              <Box
                sx={{
                  p: 1.5,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={image.productName}
                >
                  {image.productName}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,
                    fontSize: 11,
                    color: "text.secondary",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={image.name}
                >
                  {image.name}
                </Typography>

                <Typography
                  sx={{
                    mt: 0.4,
                    fontSize: 11,
                    color:
                      image.type === "thumbnail"
                        ? "primary.main"
                        : "text.secondary",
                  }}
                >
                  {image.type === "thumbnail" ? "Thumbnail" : "Hình sản phẩm"}
                </Typography>

                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => copyImageUrl(image.url)}
                    title="Copy URL"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* =================================================
          EMPTY
      ================================================= */}

      {!loading && !error && filteredImages.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            minHeight: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 3,
          }}
        >
          <ImageIcon
            sx={{
              fontSize: 64,
              color: "text.disabled",
              mb: 1,
            }}
          />

          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Không tìm thấy hình ảnh
          </Typography>

          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: "text.secondary",
            }}
          >
            Thử tìm kiếm bằng tên sản phẩm hoặc tên hình ảnh khác
          </Typography>
        </Paper>
      )}

      {/* =================================================
          IMAGE PREVIEW
      ================================================= */}

      <Dialog
        open={Boolean(selectedImage)}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent
          sx={{
            p: 0,
            position: "relative",
            backgroundColor: "#111",
          }}
        >
          {/* CLOSE */}

          <IconButton
            onClick={() => setSelectedImage(null)}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              color: "#fff",
              backgroundColor: "rgba(0,0,0,.55)",

              "&:hover": {
                backgroundColor: "rgba(0,0,0,.8)",
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* IMAGE */}

          {selectedImage && (
            <Box
              sx={{
                width: "100%",
                minHeight: "75vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                p: 3,
              }}
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.productName}
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  objectFit: "contain",
                }}
              />

              <Typography
                sx={{
                  mt: 2,
                  color: "#fff",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                {selectedImage.productName}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Images;
