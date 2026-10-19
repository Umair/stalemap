import { Avatar } from "./components/Avatar";
import { ProductPhoto } from "./components/ProductPhoto";

export default function Home() {
  return (
    <main>
      <ProductPhoto src="https://cdn.example.com/products/lamp.jpg" alt="Brass desk lamp" />
      <p>
        <Avatar src="https://cdn.example.com/people/ada.jpg" name="Ada" /> Designed by Ada
      </p>
    </main>
  );
}
