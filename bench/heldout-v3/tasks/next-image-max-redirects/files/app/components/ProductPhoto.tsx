import Image from "next/image";

export function ProductPhoto({ sku, name }: { sku: string; name: string }) {
  return <Image src={`https://media.example.com/p/${sku}`} alt={name} width={800} height={800} sizes="(max-width: 768px) 100vw, 800px" />;
}
