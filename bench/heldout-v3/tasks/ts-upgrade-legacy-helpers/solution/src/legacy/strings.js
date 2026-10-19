// String helpers carried over from the old jQuery front end.

export function joinPath(...segments) {
  var parts = [];
  for (var i = 0; i < segments.length; i++) {
    var part = String(segments[i]).replace(/^\/+|\/+$/g, "");
    if (part) parts.push(part);
  }
  return "/" + parts.join("/");
}

export function format(template, ...args) {
  return String(template).replace(/\{(\d+)\}/g, function (match, index) {
    return index < args.length ? String(args[index]) : match;
  });
}

export function firstDefined(...values) {
  for (var i = 0; i < values.length; i++) {
    if (values[i] !== undefined && values[i] !== null) return values[i];
  }
  return undefined;
}
