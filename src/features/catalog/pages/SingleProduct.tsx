import { FC, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../redux/hooks";
import { addToCart, setCartState } from "../../../redux/features/cartSlice";
import { addToWishlist } from "../../../redux/features/productSlice";
import { updateLoading } from "../../../redux/features/homeSlice";

import { Product } from "../../../models/Product";
import RatingStar from "../../../components/RatingStar";
import PriceSection from "../../../components/PriceSection";
import ProductList from "../../../components/ProductList";

import toast from "react-hot-toast";

import { AiOutlineShoppingCart } from "react-icons/ai";

import {
  FaHandHoldingDollar,
  FaChevronLeft,
  FaXmark,
  FaCheck,
} from "react-icons/fa6";

import {
  MdFavoriteBorder,
  MdOutlineInventory2,
  MdLocalShipping,
} from "react-icons/md";

import useAuth from "../../../hooks/useAuth";
import { API_ENDPOINTS } from "../../../api";

/* =====================================================
   VARIANT
===================================================== */

interface ShopeeReviewItem {
  commentId: string;
  customerName?: string;
  rating: number;
  content?: string;
  reviewCreatedAt?: string | null;
  images?: string[];
  videos?: string[];
  shopeeReply?: string;
  variantCode?: string;
  variantName?: string;
  variationSku?: string;
}

interface ShopeeReviewResponse {
  summary?: {
    averageRating?: number;
    total?: number;
    breakdown?: Record<number, number>;
  };
  pagination?: { hasMore?: boolean };
  data?: ShopeeReviewItem[];
}

interface ProductVariant {
  _id?: string;
  id?: string;

  name?: string;
  value?: string;
  label?: string;

  price?: number | string;
  qty?: number | string;

  code?: string;
  sku?: string;
  reservedQty?: number | string;
  thumbnail?: string;
  image?: string;
}

/* =====================================================
   TOKEN
===================================================== */

const getToken = () => {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("adminToken") ||
    ""
  );
};
const getAvailableQty = (
  qty: number | string | undefined,
  reservedQty: number | string | undefined,
) => {
  const total = Math.max(0, Number(qty) || 0);
  const reserved = Math.max(0, Number(reservedQty) || 0);

  return Math.max(0, total - reserved);
};
/* =====================================================
   COMPONENT
===================================================== */

const SingleProduct: FC = () => {
  const dispatch = useAppDispatch();

  const { productID } = useParams();
  const navigate = useNavigate();

  const { requireAuth } = useAuth();

  /* ===================================================
     REDUX
  =================================================== */

  const isLoading = useAppSelector((state) => state.homeReducer.isLoading);

  /*
   * Lấy setting từ Redux
   *
   * Nếu chưa load settings thì mặc định true
   * để sản phẩm vẫn hiển thị giá.
   */
  const showPrice = useAppSelector(
    (state) => state.settings.settings.websiteSettings.showPrice,
  );
  /* ===================================================
     PRODUCT
  =================================================== */

  const [product, setProduct]: any = useState(null);

  const [imgs, setImgs] = useState<string[]>([]);

  const [selectedImg, setSelectedImg] = useState<string>();

  const [similar, setSimilar] = useState<Product[]>([]);
  const [reviewData, setReviewData] = useState<ShopeeReviewResponse | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewRatingFilter, setReviewRatingFilter] = useState(0);
  const [reviewPage, setReviewPage] = useState(1);

  /* ===================================================
     VARIANT
  =================================================== */

  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);

  /* ===================================================
     ZOOM
  =================================================== */

  const [isZooming, setIsZooming] = useState(false);

  const [zoomPosition, setZoomPosition] = useState({
    x: 50,
    y: 50,
  });

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  /* ===================================================
     IMAGE URL
  =================================================== */

  const getImageUrl = (image?: string) => {
    if (!image) {
      return "/images/no-image.jpg";
    }

    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("/")
    ) {
      return image;
    }

    return `/images/${image}`;
  };

  /* ===================================================
     SCROLL TOP
  =================================================== */

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productID]);

  /* ===================================================
     GET PRODUCT
  =================================================== */

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        dispatch(updateLoading(true));

        const token = getToken();

        const response = await fetch(
          `${API_ENDPOINTS.PRODUCTS_ID.replace(":id", productID || "")}`,
          {
            method: "GET",

            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                }
              : {
                  "Content-Type": "application/json",
                },
          },
        );

        if (!response.ok) {
          throw new Error("Không thể lấy thông tin sản phẩm");
        }

        const data = await response.json();

        const pro = {
          ...data,
          id: data._id,
        };

        setProduct(pro);

        const productImages = Array.isArray(data.images) ? data.images : [];

        setImgs(productImages);

        setSelectedImg(data.thumbnail || productImages?.[0] || undefined);

        /*
         * Luôn chọn variant đầu tiên
         */
        setSelectedVariantIndex(0);
      } catch (error) {
        console.error("Lỗi lấy sản phẩm:", error);

        toast.error("Không thể tải sản phẩm");
      } finally {
        dispatch(updateLoading(false));
      }
    };

    if (productID) {
      fetchProductDetails();
    }
  }, [productID, dispatch]);

  useEffect(() => {
    setReviewPage(1);
    setReviewData(null);
  }, [productID]);

  /* ===================================================
     SHOPEE REVIEWS
  =================================================== */

  useEffect(() => {
    if (!productID) return;
    const controller = new AbortController();
    const loadReviews = async () => {
      try {
        setReviewLoading(true);
        const params = new URLSearchParams({ page: String(reviewPage), limit: "10" });
        if (reviewRatingFilter) params.set("rating", String(reviewRatingFilter));
        const response = await fetch(
          `${API_ENDPOINTS.PRODUCTS}/${productID}/reviews?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Không thể tải đánh giá");
        const nextData = await response.json();
        setReviewData((previous) =>
          reviewPage === 1
            ? nextData
            : { ...nextData, data: [...(previous?.data || []), ...(nextData.data || [])] },
        );
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== "AbortError") {
          console.error("Load Shopee reviews error:", error);
          setReviewData(null);
        }
      } finally {
        if (!controller.signal.aborted) setReviewLoading(false);
      }
    };
    loadReviews();
    return () => controller.abort();
  }, [productID, reviewRatingFilter, reviewPage]);

  /* ===================================================
     SIMILAR PRODUCTS
  =================================================== */

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        if (!product?.categoryId) return;

        const token = getToken();

        const response = await fetch(
          `${API_ENDPOINTS.PRODUCTS_CATEGORY_ID.replace(
            ":id",
            product.categoryId,
          )}`,
          {
            method: "GET",

            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                }
              : {
                  "Content-Type": "application/json",
                },
          },
        );

        if (!response.ok) return;

        const data = await response.json();

        const products = (data.products || [])
          .map((item: any) => ({
            ...item,
            id: item._id,
          }))
          .filter((item: any) => item.id !== productID);

        setSimilar(products);
      } catch (error) {
        console.error("Lỗi lấy sản phẩm tương tự:", error);
      }
    };

    fetchPreferences();
  }, [product?.categoryId, productID]);

  /* ===================================================
     VARIANTS
  =================================================== */

  const variants: ProductVariant[] = Array.isArray(product?.variants)
    ? product.variants
    : [];

  const hasVariants = variants.length > 0;

  const selectedVariant = hasVariants
    ? variants[selectedVariantIndex] || variants[0]
    : null;

  /* ===================================================
     VARIANT NAME
  =================================================== */

  const getVariantName = (variant?: ProductVariant | null) => {
    if (!variant) return "";

    return (
      variant.name ||
      variant.label ||
      variant.value ||
      variant.code ||
      variant.sku ||
      ""
    );
  };

  /* ===================================================
     VARIANT PRICE
  =================================================== */

  const currentPrice = selectedVariant
    ? Number(selectedVariant.price) || Number(product?.price) || 0
    : Number(product?.price) || 0;

  /* ===================================================
     VARIANT QTY
  =================================================== */

  const currentQty = selectedVariant
    ? getAvailableQty(selectedVariant.qty, selectedVariant.reservedQty)
    : getAvailableQty(product?.qty, product?.reservedQty);

  const isInStock = currentQty > 0;

  /* ===================================================
     SELECT VARIANT
  =================================================== */

  const handleSelectVariant = (index: number) => {
    const variant = variants[index];

    if (!variant) return;

    const qty = getAvailableQty(variant.qty, variant.reservedQty);
    if (qty <= 0) {
      toast.error(`Phân loại "${getVariantName(variant)}" hiện đã hết hàng`);

      return;
    }

    setSelectedVariantIndex(index);

    if (variant.image || variant.thumbnail) {
      setSelectedImg(variant.image || variant.thumbnail);
    }
  };

  /* ===================================================
     IMAGE ZOOM
  =================================================== */

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;

    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setZoomPosition({
      x,
      y,
    });
  };

  /* ===================================================
     CART PRODUCT
  =================================================== */

  const createCartProduct = () => {
    if (!product) return null;

    return {
      id: product.id,

      title: product.title,

      category: product.category,

      rating: product.rating,

      thumbnail:
        selectedVariant?.thumbnail ||
        selectedVariant?.image ||
        product.thumbnail,

      discountPercentage: product.discountPercentage,

      /*
       * Giá vẫn lưu vào cart.
       * showPrice chỉ quyết định UI có hiển thị
       * giá cho khách hay không.
       */
      price: currentPrice,

      selectedVariant: selectedVariant
        ? {
            ...selectedVariant,

            name: getVariantName(selectedVariant),

            price: currentPrice,

            qty: currentQty,
          }
        : null,
    };
  };

  /* ===================================================
     ADD CART
  =================================================== */

  const addCart = () => {
    requireAuth(() => {
      if (!product) return;

      if (!isInStock) {
        toast.error("Sản phẩm hiện đã hết hàng");

        return;
      }

      const cartProduct = createCartProduct();

      if (!cartProduct) return;

      dispatch(addToCart(cartProduct));

      if (selectedVariant) {
        toast.success(
          `Đã thêm "${product.title} - ${getVariantName(
            selectedVariant,
          )}" vào giỏ hàng`,
          {
            duration: 3000,
          },
        );
      } else {
        toast.success("Đã thêm sản phẩm vào giỏ hàng", {
          duration: 3000,
        });
      }
    });
  };

  /* ===================================================
     BUY NOW
  =================================================== */

  const buyNow = () => {
    requireAuth(() => {
      if (!product) return;

      if (!isInStock) {
        toast.error("Sản phẩm hiện đã hết hàng");

        return;
      }

      const cartProduct = createCartProduct();

      if (!cartProduct) return;

      dispatch(addToCart(cartProduct));

      dispatch(setCartState(true));
    });
  };

  /* ===================================================
     WISHLIST
  =================================================== */

  const addWishlist = () => {
    requireAuth(() => {
      if (!product) return;

      dispatch(addToWishlist(product));

      toast.success("Đã thêm vào danh sách yêu thích", {
        duration: 3000,
      });
    });
  };

  /* ===================================================
     LOADING
  =================================================== */

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Đang tải sản phẩm...
          </p>
        </div>
      </div>
    );
  }

  /* ===================================================
     NOT FOUND
  =================================================== */

  if (!product) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="text-5xl">📦</div>

          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            Không tìm thấy sản phẩm
          </h2>

          <button
            onClick={() => navigate(-1)}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const imageList =
    imgs.length > 0 ? imgs : product.thumbnail ? [product.thumbnail] : [];

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* =================================================
          BREADCRUMB
      ================================================= */}

      <div className="mx-auto max-w-7xl px-4 pt-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/" className="transition hover:text-blue-600">
            Trang chủ
          </Link>

          <span>/</span>

          <Link to="/categories" className="transition hover:text-blue-600">
            Sản phẩm
          </Link>

          <span>/</span>

          <span className="font-medium text-gray-800 dark:text-gray-200">
            {product.title}
          </span>
        </div>
      </div>

      {/* =================================================
          BACK BUTTON
      ================================================= */}

      <div className="mx-auto max-w-7xl px-4 pt-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:-translate-x-1 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
        >
          <FaChevronLeft className="text-xs" />
          Quay lại
        </button>
      </div>

      {/* =================================================
          PRODUCT
      ================================================= */}

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-5">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* =================================================
                IMAGE AREA
            ================================================= */}

            <div className="border-b border-gray-100 p-5 dark:border-slate-700 lg:border-b-0 lg:border-r lg:p-8">
              <div className="flex flex-col gap-4 md:flex-row">
                {/* THUMBNAILS */}

                {imageList.length > 0 && (
                  <div className="order-2 flex gap-3 overflow-x-auto md:order-1 md:w-20 md:flex-col">
                    {imageList.map((img, index) => {
                      const imageSrc = getImageUrl(img);

                      const isSelected = img === selectedImg;

                      return (
                        <button
                          key={`${img}-${index}`}
                          type="button"
                          onClick={() => setSelectedImg(img)}
                          className={`flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-white transition ${
                            isSelected
                              ? "border-blue-600 ring-2 ring-blue-100"
                              : "border-gray-200 hover:border-blue-400 dark:border-slate-600"
                          }`}
                        >
                          <img
                            src={imageSrc}
                            alt={`${product.title} ${index + 1}`}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* MAIN IMAGE */}

                <div
                  className="group relative order-1 flex min-h-[380px] flex-1 cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl bg-gray-50 dark:bg-slate-900 md:order-2"
                  onMouseEnter={() => setIsZooming(true)}
                  onMouseLeave={() => setIsZooming(false)}
                  onMouseMove={handleImageMouseMove}
                  onClick={() => setIsImageModalOpen(true)}
                >
                  <img
                    src={getImageUrl(selectedImg)}
                    alt={product.title || "Sản phẩm"}
                    className={`h-[380px] w-full object-contain p-6 transition-transform duration-200 md:h-[480px] ${
                      isZooming ? "scale-[2]" : "scale-100"
                    }`}
                    style={{
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }}
                  />

                  {/* DISCOUNT */}

                  {product.discountPercentage > 0 && (
                    <div className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow">
                      -{product.discountPercentage}%
                    </div>
                  )}

                  {/* IMAGE COUNT */}

                  {imageList.length > 1 && (
                    <div className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                      {imageList.indexOf(selectedImg || "") + 1}/
                      {imageList.length}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* =================================================
                PRODUCT INFO
            ================================================= */}

            <div className="p-5 md:p-8 lg:p-10">
              {/* CATEGORY */}

              {product.category && (
                <div className="mb-3">
                  <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    {product.category}
                  </span>
                </div>
              )}

              {/* TITLE */}

              <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-white md:text-3xl">
                {product.title}
              </h1>

              {/* RATING */}

              <div className="mt-4 flex flex-wrap items-center gap-4">
                {product.rating && (
                  <div className="flex items-center gap-2">
                    <RatingStar rating={product.rating} />

                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {product.rating}/5
                    </span>
                  </div>
                )}

                {product.code && (
                  <span className="text-sm text-gray-400">
                    Mã SP: {product.code}
                  </span>
                )}
              </div>

              {/* =================================================
                  VARIANTS
              ================================================= */}

              {hasVariants && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        Phân loại
                      </h2>

                      <p className="mt-0.5 text-xs text-gray-400">
                        Vui lòng chọn phân loại
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      {variants.length} loại
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {variants.map((variant, index) => {
                      const variantQty = getAvailableQty(
                        variant.qty,
                        variant.reservedQty,
                      );
                      const isSelected = index === selectedVariantIndex;

                      const variantName = getVariantName(variant);

                      return (
                        <button
                          key={
                            variant._id ||
                            variant.id ||
                            variant.code ||
                            variant.sku ||
                            `${variantName}-${index}`
                          }
                          type="button"
                          disabled={variantQty <= 0}
                          onClick={() => handleSelectVariant(index)}
                          className={`
                              relative
                              min-w-[100px]
                              rounded-xl
                              border-2
                              px-4 py-3
                              text-left
                              transition-all
                              ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-400"
                                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-400 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
                              }
                              ${
                                variantQty <= 0
                                  ? "cursor-not-allowed opacity-40"
                                  : ""
                              }
                            `}
                        >
                          {/* CHECK */}

                          {isSelected && variantQty > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                              <FaCheck className="text-[9px]" />
                            </span>
                          )}

                          {/* NAME */}

                          <div className="text-sm font-semibold">
                            {variantName || `Phân loại ${index + 1}`}
                          </div>

                          {/* PRICE */}

                          {showPrice && Number(variant.price) > 0 && (
                            <div className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                              {Number(variant.price).toLocaleString("vi-VN")}₫
                            </div>
                          )}

                          {/* STOCK */}

                          <div
                            className={`mt-1 text-[10px] ${
                              variantQty > 0 ? "text-green-600" : "text-red-500"
                            }`}
                          >
                            {variantQty > 0 ? `Còn ${variantQty}` : "Hết hàng"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* SELECTED VARIANT */}

                  {selectedVariant && (
                    <div
                      className={`mt-4 flex items-center rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20 ${
                        showPrice ? "justify-between" : ""
                      }`}
                    >
                      <div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Đã chọn
                        </p>

                        <p className="mt-0.5 text-sm font-bold text-blue-700 dark:text-blue-400">
                          {getVariantName(selectedVariant)}
                        </p>
                      </div>

                      {showPrice && (
                        <div className="text-right">
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Giá
                          </p>

                          <p className="text-base font-bold text-red-600">
                            {currentPrice > 0
                              ? currentPrice.toLocaleString("vi-VN")
                              : "Liên hệ"}{" "}
                            {currentPrice > 0 && "₫"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* =================================================
                  PRICE
              ================================================= */}

              {showPrice && (
                <div className="mt-6 rounded-2xl bg-gray-50 p-5 dark:bg-slate-900">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Giá bán
                  </p>

                  {hasVariants ? (
                    <p className="text-3xl font-bold text-red-600">
                      {currentPrice > 0
                        ? currentPrice.toLocaleString("vi-VN")
                        : "Liên hệ"}

                      {currentPrice > 0 && (
                        <span className="ml-1 text-base">₫</span>
                      )}
                    </p>
                  ) : product.discountPercentage ? (
                    <PriceSection
                      discountPercentage={product.discountPercentage}
                      price={product.price}
                    />
                  ) : (
                    <p className="text-3xl font-bold text-red-600">
                      {Number(product.price || 0).toLocaleString("vi-VN")} ₫
                    </p>
                  )}
                </div>
              )}

              {/* =================================================
                  INFO
              ================================================= */}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* STOCK */}

                <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 dark:border-slate-700">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30">
                    <MdOutlineInventory2 className="text-xl" />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Tồn kho</p>

                    <p className="font-semibold text-gray-900 dark:text-white">
                      {isInStock ? `${currentQty} sản phẩm` : "Hết hàng"}
                    </p>
                  </div>
                </div>

                {/* STATUS */}

                <div className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 dark:border-slate-700">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-900/30">
                    <MdLocalShipping className="text-xl" />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Tình trạng</p>

                    <p
                      className={`font-semibold ${
                        isInStock ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isInStock ? "Đang có hàng" : "Hết hàng"}
                    </p>
                  </div>
                </div>
              </div>

              {/* =================================================
                  PRODUCT META
              ================================================= */}

              <div className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-100 dark:divide-slate-700 dark:border-slate-700">
                {product.brand && (
                  <div className="flex justify-between gap-4 px-5 py-3.5">
                    <span className="text-sm text-gray-500">Thương hiệu</span>

                    <span className="text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {product.brand}
                    </span>
                  </div>
                )}

                {product.category && (
                  <div className="flex justify-between gap-4 px-5 py-3.5">
                    <span className="text-sm text-gray-500">Danh mục</span>

                    <span className="text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {product.category}
                    </span>
                  </div>
                )}

                {product.code && (
                  <div className="flex justify-between gap-4 px-5 py-3.5">
                    <span className="text-sm text-gray-500">Mã sản phẩm</span>

                    <span className="text-right text-sm font-semibold text-gray-900 dark:text-white">
                      {product.code}
                    </span>
                  </div>
                )}
              </div>

              {/* =================================================
                  DESCRIPTION
              ================================================= */}

              {product.description && (
                <div className="mt-7">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Mô tả sản phẩm
                  </h2>

                  <div className="mt-3 rounded-2xl bg-gray-50 p-5 dark:bg-slate-900">
                    <p className="whitespace-pre-line text-sm leading-7 text-gray-600 dark:text-gray-300">
                      {product.description}
                    </p>
                  </div>
                </div>
              )}

              {/* =================================================
                  ACTION
              ================================================= */}

              <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={addCart}
                  disabled={!isInStock}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-600 px-5 py-3.5 text-sm font-bold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 dark:hover:bg-blue-900/20"
                >
                  <AiOutlineShoppingCart className="text-xl" />

                  {isInStock ? "Thêm vào giỏ" : "Hết hàng"}
                </button>

                <button
                  type="button"
                  onClick={buyNow}
                  disabled={!isInStock}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  <FaHandHoldingDollar className="text-lg" />

                  {isInStock ? "Mua ngay" : "Hết hàng"}
                </button>
              </div>

              {/* =================================================
                  WISHLIST
              ================================================= */}

              {/* <button
                type="button"
                onClick={addWishlist}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-500 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-red-900/20"
              >
                <MdFavoriteBorder className="text-xl" />
                Thêm vào yêu thích
              </button> */}

              {/* =================================================
                  TRUST
              ================================================= */}

              <div className="mt-6 border-t border-gray-100 pt-5 dark:border-slate-700">
                <div className="flex flex-wrap gap-5 text-xs text-gray-500 dark:text-gray-400">
                  <span>✓ Hàng đúng mô tả</span>

                  <span>✓ Kiểm tra trước khi gửi</span>

                  <span>✓ Hỗ trợ tư vấn</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SHOPEE REVIEWS */}
        <section
          id="product-reviews"
          className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 px-4 py-5 dark:border-slate-700 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-700 shadow-sm dark:bg-slate-800 dark:text-orange-300">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  ĐÁNH GIÁ ĐÃ MUA TRÊN SHOPEE
                </div>
                <h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                  Đánh giá sản phẩm
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Chia sẻ thực tế từ khách hàng Nhật Khang Bike trên Shopee
                </p>
              </div>
              <div className="min-w-[116px] rounded-2xl border border-orange-100 bg-white px-4 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="text-3xl font-black leading-none text-orange-600 dark:text-orange-400">
                  {Number(reviewData?.summary?.averageRating || 0).toFixed(1)}
                  <span className="ml-1 text-base font-bold text-slate-400">/5</span>
                </div>
                <div className="mt-1 text-sm tracking-wider text-amber-500" aria-label="Điểm đánh giá">
                  ★★★★★
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {reviewData?.summary?.total || 0} lượt đánh giá
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)]">
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Thống kê số sao</p>
              {[5, 4, 3, 2, 1].map((rating) => {
                const total = Number(reviewData?.summary?.total || 0);
                const count = Number(reviewData?.summary?.breakdown?.[rating] || 0);
                const percent = total > 0 ? (count / total) * 100 : 0;
                return (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => {
                      setReviewRatingFilter(rating);
                      setReviewPage(1);
                    }}
                    aria-pressed={reviewRatingFilter === rating}
                    className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                      reviewRatingFilter === rating
                        ? "bg-orange-50 ring-1 ring-orange-200 dark:bg-orange-950/30 dark:ring-orange-900"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="w-9 shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">{rating} sao</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                      <span className="block h-full rounded-full bg-amber-400 transition-all" style={{ width: `${percent}%` }} />
                    </span>
                    <span className="w-7 shrink-0 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{count}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setReviewRatingFilter(0);
                  setReviewPage(1);
                }}
                aria-pressed={reviewRatingFilter === 0}
                className={`mt-2 w-full rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  reviewRatingFilter === 0
                    ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                    : "border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-700 dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                Xem tất cả đánh giá
              </button>
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {reviewRatingFilter ? `Đánh giá ${reviewRatingFilter} sao` : "Tất cả nhận xét"}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Nguồn dữ liệu: Shopee
                </span>
              </div>

              {reviewLoading && reviewPage === 1 ? (
                <div className="space-y-4 py-3" aria-live="polite">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="animate-pulse border-b border-slate-100 pb-4 dark:border-slate-800">
                      <div className="h-3 w-32 rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="mt-3 h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="mt-3 h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="mt-2 h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  ))}
                </div>
              ) : (reviewData?.data || []).length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reviewData?.data?.map((review) => (
                    <article key={review.commentId} className="py-5 first:pt-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-extrabold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                            {(review.customerName || "K").trim().charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {review.customerName || "Khách hàng Shopee"}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              <span className="text-xs tracking-wider text-amber-500" aria-label={`${review.rating} trên 5 sao`}>
                                {"★".repeat(Math.max(0, Math.min(5, Number(review.rating) || 0)))}
                                <span className="text-slate-300 dark:text-slate-600">{"★".repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0)))}</span>
                              </span>
                              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/40 dark:text-green-300">
                                Đánh giá Shopee
                              </span>
                              {(review.variantName || review.variationSku || review.variantCode) && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  Phân loại: {review.variantName || review.variationSku || review.variantCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <time className="shrink-0 text-xs text-slate-400">
                          {review.reviewCreatedAt ? new Date(review.reviewCreatedAt).toLocaleDateString("vi-VN") : ""}
                        </time>
                      </div>

                      {review.content ? (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {review.content}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm italic text-slate-400">Khách hàng không để lại nội dung.</p>
                      )}

                      {(review.images || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {review.images?.map((image, index) => (
                            <a
                              key={image + index}
                              href={image}
                              target="_blank"
                              rel="noreferrer"
                              className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
                            >
                              <img
                                src={image}
                                alt={`Ảnh đánh giá của khách hàng ${index + 1}`}
                                loading="lazy"
                                className="h-20 w-20 object-cover transition duration-200 hover:scale-105 sm:h-24 sm:w-24"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {(review.videos || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {review.videos?.map((video, index) => (
                            <video
                              key={video + index}
                              src={video}
                              controls
                              preload="metadata"
                              className="max-h-52 max-w-full rounded-xl border border-slate-200 dark:border-slate-700"
                            />
                          ))}
                        </div>
                      )}

                      {review.shopeeReply && (
                        <div className="mt-4 rounded-xl border-l-4 border-blue-400 bg-blue-50/80 px-4 py-3 dark:border-blue-500 dark:bg-blue-950/30">
                          <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                            Nhật Khang Bike phản hồi
                          </p>
                          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-300">
                            {review.shopeeReply}
                          </p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-2xl text-orange-500 dark:bg-orange-950/30">
                    ★
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">
                    Chưa có đánh giá cho sản phẩm này
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Đánh giá từ Shopee sẽ hiển thị tại đây sau khi được đồng bộ.
                  </p>
                </div>
              )}

              {reviewData?.pagination?.hasMore && (
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    disabled={reviewLoading}
                    onClick={() => setReviewPage((page) => page + 1)}
                    className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-5 py-2.5 text-sm font-bold text-orange-700 shadow-sm transition hover:border-orange-400 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-900 dark:bg-slate-800 dark:text-orange-300 dark:hover:bg-slate-700"
                  >
                    {reviewLoading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
                        Đang tải...
                      </>
                    ) : "Xem thêm đánh giá"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            SIMILAR PRODUCTS
        ================================================= */}

        {similar.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                  Có thể bạn quan tâm
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  Sản phẩm tương tự
                </h2>
              </div>
            </div>

            <ProductList
              title=""
              products={similar}
              isSlide={false}
              type={String(product?.type || "")}
            />
          </section>
        )}
      </main>

      {/* =====================================================
          FULL SCREEN IMAGE MODAL
      ===================================================== */}

      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsImageModalOpen(false)}
            className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-lg transition hover:scale-105 hover:bg-white"
          >
            <FaXmark className="text-xl" />
          </button>

          <img
            src={getImageUrl(selectedImg)}
            alt={product.title || "Sản phẩm"}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default SingleProduct;
