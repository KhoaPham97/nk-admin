import { useAppSelector } from "../redux/hooks";
import ProductList from "./ProductList";

const EbikeProducts = () => {
  const ebikeProducts = useAppSelector(
    (state) => state.productReducer.ebikeProducts,
  );

  return (
    <ProductList
      title="Phụ tùng xe điện"
      products={ebikeProducts}
      isSlide={true}
      type="2"
    />
  );
};

export default EbikeProducts;
