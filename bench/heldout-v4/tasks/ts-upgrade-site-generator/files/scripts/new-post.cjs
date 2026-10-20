#!/usr/bin/env node
// Prints the URL a new post will get: node scripts/new-post.cjs "My title" [2026-03-04]
"use strict";
var slugify = require("../src/legacy/slugify.cjs");
var dates = require("../src/legacy/dates.cjs");

var title = process.argv[2] || "Untitled";
var day = process.argv[3] ? new Date(process.argv[3]) : new Date();
console.log("/" + dates.urlDay(day) + "/" + slugify(title) + "/");
if (slugify(title).length >= slugify.maxLength) console.warn("Title is long; its slug is cut at " + slugify.maxLength + " characters.");
