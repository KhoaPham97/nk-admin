import { useAppSelector } from "../redux/hooks";
import ProductList from "./ProductList";

const ThreeWheeleProducts = () => {
  const threeWheeleProducts = useAppSelector(
    (state) => state.productReducer.threeWheeleProducts,
  );

  return (
    <ProductList
      title="Phụ tùng xe ba gác"
      products={threeWheeleProducts}
      isSlide={true}
      type="3"
    />
  );
};

export default ThreeWheeleProducts;
