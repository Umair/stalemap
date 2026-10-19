type PhotoProps = {
  id: string;
  src: string;
  alt: string;
  size: "thumb" | "large";
};

const widths = { thumb: 240, large: 1200 } as const;

export function Photo({ id, src, alt, size }: PhotoProps) {
  return <img src={src} alt={alt} width={widths[size]} className={`photo photo-${size}`} data-photo={id} />;
}
