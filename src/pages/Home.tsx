import { FC, useEffect, useState } from "react";

import BikeProducts from "../components/BikeProducts";
import EbikeProducts from "../components/EbikeProducts";
import ThreeWheeleProducts from "../components/ThreeWheeleProducts";

import { useAppDispatch } from "../redux/hooks";
import {
  updateEbikeList,
  updateBikeList,
  updateThreeWheeleList,
} from "../redux/features/productSlice";

import { API_ENDPOINTS } from "../api";
import toast from "react-hot-toast";

// =====================================================
// QUAN TRỌNG:
// Promise được đặt ngoài component.
// React StrictMode có mount lại Home thì Promise này
// vẫn được giữ nguyên.
// =====================================================

let productsRequest: Promise<any[]> | null = null;

const fetchProductsOnce = () => {
  if (!productsRequest) {
    productsRequest = Promise.all([
      fetch(`${API_ENDPOINTS.PRODUCTS}?type=1&limit=10`),
      fetch(`${API_ENDPOINTS.PRODUCTS}?type=2&limit=10`),
      fetch(`${API_ENDPOINTS.PRODUCTS}?type=3&limit=10`),
    ]).then(async ([bikeRes, ebikeRes, threeWRes]) => {
      if (!bikeRes.ok || !ebikeRes.ok || !threeWRes.ok) {
        throw new Error("Không thể tải dữ liệu sản phẩm");
      }

      return Promise.all([bikeRes.json(), ebikeRes.json(), threeWRes.json()]);
    });
  }

  return productsRequest;
};

const Home: FC = () => {
  const dispatch = useAppDispatch();

  const [isMount, setMount] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        // Chỉ toast loading một lần
        toast.loading("Đang tải dữ liệu ...", {
          id: "loading-products",
        });

        const [bikeData, ebikeData, threeWData] = await fetchProductsOnce();

        if (cancelled) {
          return;
        }

        const convertProducts = (products: any[]) => {
          return products.map((product: any) => ({
            id: product._id,
            title: product.title,
            images: product.images,
            price: product.price,
            rating: product.rating,
            thumbnail: product.thumbnail,
            description: product.description,
            category: product.category,
            discountPercentage: 0.1,
            qty: product.qty ?? 0,
          }));
        };

        const productListBike = convertProducts(bikeData.products ?? []);

        const productListEBike = convertProducts(ebikeData.products ?? []);

        const product3W = convertProducts(threeWData.products ?? []);

        dispatch(updateBikeList(productListBike));
        dispatch(updateEbikeList(productListEBike));
        dispatch(updateThreeWheeleList(product3W));

        setMount(true);

        toast.success("Tải thành công", {
          id: "loading-products",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Fetch products error:", error);

        toast.error("Không thể tải dữ liệu sản phẩm", {
          id: "loading-products",
        });
      }
    };

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (!isMount) {
    return (
      <div className="flex min-h-[300px] items-center justify-center dark:bg-slate-800">
        <div className="text-gray-500">Đang tải sản phẩm...</div>
      </div>
    );
  }

  return (
    <div className="dark:bg-slate-800">
      <BikeProducts />
      <EbikeProducts />
      <ThreeWheeleProducts />
      <br />
    </div>
  );
};

export default Home;
