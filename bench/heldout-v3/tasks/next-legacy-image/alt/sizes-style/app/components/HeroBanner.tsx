import NextImage from "next/image";

const cover = { objectFit: "cover" } as const;

export function HeroBanner(props: { src: string; alt: string; title: string }) {
  return (
    <section className="hero" style={{ position: "relative", height: 420, overflow: "hidden" }}>
      <NextImage src={props.src} alt={props.alt} fill style={cover} sizes="(max-width: 1200px) 100vw, 1200px" />
      <h1 className="hero-title">{props.title}</h1>
    </section>
  );
}
