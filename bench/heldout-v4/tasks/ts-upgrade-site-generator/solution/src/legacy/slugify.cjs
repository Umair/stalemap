// Shared with the old Node scripts in scripts/, which require() it directly.
"use strict";

/**
 * Turns a post title into a URL slug.
 * @param {string} title
 * @returns {string}
 */
function slugify(title) {
  var slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, slugify.separator)
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, slugify.maxLength).replace(/-+$/, "");
}

slugify.separator = "-";
slugify.maxLength = 48;

module.exports = slugify;
