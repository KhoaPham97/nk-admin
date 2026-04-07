import { FC, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { addCategories } from "../redux/features/productSlice";
import { Link } from "react-router-dom";
import { updateLoading } from "../redux/features/homeSlice";
import { API_ENDPOINTS } from "../api";

const AllCategories: FC = () => {
  const dispatch = useAppDispatch();

  const allCategories = useAppSelector(
    (state) => state.productReducer.categories
  );
  const isLoading = useAppSelector((state) => state.homeReducer.isLoading);

  useEffect(() => {
    const fetchCategories = () => {
      dispatch(updateLoading(true));
      fetch(`${API_ENDPOINTS.PRODUCTS_CATEGORIES}`)
        .then((res) => res.json())
        .then((data) => {
          dispatch(addCategories(data.categorys));
          dispatch(updateLoading(false));
        });
    };
    if (allCategories.length === 0) fetchCategories();
  }, [allCategories, dispatch]);
  let cateBike = allCategories
    .filter((i) => i.type === "1")
    .sort((a: any, b) => a.name.localeCompare(b.name));

  let cateEBike = allCategories
    .filter((i) => i.type === "2")
    .sort((a: any, b) => a.name.localeCompare(b.name));
  return (
    <div className="container mx-auto min-h-[83vh] p-4 ">
      <span className="text-lg dark:text-white">Danh mục</span>
      <div className="sm:flex items-center justify-between">
        <h2 className="text-4xl font-medium font-lora dark:text-white">
          Phụ tùng xe đạp
        </h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin mt-32 rounded-fƒƒull h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : (
        <div className="grid xl:grid-cols-6 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-2 my-2">
          {allCategories &&
            cateBike.map((category: any) => (
              <div
                key={category.name}
                className="bg-gray-100 dark:bg-slate-600 dark:text-white px-4 py-4  mr-2 mb-2"
              >
                <div className="text-lg">
                  {category.name.split("Phụ tùng xe đạp - ")}
                </div>
                <Link
                  to={{ pathname: `/category/${category._id}` }}
                  state={{
                    category,
                  }}
                  className="hover:underline text-blue-500"
                >
                  Xem sản phẩm
                </Link>
              </div>
            ))}
        </div>
      )}
      <div className="sm:flex items-center justify-between">
        <h2 className="text-4xl font-medium font-lora dark:text-white">
          Phụ tùng xe điện
        </h2>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin mt-32 rounded-fƒƒull h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : (
        <div className="grid xl:grid-cols-6 lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-2 my-2">
          {allCategories &&
            cateEBike.map((category: any) => (
              <div
                key={category.name}
                className="bg-gray-100 dark:bg-slate-600 dark:text-white px-4 py-4  mr-2 mb-2"
              >
                <div className="text-lg">
                  {category.name.split("Phụ tùng xe điện - ")}
                </div>
                <Link
                  to={{ pathname: `/category/${category._id}` }}
                  state={{
                    category,
                  }}
                  className="hover:underline text-blue-500"
                >
                  Xem sản phẩm
                </Link>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default AllCategories;
