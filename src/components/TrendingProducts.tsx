import { useAppSelector } from "../redux/hooks";
import ProductList from "./ProductList";

const TrendingProducts = () => {
  const featuredProducts = useAppSelector(
    (state) => state.productReducer.featuredProducts
  );

  return <ProductList title="Phụ tùng xe đạp" products={featuredProducts} />;
};

export default TrendingProducts;
