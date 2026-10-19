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

articleSchema.pre("validate", async function () {
  if (!this.slug && this.title) {
    this.slug = this.title
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .join("-")
      .toLowerCase();
  }
  if (this.status === "published" && !this.body?.trim()) {
    this.invalidate("body", "A published article needs a body");
  }
});

export const Article = model("Article", articleSchema);
