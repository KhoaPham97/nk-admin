import { FC, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import { Product } from "../models/Product";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { updateLoading } from "../redux/features/homeSlice";

import SortProducts from "../components/SortProducts";
import PaginatedProducts from "../components/PaginatedProducts";

import { API_ENDPOINTS } from "../api";

interface Category {
  _id?: string;
  id?: string;
  slug?: string;
  name: string;
  url?: string;
  type?: string;
  image?: string;
  thumbnail?: string;
  description?: string;
}

const SearchPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const query = searchParams.get("q")?.trim() || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categoryResults, setCategoryResults] = useState<Category[]>([]);
  const [notFound, setNotFound] = useState(false);

  const isLoading = useAppSelector((state) => state.homeReducer.isLoading);

  // =========================================================
  // LẤY DANH SÁCH PRODUCTS TỪ RESPONSE
  // =========================================================

  const getProductsFromResponse = (data: any): Product[] => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.products)) {
      return data.products;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    if (Array.isArray(data?.data?.products)) {
      return data.data.products;
    }

    return [];
  };

  // =========================================================
  // LẤY DANH SÁCH CATEGORIES TỪ RESPONSE
  // =========================================================

  const getCategoriesFromResponse = (data: any): Category[] => {
    if (Array.isArray(data)) {
      return data;
    }

    if (Array.isArray(data?.categorys)) {
      return data.categorys;
    }

    if (Array.isArray(data?.categories)) {
      return data.categories;
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    if (Array.isArray(data?.data?.categorys)) {
      return data.data.categorys;
    }

    if (Array.isArray(data?.data?.categories)) {
      return data.data.categories;
    }

    return [];
  };

  // =========================================================
  // LẤY TEXT ĐỂ SEARCH
  // =========================================================

  const getProductSearchText = (product: any): string => {
    return [
      product?.title,
      product?.name,
      product?.code,
      product?.productCode,
      product?.sku,
      product?.description,
      product?.category,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  };

  // =========================================================
  // LẤY IMAGE CATEGORY
  // =========================================================

  const getCategoryImage = (category: Category) => {
    const image =
      category.thumbnail || category.image || "/images/categories/default.jpg";

    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:image")
    ) {
      return image;
    }

    if (image.startsWith("/")) {
      return image;
    }

    return `/images/${image}`;
  };

  // =========================================================
  // SEARCH
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    const searchProducts = async () => {
      if (!query) {
        setProducts([]);
        setCategoryResults([]);
        setNotFound(true);
        return;
      }

      dispatch(updateLoading(true));

      setProducts([]);
      setCategoryResults([]);
      setNotFound(false);

      try {
        console.log("🔎 Searching:", query);

        // =====================================================
        // SEARCH PRODUCTS
        // =====================================================

        const productsResponse = await fetch(
          `${API_ENDPOINTS.PRODUCTS_SEARCH}?q=${encodeURIComponent(query)}`,
        );

        if (!productsResponse.ok) {
          throw new Error(`Product search error: ${productsResponse.status}`);
        }

        const productsDataResponse = await productsResponse.json();

        console.log("📦 Product search response:", productsDataResponse);

        const allProducts = getProductsFromResponse(productsDataResponse);

        const normalizedQuery = query.toLowerCase();

        const matchedProducts = allProducts.filter((product: any) => {
          const searchText = getProductSearchText(product);

          return searchText.includes(normalizedQuery);
        });

        console.log("📦 Products found:", matchedProducts.length);

        if (cancelled) return;

        if (matchedProducts.length > 0) {
          const formattedProducts: Product[] = matchedProducts.map(
            (product: any) => ({
              ...product,
              id: product._id || product.id,
            }),
          );

          setProducts(formattedProducts);
          setCategoryResults([]);
          setNotFound(false);

          return;
        }

        // =====================================================
        // NẾU KHÔNG CÓ PRODUCT THÌ SEARCH CATEGORY
        // =====================================================

        const categoriesResponse = await fetch(
          API_ENDPOINTS.PRODUCTS_CATEGORIES,
        );

        if (!categoriesResponse.ok) {
          throw new Error(
            `Category search error: ${categoriesResponse.status}`,
          );
        }

        const categoriesDataResponse = await categoriesResponse.json();

        console.log("📂 Category response:", categoriesDataResponse);

        const allCategories = getCategoriesFromResponse(categoriesDataResponse);

        const matchedCategories = allCategories.filter((category: Category) => {
          const categoryText = [
            category.name,
            category.slug,
            category.url,
            category.description,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return categoryText.includes(normalizedQuery);
        });

        console.log("📂 Categories found:", matchedCategories.length);

        if (cancelled) return;

        if (matchedCategories.length > 0) {
          setCategoryResults(matchedCategories);
          setProducts([]);
          setNotFound(false);
        } else {
          setCategoryResults([]);
          setProducts([]);
          setNotFound(true);
        }
      } catch (error) {
        console.error("❌ Search error:", error);

        if (!cancelled) {
          setProducts([]);
          setCategoryResults([]);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) {
          dispatch(updateLoading(false));
        }
      }
    };

    searchProducts();

    return () => {
      cancelled = true;
    };
  }, [query, dispatch]);

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="container mx-auto min-h-[83vh] p-4">
      <div className="space-y-5">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-lg text-gray-800 dark:text-white">
              Kết quả tìm kiếm:
              <span className="ml-1 font-bold">"{query}"</span>
            </h1>

            {!isLoading && products.length > 0 && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tìm thấy {products.length} sản phẩm
              </p>
            )}
          </div>

          {products.length > 0 && (
            <SortProducts products={products} onChange={setProducts} />
          )}
        </div>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {isLoading && (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900 dark:border-slate-700 dark:border-t-white" />

              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Đang tìm kiếm sản phẩm...
              </p>
            </div>
          </div>
        )}

        {/* =====================================================
            NOT FOUND
        ===================================================== */}

        {!isLoading && notFound && (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="text-center">
              <div className="text-5xl">🔍</div>

              <p className="mt-5 text-2xl font-semibold text-gray-800 dark:text-white">
                Không tìm thấy sản phẩm
              </p>

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Thử tìm kiếm bằng tên sản phẩm, mã sản phẩm hoặc danh mục khác.
              </p>

              <button
                type="button"
                onClick={() => navigate("/products")}
                className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          </div>
        )}

        {/* =====================================================
            CATEGORY RESULTS
        ===================================================== */}

        {!isLoading && !notFound && categoryResults.length > 0 && (
          <div>
            <p className="mb-5 text-lg text-gray-800 dark:text-white">
              Không tìm thấy sản phẩm trực tiếp, nhưng có danh mục phù hợp:
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {categoryResults.map((category) => {
                const categoryId =
                  category._id || category.id || category.slug || category.name;

                const categoryUrl =
                  category._id || category.slug || category.id;

                return (
                  <button
                    key={String(categoryId)}
                    type="button"
                    onClick={() =>
                      navigate(`/category/${categoryUrl}`, {
                        state: {
                          category,
                        },
                      })
                    }
                    className="group overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-500 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                  >
                    {/* CATEGORY IMAGE */}

                    <div className="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-slate-700">
                      <img
                        src={getCategoryImage(category)}
                        alt={category.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                        onError={(event) => {
                          event.currentTarget.src =
                            "/images/categories/default.jpg";
                        }}
                      />
                    </div>

                    {/* CATEGORY CONTENT */}

                    <div className="p-4">
                      <h2 className="line-clamp-2 min-h-[48px] text-base font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white">
                        {category.name}
                      </h2>

                      <span className="mt-4 inline-flex text-sm font-semibold text-blue-600">
                        Xem sản phẩm →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =====================================================
            PRODUCT RESULTS
        ===================================================== */}

        {!isLoading &&
          !notFound &&
          categoryResults.length === 0 &&
          products.length > 0 && (
            <PaginatedProducts
              products={products}
              isLoading={isLoading}
              initialRows={5}
            />
          )}
      </div>
    </div>
  );
};

export default SearchPage;
