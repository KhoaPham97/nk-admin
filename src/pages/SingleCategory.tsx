import { FC, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../redux/hooks";
import { Product } from "../models/Product";
import { useAppSelector } from "../redux/hooks";
import { updateLoading } from "../redux/features/homeSlice";
import SortProducts from "../components/SortProducts";
import PaginatedProducts from "../components/PaginatedProducts";
import { API_ENDPOINTS } from "../api";
import { useLocation } from "react-router";

const SingleCategory: FC = (props) => {
  const dispatch = useAppDispatch();
  const { slug } = useParams();
  const [productList, setProductList] = useState<Product[]>([]);
  const isLoading = useAppSelector((state) => state.homeReducer.isLoading);
  const navigate = useNavigate();
  let data = useLocation();
  useEffect(() => {
    const fetchProducts = () => {
      dispatch(updateLoading(true));
      fetch(`${API_ENDPOINTS.PRODUCTS_CATEGORY_ID.replace(":id", slug || "")}`)
        .then((res) => res.json())
        .then((data) => {
          const { products } = data;
          let formatP = products.map((i: any) => ({ ...i, id: i._id }));
          setProductList(formatP);
          dispatch(updateLoading(false));
        });
    };

    fetchProducts();
  }, [slug, dispatch]);

  return (
    <div className="container mx-auto min-h-[83vh] p-4 ">
      <div className="flex items-center justify-between space-x-2 text-lg dark:text-white">
        <div>
          <button
            onClick={() => {
              navigate("/categories");
            }}
          >
            Danh mục
          </button>
          <span> {">"} </span>
          <span className="font-bold">{data.state.category.name}</span>
        </div>
        <SortProducts products={productList} onChange={setProductList} />
      </div>
      {/* {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin mt-32 rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : (<div className="grid gap-4 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 my-2">
        {productList?.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>)} */}
      <PaginatedProducts
        products={productList}
        isLoading={isLoading}
        initialRows={5}
      />
    </div>
  );
};

export default SingleCategory;
