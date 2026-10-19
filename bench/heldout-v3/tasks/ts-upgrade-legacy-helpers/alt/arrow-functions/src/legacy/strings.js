// String helpers carried over from the old jQuery front end.

/**
 * @param {...(string | number)} segments
 * @returns {string}
 */
export const joinPath = (...segments) =>
  "/" + segments.map((segment) => String(segment).replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");

/**
 * @param {string} template
 * @param {...unknown} args
 * @returns {string}
 */
export const format = (template, ...args) =>
  String(template).replace(/\{(\d+)\}/g, (match, index) => (index < args.length ? String(args[index]) : match));

/**
 * @param {...any} values
 * @returns {any}
 */
export const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);
