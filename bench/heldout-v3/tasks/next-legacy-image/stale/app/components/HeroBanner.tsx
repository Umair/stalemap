import Image from "next/legacy/image";

export function HeroBanner({ src, alt, title }: { src: string; alt: string; title: string }) {
  return (
    <section className="hero" style={{ position: "relative", height: 420 }}>
      <Image src={src} alt={alt} layout="fill" objectFit="cover" />
      <h1 className="hero-title">{title}</h1>
    </section>
  );
}
