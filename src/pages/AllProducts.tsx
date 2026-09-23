import { FC, useEffect, useRef, useState } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import SortProducts from "../components/SortProducts";
import { API_ENDPOINTS } from "../api";
import { Product } from "../models/Product";

function AllProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentProducts, setCurrentProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // =========================
  // QUAN TRỌNG:
  // Dùng ref chống gọi API 2 lần
  // =========================
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  // =========================
  // LOAD PRODUCTS
  // =========================
  const loadProducts = async (pageNumber: number) => {
    // Đang gọi API thì không gọi lần nữa
    if (loadingRef.current) {
      console.log("⛔ Đang loading");
      return;
    }

    // Hết sản phẩm
    if (!hasMoreRef.current) {
      console.log("⛔ Hết sản phẩm");
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    console.log("🔥 LOAD API");
    console.log("Page:", pageNumber);

    try {
      const res = await axios.get(API_ENDPOINTS.PRODUCTS, {
        params: {
          page: pageNumber,
          limit: 15,
        },
      });

      const newProducts: Product[] = res.data.products || [];

      const pagination = res.data.pagination;

      console.log("📦 Số sản phẩm:", newProducts.length);

      console.log("📄 Page:", pageNumber);

      console.log("➡️ HasMore:", pagination?.hasMore);

      // =========================
      // KHÔNG BỊ DUPLICATE
      // =========================
      setProducts((prev) => {
        const existingIds = new Set(prev.map((item) => item._id));

        const uniqueProducts = newProducts.filter(
          (item) => !existingIds.has(item._id),
        );

        return [...prev, ...uniqueProducts];
      });

      // =========================
      // PAGINATION
      // =========================

      const nextHasMore = Boolean(pagination?.hasMore);

      pageRef.current = pageNumber;

      hasMoreRef.current = nextHasMore;

      setHasMore(nextHasMore);
    } catch (error) {
      console.error("❌ API ERROR:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);

      // Kiểm tra danh sách có đủ dài chưa
      requestAnimationFrame(() => {
        checkNeedMore();
      });
    }
  };

  // =========================
  // KIỂM TRA CÓ CẦN LOAD THÊM
  // =========================
  const checkNeedMore = () => {
    const element = loadMoreRef.current;

    if (!element) return;

    if (loadingRef.current) return;

    if (!hasMoreRef.current) return;

    const rect = element.getBoundingClientRect();

    console.log("📏 Sentinel top:", rect.top);

    console.log("🖥️ Window height:", window.innerHeight);

    // Sentinel gần viewport
    if (rect.top <= window.innerHeight + 500) {
      const nextPage = pageRef.current + 1;

      console.log("🚀 AUTO LOAD:", nextPage);

      loadProducts(nextPage);
    }
  };

  // =========================
  // LOAD PAGE 1
  // =========================
  const initializedRef = useRef(false);

  useEffect(() => {
    // Chống StrictMode gọi lần 2
    if (initializedRef.current) {
      console.log("🛑 Bỏ qua StrictMode");

      return;
    }

    initializedRef.current = true;

    console.log("🟢 INIT ALL PRODUCTS");

    setProducts([]);

    setCurrentProducts([]);

    pageRef.current = 1;

    hasMoreRef.current = true;

    setHasMore(true);

    loadProducts(1);
  }, []);

  // =========================
  // CẬP NHẬT PRODUCTS CHO SORT
  // =========================
  useEffect(() => {
    setCurrentProducts(products);
  }, [products]);

  // =========================
  // INTERSECTION OBSERVER
  // =========================
  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) {
          return;
        }

        console.log("👀 Sentinel visible");

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

        // Tải trước khi tới cuối 500px
        rootMargin: "500px 0px",

        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="container mx-auto min-h-[83vh] p-4">
        {/* =========================
            HEADER
        ========================= */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg dark:text-white">Danh sách sản phẩm</span>

          <SortProducts products={products} onChange={setCurrentProducts} />
        </div>

        {/* =========================
            PRODUCT LIST
        ========================= */}
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          data-test="product-list-container"
        >
          {currentProducts.map((product) => (
            <ProductCard
              key={product._id}
              id={product._id}
              category={product.category}
              title={product.title}
              price={product.price}
              thumbnail={product.thumbnail}
              rating={product.rating}
              discountPercentage={product.discountPercentage}
              qty={+product.qty}
            />
          ))}
        </div>
      </div>

      {/* =========================
          SENTINEL
      ========================= */}
      <div ref={loadMoreRef} className="flex h-24 items-center justify-center">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-800" />
          </div>
        )}

        {!loading && !hasMore && products.length > 0 && (
          <p className="text-gray-500">Đã tải hết sản phẩm</p>
        )}
      </div>
    </>
  );
}

export default AllProducts;
