import { FC, useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard";
import { Product } from "../models/Product";

interface Props {
  products: Product[];
  isLoading: boolean;
  initialRows?: number;
}

// =========================================================
// XÁC ĐỊNH SỐ CỘT
// =========================================================

const getColumnsForWidth = (width: number) => {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  if (width >= 640) return 2;

  return 2;
};

// =========================================================
// COMPONENT
// =========================================================

const PaginatedProducts: FC<Props> = ({
  products = [],
  isLoading,
  initialRows = 5,
}) => {
  const [rowsToShow, setRowsToShow] = useState<number>(initialRows);

  const [columns, setColumns] = useState<number>(() =>
    typeof window !== "undefined" ? getColumnsForWidth(window.innerWidth) : 4,
  );

  // =========================================================
  // RESPONSIVE
  // =========================================================

  useEffect(() => {
    const handleResize = () => {
      setColumns(getColumnsForWidth(window.innerWidth));
    };

    if (typeof window !== "undefined") {
      handleResize();

      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  // =========================================================
  // RESET KHI PRODUCTS THAY ĐỔI
  // =========================================================

  useEffect(() => {
    setRowsToShow(initialRows);
  }, [products, initialRows]);

  // =========================================================
  // SỐ PRODUCT HIỂN THỊ
  // =========================================================

  const itemsPerPage = useMemo(() => {
    return rowsToShow * columns;
  }, [rowsToShow, columns]);

  // =========================================================
  // NORMALIZE PRODUCTS
  // =========================================================

  const normalizedProducts = useMemo(() => {
    if (!Array.isArray(products)) {
      return [];
    }

    return products.filter(Boolean).map((product: any, index) => {
      const productId =
        product?._id || product?.id || `search-product-${index}`;

      return {
        ...product,

        // Quan trọng:
        _id: product?._id || product?.id || productId,

        id: product?.id || product?._id || productId,

        title: product?.title || product?.name || "Sản phẩm",

        price: product?.price ?? 0,

        qty: product?.qty ?? product?.stock ?? 0,

        stock: product?.stock ?? product?.qty ?? 0,

        rating: product?.rating ?? 0,

        discountPercentage: product?.discountPercentage ?? 0,

        thumbnail: product?.thumbnail || "",

        images: Array.isArray(product?.images) ? product.images : [],

        variants: Array.isArray(product?.variants) ? product.variants : [],
      };
    });
  }, [products]);

  // =========================================================
  // VISIBLE PRODUCTS
  // =========================================================

  const visibleProducts = useMemo(() => {
    return normalizedProducts.slice(0, itemsPerPage);
  }, [normalizedProducts, itemsPerPage]);

  const allShown = visibleProducts.length >= normalizedProducts.length;

  // =========================================================
  // DEBUG
  // =========================================================

  useEffect(() => {
    console.log("🟢 PaginatedProducts - products:", products);

    console.log("📦 PaginatedProducts - normalized:", normalizedProducts);

    console.log("👀 PaginatedProducts - visible:", visibleProducts);

    console.log("📊 PaginatedProducts - count:", normalizedProducts.length);
  }, [products, normalizedProducts, visibleProducts]);

  // =========================================================
  // LOADING
  // =========================================================

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900 dark:border-slate-700 dark:border-t-white" />

          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Đang tải sản phẩm...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // EMPTY
  // =========================================================

  if (normalizedProducts.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="text-5xl">🔍</div>

          <p className="mt-4 text-lg font-semibold text-gray-700 dark:text-white">
            Không có sản phẩm
          </p>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Không tìm thấy sản phẩm phù hợp.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="w-full">
      {/* =====================================================
          PRODUCT GRID
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-2
          gap-3
          sm:grid-cols-2
          md:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-4
          items-stretch
        "
      >
        {visibleProducts.map((product: any, index) => {
          const productId = product?._id || product?.id || `product-${index}`;

          return (
            <div key={String(productId)} className="flex min-w-0 h-full">
              <ProductCard
                {...product}
                _id={product._id}
                id={product.id}
                title={product.title}
                category={product.category}
                price={product.price}
                qty={product.qty}
                stock={product.stock}
                thumbnail={product.thumbnail}
                images={Array.isArray(product.images) ? product.images : []}
                variants={
                  Array.isArray(product.variants) ? product.variants : []
                }
                rating={product.rating}
                discountPercentage={product.discountPercentage}
                description={product.description}
              />
            </div>
          );
        })}
      </div>

      {/* =====================================================
          VIEW MORE
      ===================================================== */}

      {!allShown && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setRowsToShow((current) => current + initialRows)}
            className="
              rounded-xl
              border
              border-gray-300
              bg-white
              px-6
              py-3
              text-sm
              font-semibold
              text-gray-700
              transition
              hover:border-blue-500
              hover:text-blue-600
              hover:shadow-md
              dark:border-slate-700
              dark:bg-slate-800
              dark:text-white
            "
          >
            Xem thêm
          </button>
        </div>
      )}

      {/* =====================================================
          COUNT
      ===================================================== */}

      <div className="mt-5 text-center">
        <p className="text-sm text-gray-400">
          Đang hiển thị{" "}
          <span className="font-semibold">{visibleProducts.length}</span> /{" "}
          <span className="font-semibold">{normalizedProducts.length}</span> sản
          phẩm
        </p>
      </div>
    </div>
  );
};

export default PaginatedProducts;
