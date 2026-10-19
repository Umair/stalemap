type PhotoProps = {
  id: string;
  src: string;
  alt: string;
  size: "thumb" | "large";
};

const widths = { thumb: 240, large: 1200 } as const;

/** The same view-transition-name on the grid and the photo page morphs one into the other in the layout's transition. */
export function Photo({ id, src, alt, size }: PhotoProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={widths[size]}
      className={`photo photo-${size}`}
      data-photo={id}
      style={{ viewTransitionName: `photo-${id}` }}
    />
  );
}
