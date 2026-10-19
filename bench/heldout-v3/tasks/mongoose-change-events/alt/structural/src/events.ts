export interface ChangeEvent {
  type: "saved" | "deleted";
  collection: string;
  id: string;
}

interface StoredDocument {
  _id: { toString(): string };
  collection: { collectionName: string };
}

/** Builds the event we put on the queue when a document of any of our models changes. */
export function toChangeEvent(type: ChangeEvent["type"], doc: StoredDocument): ChangeEvent {
  const { _id, collection } = doc;
  return { type, collection: collection.collectionName, id: _id.toString() };
}
