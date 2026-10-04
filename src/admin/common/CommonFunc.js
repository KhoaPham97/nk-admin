export const getProductPriceRange = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const prices = variants
    .map((variant) => Number(variant?.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  // Không có variant hợp lệ -> dùng price của product
  if (prices.length === 0) {
    const price = Number(product?.price);

    if (Number.isFinite(price)) {
      return {
        min: price,
        max: price,
      };
    }

    return {
      min: 0,
      max: 0,
    };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    min,
    max,
  };
};
