import Image from "next/image";

export function HeroBanner({ src, alt, title }: { src: string; alt: string; title: string }) {
  return (
    <section className="hero" style={{ position: "relative", height: 420 }}>
      <Image src={src} alt={alt} fill sizes="100vw" style={{ objectFit: "cover" }} />
      <h1 className="hero-title">{title}</h1>
    </section>
  );
}
