import assert from 'node:assert/strict';
import test from 'node:test';
import { formatVnd, validateCategoriesResponse, validateProductsResponse } from './catalog.ts';

const validProduct = { slug: 'vay-may', name: 'Váy Mây', description: 'Mẫu thử', basePriceVnd: 259000, priceVnd: 259000, isFeatured: false, isNew: true, categorySlug: 'vay-dam', categoryName: 'Váy đầm', image: '/demo/product-floral-dress.png', colors: ['#A9D6F5'] };
test('catalog product response passes runtime validation', () => {
  const parsed = validateProductsResponse({ data: [validProduct], pagination: { page: 1, limit: 20, total: 1, pages: 1 } });
  assert.equal(parsed.success, true);
});
test('catalog response rejects a formatted price or malformed pagination', () => {
  assert.equal(validateProductsResponse({ data: [{ ...validProduct, priceVnd: '259.000đ' }], pagination: { page: 1, limit: 20, total: 1, pages: 1 } }).success, false);
  assert.equal(validateProductsResponse({ data: [validProduct], pagination: { page: 1, limit: 500, total: 1, pages: 1 } }).success, false);
});
test('category shortcuts validate only public slug/name projection', () => {
  assert.equal(validateCategoriesResponse({ data: [{ slug: 'vay-dam', name: 'Váy đầm', iconKey: 'dress' }] }).success, true);
  assert.equal(validateCategoriesResponse({ data: [{ slug: '../admin', name: 'Sai' }] }).success, false);
});
test('integer VND formats as Vietnamese đồng', () => assert.equal(formatVnd(259000), '259.000đ'));
