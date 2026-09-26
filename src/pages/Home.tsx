import { FC, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import ProductList from "../components/ProductList";
import { API_ENDPOINTS } from "../api";

interface Product {
  _id: string;
  id?: string;
  title: string;
  price?: number | string;
  qty?: number | string;
  thumbnail?: string;
  images?: string[];
  rating?: number;
  discountPercentage?: number;
  category?: string;
  categoryId?: string;
  type?: string;
  variants?: any[];
}

interface Category {
  _id: string;
  name: string;
  type: string;
  description?: string;
  thumbnail?: string;
  image?: string;
}

interface CategoryGroup {
  type: string;
  title: string;
  description: string;
  fallbackImage: string;
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    type: "1",
    title: "Phụ tùng xe đạp",
    description: "Các loại phụ tùng, linh kiện và phụ kiện dành cho xe đạp.",
    fallbackImage: "/images/categories/bicycle.jpg",
  },
  {
    type: "2",
    title: "Phụ tùng xe điện",
    description: "Motor, controller, tay ga, bánh xe và linh kiện điện xe.",
    fallbackImage: "/images/categories/electric.jpg",
  },
  {
    type: "3",
    title: "Phụ tùng xe ba gác",
    description: "Bạc đạn, chữ thập, cầu, phanh và phụ tùng xe ba gác.",
    fallbackImage: "/images/categories/tricycle.jpg",
  },
];

const getImageUrl = (
  image?: string,
  fallback = "/images/categories/default.jpg",
) => {
  if (!image) return fallback;

  const value = String(image).trim();

  if (!value) return fallback;

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image")
  ) {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  return `/images/${value}`;
};

const getCategoryName = (name: string, type: string) => {
  const prefixes: Record<string, string> = {
    "1": "Phụ tùng xe đạp - ",
    "2": "Phụ tùng xe điện - ",
    "3": "Phụ tùng xe ba gác - ",
  };

  const prefix = prefixes[type];

  if (prefix && name.startsWith(prefix)) {
    return name.substring(prefix.length);
  }

  return name;
};

const Home: FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);

        const response = await axios.get(API_ENDPOINTS.PRODUCTS, {
          params: {
            type: "all",
          },
        });

        const data = response.data;

        const productList = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.data)
            ? data.data
            : [];

        setProducts(productList);
      } catch (error) {
        console.error("❌ Lỗi tải sản phẩm:", error);
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // =========================================================
  // LOAD CATEGORIES
  // =========================================================

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);

        const response = await axios.get(API_ENDPOINTS.PRODUCTS_CATEGORIES);

        const data = response.data;

        const categoryList = Array.isArray(data?.categorys)
          ? data.categorys
          : Array.isArray(data?.categories)
            ? data.categories
            : [];

        setCategories(categoryList);
      } catch (error) {
        console.error("❌ Lỗi tải danh mục:", error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadCategories();
  }, []);

  // =========================================================
  // PRODUCT MỚI
  // =========================================================

  const newestProducts = useMemo(() => {
    return products.slice(0, 10);
  }, [products]);

  // =========================================================
  // PRODUCT NỔI BẬT
  // =========================================================

  const featuredProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const ratingA = Number(a.rating) || 0;
        const ratingB = Number(b.rating) || 0;

        return ratingB - ratingA;
      })
      .slice(0, 10);
  }, [products]);

  // =========================================================
  // PRODUCT THEO TYPE
  // =========================================================

  const getProductsByType = (type: string) => {
    return products
      .filter((product) => String(product.type) === String(type))
      .slice(0, 10);
  };

  // =========================================================
  // CATEGORY THEO TYPE
  // =========================================================

  const getCategoriesByType = (type: string) => {
    return categories.filter(
      (category) => String(category.type) === String(type),
    );
  };

  // =========================================================
  // TÌM ẢNH ĐẠI DIỆN CATEGORY
  //
  // Ưu tiên:
  // 1. category.thumbnail
  // 2. category.image
  // 3. thumbnail của sản phẩm thuộc category
  // 4. ảnh mặc định theo type
  // =========================================================

  const getCategoryImage = (category: Category, group: CategoryGroup) => {
    if (category.thumbnail) {
      return getImageUrl(category.thumbnail, group.fallbackImage);
    }

    if (category.image) {
      return getImageUrl(category.image, group.fallbackImage);
    }

    const categoryProducts = products.filter((product) => {
      return (
        String(product.categoryId) === String(category._id) ||
        String(product.category) === String(category._id)
      );
    });

    const firstProduct = categoryProducts.find((product) => product.thumbnail);

    if (firstProduct?.thumbnail) {
      return getImageUrl(firstProduct.thumbnail, group.fallbackImage);
    }

    return group.fallbackImage;
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <img
            src="/images/home/banner.jpg"
            alt="Nhật Khang Bike"
            className="h-full w-full object-cover opacity-40"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
        </div>

        <div className="relative container mx-auto px-4">
          <div className="flex min-h-[520px] items-center py-16 md:min-h-[600px]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">
                <span className="mr-2 h-2 w-2 rounded-full bg-blue-500" />

                <span className="text-sm font-medium text-white">
                  NHẬT KHANG BIKE
                </span>
              </div>

              <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                Phụ tùng xe
                <span className="block text-blue-500">chất lượng</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-gray-300 md:text-lg">
                Chuyên phụ tùng xe đạp, xe điện và xe ba gác. Nhiều mẫu mã, dễ
                tìm kiếm, hỗ trợ tư vấn đúng loại phụ tùng cho nhu cầu của bạn.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/products"
                  className="rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
                >
                  Xem sản phẩm
                </Link>

                <Link
                  to="/categories"
                  className="rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Xem danh mục
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-8">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {products.length}+
                  </p>

                  <p className="mt-1 text-sm text-gray-400">Sản phẩm</p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-white">3</p>

                  <p className="mt-1 text-sm text-gray-400">Nhóm phụ tùng</p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-white">NK</p>

                  <p className="mt-1 text-sm text-gray-400">Nhật Khang Bike</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          CATEGORY
      ===================================================== */}

      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Danh mục
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
              Tìm đúng phụ tùng
            </h2>

            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Chọn nhóm xe bạn đang cần tìm phụ tùng.
            </p>
          </div>

          <Link
            to="/categories"
            className="hidden text-sm font-semibold text-blue-600 hover:text-blue-700 sm:block"
          >
            Xem tất cả →
          </Link>
        </div>

        {loadingCategories ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[300px] animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {CATEGORY_GROUPS.map((group) => {
              const groupCategories = getCategoriesByType(group.type);

              return (
                <div
                  key={group.type}
                  className="group relative overflow-hidden rounded-2xl bg-black"
                >
                  <img
                    src={
                      groupCategories.length > 0
                        ? getCategoryImage(groupCategories[0], group)
                        : group.fallbackImage
                    }
                    alt={group.title}
                    className="h-[300px] w-full object-cover opacity-70 transition duration-700 group-hover:scale-110 group-hover:opacity-80"
                    onError={(event) => {
                      event.currentTarget.src = group.fallbackImage;
                    }}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                      {groupCategories.length} danh mục
                    </p>

                    <h3 className="mt-2 text-2xl font-bold text-white">
                      {group.title}
                    </h3>

                    <p className="mt-2 text-sm leading-5 text-gray-300">
                      {group.description}
                    </p>

                    <Link
                      to={`/categories?type=${group.type}`}
                      className="mt-5 inline-flex items-center text-sm font-semibold text-white"
                    >
                      Xem phụ tùng
                      <span className="ml-2 transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================
          SẢN PHẨM MỚI
      ===================================================== */}

      {!loadingProducts && newestProducts.length > 0 && (
        <section className="bg-gray-50 py-14 dark:bg-slate-900 md:py-20">
          <div className="container mx-auto px-4">
            <ProductList
              title="Sản phẩm mới"
              products={newestProducts}
              isSlide
              type="all"
            />

            <div className="mt-8 text-center">
              <Link
                to="/products"
                className="inline-flex rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-blue-600 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
              >
                Xem tất cả sản phẩm
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          SẢN PHẨM NỔI BẬT
      ===================================================== */}

      {!loadingProducts && featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-14 md:py-20">
          <ProductList
            title="Sản phẩm nổi bật"
            products={featuredProducts}
            isSlide
            type="all"
          />
        </section>
      )}

      {/* =====================================================
          NHÓM SẢN PHẨM
      ===================================================== */}

      {!loadingProducts &&
        CATEGORY_GROUPS.map((group) => {
          const groupProducts = getProductsByType(group.type);

          if (groupProducts.length === 0) {
            return null;
          }

          return (
            <section
              key={group.type}
              className="border-t border-gray-100 bg-gray-50 py-14 dark:border-slate-800 dark:bg-slate-900 md:py-20"
            >
              <div className="container mx-auto px-4">
                <ProductList
                  title={group.title}
                  products={groupProducts}
                  isSlide
                  type={group.type}
                />
              </div>
            </section>
          );
        })}

      {/* =====================================================
          WHY CHOOSE US
      ===================================================== */}

      <section className="container mx-auto px-4 py-14 md:py-20">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Nhật Khang Bike
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            Vì sao chọn Nhật Khang Bike?
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "✓",
              title: "Nhiều loại phụ tùng",
              description: "Danh mục đa dạng cho xe đạp, xe điện và xe ba gác.",
            },
            {
              icon: "▣",
              title: "Hàng sẵn kho",
              description:
                "Dễ dàng kiểm tra sản phẩm và số lượng trước khi đặt.",
            },
            {
              icon: "⚙",
              title: "Tư vấn đúng phụ tùng",
              description: "Hỗ trợ tìm đúng loại phụ tùng theo nhu cầu.",
            },
            {
              icon: "→",
              title: "Giao hàng",
              description: "Hỗ trợ đóng hàng và giao phụ tùng đến khách hàng.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-600 dark:bg-slate-700">
                {item.icon}
              </div>

              <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-white">
                {item.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          CTA
      ===================================================== */}

      <section className="container mx-auto px-4 pb-14 md:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-6 py-12 md:px-12 md:py-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />

          <div className="absolute -bottom-32 right-20 h-72 w-72 rounded-full bg-white/10" />

          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-100">
                Cần tìm phụ tùng?
              </p>

              <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
                Đã chạy phải chất
              </h2>

              <p className="mt-3 text-sm leading-6 text-blue-100 md:text-base">
                Khám phá danh mục phụ tùng của Nhật Khang Bike và tìm sản phẩm
                phù hợp với xe của bạn.
              </p>
            </div>

            <Link
              to="/products"
              className="shrink-0 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-blue-600 shadow-lg transition hover:bg-gray-100"
            >
              Xem sản phẩm
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
