import { Product } from "./models/product.ts";

/** Query-string params of GET /products, e.g. ?category=lamps&minPrice=20&maxPrice=100&inStock=true&minRating=4 */
export interface ProductSearchParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  minRating?: string;
}

/** Builds the product search query; the route adds sorting and paging and runs it. */
export function searchProducts(params: ProductSearchParams) {
  const query = Product.find();
  if (params.category) query.where("category").equals(params.category);
  if (params.minPrice) query.where("price").gte(parseFloat(params.minPrice));
  if (params.maxPrice) query.where("price").lte(parseFloat(params.maxPrice));
  if (params.inStock) query.where("inStock").equals(params.inStock === "true");
  if (params.minRating) query.where("rating").gte(parseFloat(params.minRating));
  return query;
}
