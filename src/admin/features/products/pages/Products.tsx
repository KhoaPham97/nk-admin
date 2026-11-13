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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ImageIcon from "@mui/icons-material/Image";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";

import { useLocation } from "react-router-dom";

import { getRequest, patchRequest, deleteRequest } from "../../../common/ApiMethod";
import { getProductPriceRange } from "../../../common/CommonFunc";

// =====================================================
// TYPES
// =====================================================

interface Variant {
  _id?: string;
  id?: string;
  name: string;
  price: number | string;
  unitCost?: number | string;
  qty: number | string;
  weight: number | string;
  variantCode?: string;
  sku?: string;
  packageQuantity?: number | string;
  reservedQty?: number | string;
  [key: string]: any;
}

interface Category {
  _id: string;
  name: string;
  type?: string;
  [key: string]: any;
}

interface Vehicle {
  _id: string;
  name: string;
  type?: string;
  [key: string]: any;
}

interface Product {
  _id: string;
  title: string;
  thumbnail?: string;
  images?: string[];
  brand?: string;
  price?: number | string;
  originalPrice?: number | string;
  qty?: number | string;
  stock?: number | string;
  type?: string;
  categoryId?: string;
  category?: string;
  description?: string;
  detail?: string;
  rating?: number;
  code?: string;
  imageUrl?: string;
  compatibleVehicles?: string[];
  variants?: Variant[];
  isVisible?: boolean;
  [key: string]: any;
}

// =====================================================
// CONSTANTS
// =====================================================

const TYPE_NAME: Record<string, string> = {
  "1": "Phụ tùng xe đạp",
  "2": "Phụ tùng xe điện",
  "3": "Phụ tùng xe ba gác",
};

const PAGE_LIMIT = 20;

const panelSx = {
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 3,
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.04)",
  overflow: "hidden",
  bgcolor: "background.paper",
};

const sectionTitleSx = {
  fontWeight: 800,
  fontSize: 15,
  letterSpacing: "-0.2px",
};

// =====================================================
// COMPONENT
// =====================================================

const Products = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // =====================================================
  // TYPE FROM URL
  // =====================================================

  const type = useMemo(() => {
    if (pathname === "/admin/products/bicycle") return "1";
    if (pathname === "/admin/products/electric") return "2";
    if (pathname === "/admin/products/tricycle") return "3";
    return "";
  }, [pathname]);

  const typeName = TYPE_NAME[type] || "Tất cả sản phẩm";

  // =====================================================
  // STATE
  // =====================================================

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // HELPERS
  // =====================================================

  const normalizeNumber = (
    value: number | string | null | undefined,
  ): number | string => {
    if (value === "" || value === null || value === undefined) return "";

    const number = Number(value);
    return Number.isFinite(number) ? number : "";
  };

  const normalizeCompatibleVehicles = (
    value: string[] | string | null | undefined,
  ): string[] => {
    if (Array.isArray(value)) {
      return Array.from(
        new Set(value.map((item) => String(item).trim()).filter(Boolean)),
      );
    }

    if (typeof value === "string") {
      return Array.from(
        new Set(
          value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );
    }

    return [];
  };

  const calculateTotalQty = (variants: Variant[]) =>
    variants.reduce((sum, variant) => {
      const qty = Number(variant.qty);
      return sum + (Number.isFinite(qty) ? qty : 0);
    }, 0);

  const normalizeProduct = (product: Product): Product => {
    const variants = Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          ...variant,
          name: variant.name || "",
          price: normalizeNumber(variant.price),
          unitCost: normalizeNumber(variant.unitCost),
          qty: normalizeNumber(variant.qty),
          weight: normalizeNumber(variant.weight),
          packageQuantity:
            variant.packageQuantity == null
              ? 1
              : normalizeNumber(variant.packageQuantity),
          reservedQty: normalizeNumber(variant.reservedQty),
        }))
      : [];

    return {
      ...product,
      title: product.title || "",
      brand: product.brand || "",
      code: product.code || "",
      type: product.type ? String(product.type) : "",
      categoryId: product.categoryId || "",
      category: product.category || "",
      compatibleVehicles: normalizeCompatibleVehicles(
        product.compatibleVehicles,
      ),
      price: normalizeNumber(product.price),
      originalPrice: normalizeNumber(product.originalPrice),
      variants,
      qty: calculateTotalQty(variants),
      images: Array.isArray(product.images) ? product.images : [],
    };
  };

  const parsePrice = (value: string | number | null | undefined) => {
    if (value === "" || value === null || value === undefined) return "";
    return String(value).replace(/\D/g, "");
  };

  const formatVND = (value: string | number | null | undefined) => {
    const numericValue = parsePrice(value);
    if (numericValue === "") return "";
    return Number(numericValue).toLocaleString("vi-VN");
  };

  const formatMoney = (value: string | number | null | undefined) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("vi-VN") : "0";
  };

  const getProductPrice = (product: Product) => {
    const { min, max } = getProductPriceRange(product);

    return min === max
      ? `${min.toLocaleString("vi-VN")}đ`
      : `${min.toLocaleString("vi-VN")}đ - ${max.toLocaleString("vi-VN")}đ`;
  };

  const getImageUrl = (filename?: string) => {
    if (!filename) return "";

    if (
      filename.startsWith("http://") ||
      filename.startsWith("https://") ||
      filename.startsWith("data:") ||
      filename.startsWith("blob:") ||
      filename.startsWith("/")
    ) {
      return filename;
    }

    return filename.startsWith("images/") ? `/${filename}` : `/images/${filename}`;
  };

  const getReservedQty = (variant: Variant) =>
    Math.max(0, Number(variant.reservedQty) || 0);

  const getAvailableQty = (variant: Variant) =>
    Math.max(0, (Number(variant.qty) || 0) - getReservedQty(variant));

  // =====================================================
  // LOAD VEHICLES
  // =====================================================

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const res = await getRequest({ url: "/vehicles" });
      const list = Array.isArray(res?.vehicles) ? res.vehicles : [];
      setVehicles(list);
    } catch (error) {
      console.error("Load vehicles error:", error);
      setVehicles([]);
    }
  };

  const vehicleOptions = useMemo(
    () =>
      vehicles
        .map((vehicle) => vehicle.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "vi")),
    [vehicles],
  );

  // =====================================================
  // LOAD CATEGORIES
  // =====================================================

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await getRequest({ url: "/categorys" });
      const list = Array.isArray(res?.categorys) ? res.categorys : [];
      setCategories(list);
    } catch (error) {
      console.error("Load categories error:", error);
      setCategories([]);
    }
  };

  // =====================================================
  // RESET WHEN CHANGE SIDEBAR
  // =====================================================

  useEffect(() => {
    setPage(1);
    setSearch("");
    setProducts([]);
    setSelectedProduct(null);
    setDirty(false);
    setSaveMessage("");
    setErrorMessage("");
  }, [pathname]);

  // =====================================================
  // LOAD PRODUCTS
  // =====================================================

  useEffect(() => {
    loadProducts();
  }, [pathname, type, page, search]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const params: Record<string, any> = {
        page,
        limit: PAGE_LIMIT,
      };

      if (type) params.type = type;
      if (search.trim()) params.search = search.trim();

      const res = await getRequest({
        url: "/products",
        params,
      });

      const list = Array.isArray(res?.products) ? res.products : [];
      setProducts(list);

      const pagination = res?.pagination || {};
      const responseTotal = Number(pagination.total) || 0;
      const responseTotalPages = Number(pagination.totalPages) || 1;

      setTotal(responseTotal || list.length);
      setTotalPages(responseTotalPages);
      setHasMore(Boolean(pagination.hasMore));

      if (list.length > 0) {
        setSelectedProduct(normalizeProduct(list[0]));
      } else {
        setSelectedProduct(null);
      }

      setDirty(false);
    } catch (error: any) {
      console.error("Load products error:", error);
      setErrorMessage(error?.message || "Không thể tải sản phẩm");
      setProducts([]);
      setSelectedProduct(null);
      setTotal(0);
      setTotalPages(1);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // SELECT PRODUCT
  // =====================================================

  const selectProduct = (product: Product) => {
    setSelectedProduct(normalizeProduct(product));
    setDirty(false);
    setSaveMessage("");
    setErrorMessage("");
  };

  // =====================================================
  // UPDATE PRODUCT
  // =====================================================

  const updateProductField = (field: string, value: any) => {
    if (!selectedProduct) return;

    setSelectedProduct({
      ...selectedProduct,
      [field]: value,
    });

    setDirty(true);
    setSaveMessage("");
    setErrorMessage("");
  };

  const changeCompatibleVehicles = (values: string[]) => {
    if (!selectedProduct) return;

    const normalized = Array.from(
      new Set(values.map((item) => String(item).trim()).filter(Boolean)),
    );

    setSelectedProduct({
      ...selectedProduct,
      compatibleVehicles: normalized,
    });

    setDirty(true);
    setSaveMessage("");
    setErrorMessage("");
  };

  // =====================================================
  // UPDATE VARIANT
  // =====================================================

  const updateVariant = (
    index: number,
    field:
      | "name"
      | "price"
      | "unitCost"
      | "qty"
      | "weight"
      | "packageQuantity"
      | "variantCode"
      | "sku",
    value: string,
  ) => {
    if (!selectedProduct) return;

    const variants = [...(selectedProduct.variants || [])];

    variants[index] = {
      ...variants[index],
      [field]: value,
    };

    setSelectedProduct({
      ...selectedProduct,
      variants,
      qty: calculateTotalQty(variants),
    });

    setDirty(true);
    setSaveMessage("");
    setErrorMessage("");
  };

  const addVariant = () => {
    if (!selectedProduct) return;

    const variants = [
      ...(selectedProduct.variants || []),
      {
        name: "",
        price: "",
        unitCost: "",
        qty: "",
        weight: "",
        packageQuantity: 1,
      },
    ];

    setSelectedProduct({
      ...selectedProduct,
      variants,
      qty: calculateTotalQty(variants),
    });

    setDirty(true);
    setSaveMessage("");
    setErrorMessage("");
  };

  const deleteVariant = (index: number) => {
    if (!selectedProduct) return;

    const variants = [...(selectedProduct.variants || [])];
    variants.splice(index, 1);

    setSelectedProduct({
      ...selectedProduct,
      variants,
      qty: calculateTotalQty(variants),
    });

    setDirty(true);
    setSaveMessage("");
    setErrorMessage("");
  };

  // =====================================================
  // CATEGORY / TYPE
  // =====================================================

  const changeCategory = (category: Category | null) => {
    if (!selectedProduct) return;

    setSelectedProduct({
      ...selectedProduct,
      categoryId: category?._id || "",
      category: category?.name || "",
    });

    setDirty(true);
    setSaveMessage("");
  };

  const changeProductType = (value: string) => {
    if (!selectedProduct) return;

    setSelectedProduct({
      ...selectedProduct,
      type: String(value),
    });

    setDirty(true);
    setSaveMessage("");
    setErrorMessage("");
  };

  const currentCategory =
    categories.find(
      (category) => category._id === selectedProduct?.categoryId,
    ) || null;

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) => String(category.type) === String(selectedProduct?.type),
      ),
    [categories, selectedProduct?.type],
  );

  // =====================================================
  // DELETE PRODUCT
  // =====================================================

  const deleteProduct = async () => {
    if (!selectedProduct?._id) return;

    const productId = selectedProduct._id;
    const productTitle = selectedProduct.title || "sản phẩm này";

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa "${productTitle}"?\n\nHành động này không thể hoàn tác.`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setSaveMessage("");
      setErrorMessage("");

      await deleteRequest({
        url: `/products/${productId}`,
      });

      setProducts((current) =>
        current.filter((product) => product._id !== productId),
      );

      setSelectedProduct(null);
      setDirty(false);
      setTotal((current) => Math.max(current - 1, 0));
      setSaveMessage(`Đã xóa sản phẩm "${productTitle}"`);
    } catch (error: any) {
      console.error("Delete product error:", error);

      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Không thể xóa sản phẩm",
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SAVE PRODUCT
  // =====================================================

  const saveProduct = async () => {
    if (!selectedProduct) return;

    const productType = String(selectedProduct.type || "");

    if (!["1", "2", "3"].includes(productType)) {
      setErrorMessage("Vui lòng chọn loại sản phẩm: 1, 2 hoặc 3");
      return;
    }

    const invalidPackageIndex = (selectedProduct.variants || []).findIndex(
      (variant) =>
        !Number.isSafeInteger(Number(variant.packageQuantity)) ||
        Number(variant.packageQuantity) < 1 ||
        variant.packageQuantity === "",
    );

    if (invalidPackageIndex !== -1) {
      setErrorMessage(
        `SL/kiện ở phân loại ${invalidPackageIndex + 1} phải là số nguyên lớn hơn 0`,
      );
      return;
    }

    try {
      setSaving(true);
      setSaveMessage("");
      setErrorMessage("");

      const variants = (selectedProduct.variants || []).map((variant) => ({
        ...(variant._id ? { _id: variant._id } : {}),

        name: variant.name || "",

        price:
          variant.price === "" ||
          variant.price === null ||
          variant.price === undefined
            ? "0"
            : parsePrice(variant.price),

        unitCost:
          variant.unitCost === "" ||
          variant.unitCost === null ||
          variant.unitCost === undefined
            ? 0
            : Number(variant.unitCost) || 0,

        qty:
          variant.qty === "" ||
          variant.qty === null ||
          variant.qty === undefined
            ? 0
            : Number(variant.qty) || 0,

        weight:
          variant.weight === "" ||
          variant.weight === null ||
          variant.weight === undefined
            ? 0
            : Number(variant.weight) || 0,

        packageQuantity: Number(variant.packageQuantity),

        // Giữ lại các mã phân loại nếu backend có lưu
        variantCode: variant.variantCode || "",
        sku: variant.sku || "",

        // Giữ giá trị đang giữ hàng nếu schema backend hỗ trợ trường này
        ...(variant.reservedQty !== undefined
          ? { reservedQty: Number(variant.reservedQty) || 0 }
          : {}),
      }));

      const finalQty = calculateTotalQty(variants);

      const finalPrice =
        selectedProduct.price === "" ||
        selectedProduct.price === null ||
        selectedProduct.price === undefined
          ? "0"
          : parsePrice(selectedProduct.price);

      const finalOriginalPrice =
        selectedProduct.originalPrice === "" ||
        selectedProduct.originalPrice === null ||
        selectedProduct.originalPrice === undefined
          ? "0"
          : parsePrice(selectedProduct.originalPrice);

      const compatibleVehicles = normalizeCompatibleVehicles(
        selectedProduct.compatibleVehicles,
      );

      const productToSave: Product = {
        ...selectedProduct,
        type: productType,
        price: finalPrice,
        originalPrice: finalOriginalPrice,
        compatibleVehicles,
        variants,
        qty: finalQty,
      };

      await patchRequest({
        url: "/products",
        data: [productToSave],
      });

      setProducts((current) =>
        current.map((product) =>
          product._id === productToSave._id ? productToSave : product,
        ),
      );

      setSelectedProduct(productToSave);
      setDirty(false);
      setSaveMessage("Đã lưu sản phẩm");
    } catch (error: any) {
      console.error("Save error:", error);
      setErrorMessage(error?.message || "Không thể lưu sản phẩm");
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  const totalQty = useMemo(
    () =>
      selectedProduct ? calculateTotalQty(selectedProduct.variants || []) : 0,
    [selectedProduct],
  );

  const totalReservedQty = useMemo(
    () =>
      (selectedProduct?.variants || []).reduce(
        (sum, variant) => sum + getReservedQty(variant),
        0,
      ),
    [selectedProduct],
  );

  const totalAvailableQty = Math.max(0, totalQty - totalReservedQty);

  const visibleCount = products.filter(
    (product) => product.isVisible !== false,
  ).length;

  const hiddenCount = products.length - visibleCount;

  const inStockCount = products.filter(
    (product) => Number(product.qty) > 0,
  ).length;

  // =====================================================
  // SMALL UI HELPERS
  // =====================================================

  const SectionHeading = ({
    icon,
    title,
    subtitle,
    action,
  }: {
    icon?: React.ReactNode;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
  }) => (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
      mb={2}
    >
      <Stack direction="row" spacing={1.2} alignItems="center">
        {icon && (
          <Box
            sx={{
              width: 34,
              height: 34,
              display: "grid",
              placeItems: "center",
              borderRadius: 2,
              bgcolor: "action.hover",
              color: "text.secondary",
            }}
          >
            {icon}
          </Box>
        )}

        <Box>
          <Typography sx={sectionTitleSx}>{title}</Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      {action}
    </Stack>
  );

  const SummaryItem = ({
    label,
    value,
    color = "text.primary",
    icon,
  }: {
    label: string;
    value: string | number;
    color?: string;
    icon: React.ReactNode;
  }) => (
    <Box
      sx={{
        p: 1.7,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2.5,
        minWidth: 0,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
        <Typography variant="caption" color="text.secondary" noWrap>
          {label}
        </Typography>
      </Stack>

      <Typography
        variant="h5"
        fontWeight={800}
        color={color}
        sx={{ lineHeight: 1.2 }}
      >
        {value}
      </Typography>
    </Box>
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1900,
        mx: "auto",
        pb: 4,
      }}
    >
      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Stack direction="row" spacing={1.2} alignItems="center" mb={0.5}>
            <Box
              sx={{
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                borderRadius: 2.5,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <Inventory2Icon />
            </Box>

            <Box>
              <Typography
                variant="h5"
                fontWeight={900}
                sx={{ letterSpacing: "-0.6px" }}
              >
                Quản lý sản phẩm
              </Typography>

              <Typography variant="body2" color="text.secondary">
                NHẬT KHANG BIKE · {typeName}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip
            icon={<Inventory2OutlinedIcon />}
            label={`${total.toLocaleString("vi-VN")} sản phẩm`}
            variant="outlined"
          />

          {dirty && (
            <Chip
              label="Có thay đổi chưa lưu"
              color="warning"
              variant="filled"
            />
          )}

          <Button
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress size={17} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={!selectedProduct || !dirty || saving}
            onClick={saveProduct}
            sx={{
              borderRadius: 2,
              px: 2.2,
              fontWeight: 700,
              minHeight: 40,
            }}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </Stack>
      </Stack>

      {/* =================================================
          ALERTS
      ================================================= */}

      {saveMessage && (
        <Alert
          severity="success"
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setSaveMessage("")}
        >
          {saveMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setErrorMessage("")}
        >
          {errorMessage}
        </Alert>
      )}

      {/* =================================================
          SUMMARY
      ================================================= */}

      <Grid container spacing={1.5} mb={2.5}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryItem
            label="Sản phẩm trên trang"
            value={products.length}
            icon={<Inventory2OutlinedIcon fontSize="small" />}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryItem
            label="Còn hàng"
            value={inStockCount}
            color="success.main"
            icon={<CategoryOutlinedIcon fontSize="small" />}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryItem
            label="Đang hiển thị"
            value={visibleCount}
            color="primary.main"
            icon={<VisibilityOutlinedIcon fontSize="small" />}
          />
        </Grid>

        <Grid size={{ xs: 6, sm: 3 }}>
          <SummaryItem
            label="Đang ẩn"
            value={hiddenCount}
            color="text.secondary"
            icon={<EditOutlinedIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      {/* =================================================
          MAIN LAYOUT
      ================================================= */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "350px minmax(0, 1fr)",
            xl: "390px minmax(0, 1fr)",
          },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* =================================================
            LEFT: PRODUCT LIST
        ================================================= */}

        <Card sx={panelSx}>
          <Box sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1.5}
            >
              <Box>
                <Typography fontWeight={800}>Danh sách sản phẩm</Typography>
                <Typography variant="caption" color="text.secondary">
                  Chọn sản phẩm để chỉnh sửa
                </Typography>
              </Box>

              <Chip
                size="small"
                label={total}
                color="primary"
                variant="outlined"
              />
            </Stack>

            <TextField
              fullWidth
              size="small"
              placeholder="Tìm tên, mã hoặc thương hiệu..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "action.hover",
                },
              }}
            />
          </Box>

          <Divider />

          {loading ? (
            <Box
              sx={{
                minHeight: 300,
                display: "grid",
                placeItems: "center",
              }}
            >
              <Stack alignItems="center" spacing={1.5}>
                <CircularProgress size={28} />
                <Typography variant="body2" color="text.secondary">
                  Đang tải sản phẩm...
                </Typography>
              </Stack>
            </Box>
          ) : products.length === 0 ? (
            <Box sx={{ py: 8, px: 2, textAlign: "center" }}>
              <Inventory2OutlinedIcon
                sx={{ fontSize: 42, color: "text.disabled", mb: 1 }}
              />
              <Typography fontWeight={700}>Không có sản phẩm</Typography>
              <Typography variant="body2" color="text.secondary">
                Thử thay đổi từ khóa tìm kiếm
              </Typography>
            </Box>
          ) : (
            <List
              disablePadding
              sx={{
                maxHeight: {
                  xs: 520,
                  lg: "calc(100vh - 300px)",
                },
                overflowY: "auto",
                "&::-webkit-scrollbar": { width: 6 },
                "&::-webkit-scrollbar-thumb": {
                  bgcolor: "divider",
                  borderRadius: 5,
                },
              }}
            >
              {products.map((product) => {
                const active = selectedProduct?._id === product._id;
                const qty = Number(product.qty) || 0;

                return (
                  <ListItemButton
                    key={product._id}
                    selected={active}
                    onClick={() => selectProduct(product)}
                    sx={{
                      px: 1.7,
                      py: 1.5,
                      alignItems: "flex-start",
                      gap: 1.4,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      borderLeft: "3px solid",
                      borderLeftColor: active ? "primary.main" : "transparent",
                      bgcolor: active ? "action.selected" : "transparent",
                      "&.Mui-selected": {
                        bgcolor: "action.selected",
                      },
                      "&.Mui-selected:hover": {
                        bgcolor: "action.selected",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 68,
                        height: 68,
                        flexShrink: 0,
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "action.hover",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {product.thumbnail ? (
                        <Box
                          component="img"
                          src={getImageUrl(product.thumbnail)}
                          alt={product.title}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <Inventory2OutlinedIcon color="disabled" />
                      )}
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        fontWeight={active ? 800 : 650}
                        fontSize={13.5}
                        lineHeight={1.4}
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {product.title || "Chưa có tên sản phẩm"}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        noWrap
                        mt={0.35}
                      >
                        {product.code || "Chưa có mã"}
                        {product.brand ? ` · ${product.brand}` : ""}
                      </Typography>

                      <Typography
                        fontWeight={800}
                        fontSize={12.5}
                        color="primary.main"
                        mt={0.5}
                      >
                        {getProductPrice(product)}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={0.7}
                        alignItems="center"
                        mt={0.8}
                        flexWrap="wrap"
                      >
                        <Chip
                          size="small"
                          label={`Tồn: ${qty}`}
                          color={qty > 0 ? "success" : "error"}
                          sx={{
                            height: 21,
                            fontSize: 10.5,
                            fontWeight: 700,
                          }}
                        />

                        <Chip
                          size="small"
                          label={
                            product.isVisible === false ? "Đang ẩn" : "Hiển thị"
                          }
                          color={
                            product.isVisible === false ? "default" : "info"
                          }
                          variant="outlined"
                          sx={{ height: 21, fontSize: 10.5 }}
                        />
                      </Stack>
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          )}

          <Divider />

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ p: 1.3 }}
          >
            <Button
              size="small"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              sx={{ borderRadius: 2 }}
            >
              ← Trước
            </Button>

            <Box textAlign="center">
              <Typography variant="caption" fontWeight={800} display="block">
                {page} / {totalPages}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Trang
              </Typography>
            </Box>

            <Button
              size="small"
              disabled={!hasMore || loading}
              onClick={() => setPage((current) => current + 1)}
              sx={{ borderRadius: 2 }}
            >
              Sau →
            </Button>
          </Stack>
        </Card>

        {/* =================================================
            RIGHT: PRODUCT EDITOR
        ================================================= */}

        <Box sx={{ minWidth: 0 }}>
          {!selectedProduct ? (
            <Card sx={panelSx}>
              <Box
                sx={{
                  minHeight: 460,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  p: 3,
                }}
              >
                <Box
                  sx={{
                    width: 76,
                    height: 76,
                    borderRadius: 4,
                    bgcolor: "action.hover",
                    display: "grid",
                    placeItems: "center",
                    mb: 2,
                  }}
                >
                  <Inventory2OutlinedIcon
                    sx={{ fontSize: 36, color: "text.disabled" }}
                  />
                </Box>

                <Typography variant="h6" fontWeight={800}>
                  Chưa chọn sản phẩm
                </Typography>

                <Typography color="text.secondary" variant="body2">
                  Chọn một sản phẩm ở danh sách bên trái để bắt đầu chỉnh sửa.
                </Typography>
              </Box>
            </Card>
          ) : (
            <Stack spacing={2}>
              {/* PRODUCT EDIT HEADER */}

              <Card sx={panelSx}>
                <Box sx={{ p: 2.2 }}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "center" }}
                  >
                    <Box
                      sx={{
                        width: 86,
                        height: 86,
                        flexShrink: 0,
                        borderRadius: 2.5,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "action.hover",
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {selectedProduct.thumbnail ? (
                        <Box
                          component="img"
                          src={getImageUrl(selectedProduct.thumbnail)}
                          alt={selectedProduct.title}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <ImageIcon
                          sx={{ fontSize: 32, color: "text.disabled" }}
                        />
                      )}
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        mb={0.6}
                      >
                        <Typography
                          variant="h6"
                          fontWeight={900}
                          sx={{
                            letterSpacing: "-0.4px",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {selectedProduct.title || "Sản phẩm chưa có tên"}
                        </Typography>

                        {dirty && (
                          <Chip size="small" color="warning" label="Chưa lưu" />
                        )}
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        Mã sản phẩm: {selectedProduct.code || "Chưa có mã"}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={0.8}
                        flexWrap="wrap"
                        mt={1}
                      >
                        <Chip
                          size="small"
                          label={
                            TYPE_NAME[selectedProduct.type || ""] ||
                            "Chưa phân loại"
                          }
                          color="primary"
                          variant="outlined"
                        />

                        <Chip
                          size="small"
                          label={
                            selectedProduct.isVisible === false
                              ? "Đang ẩn"
                              : "Đang hiển thị"
                          }
                          color={
                            selectedProduct.isVisible === false
                              ? "default"
                              : "success"
                          }
                        />
                      </Stack>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent={{ xs: "flex-end", md: "flex-end" }}
                    >
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        disabled={saving}
                        onClick={deleteProduct}
                        sx={{ borderRadius: 2, whiteSpace: "nowrap" }}
                      >
                        Xóa
                      </Button>

                      <Button
                        variant="contained"
                        startIcon={
                          saving ? (
                            <CircularProgress size={17} color="inherit" />
                          ) : (
                            <SaveIcon />
                          )
                        }
                        disabled={saving || !dirty}
                        onClick={saveProduct}
                        sx={{ borderRadius: 2, whiteSpace: "nowrap" }}
                      >
                        {saving ? "Đang lưu" : "Lưu"}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              </Card>

              {/* PRODUCT SUMMARY */}

              <Grid container spacing={1.5}>
                <Grid size={{ xs: 4 }}>
                  <SummaryItem
                    label="Tổng tồn"
                    value={totalQty.toLocaleString("vi-VN")}
                    color="success.main"
                    icon={<Inventory2OutlinedIcon fontSize="small" />}
                  />
                </Grid>

                <Grid size={{ xs: 4 }}>
                  <SummaryItem
                    label="Đang giữ"
                    value={totalReservedQty.toLocaleString("vi-VN")}
                    color="warning.main"
                    icon={<LocalShippingOutlinedIcon fontSize="small" />}
                  />
                </Grid>

                <Grid size={{ xs: 4 }}>
                  <SummaryItem
                    label="Khả dụng"
                    value={totalAvailableQty.toLocaleString("vi-VN")}
                    color="primary.main"
                    icon={<CategoryOutlinedIcon fontSize="small" />}
                  />
                </Grid>
              </Grid>

              {/* BASIC INFORMATION */}

              <Card sx={panelSx}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <SectionHeading
                    icon={<EditOutlinedIcon fontSize="small" />}
                    title="Thông tin sản phẩm"
                    subtitle="Tên, mã, thương hiệu và danh mục"
                  />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Tên sản phẩm"
                        value={selectedProduct.title || ""}
                        onChange={(event) =>
                          updateProductField("title", event.target.value)
                        }
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Thương hiệu"
                        value={selectedProduct.brand || ""}
                        onChange={(event) =>
                          updateProductField("brand", event.target.value)
                        }
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Mã sản phẩm"
                        value={selectedProduct.code || ""}
                        onChange={(event) =>
                          updateProductField("code", event.target.value)
                        }
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Autocomplete
                        multiple
                        freeSolo
                        options={vehicleOptions}
                        value={selectedProduct.compatibleVehicles || []}
                        onChange={(_, newValue) =>
                          changeCompatibleVehicles(newValue as string[])
                        }
                        filterSelectedOptions
                        noOptionsText="Chưa có xe phù hợp"
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Xe tương thích"
                            placeholder="Tìm hoặc nhập tên xe..."
                            helperText="Có thể chọn nhiều xe hoặc nhập tên xe mới."
                          />
                        )}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        select
                        fullWidth
                        required
                        label="Loại sản phẩm"
                        value={selectedProduct.type || ""}
                        onChange={(event) =>
                          changeProductType(event.target.value)
                        }
                      >
                        <MenuItem value="">Chọn loại sản phẩm</MenuItem>
                        <MenuItem value="1">Phụ tùng xe đạp</MenuItem>
                        <MenuItem value="2">Phụ tùng xe điện</MenuItem>
                        <MenuItem value="3">Phụ tùng xe ba gác</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Autocomplete
                        options={filteredCategories}
                        value={currentCategory}
                        getOptionLabel={(option) => option.name || ""}
                        isOptionEqualToValue={(option, value) =>
                          option._id === value._id
                        }
                        onChange={(_, value) => changeCategory(value)}
                        noOptionsText="Không có danh mục thuộc loại này"
                        renderInput={(params) => (
                          <TextField {...params} label="Danh mục sản phẩm" />
                        )}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Giá mặc định"
                        value={formatVND(selectedProduct.price)}
                        onChange={(event) =>
                          updateProductField(
                            "price",
                            parsePrice(event.target.value),
                          )
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">₫</InputAdornment>
                          ),
                        }}
                        inputProps={{ inputMode: "numeric" }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Giá cũ"
                        value={formatVND(selectedProduct.originalPrice)}
                        onChange={(event) =>
                          updateProductField(
                            "originalPrice",
                            parsePrice(event.target.value),
                          )
                        }
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">₫</InputAdornment>
                          ),
                        }}
                        inputProps={{ inputMode: "numeric" }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                      <Box
                        sx={{
                          px: 1.8,
                          py: 1.2,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "action.hover",
                        }}
                      >
                        <FormControlLabel
                          sx={{ m: 0 }}
                          control={
                            <Switch
                              checked={selectedProduct.isVisible !== false}
                              onChange={(event) =>
                                updateProductField(
                                  "isVisible",
                                  event.target.checked,
                                )
                              }
                            />
                          }
                          label={
                            <Box>
                              <Typography fontWeight={700} fontSize={13}>
                                Hiển thị sản phẩm trên cửa hàng
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {selectedProduct.isVisible !== false
                                  ? "Khách hàng có thể nhìn thấy sản phẩm."
                                  : "Sản phẩm đang được ẩn khỏi cửa hàng."}
                              </Typography>
                            </Box>
                          }
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* VARIANTS */}

              <Card sx={panelSx}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <SectionHeading
                    icon={<CategoryOutlinedIcon fontSize="small" />}
                    title="Phân loại sản phẩm"
                    subtitle="Quản lý mã SKU, giá bán, giá vốn và tồn kho"
                    action={
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={addVariant}
                        sx={{ borderRadius: 2, whiteSpace: "nowrap" }}
                      >
                        Thêm phân loại
                      </Button>
                    }
                  />

                  {(selectedProduct.variants || []).length === 0 ? (
                    <Box
                      sx={{
                        py: 4,
                        textAlign: "center",
                        border: "1px dashed",
                        borderColor: "divider",
                        borderRadius: 2.5,
                      }}
                    >
                      <CategoryOutlinedIcon
                        sx={{ fontSize: 34, color: "text.disabled", mb: 1 }}
                      />
                      <Typography fontWeight={700}>
                        Chưa có phân loại
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        mb={1.5}
                      >
                        Thêm phân loại để quản lý giá và tồn kho riêng.
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={addVariant}
                      >
                        Thêm phân loại đầu tiên
                      </Button>
                    </Box>
                  ) : (
                    <Stack spacing={2}>
                      {(selectedProduct.variants || []).map(
                        (variant, index) => {
                          const qty = Math.max(0, Number(variant.qty) || 0);
                          const reserved = getReservedQty(variant);
                          const available = getAvailableQty(variant);
                          const perPackage = Number(
                            variant.packageQuantity ?? 1,
                          );

                          const validPackage =
                            Number.isSafeInteger(perPackage) && perPackage >= 1;

                          return (
                            <Box
                              key={variant._id || variant.id || index}
                              sx={{
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: 2.5,
                                overflow: "hidden",
                              }}
                            >
                              {/* VARIANT HEADER */}

                              <Box
                                sx={{
                                  px: 2,
                                  py: 1.3,
                                  bgcolor: "action.hover",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                  flexWrap="wrap"
                                >
                                  <Box
                                    sx={{
                                      width: 27,
                                      height: 27,
                                      borderRadius: 1.5,
                                      display: "grid",
                                      placeItems: "center",
                                      bgcolor: "primary.main",
                                      color: "primary.contrastText",
                                      fontSize: 12,
                                      fontWeight: 800,
                                    }}
                                  >
                                    {index + 1}
                                  </Box>

                                  <Typography fontWeight={800} fontSize={13.5}>
                                    {variant.name || `Phân loại ${index + 1}`}
                                  </Typography>

                                  {variant.variantCode && (
                                    <Chip
                                      size="small"
                                      label={variant.variantCode}
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>

                                <IconButton
                                  size="small"
                                  color="error"
                                  title="Xóa phân loại"
                                  onClick={() => deleteVariant(index)}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Box>

                              <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                                <Stack spacing={2}>
                                  {/* IDENTIFIERS */}

                                  <Box>
                                    <Typography
                                      variant="overline"
                                      color="text.secondary"
                                      fontWeight={800}
                                      sx={{ lineHeight: 2.5 }}
                                    >
                                      THÔNG TIN ĐỊNH DANH
                                    </Typography>

                                    <Grid container spacing={1.5}>
                                      <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label="Tên phân loại"
                                          placeholder="VD: 20*50"
                                          value={variant.name || ""}
                                          onChange={(event) =>
                                            updateVariant(
                                              index,
                                              "name",
                                              event.target.value,
                                            )
                                          }
                                        />
                                      </Grid>

                                      <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label="Variant Code"
                                          placeholder="VD: NK000001"
                                          value={variant.variantCode || ""}
                                          onChange={(event) =>
                                            updateVariant(
                                              index,
                                              "variantCode",
                                              event.target.value,
                                            )
                                          }
                                          helperText="Mã định danh nội bộ"
                                        />
                                      </Grid>

                                      <Grid size={{ xs: 12, md: 4 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label="SKU"
                                          placeholder="VD: 30205"
                                          value={variant.sku || ""}
                                          onChange={(event) =>
                                            updateVariant(
                                              index,
                                              "sku",
                                              event.target.value,
                                            )
                                          }
                                          helperText="Mã đối chiếu Shopee"
                                        />
                                      </Grid>
                                    </Grid>
                                  </Box>

                                  <Divider />

                                  {/* PRICING AND STOCK */}

                                  <Box>
                                    <Typography
                                      variant="overline"
                                      color="text.secondary"
                                      fontWeight={800}
                                      sx={{ lineHeight: 2.5 }}
                                    >
                                      GIÁ VÀ TỒN KHO
                                    </Typography>

                                    <Grid container spacing={1.5}>
                                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label="Giá bán"
                                          value={formatVND(variant.price)}
                                          onChange={(event) =>
                                            updateVariant(
                                              index,
                                              "price",
                                              parsePrice(event.target.value),
                                            )
                                          }
                                          InputProps={{
                                            endAdornment: (
                                              <InputAdornment position="end">
                                                ₫
                                              </InputAdornment>
                                            ),
                                          }}
                                          inputProps={{
                                            inputMode: "numeric",
                                          }}
                                        />
                                      </Grid>

                                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          label="Giá vốn"
                                          value={variant.unitCost ?? ""}
                                          onChange={(event) =>
                                            updateVariant(
                                              index,
                                              "unitCost",
                                              event.target.value,
                                            )
                                          }
                                          InputProps={{
                                            endAdornment: (
                                              <InputAdornment position="end">
                                                ¥
                                              </InputAdornment>
                                            ),
                                          }}
                                          inputProps={{
                                            inputMode: "decimal",
                                          }}
                                        />
                                      </Grid>

                                      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          type="number"
                                          label="Cân nặng"
                                          value={variant.weight ?? ""}
                                          onChange={(event) =>
                                            updateVariant(
                                              index,
                                              "weight",
                                              event.target.value,
                                            )
                                          }
                                          inputProps={{
                                            min: 0,
                                            step: 0.001,
                                          }}
                                          InputProps={{
                                            endAdornment: (
                                              <InputAdornment position="end">
                                                kg
                                              </InputAdornment>
                                            ),
                                          }}
                                        />
                                      </Grid>

                                      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          type="number"
                                          label="Tồn kho"
                                          value={variant.qty ?? ""}
                                          onChange={(event) =>
                                            updateVariant(
                                              index,
                                              "qty",
                                              event.target.value,
                                            )
                                          }
                                          inputProps={{ min: 0 }}
                                        />
                                      </Grid>

                                      <Grid size={{ xs: 12, sm: 4, md: 2 }}>
                                        <TextField
                                          fullWidth
                                          size="small"
                                          type="number"
                                          label="SL / kiện"
                                          value={variant.packageQuantity ?? 1}
                                          onChange={(event) =>
                                            updateVariant(
                                              index,
                                              "packageQuantity",
                                              event.target.value,
                                            )
                                          }
                                          inputProps={{
                                            min: 1,
                                            step: 1,
                                          }}
                                          error={
                                            variant.packageQuantity === "" ||
                                            !validPackage
                                          }
                                          helperText="Cái / kiện"
                                        />
                                      </Grid>
                                    </Grid>
                                  </Box>

                                  {/* STOCK STATUS */}

                                  <Box
                                    sx={{
                                      p: 1.5,
                                      borderRadius: 2,
                                      bgcolor: "action.hover",
                                    }}
                                  >
                                    <Grid container spacing={1.5}>
                                      <Grid size={{ xs: 4 }}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          display="block"
                                        >
                                          Tồn thực tế
                                        </Typography>
                                        <Typography
                                          fontWeight={900}
                                          color="text.primary"
                                        >
                                          {qty.toLocaleString("vi-VN")}
                                        </Typography>
                                      </Grid>

                                      <Grid size={{ xs: 4 }}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          display="block"
                                        >
                                          Đang giữ
                                        </Typography>
                                        <Typography
                                          fontWeight={900}
                                          color="warning.main"
                                        >
                                          {reserved.toLocaleString("vi-VN")}
                                        </Typography>
                                      </Grid>

                                      <Grid size={{ xs: 4 }}>
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          display="block"
                                        >
                                          Khả dụng
                                        </Typography>
                                        <Typography
                                          fontWeight={900}
                                          color="success.main"
                                        >
                                          {available.toLocaleString("vi-VN")}
                                        </Typography>
                                      </Grid>
                                    </Grid>

                                    <Divider sx={{ my: 1.3 }} />

                                    <Stack
                                      direction={{
                                        xs: "column",
                                        sm: "row",
                                      }}
                                      justifyContent="space-between"
                                      spacing={0.5}
                                    >
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        Quy cách đóng gói
                                      </Typography>

                                      {validPackage ? (
                                        <Typography
                                          variant="body2"
                                          fontWeight={700}
                                        >
                                          {Math.floor(qty / perPackage)} kiện +{" "}
                                          {qty % perPackage} cái lẻ
                                          <Typography
                                            component="span"
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ ml: 1 }}
                                          >
                                            ({qty} sản phẩm)
                                          </Typography>
                                        </Typography>
                                      ) : (
                                        <Typography
                                          variant="body2"
                                          color="error"
                                          fontWeight={700}
                                        >
                                          SL/kiện chưa hợp lệ
                                        </Typography>
                                      )}
                                    </Stack>
                                  </Box>
                                </Stack>
                              </Box>
                            </Box>
                          );
                        },
                      )}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              {/* SHOPEE MAPPING */}
              <Card sx={panelSx}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <SectionHeading icon={<CategoryOutlinedIcon fontSize="small" />} title="Liên kết Shopee" subtitle="Nhập Item ID để website lấy đúng đánh giá của sản phẩm này" />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label="Shopee Item ID" value={selectedProduct.shopeeItemId || ""} onChange={(event) => updateProductField("shopeeItemId", event.target.value)} helperText="ID sản phẩm trong gian hàng Shopee" />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField fullWidth label="Shopee Shop ID" value={selectedProduct.shopeeShopId || ""} onChange={(event) => updateProductField("shopeeShopId", event.target.value)} helperText="Để trống nếu chỉ có một gian hàng" />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* DESCRIPTION */}

              <Card sx={panelSx}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <SectionHeading
                    icon={<EditOutlinedIcon fontSize="small" />}
                    title="Mô tả sản phẩm"
                    subtitle="Nội dung giới thiệu sản phẩm trên cửa hàng"
                  />

                  <TextField
                    fullWidth
                    multiline
                    minRows={5}
                    placeholder="Nhập mô tả sản phẩm..."
                    value={selectedProduct.description || ""}
                    onChange={(event) =>
                      updateProductField("description", event.target.value)
                    }
                  />
                </CardContent>
              </Card>

              {/* IMAGES */}

              <Card sx={panelSx}>
                <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                  <SectionHeading
                    icon={<ImageIcon fontSize="small" />}
                    title="Hình ảnh sản phẩm"
                    subtitle="Ảnh được lấy từ public/images/ hoặc URL"
                  />

                  {/* THUMBNAIL */}

                  <Box
                    sx={{
                      p: 1.8,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2.5,
                      mb: 2,
                    }}
                  >
                    <Typography fontWeight={800} fontSize={13.5} mb={1.5}>
                      Ảnh đại diện
                    </Typography>

                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                        <Box
                          sx={{
                            height: 170,
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 2,
                            bgcolor: "action.hover",
                            overflow: "hidden",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {selectedProduct.thumbnail ? (
                            <Box
                              component="img"
                              src={getImageUrl(selectedProduct.thumbnail)}
                              alt={selectedProduct.title}
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                              }}
                            />
                          ) : (
                            <Stack alignItems="center" spacing={0.5}>
                              <ImageIcon
                                sx={{ fontSize: 30, color: "text.disabled" }}
                              />
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Chưa có ảnh
                              </Typography>
                            </Stack>
                          )}
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 8, md: 9 }}>
                        <TextField
                          fullWidth
                          label="Tên file ảnh hoặc URL"
                          placeholder="6205zz.jpg"
                          value={selectedProduct.thumbnail || ""}
                          onChange={(event) =>
                            updateProductField("thumbnail", event.target.value)
                          }
                          helperText="Ví dụ: 6205zz.jpg hoặc https://example.com/image.jpg"
                        />

                        <Box
                          sx={{
                            mt: 1.5,
                            p: 1.2,
                            borderRadius: 1.5,
                            bgcolor: "action.hover",
                            overflowWrap: "anywhere",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            mb={0.3}
                          >
                            Đường dẫn ảnh
                          </Typography>
                          <Typography variant="body2">
                            {selectedProduct.thumbnail
                              ? getImageUrl(selectedProduct.thumbnail)
                              : "Chưa có ảnh đại diện"}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* OTHER IMAGES */}

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1}
                    mb={1.5}
                  >
                    <Box>
                      <Typography fontWeight={800} fontSize={13.5}>
                        Bộ sưu tập hình ảnh
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedProduct.images?.length || 0} hình ảnh
                      </Typography>
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() =>
                        updateProductField("images", [
                          ...(selectedProduct.images || []),
                          "",
                        ])
                      }
                      sx={{ borderRadius: 2 }}
                    >
                      Thêm ảnh
                    </Button>
                  </Stack>

                  <Stack spacing={1.5}>
                    {(selectedProduct.images || []).map((image, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                        }}
                      >
                        <Grid container spacing={1.5} alignItems="center">
                          <Grid size={{ xs: 4, sm: 2 }}>
                            <Box
                              sx={{
                                height: 86,
                                borderRadius: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "action.hover",
                                overflow: "hidden",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              {image ? (
                                <Box
                                  component="img"
                                  src={getImageUrl(image)}
                                  alt={`Ảnh ${index + 1}`}
                                  sx={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain",
                                  }}
                                />
                              ) : (
                                <ImageIcon color="disabled" />
                              )}
                            </Box>
                          </Grid>

                          <Grid size={{ xs: 7, sm: 9 }}>
                            <TextField
                              fullWidth
                              size="small"
                              label={`Đường dẫn ảnh ${index + 1}`}
                              placeholder="6205zz-1.jpg"
                              value={image}
                              onChange={(event) => {
                                const images = [
                                  ...(selectedProduct.images || []),
                                ];
                                images[index] = event.target.value;
                                updateProductField("images", images);
                              }}
                            />
                          </Grid>

                          <Grid
                            size={{ xs: 1, sm: 1 }}
                            sx={{ display: "flex", justifyContent: "center" }}
                          >
                            <IconButton
                              color="error"
                              size="small"
                              title="Xóa ảnh"
                              onClick={() => {
                                const images = [
                                  ...(selectedProduct.images || []),
                                ];
                                images.splice(index, 1);
                                updateProductField("images", images);
                              }}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}

                    {(selectedProduct.images || []).length === 0 && (
                      <Box
                        sx={{
                          py: 3.5,
                          textAlign: "center",
                          border: "1px dashed",
                          borderColor: "divider",
                          borderRadius: 2,
                        }}
                      >
                        <ImageIcon
                          sx={{ fontSize: 30, color: "text.disabled", mb: 0.5 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Chưa có hình ảnh phụ
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>

              {/* BOTTOM ACTION BAR */}

              <Card
                sx={{
                  ...panelSx,
                  position: { lg: "sticky" },
                  bottom: { lg: 12 },
                  zIndex: 2,
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Box>
                    {dirty ? (
                      <>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          color="warning.main"
                        >
                          Bạn có thay đổi chưa lưu
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Hãy lưu để cập nhật thông tin sản phẩm.
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" fontWeight={800}>
                          Dữ liệu đã được đồng bộ
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Chưa có thay đổi mới.
                        </Typography>
                      </>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineIcon />}
                      disabled={saving}
                      onClick={deleteProduct}
                      sx={{ borderRadius: 2 }}
                    >
                      Xóa sản phẩm
                    </Button>

                    <Button
                      variant="contained"
                      size="large"
                      startIcon={
                        saving ? (
                          <CircularProgress size={17} color="inherit" />
                        ) : (
                          <SaveIcon />
                        )
                      }
                      disabled={saving || !dirty}
                      onClick={saveProduct}
                      sx={{
                        borderRadius: 2,
                        px: 3,
                        fontWeight: 800,
                      }}
                    >
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </Stack>
                </Box>
              </Card>
            </Stack>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Products;
