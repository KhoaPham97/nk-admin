import { FC, useRef } from "react";
import { Product } from "../models/Product";

interface Props {
  products: Product[];
  onChange: (sorted: Product[]) => void;
}

const SortProducts: FC<Props> = ({ products, onChange }) => {
  const sortRef = useRef<HTMLSelectElement>(null);

  const sortProducts = (sortValue: string) => {
    let sorted: Product[] = [...products];

    if (sortValue === "asc") {
      sorted = sorted.sort((a, b) => {
        const aPrice = a.price - (a.price * (a.discountPercentage ?? 0)) / 100;
        const bPrice = b.price - (b.price * (b.discountPercentage ?? 0)) / 100;
        return aPrice - bPrice;
      });
    } else if (sortValue === "desc") {
      sorted = sorted.sort((a, b) => {
        const aPrice = a.price - (a.price * (a.discountPercentage ?? 0)) / 100;
        const bPrice = b.price - (b.price * (b.discountPercentage ?? 0)) / 100;
        return bPrice - aPrice;
      });
    } else {
      sorted = sorted.sort((a, b) => a.id - b.id);
    }

    onChange(sorted);
  };

  return (
    <select
      ref={sortRef}
      className="border border-black dark:border-white rounded p-1 dark:text-white dark:bg-slate-600"
      onChange={(e) => sortProducts(e.target.value)}
    >
      <option value="default">Mặc định</option>
      <option value="asc">Giá Thấp-Cao</option>
      <option value="desc">Giá Cao-Thấp</option>
    </select>
  );
};

export default SortProducts;
