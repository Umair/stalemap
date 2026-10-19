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

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

articleSchema.pre("validate", function (next) {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  if (this.status === "published" && !this.body) return next(new Error("A published article needs a body"));
  next();
});

export const Article = model("Article", articleSchema);
