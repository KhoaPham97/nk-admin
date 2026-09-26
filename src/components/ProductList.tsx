import { FC } from "react";
import { Link } from "react-router-dom";

import ProductCard from "./ProductCard";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";

import { FiArrowRight } from "react-icons/fi";

interface ProductListProps {
  title: string;
  products: any[];
  isSlide?: boolean;
  type?: string;
}

const ProductList: FC<ProductListProps> = ({
  title,
  products = [],
  isSlide = false,
  type = "all",
}) => {
  // =========================================================
  // PRODUCT DATA
  // =========================================================

  const productList = Array.isArray(products) ? products : [];

  // =========================================================
  // PRODUCT CARD
  // =========================================================

  const renderProductCard = (product: any) => {
    if (!product) return null;

    return (
      <ProductCard
        {...product}
        _id={product._id || product.id}
        category={product.category}
        title={product.title}
        price={product.price}
        thumbnail={product.thumbnail}
        images={Array.isArray(product.images) ? product.images : []}
        rating={product.rating}
        discountPercentage={product.discountPercentage}
        qty={product.qty}
        variants={Array.isArray(product.variants) ? product.variants : []}
      />
    );
  };

  // =========================================================
  // HEADER
  // =========================================================

  const renderHeader = () => {
    return (
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="h-7 w-1 rounded-full bg-blue-600" />

            <h2
              className="
                truncate
                text-xl
                font-bold
                tracking-tight
                text-gray-900
                sm:text-2xl
                dark:text-white
              "
            >
              {title}
            </h2>
          </div>

          <div className="ml-4 mt-2 h-px w-16 bg-blue-600" />
        </div>

        <Link
          to={`/list-product/${type}`}
          data-test="main-categories"
          className="
            group
            flex
            shrink-0
            items-center
            gap-1.5
            rounded-lg
            px-2
            py-2
            text-sm
            font-semibold
            text-blue-600
            transition
            hover:bg-blue-50
            hover:text-blue-700
            dark:hover:bg-slate-800
          "
        >
          <span>Xem tất cả</span>

          <FiArrowRight
            size={17}
            className="
              transition-transform
              duration-200
              group-hover:translate-x-1
            "
          />
        </Link>
      </div>
    );
  };

  // =========================================================
  // EMPTY
  // =========================================================

  if (productList.length === 0) {
    return (
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        {renderHeader()}

        <div
          className="
            flex
            min-h-[180px]
            items-center
            justify-center
            rounded-2xl
            border
            border-dashed
            border-gray-200
            bg-gray-50
            text-sm
            text-gray-400
            dark:border-slate-700
            dark:bg-slate-800
          "
        >
          Chưa có sản phẩm
        </div>
      </section>
    );
  }

  // =========================================================
  // SLIDER
  // =========================================================

  const renderSlide = () => {
    return (
      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        {renderHeader()}

        <div className="relative">
          <Swiper
            slidesPerView={1.2}
            slidesPerGroup={1}
            spaceBetween={14}
            loop={false}
            speed={600}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            navigation={{
              nextEl: ".product-next",
              prevEl: ".product-prev",
            }}
            modules={[Autoplay, Navigation]}
            breakpoints={{
              480: {
                slidesPerView: 1.5,
                slidesPerGroup: 1,
                spaceBetween: 16,
              },

              640: {
                slidesPerView: 2,
                slidesPerGroup: 1,
                spaceBetween: 18,
              },

              768: {
                slidesPerView: 3,
                slidesPerGroup: 1,
                spaceBetween: 20,
              },

              1024: {
                slidesPerView: 4,
                slidesPerGroup: 1,
                spaceBetween: 22,
              },

              1280: {
                slidesPerView: 5,
                slidesPerGroup: 1,
                spaceBetween: 22,
              },
            }}
            className="!pb-2"
          >
            {productList.map((product: any, index: number) => (
              <SwiperSlide
                key={product?._id || product?.id || `product-${index}`}
                className="!h-auto"
              >
                <div
                  className="
                      h-full
                      overflow-hidden
                      rounded-2xl
                      border
                      border-gray-100
                      bg-white
                      transition
                      duration-300
                      hover:-translate-y-1
                      hover:shadow-lg
                      dark:border-slate-700
                      dark:bg-slate-800
                    "
                >
                  {renderProductCard(product)}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* PREV */}

          <button
            type="button"
            className="
              product-prev
              absolute
              left-1
              top-1/2
              z-10
              hidden
              h-10
              w-10
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-gray-200
              bg-white
              text-gray-700
              shadow-md
              transition
              hover:bg-blue-600
              hover:text-white
              disabled:cursor-not-allowed
              disabled:opacity-40
              md:flex
              dark:border-slate-700
              dark:bg-slate-800
              dark:text-white
            "
            aria-label="Sản phẩm trước"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* NEXT */}

          <button
            type="button"
            className="
              product-next
              absolute
              right-1
              top-1/2
              z-10
              hidden
              h-10
              w-10
              -translate-y-1/2
              items-center
              justify-center
              rounded-full
              border
              border-gray-200
              bg-white
              text-gray-700
              shadow-md
              transition
              hover:bg-blue-600
              hover:text-white
              disabled:cursor-not-allowed
              disabled:opacity-40
              md:flex
              dark:border-slate-700
              dark:bg-slate-800
              dark:text-white
            "
            aria-label="Sản phẩm tiếp theo"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </section>
    );
  };

  // =========================================================
  // GRID
  // =========================================================

  const renderDefault = () => {
    return (
      <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
        {renderHeader()}

        <div
          className="
            grid
            grid-cols-2
            gap-3
            sm:grid-cols-2
            sm:gap-5
            md:grid-cols-3
            lg:grid-cols-4
            xl:grid-cols-5
          "
          data-test="product-list-container"
        >
          {productList.map((product: any, index: number) => (
            <div
              key={product?._id || product?.id || `product-${index}`}
              className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-gray-100
                  bg-white
                  transition
                  duration-300
                  hover:-translate-y-1
                  hover:shadow-lg
                  dark:border-slate-700
                  dark:bg-slate-800
                "
            >
              {renderProductCard(product)}
            </div>
          ))}
        </div>
      </section>
    );
  };

  // =========================================================
  // RENDER
  // =========================================================

  return isSlide ? renderSlide() : renderDefault();
};

export default ProductList;
