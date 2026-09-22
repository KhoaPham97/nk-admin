import { FC } from "react";
import ProductCard from "./ProductCard";
import LazyloadProducts from "../pages/LazyloadProducts";

// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";
// Import Swiper styles
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/pagination";

import "../App.css";
import { Link } from "react-router-dom";

// import required modules
import { Autoplay, Pagination, Navigation } from "swiper/modules";
const ProductList: FC<{
  title: string;
  products: any;
  isSlide: boolean;
  type?: string;
}> = ({ title, products, isSlide = false, type = "all" }) => {
  const renderSlide = () => {
    return (
      <div className="container mt-8 mx-auto px-4 dark:bg-slate-800">
        <div className="sm:flex items-center justify-center">
          <h2 className="text-4xl font-medium font-lora dark:text-white py-2">
            {title}
          </h2>
        </div>
        <div>
          <div className="sm:flex items-center justify-end">
            <Link
              to={`/list-product/${type}`}
              className="text-xl font-bold"
              data-test="main-categories"
            >
              Xem tất cả
            </Link>
            <a
              className="text-2xl font-medium font-lora dark:text-white py-2 cursor-pointer"
              onClick={() => {}}
            ></a>
          </div>
          <Swiper
            slidesPerView={1}
            breakpoints={{
              640: {
                slidesPerView: 2,
              },
              768: {
                slidesPerView: 4,
              },
              1024: {
                slidesPerView: 5,
              },
            }}
            spaceBetween={30}
            // pagination={{
            //   clickable: true,
            // }}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
            // navigation={true}
            modules={[Autoplay, Pagination, Navigation]}
            className="mySwiper"
          >
            {products?.map((product: any) => (
              <SwiperSlide>
                <ProductCard
                  key={product.id}
                  id={product.id}
                  category={product.category}
                  title={product.title}
                  price={product.price}
                  thumbnail={product.thumbnail}
                  rating={product.rating}
                  discountPercentage={product.discountPercentage}
                  qty={+product.qty}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    );
  };
  const renderDefault = () => {
    return (
      <div className="container mt-8 mx-auto px-4 dark:bg-slate-800">
        <div className="sm:flex items-center justify-between">
          <h2 className="text-4xl font-medium font-lora dark:text-white py-2">
            {title}
          </h2>
        </div>
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4"
          data-test="product-list-container"
        >
          {products?.map((product: any) => (
            <ProductCard
              key={product.id}
              id={product.id}
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
    );
  };
  return isSlide ? renderSlide() : renderDefault();
};

export default ProductList;
