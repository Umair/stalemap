import * as React from "react";

type PhotoProps = {
  id: string;
  src: string;
  alt: string;
  size: "thumb" | "large";
};

const widths = { thumb: 240, large: 1200 } as const;

/** Shared-element transition: the same name on the grid and the photo page makes React morph one into the other. */
export function Photo({ id, src, alt, size }: PhotoProps) {
  return (
    <React.ViewTransition name={`gallery-image-${id}`} share="auto" default="none">
      <figure className={`photo photo-${size}`}>
        <img src={src} alt={alt} width={widths[size]} data-photo={id} />
      </figure>
    </React.ViewTransition>
  );
}
