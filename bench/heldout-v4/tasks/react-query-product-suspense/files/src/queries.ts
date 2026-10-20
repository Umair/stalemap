import { queryOptions } from "@tanstack/react-query";
import { getProduct } from "./api.ts";

export const productQuery = (id: string) =>
  queryOptions({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
  });
