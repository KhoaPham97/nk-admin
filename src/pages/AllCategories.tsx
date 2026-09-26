import { FC, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/hooks";

import { addCategories } from "../redux/features/productSlice";
import { updateLoading } from "../redux/features/homeSlice";
import { API_ENDPOINTS } from "../api";

interface Category {
  _id: string;
  name: string;
  type: string;
  image?: string;
  description?: string;
}

interface CategoryGroup {
  type: string;
  title: string;
  description: string;
  image: string;
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    type: "1",
    title: "Phụ tùng xe đạp",
    description:
      "Bạc đạn, sên, líp, phanh, bàn đạp và các loại phụ tùng xe đạp.",
    image: "/images/categories/bicycle.jpg",
  },
  {
    type: "2",
    title: "Phụ tùng xe điện",
    description:
      "Motor, controller, tay ga, bánh xe, điện và các linh kiện xe điện.",
    image: "/images/categories/electric.jpg",
  },
  {
    type: "3",
    title: "Phụ tùng xe ba gác",
    description:
      "Bạc đạn, chữ thập, cầu, phanh và các loại phụ tùng xe ba gác.",
    image: "/images/categories/tricycle.jpg",
  },
];

// =========================================================
// ẢNH MẶC ĐỊNH CHO CATEGORY
// =========================================================

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  "1": "/images/categories/bicycle.jpg",
  "2": "/images/categories/electric.jpg",
  "3": "/images/categories/tricycle.jpg",
};

// =========================================================
// LẤY URL ẢNH
// =========================================================

const getCategoryImage = (category: Category): string => {
  if (!category?.image) {
    return (
      DEFAULT_CATEGORY_IMAGES[String(category?.type)] ||
      "/images/categories/default.jpg"
    );
  }

  const image = String(category.image).trim();

  if (!image) {
    return (
      DEFAULT_CATEGORY_IMAGES[String(category?.type)] ||
      "/images/categories/default.jpg"
    );
  }

  // URL online
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  // Data URI
  if (image.startsWith("data:image")) {
    return image;
  }

  // Đã có /
  if (image.startsWith("/")) {
    return image;
  }

  // filename
  return `/images/categories/${image}`;
};

// =========================================================
// COMPONENT
// =========================================================

const AllCategories: FC = () => {
  const dispatch = useAppDispatch();

  const allCategories = useAppSelector(
    (state) => state.productReducer.categories,
  ) as Category[];

  const isLoading = useAppSelector((state) => state.homeReducer.isLoading);

  // =========================================================
  // LOAD CATEGORY
  // =========================================================

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        dispatch(updateLoading(true));

        const response = await fetch(API_ENDPOINTS.PRODUCTS_CATEGORIES);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log("📦 Categories:", data);

        dispatch(addCategories(data.categorys || []));
      } catch (error) {
        console.error("❌ Lỗi lấy danh mục:", error);
      } finally {
        dispatch(updateLoading(false));
      }
    };

    if (!allCategories || allCategories.length === 0) {
      fetchCategories();
    }
  }, [allCategories, dispatch]);

  // =========================================================
  // GET CATEGORY
  // =========================================================

  const getCategories = (type: string) => {
    return [...(allCategories || [])]
      .filter((category) => String(category.type) === String(type))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  };

  // =========================================================
  // CATEGORY NAME
  // =========================================================

  const getCategoryDisplayName = (name: string, type: string) => {
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

  // =========================================================
  // IMAGE ERROR
  // =========================================================

  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
    type: string,
  ) => {
    const image = event.currentTarget;

    const fallback =
      DEFAULT_CATEGORY_IMAGES[type] || "/images/categories/default.jpg";

    if (image.src.endsWith(fallback)) {
      return;
    }

    image.src = fallback;
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-[83vh] bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 pt-8 md:pt-12">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">
            Nhật Khang Bike
          </p>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white md:text-4xl lg:text-5xl">
            Danh mục sản phẩm
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400 md:text-base">
            Khám phá các loại phụ tùng xe đạp, xe điện và xe ba gác tại Nhật
            Khang Bike.
          </p>
        </div>

        {/* =====================================================
            LOADING
        ===================================================== */}

        {isLoading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Đang tải danh mục...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-14 pb-14">
            {/* =================================================
                CATEGORY GROUP
            ================================================= */}

            {CATEGORY_GROUPS.map((group) => {
              const categories = getCategories(group.type);

              return (
                <section key={group.type}>
                  {/* ==========================================
                      BIG CATEGORY BANNER
                  ========================================== */}

                  <div className="group relative overflow-hidden rounded-2xl bg-black shadow-lg">
                    <img
                      src={group.image}
                      alt={group.title}
                      className="h-[240px] w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-90 md:h-[340px]"
                      onError={(event) => handleImageError(event, group.type)}
                    />

                    {/* Overlay */}

                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />

                    {/* Content */}

                    <div className="absolute inset-0 flex items-center">
                      <div className="max-w-xl px-6 md:px-10">
                        <span className="inline-flex rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
                          Danh mục
                        </span>

                        <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                          {group.title}
                        </h2>

                        <p className="mt-3 max-w-lg text-sm leading-6 text-gray-200 md:text-base">
                          {group.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ==========================================
                      CATEGORY HEADER
                  ========================================== */}

                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Danh mục phụ tùng
                      </h3>

                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {categories.length} danh mục
                      </p>
                    </div>
                  </div>

                  {/* ==========================================
                      CATEGORY CARDS
                  ========================================== */}

                  {categories.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {categories.map((category) => {
                        const displayName = getCategoryDisplayName(
                          category.name,
                          group.type,
                        );

                        const imageUrl = getCategoryImage(category);

                        return (
                          <Link
                            key={category._id}
                            to={`/category/${category._id}`}
                            state={{
                              category,
                            }}
                            className="group/card block h-full"
                          >
                            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
                              {/* =================================
                                  IMAGE
                              ================================= */}

                              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-slate-700">
                                <img
                                  src={imageUrl}
                                  alt={displayName}
                                  loading="lazy"
                                  className="h-full w-full object-cover transition duration-500 group-hover/card:scale-110"
                                  onError={(event) =>
                                    handleImageError(event, group.type)
                                  }
                                />

                                {/* Gradient */}

                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-70" />

                                {/* Type */}

                                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-800 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-white">
                                  {group.title.replace("Phụ tùng ", "")}
                                </span>
                              </div>

                              {/* =================================
                                  CONTENT
                              ================================= */}

                              <div className="flex flex-1 flex-col p-4">
                                <h4 className="min-h-[48px] text-base font-semibold leading-6 text-gray-900 transition-colors group-hover/card:text-blue-600 dark:text-white">
                                  {displayName}
                                </h4>

                                {category.description ? (
                                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500 dark:text-gray-400">
                                    {category.description}
                                  </p>
                                ) : (
                                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-400 dark:text-gray-500">
                                    Phụ tùng {displayName.toLowerCase()} chính
                                    hãng và chất lượng.
                                  </p>
                                )}

                                {/* Bottom */}

                                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-700">
                                  <span className="text-sm font-semibold text-blue-600">
                                    Xem sản phẩm
                                  </span>

                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-all group-hover/card:bg-blue-600 group-hover/card:text-white dark:bg-slate-700">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                      className="h-4 w-4 transition-transform group-hover/card:translate-x-0.5"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Chưa có danh mục sản phẩm.
                      </p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllCategories;
