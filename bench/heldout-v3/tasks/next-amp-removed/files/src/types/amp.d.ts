import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "amp-img": { src: string; alt: string; width: number; height: number; layout?: string };
    }
  }
}
