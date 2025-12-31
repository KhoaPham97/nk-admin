import { useAppSelector } from "../redux/hooks";
import ProductList from "./ProductList";

const LatestProducts = () => {
  const newProducts = useAppSelector(
    (state) => state.productReducer.newProducts
  );

  return <ProductList title="Hàng mới về" products={newProducts} />;
};

export default LatestProducts;
