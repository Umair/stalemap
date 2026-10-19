import Image from "next/image";

export function Avatar({ src, name }: { src: string; name: string }) {
  return <Image src={src} alt={name} width={48} height={48} className="avatar" />;
}
