"use strict";

function stripAccents(value) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalize(value) {
  return stripAccents(String(value ?? ""))
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

module.exports = { normalize, onlyDigits, stripAccents };
