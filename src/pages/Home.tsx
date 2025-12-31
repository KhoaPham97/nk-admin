import { FC, useEffect } from "react";

// import HeroSection from "../components/HeroSection";
// import Features from "../components/Features";
import TrendingProducts from "../components/TrendingProducts";
import { useAppDispatch } from "../redux/hooks";
import {
  updateNewList,
  updateFeaturedList,
} from "../redux/features/productSlice";
// import { getUserInfo } from "../redux/features/authSlice";
// import { Product } from "../models/Product";
import LatestProducts from "../components/LatestProducts";
// import Banner from "../components/Banner";
import { API_ENDPOINTS } from "../api";

const Home: FC = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    const fetchProducts = () => {
      fetch(`${API_ENDPOINTS.PRODUCTS}`)
        .then((res) => res.json())
        .then(({ products }) => {
          let productListBike: any = [];
          let productListEBike: any = [];

          products.forEach((product: any) => {
            if (product.type === "1") {
              productListBike.push({
                id: product._id,
                title: product.title,
                images: product.images,
                price: product.price,
                rating: product.rating,
                thumbnail: product.thumbnail,
                description: product.description,
                category: product.category,
                discountPercentage: 0.1,
              });
            } else {
              productListEBike.push({
                id: product._id,
                title: product.title,
                images: product.images,
                price: product.price,
                rating: product.rating,
                thumbnail: product.thumbnail,
                description: product.description,
                category: product.category,
                discountPercentage: 0.1,
              });
            }
          });
          productListBike = productListBike.sort((a: any, b: any) => {
            const nameA = a.title.toUpperCase(); // ignore upper and lowercase
            const nameB = b.title.toUpperCase(); // ignore upper and lowercase

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
            // names must be equal
            return 0;
          });
          productListEBike = productListEBike.sort((a: any, b: any) => {
            const nameA = a.title.toUpperCase(); // ignore upper and lowercase
            const nameB = b.title.toUpperCase(); // ignore upper and lowercase

            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
            // names must be equal
            return 0;
          });
          dispatch(updateFeaturedList(productListBike));
          dispatch(updateNewList(productListEBike));
        });
    };
    fetchProducts();
  }, [dispatch]);

  return (
    <div className="dark:bg-slate-800">
      {/* <HeroSection /> */}
      {/* <Features /> */}
      <TrendingProducts />
      {/* <Banner /> */}
      <LatestProducts />
      <br />
    </div>
  );
};

export default Home;
