export interface PhotoEntry {
  id: string;
  title: string;
  src: string;
}

export const photos: PhotoEntry[] = [
  { id: "fern", title: "Fern in morning light", src: "/photos/fern.jpg" },
  { id: "moss", title: "Moss on granite", src: "/photos/moss.jpg" },
  { id: "birch", title: "Birch bark", src: "/photos/birch.jpg" },
];

export function findPhoto(id: string): PhotoEntry | undefined {
  return photos.find((p) => p.id === id);
}
