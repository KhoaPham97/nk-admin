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

const AllCategories: FC = () => {
  const dispatch = useAppDispatch();

  const allCategories = useAppSelector(
    (state) => state.productReducer.categories,
  ) as Category[];

  const isLoading = useAppSelector((state) => state.homeReducer.isLoading);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        dispatch(updateLoading(true));

        const response = await fetch(API_ENDPOINTS.PRODUCTS_CATEGORIES);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        dispatch(addCategories(data.categorys || []));
      } catch (error) {
        console.error("Lỗi lấy danh mục:", error);
      } finally {
        dispatch(updateLoading(false));
      }
    };

    if (!allCategories || allCategories.length === 0) {
      fetchCategories();
    }
  }, [allCategories, dispatch]);

  const getCategories = (type: string) => {
    return [...(allCategories || [])]
      .filter((category) => String(category.type) === type)
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  };

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

  return (
    <div className="min-h-[83vh] bg-gray-50 dark:bg-slate-900">
      {/* =========================================
          PAGE HEADER
      ========================================= */}
      <div className="container mx-auto px-4 pt-8 md:pt-12">
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

        {/* =========================================
            LOADING
        ========================================= */}
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
            {/* =========================================
                CATEGORY GROUP
            ========================================= */}
            {CATEGORY_GROUPS.map((group) => {
              const categories = getCategories(group.type);

              return (
                <section key={group.type}>
                  {/* =================================
                      BIG CATEGORY CARD
                  ================================= */}
                  <div className="group relative overflow-hidden rounded-2xl bg-black shadow-lg">
                    {/* Image */}
                    <img
                      src={group.image}
                      alt={group.title}
                      className="h-[260px] w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-90 md:h-[340px]"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />

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

                  {/* =================================
                      CATEGORY COUNT
                  ================================= */}
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

                  {/* =================================
                      CATEGORY LIST
                  ================================= */}
                  {categories.length > 0 ? (
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {categories.map((category) => {
                        const displayName = getCategoryDisplayName(
                          category.name,
                          group.type,
                        );

                        return (
                          <Link
                            key={category._id}
                            to={`/category/${category._id}`}
                            state={{
                              category,
                            }}
                            className="group/card"
                          >
                            <div className="h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800">
                              {/* Icon */}
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover/card:bg-blue-600 group-hover/card:text-white dark:bg-slate-700">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.8}
                                  stroke="currentColor"
                                  className="h-6 w-6"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                                  />

                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 5a3 3 0 006 0"
                                  />
                                </svg>
                              </div>

                              {/* Name */}
                              <h4 className="mt-5 min-h-[48px] text-lg font-semibold leading-6 text-gray-900 group-hover/card:text-blue-600 dark:text-white">
                                {displayName}
                              </h4>

                              {/* Description */}
                              {category.description && (
                                <p className="mt-2 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
                                  {category.description}
                                </p>
                              )}

                              {/* Bottom */}
                              <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-700">
                                <span className="text-sm font-medium text-blue-600">
                                  Xem sản phẩm
                                </span>

                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="h-4 w-4 text-blue-600 transition-transform group-hover/card:translate-x-1"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                  />
                                </svg>
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
