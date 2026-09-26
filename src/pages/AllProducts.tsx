import { FC, useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

import ProductCard from "../components/ProductCard";
import SortProducts from "../components/SortProducts";
import { API_ENDPOINTS } from "../api";
import { Product } from "../models/Product";

const AllProducts: FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // =========================================================
  // REF
  // =========================================================

  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const initializedRef = useRef(false);

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = useCallback(async (pageNumber: number) => {
    // Đang loading
    if (loadingRef.current) {
      console.log("⛔ Đang loading");
      return;
    }

    // Hết sản phẩm
    if (!hasMoreRef.current && pageNumber !== 1) {
      console.log("⛔ Hết sản phẩm");
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    console.log("=================================");
    console.log("🔥 LOAD PRODUCTS");
    console.log("📄 Page:", pageNumber);
    console.log("=================================");

    try {
      const res = await axios.get(API_ENDPOINTS.PRODUCTS, {
        params: {
          page: pageNumber,
          limit: 15,
        },
      });

      console.log("📥 API RESPONSE:", res.data);

      // =====================================================
      // LẤY PRODUCTS
      // =====================================================

      const newProducts: Product[] = Array.isArray(res.data?.products)
        ? res.data.products
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      // =====================================================
      // BACKEND CỦA BẠN ĐANG TRẢ:
      //
      // {
      //   products,
      //   total,
      //   page,
      //   limit,
      //   totalPages,
      //   hasMore
      // }
      //
      // Không phải:
      //
      // {
      //   pagination: {
      //      hasMore
      //   }
      // }
      // =====================================================

      const nextHasMore =
        typeof res.data?.hasMore === "boolean"
          ? res.data.hasMore
          : typeof res.data?.pagination?.hasMore === "boolean"
            ? res.data.pagination.hasMore
            : typeof res.data?.totalPages === "number"
              ? pageNumber < res.data.totalPages
              : newProducts.length >= 15;

      console.log("📦 Products nhận được:", newProducts.length);
      console.log("📄 Page:", pageNumber);
      console.log("➡️ hasMore:", nextHasMore);
      console.log("📊 Total:", res.data?.total);
      console.log("📊 Total pages:", res.data?.totalPages);

      // =====================================================
      // MERGE PRODUCT
      // =====================================================

      setProducts((prev) => {
        // Page 1 thì reset
        if (pageNumber === 1) {
          return newProducts;
        }

        const existingIds = new Set(
          prev.map((item: any) => String(item?._id || item?.id)),
        );

        const uniqueProducts = newProducts.filter((item: any) => {
          const id = String(item?._id || item?.id);

          if (!id || id === "undefined" || id === "null") {
            return true;
          }

          return !existingIds.has(id);
        });

        return [...prev, ...uniqueProducts];
      });

      // =====================================================
      // PAGINATION
      // =====================================================

      pageRef.current = pageNumber;

      hasMoreRef.current = nextHasMore;

      setHasMore(nextHasMore);
    } catch (error) {
      console.error("❌ LOAD PRODUCTS ERROR:", error);

      if (axios.isAxiosError(error)) {
        console.error("❌ Status:", error.response?.status);
        console.error("❌ Response:", error.response?.data);
      }

      // Nếu lỗi thì không tự coi là hết sản phẩm
      hasMoreRef.current = true;
      setHasMore(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);

      // =====================================================
      // KIỂM TRA VIEWPORT
      // Nếu 15 sản phẩm vẫn chưa đủ cao màn hình
      // thì tự load page tiếp theo
      // =====================================================

      requestAnimationFrame(() => {
        setTimeout(() => {
          checkNeedMore();
        }, 100);
      });
    }
  }, []);

  // =========================================================
  // CHECK NEED MORE
  // =========================================================

  const checkNeedMore = useCallback(() => {
    const element = loadMoreRef.current;

    if (!element) {
      return;
    }

    if (loadingRef.current) {
      return;
    }

    if (!hasMoreRef.current) {
      return;
    }

    const rect = element.getBoundingClientRect();

    console.log("📏 Sentinel top:", rect.top);
    console.log("🖥️ Window height:", window.innerHeight);

    if (rect.top <= window.innerHeight + 500) {
      const nextPage = pageRef.current + 1;

      console.log("🚀 AUTO LOAD PAGE:", nextPage);

      loadProducts(nextPage);
    }
  }, [loadProducts]);

  // =========================================================
  // INIT
  // =========================================================

  useEffect(() => {
    if (initializedRef.current) {
      console.log("🛑 Bỏ qua lần render thứ 2");
      return;
    }

    initializedRef.current = true;

    console.log("🟢 INIT ALL PRODUCTS");

    // Reset
    setProducts([]);
    setCurrentProducts([]);

    pageRef.current = 1;
    hasMoreRef.current = true;

    setHasMore(true);

    loadProducts(1);
  }, [loadProducts]);

  // =========================================================
  // SYNC CURRENT PRODUCTS
  // =========================================================

  useEffect(() => {
    setCurrentProducts(products);
  }, [products]);

  // =========================================================
  // INTERSECTION OBSERVER
  // =========================================================

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting) {
          return;
        }

        console.log("👀 SENTINEL VISIBLE");

        if (loadingRef.current) {
          console.log("⛔ Đang loading");
          return;
        }

        if (!hasMoreRef.current) {
          console.log("⛔ Hết sản phẩm");
          return;
        }

        const nextPage = pageRef.current + 1;

        console.log("🚀 INTERSECTION LOAD:", nextPage);

        loadProducts(nextPage);
      },
      {
        root: null,
        rootMargin: "500px 0px",
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [loadProducts]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      <div className="container mx-auto min-h-[83vh] p-4">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
              Danh sách sản phẩm
            </h1>

            {products.length > 0 && (
              <p className="mt-1 text-sm text-gray-500">
                Đã tải {products.length} sản phẩm
              </p>
            )}
          </div>
        </div>

        {/* =====================================================
            LOADING PAGE 1
        ===================================================== */}

        {loading && products.length === 0 && (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-800" />

              <span className="text-sm text-gray-500">
                Đang tải sản phẩm...
              </span>
            </div>
          </div>
        )}

        {/* =====================================================
            EMPTY
        ===================================================== */}

        {!loading && products.length === 0 && (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-600 dark:text-gray-300">
                Không có sản phẩm
              </p>

              <p className="mt-1 text-sm text-gray-400">
                Chưa có sản phẩm nào được tìm thấy
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            PRODUCT LIST
        ===================================================== */}

        {currentProducts.length > 0 && (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            data-test="product-list-container"
          >
            {currentProducts.map((product: any, index) => {
              const productId =
                product?._id || product?.id || `product-${index}`;

              return (
                <div key={String(productId)} className="flex min-w-0 h-full">
                  <ProductCard
                    {...product}
                    _id={product?._id || product?.id}
                    id={product?._id || product?.id}
                    category={product?.category}
                    title={product?.title || "Sản phẩm"}
                    price={product?.price ?? 0}
                    thumbnail={product?.thumbnail || ""}
                    images={
                      Array.isArray(product?.images) ? product.images : []
                    }
                    rating={product?.rating ?? 0}
                    discountPercentage={product?.discountPercentage ?? 0}
                    qty={product?.qty ?? 0}
                    variants={
                      Array.isArray(product?.variants) ? product.variants : []
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =====================================================
          SENTINEL
      ===================================================== */}

      <div
        ref={loadMoreRef}
        className="flex min-h-24 w-full items-center justify-center"
      >
        {loading && products.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-800" />
          </div>
        )}

        {!loading && !hasMore && products.length > 0 && (
          <p className="py-8 text-sm text-gray-500">
            Đã tải hết {products.length} sản phẩm
          </p>
        )}
      </div>
    </>
  );
};

export default AllProducts;
