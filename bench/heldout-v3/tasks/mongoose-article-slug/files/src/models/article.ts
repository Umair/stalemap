import { Schema, model } from "mongoose";

export const articleSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    body: String,
    tags: [String],
  },
  { timestamps: true },
);

export const Article = model("Article", articleSchema);
