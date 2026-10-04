import { FC, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  shortTitle: string;
  description: string;
  image: string;
  color: string;
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    type: "1",
    title: "Phụ tùng xe đạp",
    shortTitle: "Xe đạp",
    description:
      "Bạc đạn, sên, líp, phanh, bàn đạp và các loại phụ tùng xe đạp.",
    image: "/images/categories/bicycle.jpg",
    color: "blue",
  },
  {
    type: "2",
    title: "Phụ tùng xe điện",
    shortTitle: "Xe điện",
    description:
      "Motor, controller, tay ga, bánh xe, điện và các linh kiện xe điện.",
    image: "/images/categories/electric.jpg",
    color: "emerald",
  },
  {
    type: "3",
    title: "Phụ tùng xe ba gác",
    shortTitle: "Xe ba gác",
    description:
      "Bạc đạn, chữ thập, cầu, phanh và các loại phụ tùng xe ba gác.",
    image: "/images/categories/tricycle.jpg",
    color: "orange",
  },
];

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  "1": "/images/categories/phu-tung-xe-dap.png",
  "2": "/images/categories/phu-tung-xe-dien.png",
  "3": "/images/categories/phu-tung-xe-ba-gac.png",
};

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

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image.startsWith("data:image")) {
    return image;
  }

  if (image.startsWith("/")) {
    return image;
  }

  return `/images/categories/${image}`;
};

const AllCategories: FC = () => {
  const dispatch = useAppDispatch();

  const [searchParams] = useSearchParams();

  const selectedType = searchParams.get("type");

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
  // VISIBLE GROUP
  // =========================================================

  const visibleGroups = CATEGORY_GROUPS.filter((group) => {
    if (!selectedType) {
      return true;
    }

    return String(group.type) === String(selectedType);
  });

  // =========================================================
  // TOTAL CATEGORY
  // =========================================================

  const totalVisibleCategories = visibleGroups.reduce(
    (total, group) => total + getCategories(group.type).length,
    0,
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      {/* =====================================================
          HERO HEADER
      ===================================================== */}

      <div className="border-b border-gray-100 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 dark:border-blue-900/40 dark:bg-blue-950/40">
              <span className="h-2 w-2 rounded-full bg-blue-600" />

              <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                Nhật Khang Bike
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white md:text-5xl">
              Danh mục sản phẩm
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400 md:text-base">
              Tìm nhanh phụ tùng phù hợp cho xe đạp, xe điện và xe ba gác tại
              Nhật Khang Bike.
            </p>

            {/* SUMMARY */}

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="font-bold text-gray-900 dark:text-white">
                  {visibleGroups.length}
                </span>

                <span className="ml-1 text-gray-500 dark:text-gray-400">
                  nhóm sản phẩm
                </span>
              </div>

              <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <span className="font-bold text-gray-900 dark:text-white">
                  {totalVisibleCategories}
                </span>

                <span className="ml-1 text-gray-500 dark:text-gray-400">
                  danh mục
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* ===================================================
            LOADING
        =================================================== */}

        {isLoading ? (
          <div className="space-y-8">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-3xl bg-white shadow-sm dark:bg-slate-900"
              >
                <div className="h-[260px] animate-pulse bg-gray-200 dark:bg-slate-800 md:h-[360px]" />

                <div className="grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
                  {[1, 2, 3, 4].map((card) => (
                    <div
                      key={card}
                      className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-12 md:space-y-16">
            {visibleGroups.map((group) => {
              const categories = getCategories(group.type);

              return (
                <section key={group.type}>
                  {/* =================================================
    BIG BANNER
================================================= */}

                  <Link
                    to={`/categories?type=${group.type}`}
                    className="
    group
    relative
    block
    overflow-hidden
    rounded-2xl
    bg-white
    shadow-md
    ring-1
    ring-gray-100
    dark:bg-slate-900
    dark:ring-slate-800
    md:rounded-[28px]
    md:shadow-xl
  "
                    onClick={() => {
                      window.scrollTo({
                        top: 0,
                        behavior: "instant",
                      });
                    }}
                  >
                    <div className="relative w-full overflow-hidden">
                      <img
                        src={group.image}
                        alt={group.title}
                        className="
        block
        h-auto
        w-full
        object-contain
        transition-transform
        duration-700
        group-hover:scale-[1.02]
      "
                        onError={(event) => handleImageError(event, group.type)}
                      />

                      {/* Overlay */}
                      <div
                        className="
        pointer-events-none
        absolute
        inset-0
        bg-gradient-to-t
        from-black/70
        via-black/15
        to-transparent
        sm:bg-gradient-to-r
        sm:from-black/70
        sm:via-black/25
        sm:to-transparent
      "
                      />

                      {/* Nội dung */}
                      <div
                        className="
        absolute
        inset-x-0
        bottom-0
        p-4
        sm:inset-y-0
        sm:flex
        sm:items-center
        sm:p-6
        md:p-10
        lg:p-14
      "
                      >
                        <div className="max-w-xl">
                          <div
                            className="
            mb-2
            inline-flex
            items-center
            gap-1.5
            rounded-full
            border
            border-white/20
            bg-black/25
            px-2.5
            py-1
            backdrop-blur-md
            sm:mb-3
            sm:px-3
            sm:py-1.5
            md:mb-4
            md:px-4
            md:py-2
          "
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 sm:h-2 sm:w-2" />

                            <span
                              className="
              text-[8px]
              font-bold
              uppercase
              tracking-wider
              text-white
              sm:text-[10px]
              md:text-xs
            "
                            >
                              NHẬT KHANG BIKE
                            </span>
                          </div>

                          <h2
                            className="
            text-xl
            font-black
            leading-tight
            tracking-tight
            text-white
            drop-shadow-xl
            sm:text-3xl
            md:text-5xl
            lg:text-6xl
          "
                          >
                            {group.title}
                          </h2>

                          <p
                            className="
            mt-1
            max-w-md
            text-[9px]
            leading-4
            text-white/90
            sm:mt-2
            sm:text-xs
            sm:leading-5
            md:mt-4
            md:text-base
            md:leading-7
          "
                          >
                            {group.description}
                          </p>

                          <div
                            className="
            mt-2.5
            flex
            items-center
            gap-2
            sm:mt-4
            md:mt-6
          "
                          >
                            <span
                              className="
              inline-flex
              items-center
              gap-1.5
              rounded-full
              bg-white
              px-3
              py-1.5
              text-[9px]
              font-bold
              text-gray-900
              shadow-lg
              transition
              group-hover:bg-blue-600
              group-hover:text-white
              sm:px-4
              sm:py-2
              sm:text-xs
              md:px-5
              md:py-3
              md:text-sm
            "
                            >
                              Xem danh mục
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-3 w-3 sm:h-4 sm:w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M13.5 4.5 21 12l-7.5 7.5M3 12h18"
                                />
                              </svg>
                            </span>

                            <span
                              className="
              rounded-full
              border
              border-white/25
              bg-black/25
              px-2.5
              py-1.5
              text-[9px]
              font-medium
              text-white
              backdrop-blur-md
              sm:px-3
              sm:py-2
              sm:text-xs
              md:px-4
              md:py-3
              md:text-sm
            "
                            >
                              {
                                categories.filter(
                                  (category) =>
                                    String(category.type) ===
                                    String(group.type),
                                ).length
                              }{" "}
                              danh mục
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* =================================================
                      CATEGORY SECTION HEADER
                  ================================================= */}

                  <div className="mt-7 flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="h-7 w-1 rounded-full bg-blue-600" />

                        <h3 className="text-xl font-black tracking-tight text-gray-900 dark:text-white md:text-2xl">
                          Danh mục phụ tùng
                        </h3>
                      </div>

                      <p className="mt-2 pl-4 text-sm text-gray-500 dark:text-gray-400">
                        Chọn nhóm phụ tùng bạn đang tìm kiếm
                      </p>
                    </div>

                    <span className="hidden rounded-full bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 dark:bg-slate-800 dark:text-gray-300 sm:block">
                      {categories.length} danh mục
                    </span>
                  </div>

                  {/* =================================================
                      CATEGORY CARDS
                  ================================================= */}

                  {categories.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                            onClick={() => {
                              window.scrollTo({
                                top: 0,
                                behavior: "instant",
                              });
                            }}
                            className="group/card block h-full"
                          >
                            <div
                              className="
                                flex
                                h-full
                                flex-col
                                overflow-hidden
                                rounded-2xl
                                border
                                border-gray-200
                                bg-white
                                shadow-sm
                                transition-all
                                duration-300
                                hover:-translate-y-1.5
                                hover:border-blue-300
                                hover:shadow-xl
                                dark:border-slate-800
                                dark:bg-slate-900
                                dark:hover:border-blue-700
                              "
                            >
                              {/* IMAGE */}

                              <div className="relative aspect-[1.15/1] overflow-hidden bg-gray-100 dark:bg-slate-800">
                                <img
                                  src={imageUrl}
                                  alt={displayName}
                                  loading="lazy"
                                  className="
                                    h-full
                                    w-full
                                    object-cover
                                    transition-transform
                                    duration-500
                                    ease-out
                                    group-hover/card:scale-110
                                  "
                                  onError={(event) =>
                                    handleImageError(event, group.type)
                                  }
                                />

                                {/* IMAGE OVERLAY */}

                                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-70" />

                                {/* TYPE BADGE */}

                                <div className="absolute left-3 top-3">
                                  <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-gray-800 shadow-sm backdrop-blur-md dark:bg-slate-900/95 dark:text-white">
                                    {group.shortTitle}
                                  </span>
                                </div>

                                {/* ARROW */}

                                <div
                                  className="
                                  absolute
                                  bottom-3
                                  right-3
                                  flex
                                  h-8
                                  w-8
                                  translate-y-2
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-white/95
                                  text-gray-800
                                  opacity-0
                                  shadow-lg
                                  transition-all
                                  duration-300
                                  group-hover/card:translate-y-0
                                  group-hover/card:opacity-100
                                "
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="h-4 w-4"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                    />
                                  </svg>
                                </div>
                              </div>

                              {/* CONTENT */}

                              <div className="flex flex-1 flex-col p-3.5 md:p-4">
                                <h4
                                  className="
                                    line-clamp-2
                                    min-h-[42px]
                                    text-sm
                                    font-bold
                                    leading-5
                                    text-gray-900
                                    transition-colors
                                    group-hover/card:text-blue-600
                                    dark:text-white
                                    dark:group-hover/card:text-blue-400
                                  "
                                >
                                  {displayName}
                                </h4>

                                {/* DESCRIPTION */}

                                {category.description ? (
                                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
                                    {category.description}
                                  </p>
                                ) : (
                                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400 dark:text-gray-500">
                                    Phụ tùng {displayName.toLowerCase()} chất
                                    lượng.
                                  </p>
                                )}

                                {/* FOOTER */}

                                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-slate-800">
                                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    Xem sản phẩm
                                  </span>

                                  <span
                                    className="
                                    flex
                                    h-7
                                    w-7
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-blue-50
                                    text-blue-600
                                    transition-all
                                    duration-300
                                    group-hover/card:bg-blue-600
                                    group-hover/card:text-white
                                    dark:bg-blue-950/50
                                  "
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                      className="h-3.5 w-3.5 transition-transform group-hover/card:translate-x-0.5"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                                      />
                                    </svg>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-7 w-7 text-gray-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 7.5l-8.25-4.5-8.25 4.5m16.5 0v9l-8.25 4.5m8.25-13.5l-8.25 4.5m0 0L3.75 7.5m8.25 4.5v9"
                          />
                        </svg>
                      </div>

                      <h4 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                        Chưa có danh mục
                      </h4>

                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Hiện chưa có phụ tùng trong nhóm này.
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
