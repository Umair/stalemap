import type { Document } from "mongoose";

export interface ChangeEvent {
  type: "saved" | "deleted";
  collection: string;
  id: string;
}

/** Builds the event we put on the queue when a document of any of our models changes. */
export function toChangeEvent(type: ChangeEvent["type"], doc: Document): ChangeEvent {
  return { type, collection: doc.collection.collectionName, id: doc.id };
}
