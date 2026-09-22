import { useAppSelector } from "../redux/hooks";
import ProductList from "./ProductList";

const BikeProducts = () => {
  const bikeProducts = useAppSelector(
    (state) => state.productReducer.bikeProducts,
  );

  return (
    <ProductList
      title="Phụ tùng xe đạp"
      products={bikeProducts}
      isSlide={true}
      type="1"
    />
  );
};

export default BikeProducts;
