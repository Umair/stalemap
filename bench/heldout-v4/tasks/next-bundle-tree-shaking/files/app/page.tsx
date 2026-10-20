import { formatPrice } from "./lib/format";

export default function Home() {
  return <h1>Plans from {formatPrice(900)}/month</h1>;
}
