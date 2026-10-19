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
  // Mongoose casts the string params to the schema's types.
  return Product.find({
    ...(params.category ? { category: params.category } : {}),
    ...(params.minPrice || params.maxPrice
      ? {
          price: {
            ...(params.minPrice ? { $gte: params.minPrice } : {}),
            ...(params.maxPrice ? { $lte: params.maxPrice } : {}),
          },
        }
      : {}),
    ...(params.inStock ? { inStock: params.inStock } : {}),
    ...(params.minRating ? { rating: { $gte: params.minRating } } : {}),
  });
}
