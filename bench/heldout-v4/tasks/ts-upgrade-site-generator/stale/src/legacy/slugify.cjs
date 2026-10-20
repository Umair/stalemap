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
    .replace(/[^a-z0-9]+/g, module.exports.separator)
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, module.exports.maxLength).replace(/-+$/, "");
}

module.exports = slugify;
/** @type {string} */
module.exports.separator = "-";
/** @type {number} */
module.exports.maxLength = 48;
