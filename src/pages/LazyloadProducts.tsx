import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import { API_ENDPOINTS } from "../api";
import { useParams } from "react-router-dom";

function LazyloadProducts() {
  const { type } = useParams();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Quan trọng: dùng ref để chống StrictMode gọi API 2 lần
  const loadingRef = useRef(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);

  // Theo dõi type hiện tại
  const typeRef = useRef(type);

  useEffect(() => {
    typeRef.current = type;
  }, [type]);

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
    console.log("Type:", typeRef.current);
    console.log("Page:", pageNumber);

    try {
      const res = await axios.get(API_ENDPOINTS.PRODUCTS, {
        params: {
          type: typeRef.current,
          page: pageNumber,
          limit: 15,
        },
      });

      const newProducts = res.data.products || [];
      const pagination = res.data.pagination;

      console.log("📦 Số sản phẩm:", newProducts.length);
      console.log("📄 Page:", pageNumber);
      console.log("➡️ HasMore:", pagination?.hasMore);

      // Không bị duplicate
      setProducts((prev) => {
        const existingIds = new Set(prev.map((item) => item._id));

        const uniqueProducts = newProducts.filter(
          (item: any) => !existingIds.has(item._id),
        );

        return [...prev, ...uniqueProducts];
      });

      const nextHasMore = Boolean(pagination?.hasMore);

      pageRef.current = pageNumber;
      hasMoreRef.current = nextHasMore;

      setHasMore(nextHasMore);
    } catch (error) {
      console.error("❌ API ERROR:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);

      // Kiểm tra xem trang đã đủ dài chưa
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

    // Sentinel đang nằm gần viewport
    if (rect.top <= window.innerHeight + 500) {
      const nextPage = pageRef.current + 1;

      console.log("🚀 AUTO LOAD:", nextPage);

      loadProducts(nextPage);
    }
  };

  // =========================
  // LOAD PAGE 1
  // =========================
  const initializedTypeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // StrictMode chạy effect 2 lần
    // Lần thứ 2 sẽ bị chặn ở đây
    if (initializedTypeRef.current === type) {
      console.log("🛑 Bỏ qua StrictMode:", type);
      return;
    }

    initializedTypeRef.current = type;

    console.log("🟢 INIT TYPE:", type);

    setProducts([]);

    pageRef.current = 1;
    hasMoreRef.current = true;

    setHasMore(true);

    // Không set loadingRef = false ở đây

    loadProducts(1);
  }, [type]);

  // =========================
  // INTERSECTION OBSERVER
  // =========================
  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;

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
        rootMargin: "500px 0px",
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [type]);

  return (
    <>
      <div className="container mt-8 mx-auto px-4 dark:bg-slate-800">
        <div className="sm:flex items-center justify-between">
          <h2 className="text-4xl font-medium font-lora dark:text-white py-2">
            {type === "1"
              ? "Phụ tùng xe đạp"
              : type === "2"
                ? "Phụ tùng xe điện"
                : "Phụ tùng xe ba gác"}
          </h2>
        </div>

        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4"
          data-test="product-list-container"
        >
          {products.map((product: any) => (
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

      {/* SENTINEL */}
      <div ref={loadMoreRef} className="h-24 flex items-center justify-center">
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
          </div>
        )}

        {!loading && !hasMore && (
          <p className="text-gray-500">Đã tải hết sản phẩm</p>
        )}
      </div>
    </>
  );
}

export default LazyloadProducts;
