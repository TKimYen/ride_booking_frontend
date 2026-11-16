import { describe, expect, it } from 'vitest';
import { isOn } from './features';

describe('cờ tính năng', () => {
  it('chỉ "true"/"1" (không phân biệt hoa thường, bỏ khoảng trắng) là bật', () => {
    for (const v of ['true', 'TRUE', ' True ', '1']) expect(isOn(v)).toBe(true);
  });

  it('bỏ trống hoặc giá trị lạ là tắt', () => {
    for (const v of [undefined, '', 'false', '0', 'yes', 'on']) expect(isOn(v)).toBe(false);
  });
});
