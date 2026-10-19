// String helpers carried over from the old jQuery front end.

export function joinPath() {
  var parts = [];
  for (var i = 0; i < arguments.length; i++) {
    var part = String(arguments[i]).replace(/^\/+|\/+$/g, "");
    if (part) parts.push(part);
  }
  return "/" + parts.join("/");
}

export function format(template) {
  var args = Array.prototype.slice.call(arguments, 1);
  return String(template).replace(/\{(\d+)\}/g, function (match, index) {
    return index < args.length ? String(args[index]) : match;
  });
}

export function firstDefined() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] !== undefined && arguments[i] !== null) return arguments[i];
  }
  return undefined;
}
