import { Category } from "./Category";
import { Product } from "./Product";

export interface ProductSlice {
  allProducts: Product[];
  ebikeProducts: Product[];
  bikeProducts: Product[];
  threeWheeleProducts: Product[];
  wishlist: Product[];
  categories: Category[];
}
