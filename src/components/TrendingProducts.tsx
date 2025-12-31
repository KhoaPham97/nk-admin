import { useAppSelector } from "../redux/hooks";
import ProductList from "./ProductList";

const TrendingProducts = () => {
  const featuredProducts = useAppSelector(
    (state) => state.productReducer.featuredProducts
  );

  return <ProductList title="Sản phẩm nổi bật" products={featuredProducts} />;
};

export default TrendingProducts;
