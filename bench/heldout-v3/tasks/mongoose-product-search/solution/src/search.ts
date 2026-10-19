import { Product } from "./models/product.ts";

/** Query-string params of GET /products, e.g. ?category=lamps&minPrice=20&maxPrice=100&inStock=true&minRating=4 */
export interface ProductSearchParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  minRating?: string;
}

const given = (value: string | undefined): value is string => value !== undefined && value.trim() !== "";

/** Builds the product search query; the route adds sorting and paging and runs it. */
export function searchProducts(params: ProductSearchParams) {
  const { category, minPrice, maxPrice, inStock, minRating } = params;
  const price = {
    ...(given(minPrice) ? { $gte: Number(minPrice) } : {}),
    ...(given(maxPrice) ? { $lte: Number(maxPrice) } : {}),
  };
  return Product.find({
    ...(given(category) ? { category } : {}),
    ...(Object.keys(price).length > 0 ? { price } : {}),
    ...(given(inStock) ? { inStock: inStock === "true" } : {}),
    ...(given(minRating) ? { rating: { $gte: Number(minRating) } } : {}),
  });
}
