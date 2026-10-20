// Shared with the old Node scripts in scripts/, which require() it directly.
"use strict";

var options = { separator: "-", maxLength: 48 };

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
    .replace(/[^a-z0-9]+/g, options.separator)
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, options.maxLength).replace(/-+$/, "");
}

module.exports = Object.assign(slugify, options);
