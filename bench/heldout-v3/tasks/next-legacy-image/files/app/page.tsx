import { HeroBanner } from "./components/HeroBanner";
import { ProductPhoto } from "./components/ProductPhoto";

export default function Home() {
  return (
    <main>
      <HeroBanner src="https://cdn.example.com/hero/autumn.jpg" alt="Knitwear on a wooden table" title="Autumn collection" />
      <div className="grid">
        <ProductPhoto src="https://cdn.example.com/products/scarf.jpg" alt="Wool scarf" />
        <ProductPhoto src="https://cdn.example.com/products/beanie.jpg" alt="Ribbed beanie" />
      </div>
    </main>
  );
}
