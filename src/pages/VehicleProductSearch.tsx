import React, { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  InputAdornment,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

import {
  DirectionsCarOutlined,
  Search,
  Clear,
  Inventory2Outlined,
  ArrowForward,
  CategoryOutlined,
} from "@mui/icons-material";

import { useSearchParams } from "react-router-dom";

import { getRequest } from "../admin/common/ApiMethod";

// ======================================================
// TYPES
// ======================================================

interface Vehicle {
  _id: string;
  name: string;
  type?: string;
  brand?: string;
  model?: string;
  description?: string;
  isVisible?: boolean;
}

interface ProductVariant {
  _id?: string;
  name?: string;
  price?: number | string;
  defaultPrice?: number | string;
  qty?: number | string;
  weight?: number | string;
}

interface Product {
  _id: string;
  title: string;
  code?: string;
  brand?: string;

  thumbnail?: string;
  images?: string[];

  price?: number | string;
  originalPrice?: number | string;

  type?: string;
  qty?: number | string;

  variants?: ProductVariant[];

  compatibleVehicles?: string[];

  isVisible?: boolean;
}

// ======================================================
// CATEGORY
// ======================================================

interface CategoryInfo {
  key: string;
  label: string;
  shortLabel: string;
  color: "primary" | "success" | "warning";
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  "1": {
    key: "1",
    label: "Phụ tùng xe đạp",
    shortLabel: "Xe đạp",
    color: "success",
  },

  "2": {
    key: "2",
    label: "Phụ tùng xe điện",
    shortLabel: "Xe điện",
    color: "primary",
  },

  "3": {
    key: "3",
    label: "Phụ tùng xe ba gác",
    shortLabel: "Xe ba gác",
    color: "warning",
  },
};

const getCategoryInfo = (type?: string): CategoryInfo | null => {
  if (!type) return null;

  return CATEGORY_MAP[String(type)] || null;
};

// ======================================================
// HELPERS
// ======================================================

const getImageUrl = (image?: string) => {
  if (!image) return "";

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

  return `/images/${image}`;
};

const formatPrice = (value: number | string | undefined) => {
  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    return "Liên hệ";
  }

  return `${price.toLocaleString("vi-VN")} ₫`;
};

const getProductPrice = (product: Product) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  const prices = variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length > 0) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (min === max) {
      return formatPrice(min);
    }

    return `${formatPrice(min)} - ${formatPrice(max)}`;
  }

  return formatPrice(product.price);
};

const getProductQty = (product: Product) => {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.reduce((total, variant) => {
      const qty = Number(variant.qty);

      return total + (Number.isFinite(qty) ? qty : 0);
    }, 0);
  }

  const qty = Number(product.qty);

  return Number.isFinite(qty) ? qty : 0;
};

// ======================================================
// COMPONENT
// ======================================================

const VehicleProductSearch: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const vehicleFromUrl = searchParams.get("vehicle") || "";

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [products, setProducts] = useState<Product[]>([]);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [vehicleLoading, setVehicleLoading] = useState(false);

  const [productLoading, setProductLoading] = useState(false);

  const [error, setError] = useState("");

  const [searched, setSearched] = useState(false);

  /*
   * Category đang filter
   *
   * "all" = tất cả
   */
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ======================================================
  // LOAD VEHICLES
  // ======================================================

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setVehicleLoading(true);
      setError("");

      const res = await getRequest({
        url: "/vehicles",
      });

      const list = Array.isArray(res?.vehicles)
        ? res.vehicles
        : Array.isArray(res)
          ? res
          : [];

      const visibleVehicles = list
        .filter(
          (item: Vehicle) => item && item.name && item.isVisible !== false,
        )
        .sort((a: Vehicle, b: Vehicle) =>
          String(a.name).localeCompare(String(b.name), "vi"),
        );

      setVehicles(visibleVehicles);

      if (vehicleFromUrl) {
        const found = visibleVehicles.find(
          (vehicle: Vehicle) =>
            vehicle.name.toLowerCase() === vehicleFromUrl.toLowerCase(),
        );

        if (found) {
          setSelectedVehicle(found);

          /*
           * Mặc định category
           * theo loại xe
           */
          setSelectedCategory(
            found.type && CATEGORY_MAP[found.type] ? found.type : "all",
          );

          searchProducts(found.name);
        }
      }
    } catch (err) {
      console.error("Load vehicles error:", err);

      setError("Không thể tải danh sách xe. Vui lòng thử lại.");
    } finally {
      setVehicleLoading(false);
    }
  };

  // ======================================================
  // VEHICLE OPTIONS
  // ======================================================

  const vehicleOptions = useMemo(() => {
    return vehicles;
  }, [vehicles]);

  // ======================================================
  // SEARCH PRODUCTS
  // ======================================================

  const searchProducts = async (vehicleName: string) => {
    if (!vehicleName.trim()) {
      setProducts([]);
      setSearched(false);
      return;
    }

    try {
      setProductLoading(true);

      setError("");

      const res = await getRequest({
        url: `/products?compatibleVehicle=${encodeURIComponent(
          vehicleName.trim(),
        )}&limit=100`,
      });

      const list = Array.isArray(res?.products)
        ? res.products
        : Array.isArray(res)
          ? res
          : [];

      setProducts(list);
      setSearched(true);
    } catch (err) {
      console.error("Search compatible products error:", err);

      setProducts([]);

      setError("Không thể tìm sản phẩm. Vui lòng thử lại.");
    } finally {
      setProductLoading(false);
    }
  };

  // ======================================================
  // CATEGORY COUNTS
  // ======================================================

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: products.length,
      "1": 0,
      "2": 0,
      "3": 0,
    };

    products.forEach((product) => {
      const type = String(product.type || "");

      if (counts[type] !== undefined) {
        counts[type] += 1;
      }
    });

    return counts;
  }, [products]);

  // ======================================================
  // AVAILABLE CATEGORIES
  // ======================================================

  const availableCategories = useMemo(() => {
    return Object.values(CATEGORY_MAP).filter(
      (category) => categoryCounts[category.key] > 0,
    );
  }, [categoryCounts]);

  // ======================================================
  // FILTERED PRODUCTS
  // ======================================================

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") {
      return products;
    }

    return products.filter(
      (product) => String(product.type || "") === selectedCategory,
    );
  }, [products, selectedCategory]);

  // ======================================================
  // SELECT VEHICLE
  // ======================================================

  const handleVehicleChange = (
    _event: React.SyntheticEvent,
    value: Vehicle | null,
  ) => {
    setSelectedVehicle(value);

    if (!value) {
      setProducts([]);
      setSearched(false);

      setSelectedCategory("all");

      searchParams.delete("vehicle");

      setSearchParams(searchParams);

      return;
    }

    /*
     * Mặc định category
     * theo type của xe
     */
    setSelectedCategory(
      value.type && CATEGORY_MAP[value.type] ? value.type : "all",
    );

    setSearchParams({
      vehicle: value.name,
    });

    searchProducts(value.name);
  };

  // ======================================================
  // CLEAR
  // ======================================================

  const handleClear = () => {
    setSelectedVehicle(null);
    setProducts([]);
    setSearched(false);
    setSelectedCategory("all");

    setSearchParams({});
  };

  // ======================================================
  // PRODUCT CLICK
  // ======================================================

  const handleProductClick = (product: Product) => {
    console.log("Product:", product);

    /*
     * Nếu có route chi tiết:
     *
     * navigate(
     *   `/product/${product._id}`
     * );
     */
  };

  // ======================================================
  // VEHICLE CATEGORY
  // ======================================================

  const vehicleCategory = getCategoryInfo(selectedVehicle?.type);

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <Box
      sx={{
        minHeight: "100vh",

        bgcolor: "#f7f8fa",

        py: {
          xs: 3,
          md: 5,
        },
      }}
    >
      <Container maxWidth="xl">
        {/* ==================================================
              HEADER
          ================================================== */}

        <Box
          sx={{
            textAlign: "center",

            maxWidth: 760,

            mx: "auto",

            mb: {
              xs: 3,
              md: 5,
            },
          }}
        >
          <Box
            sx={{
              width: 58,
              height: 58,

              mx: "auto",
              mb: 2,

              borderRadius: "18px",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              bgcolor: "rgba(25,118,210,.1)",

              color: "primary.main",
            }}
          >
            <DirectionsCarOutlined
              sx={{
                fontSize: 31,
              }}
            />
          </Box>

          <Typography
            component="h1"
            sx={{
              fontSize: {
                xs: 27,
                sm: 34,
                md: 40,
              },

              lineHeight: 1.15,

              fontWeight: 900,

              color: "text.primary",
            }}
          >
            Tìm phụ tùng theo xe
          </Typography>

          <Typography
            sx={{
              mt: 1.5,

              color: "text.secondary",

              fontSize: {
                xs: 14,
                md: 16,
              },

              lineHeight: 1.7,
            }}
          >
            Chọn dòng xe của bạn để tìm những phụ tùng tương thích tại Nhật
            Khang Bike.
          </Typography>
        </Box>

        {/* ==================================================
              SEARCH BOX
          ================================================== */}

        <Card
          elevation={0}
          sx={{
            maxWidth: 900,

            mx: "auto",

            borderRadius: {
              xs: 2.5,
              md: 3,
            },

            border: "1px solid",

            borderColor: "divider",

            mb: 5,
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 2,
                sm: 3,
                md: 4,
              },

              "&:last-child": {
                pb: {
                  xs: 2,
                  sm: 3,
                  md: 4,
                },
              },
            }}
          >
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 800,
                mb: 1.5,
              }}
            >
              Bạn đang sử dụng xe nào?
            </Typography>

            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={1.5}
            >
              <Autocomplete
                fullWidth
                options={vehicleOptions}
                value={selectedVehicle}
                loading={vehicleLoading}
                onChange={handleVehicleChange}
                isOptionEqualToValue={(option, value) =>
                  option._id === value._id
                }
                getOptionLabel={(option) => option.name || ""}
                noOptionsText={
                  vehicleLoading ? "Đang tải..." : "Không tìm thấy dòng xe"
                }
                loadingText="Đang tải danh sách xe..."
                renderOption={(props, option) => {
                  const category = getCategoryInfo(option.type);

                  return (
                    <Box
                      component="li"
                      {...props}
                      key={option._id}
                      sx={{
                        display: "flex !important",

                        alignItems: "center",

                        justifyContent: "space-between",

                        gap: 1.5,

                        width: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",

                          alignItems: "center",

                          minWidth: 0,
                        }}
                      >
                        <DirectionsCarOutlined
                          sx={{
                            mr: 1.5,

                            color: "primary.main",
                          }}
                        />

                        <Box
                          sx={{
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 14,

                              fontWeight: 700,
                            }}
                          >
                            {option.name}
                          </Typography>

                          {(option.brand || option.model) && (
                            <Typography
                              sx={{
                                fontSize: 12,

                                color: "text.secondary",
                              }}
                            >
                              {[option.brand, option.model]
                                .filter(Boolean)
                                .join(" • ")}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {category && (
                        <Chip
                          label={category.label}
                          color={category.color}
                          size="small"
                          variant="outlined"
                          sx={{
                            flexShrink: 0,

                            fontWeight: 700,

                            fontSize: 10,
                          }}
                        />
                      )}
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Nhập tên xe..."
                    InputProps={{
                      ...params.InputProps,

                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <Search
                              sx={{
                                color: "text.secondary",
                              }}
                            />
                          </InputAdornment>

                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />

              <Button
                variant="outlined"
                disabled={!selectedVehicle}
                onClick={handleClear}
                startIcon={<Clear />}
                sx={{
                  minWidth: {
                    xs: "100%",
                    sm: 120,
                  },

                  height: 56,

                  borderRadius: 1.5,

                  textTransform: "none",

                  fontWeight: 700,
                }}
              >
                Xóa
              </Button>
            </Stack>

            {/* ==================================================
                  SELECTED VEHICLE
              ================================================== */}

            {selectedVehicle && (
              <Box
                sx={{
                  mt: 2,

                  display: "flex",

                  alignItems: "center",

                  gap: 1,

                  flexWrap: "wrap",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13,

                    color: "text.secondary",
                  }}
                >
                  Đang tìm phụ tùng cho:
                </Typography>

                <Chip
                  icon={<DirectionsCarOutlined />}
                  label={selectedVehicle.name}
                  color="primary"
                  sx={{
                    fontWeight: 700,
                  }}
                />

                {vehicleCategory && (
                  <Chip
                    icon={<CategoryOutlined />}
                    label={vehicleCategory.label}
                    size="small"
                    color={vehicleCategory.color}
                    variant="outlined"
                    sx={{
                      fontWeight: 700,
                    }}
                  />
                )}

                {selectedVehicle.brand && (
                  <Chip
                    label={selectedVehicle.brand}
                    size="small"
                    variant="outlined"
                  />
                )}

                {selectedVehicle.model && (
                  <Chip
                    label={selectedVehicle.model}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* ==================================================
              ERROR
          ================================================== */}

        {error && (
          <Alert
            severity="error"
            sx={{
              maxWidth: 900,
              mx: "auto",
              mb: 3,
            }}
          >
            {error}
          </Alert>
        )}

        {/* ==================================================
              LOADING
          ================================================== */}

        {productLoading && (
          <Box
            sx={{
              py: 8,

              textAlign: "center",
            }}
          >
            <CircularProgress />

            <Typography
              sx={{
                mt: 2,

                color: "text.secondary",
              }}
            >
              Đang tìm phụ tùng tương thích...
            </Typography>
          </Box>
        )}

        {/* ==================================================
              RESULT
          ================================================== */}

        {!productLoading && searched && selectedVehicle && (
          <>
            {/* RESULT HEADER */}

            <Box
              sx={{
                display: "flex",

                alignItems: {
                  xs: "flex-start",
                  sm: "center",
                },

                justifyContent: "space-between",

                flexDirection: {
                  xs: "column",
                  sm: "row",
                },

                gap: 1,

                mb: 2.5,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: {
                      xs: 20,
                      md: 24,
                    },

                    fontWeight: 900,
                  }}
                >
                  Phụ tùng tương thích
                </Typography>

                <Typography
                  sx={{
                    mt: 0.5,

                    fontSize: 13,

                    color: "text.secondary",
                  }}
                >
                  Dành cho{" "}
                  <Box
                    component="span"
                    sx={{
                      color: "primary.main",

                      fontWeight: 800,
                    }}
                  >
                    {selectedVehicle.name}
                  </Box>
                </Typography>
              </Box>

              <Chip
                icon={<Inventory2Outlined />}
                label={`${filteredProducts.length} sản phẩm`}
                variant="outlined"
              />
            </Box>

            {/* ==================================================
                    CATEGORY FILTER
                ================================================== */}

            {products.length > 0 && (
              <Card
                elevation={0}
                sx={{
                  mb: 3,

                  border: "1px solid",

                  borderColor: "divider",

                  borderRadius: 3,

                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: {
                      xs: 1.5,
                      sm: 2,
                    },

                    pt: 1,

                    display: "flex",

                    alignItems: "center",

                    gap: 1,
                  }}
                >
                  <CategoryOutlined
                    sx={{
                      color: "primary.main",

                      fontSize: 20,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 14,

                      fontWeight: 800,
                    }}
                  >
                    Phân loại phụ tùng
                  </Typography>
                </Box>

                <Tabs
                  value={selectedCategory}
                  onChange={(_event, value) => {
                    setSelectedCategory(value);
                  }}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    px: {
                      xs: 0.5,
                      sm: 1,
                    },

                    minHeight: 52,

                    "& .MuiTab-root": {
                      minHeight: 52,

                      textTransform: "none",

                      fontWeight: 700,

                      fontSize: 13,

                      px: {
                        xs: 1.5,
                        sm: 2,
                      },
                    },
                  }}
                >
                  <Tab
                    value="all"
                    label={
                      <Box
                        sx={{
                          display: "flex",

                          alignItems: "center",

                          gap: 0.8,
                        }}
                      >
                        <span>Tất cả</span>

                        <Chip
                          label={categoryCounts.all}
                          size="small"
                          color="primary"
                          sx={{
                            height: 21,

                            minWidth: 21,

                            fontSize: 10,

                            fontWeight: 800,
                          }}
                        />
                      </Box>
                    }
                  />

                  {availableCategories.map((category) => (
                    <Tab
                      key={category.key}
                      value={category.key}
                      label={
                        <Box
                          sx={{
                            display: "flex",

                            alignItems: "center",

                            gap: 0.8,
                          }}
                        >
                          <span>{category.shortLabel}</span>

                          <Chip
                            label={categoryCounts[category.key]}
                            size="small"
                            color={category.color}
                            sx={{
                              height: 21,

                              minWidth: 21,

                              fontSize: 10,

                              fontWeight: 800,
                            }}
                          />
                        </Box>
                      }
                    />
                  ))}
                </Tabs>
              </Card>
            )}

            <Divider
              sx={{
                mb: 3,
              }}
            />

            {/* ==================================================
                    NO RESULT
                ================================================== */}

            {products.length === 0 && (
              <Card
                elevation={0}
                sx={{
                  border: "1px solid",

                  borderColor: "divider",

                  borderRadius: 3,
                }}
              >
                <CardContent
                  sx={{
                    py: 8,

                    textAlign: "center",
                  }}
                >
                  <Inventory2Outlined
                    sx={{
                      fontSize: 55,

                      color: "text.disabled",
                    }}
                  />

                  <Typography
                    sx={{
                      mt: 2,

                      fontSize: 19,

                      fontWeight: 800,
                    }}
                  >
                    Chưa tìm thấy phụ tùng
                  </Typography>

                  <Typography
                    sx={{
                      mt: 1,

                      color: "text.secondary",

                      fontSize: 14,
                    }}
                  >
                    Hiện chưa có sản phẩm được khai báo tương thích với{" "}
                    {selectedVehicle.name}.
                  </Typography>

                  <Button
                    variant="outlined"
                    onClick={handleClear}
                    sx={{
                      mt: 3,

                      textTransform: "none",

                      fontWeight: 700,
                    }}
                  >
                    Chọn dòng xe khác
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ==================================================
                    FILTER EMPTY
                ================================================== */}

            {products.length > 0 && filteredProducts.length === 0 && (
              <Card
                elevation={0}
                sx={{
                  border: "1px solid",

                  borderColor: "divider",

                  borderRadius: 3,
                }}
              >
                <CardContent
                  sx={{
                    py: 6,

                    textAlign: "center",
                  }}
                >
                  <CategoryOutlined
                    sx={{
                      fontSize: 48,

                      color: "text.disabled",
                    }}
                  />

                  <Typography
                    sx={{
                      mt: 1.5,

                      fontWeight: 800,
                    }}
                  >
                    Không có sản phẩm trong nhóm này
                  </Typography>

                  <Button
                    sx={{
                      mt: 2,

                      textTransform: "none",
                    }}
                    onClick={() => setSelectedCategory("all")}
                  >
                    Xem tất cả phụ tùng
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ==================================================
                    PRODUCTS
                ================================================== */}

            {filteredProducts.length > 0 && (
              <Grid
                container
                spacing={{
                  xs: 1.5,
                  sm: 2,
                  md: 2.5,
                }}
              >
                {filteredProducts.map((product) => {
                  const image = getImageUrl(
                    product.thumbnail || product.images?.[0],
                  );

                  const qty = getProductQty(product);

                  const category = getCategoryInfo(product.type);

                  return (
                    <Grid
                      key={product._id}
                      size={{
                        xs: 6,
                        sm: 4,
                        md: 3,
                        lg: 3,
                      }}
                    >
                      <Card
                        elevation={0}
                        onClick={() => handleProductClick(product)}
                        sx={{
                          height: "100%",

                          cursor: "pointer",

                          borderRadius: 2.5,

                          overflow: "hidden",

                          border: "1px solid",

                          borderColor: "rgba(0,0,0,.08)",

                          transition: "all .2s ease",

                          "&:hover": {
                            transform: "translateY(-4px)",

                            boxShadow: "0 10px 30px rgba(0,0,0,.08)",

                            borderColor: "primary.main",
                          },
                        }}
                      >
                        {/* IMAGE */}

                        <Box
                          sx={{
                            position: "relative",

                            aspectRatio: "1 / 1",

                            bgcolor: "#f8f8f8",

                            overflow: "hidden",
                          }}
                        >
                          {image ? (
                            <Box
                              component="img"
                              src={image}
                              alt={product.title}
                              loading="lazy"
                              sx={{
                                width: "100%",

                                height: "100%",

                                objectFit: "contain",

                                display: "block",

                                transition: "transform .3s ease",

                                "&:hover": {
                                  transform: "scale(1.04)",
                                },
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: "100%",

                                height: "100%",

                                display: "flex",

                                alignItems: "center",

                                justifyContent: "center",

                                color: "text.disabled",
                              }}
                            >
                              <Inventory2Outlined
                                sx={{
                                  fontSize: 45,
                                }}
                              />
                            </Box>
                          )}

                          {/* COMPATIBLE */}

                          <Chip
                            label="Tương thích"
                            size="small"
                            color="success"
                            sx={{
                              position: "absolute",

                              top: 8,

                              left: 8,

                              fontSize: 10,

                              height: 24,

                              fontWeight: 800,
                            }}
                          />
                        </Box>

                        {/* CONTENT */}

                        <CardContent
                          sx={{
                            p: {
                              xs: 1.3,
                              sm: 1.7,
                            },

                            "&:last-child": {
                              pb: {
                                xs: 1.3,
                                sm: 1.7,
                              },
                            },
                          }}
                        >
                          {/* TITLE */}

                          <Typography
                            sx={{
                              fontSize: {
                                xs: 13,
                                sm: 14,
                              },

                              lineHeight: 1.45,

                              fontWeight: 700,

                              display: "-webkit-box",

                              WebkitLineClamp: 2,

                              WebkitBoxOrient: "vertical",

                              overflow: "hidden",

                              minHeight: {
                                xs: 38,
                                sm: 41,
                              },
                            }}
                          >
                            {product.title}
                          </Typography>

                          {/* CATEGORY */}

                          {category && (
                            <Box
                              sx={{
                                mt: 1,

                                display: "flex",

                                alignItems: "center",

                                gap: 0.7,
                              }}
                            >
                              <CategoryOutlined
                                sx={{
                                  fontSize: 15,

                                  color: `${category.color}.main`,
                                }}
                              />

                              <Chip
                                label={product.category}
                                size="small"
                                color={category.color}
                                variant="outlined"
                                sx={{
                                  height: 23,

                                  fontSize: 10,

                                  fontWeight: 700,
                                }}
                              />
                            </Box>
                          )}
                          {/* CODE */}

                          {/* {product.code && (
                            <Typography
                              sx={{
                                mt: 0.7,

                                fontSize: 11,

                                color: "text.secondary",
                              }}
                            >
                              Mã: {product.code}
                            </Typography>
                          )} */}

                          {/* PRICE */}

                          <Typography
                            sx={{
                              mt: 1,

                              color: "primary.main",

                              fontWeight: 900,

                              fontSize: {
                                xs: 14,
                                sm: 16,
                              },
                            }}
                          >
                            {getProductPrice(product)}
                          </Typography>

                          {/* STOCK */}

                          <Box
                            sx={{
                              mt: 1,

                              display: "flex",

                              alignItems: "center",

                              justifyContent: "space-between",

                              gap: 1,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,

                                color: qty > 0 ? "success.main" : "error.main",

                                fontWeight: 700,
                              }}
                            >
                              {qty > 0 ? "Còn hàng" : "Hết hàng"}
                            </Typography>

                            <ArrowForward
                              sx={{
                                fontSize: 17,

                                color: "text.disabled",
                              }}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </>
        )}

        {/* ==================================================
              INITIAL STATE
          ================================================== */}

        {!searched && !productLoading && !selectedVehicle && (
          <Box
            sx={{
              maxWidth: 800,

              mx: "auto",

              textAlign: "center",

              py: {
                xs: 4,
                md: 6,
              },
            }}
          >
            <Box
              sx={{
                width: 70,
                height: 70,

                mx: "auto",

                borderRadius: "22px",

                bgcolor: "#fff",

                border: "1px solid",

                borderColor: "divider",

                display: "flex",

                alignItems: "center",

                justifyContent: "center",
              }}
            >
              <Search
                sx={{
                  fontSize: 34,

                  color: "primary.main",
                }}
              />
            </Box>

            <Typography
              sx={{
                mt: 2,

                fontSize: 19,

                fontWeight: 800,
              }}
            >
              Hãy chọn dòng xe của bạn
            </Typography>

            <Typography
              sx={{
                mt: 1,

                color: "text.secondary",

                fontSize: 14,
              }}
            >
              Chúng tôi sẽ tìm những phụ tùng được khai báo tương thích với xe
              của bạn.
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default VehicleProductSearch;
