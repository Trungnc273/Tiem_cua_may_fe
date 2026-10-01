import assert from "node:assert/strict";
import test from "node:test";
import { demoProducts, filterDemoProducts } from "./catalog.ts";

test("demo catalog search returns all fixtures for an empty search", () => {
  assert.equal(filterDemoProducts("   ").length, 4);
});

test("demo catalog search matches product names without case sensitivity", () => {
  assert.deepEqual(filterDemoProducts("BLOUSE").map((product) => product.name), ["Áo blouse nơ tay phồng"]);
});

test("demo catalog search matches Vietnamese text and accented letters", () => {
  assert.deepEqual(filterDemoProducts("VÁY").map((product) => product.name), [
    "Chân váy tầng bồng bềnh",
    "Váy hoa nhí hai dây",
  ]);
});

test("unknown terms return none and each fixture keeps its DEMO label", () => {
  assert.deepEqual(filterDemoProducts("không có mẫu này"), []);
  assert.equal(demoProducts.every((product) => product.badge === "DEMO"), true);
});
