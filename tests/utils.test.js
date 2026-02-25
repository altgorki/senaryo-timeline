import { describe, it, expect, beforeEach } from 'vitest';
import { loadModule } from './setup.js';

describe('App.Utils', () => {
  beforeEach(() => {
    // App is reset in setup.js beforeEach, then we load utils
    loadModule('src/js/utils.js');
  });

  describe('s2t() - seconds to time string', () => {
    it('converts 0 seconds to 0:00', () => {
      expect(App.Utils.s2t(0)).toBe('0:00');
    });

    it('converts 60 seconds to 1:00', () => {
      expect(App.Utils.s2t(60)).toBe('1:00');
    });

    it('converts 90 seconds to 1:30', () => {
      expect(App.Utils.s2t(90)).toBe('1:30');
    });

    it('converts 3661 seconds to 61:01', () => {
      expect(App.Utils.s2t(3661)).toBe('61:01');
    });

    it('pads single-digit seconds with zero', () => {
      expect(App.Utils.s2t(5)).toBe('0:05');
    });

    it('handles fractional seconds by flooring', () => {
      expect(App.Utils.s2t(61.9)).toBe('1:01');
    });
  });

  describe('genId() - ID generation', () => {
    it('generates an ID with given prefix', () => {
      const id = App.Utils.genId('test');
      expect(id).toMatch(/^test_\d+_[a-z0-9]+$/);
    });

    it('generates unique sequential IDs', () => {
      const id1 = App.Utils.genId('x');
      const id2 = App.Utils.genId('x');
      expect(id1).not.toBe(id2);
    });

    it('generates IDs with timestamp and random suffix', () => {
      const id = App.Utils.genId('p');
      const parts = id.split('_');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('p');
      expect(Number(parts[1])).toBeGreaterThan(0);
      expect(parts[2].length).toBeGreaterThan(0);
    });
  });

  describe('clamp() - value clamping', () => {
    it('returns value when within range', () => {
      expect(App.Utils.clamp(5, 0, 10)).toBe(5);
    });

    it('clamps to min when value is below', () => {
      expect(App.Utils.clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps to max when value is above', () => {
      expect(App.Utils.clamp(15, 0, 10)).toBe(10);
    });

    it('returns min when min equals max and value differs', () => {
      expect(App.Utils.clamp(5, 3, 3)).toBe(3);
    });

    it('handles negative ranges', () => {
      expect(App.Utils.clamp(-5, -10, -1)).toBe(-5);
    });
  });

  describe('escHtml() - HTML escaping', () => {
    it('escapes ampersands', () => {
      expect(App.Utils.escHtml('a&b')).toBe('a&amp;b');
    });

    it('escapes less-than signs', () => {
      expect(App.Utils.escHtml('<div>')).toBe('&lt;div&gt;');
    });

    it('escapes double quotes', () => {
      expect(App.Utils.escHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('escapes all special characters together', () => {
      expect(App.Utils.escHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    });

    it('leaves plain text unchanged', () => {
      expect(App.Utils.escHtml('hello world')).toBe('hello world');
    });
  });

  describe('sanitizeColor() - color validation', () => {
    it('returns default for null input', () => {
      expect(App.Utils.sanitizeColor(null)).toBe('#888');
    });

    it('returns default for undefined input', () => {
      expect(App.Utils.sanitizeColor(undefined)).toBe('#888');
    });

    it('returns default for empty string', () => {
      expect(App.Utils.sanitizeColor('')).toBe('#888');
    });

    it('accepts valid 3-digit hex colors', () => {
      expect(App.Utils.sanitizeColor('#abc')).toBe('#abc');
    });

    it('accepts valid 6-digit hex colors', () => {
      expect(App.Utils.sanitizeColor('#ff0000')).toBe('#ff0000');
    });

    it('accepts valid 8-digit hex colors (with alpha)', () => {
      expect(App.Utils.sanitizeColor('#ff000080')).toBe('#ff000080');
    });

    it('accepts rgb() colors', () => {
      expect(App.Utils.sanitizeColor('rgb(255, 0, 0)')).toBe('rgb(255, 0, 0)');
    });

    it('accepts rgba() colors', () => {
      expect(App.Utils.sanitizeColor('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('accepts hsl() colors', () => {
      expect(App.Utils.sanitizeColor('hsl(120, 50%, 50%)')).toBe('hsl(120, 50%, 50%)');
    });

    it('accepts CSS variable colors', () => {
      expect(App.Utils.sanitizeColor('var(--my-color)')).toBe('var(--my-color)');
    });

    it('accepts named colors like red', () => {
      expect(App.Utils.sanitizeColor('red')).toBe('red');
    });

    it('accepts named colors case-insensitively', () => {
      expect(App.Utils.sanitizeColor('RED')).toBe('RED');
    });

    it('accepts transparent', () => {
      expect(App.Utils.sanitizeColor('transparent')).toBe('transparent');
    });

    it('rejects invalid color strings', () => {
      expect(App.Utils.sanitizeColor('not-a-color')).toBe('#888');
    });

    it('rejects script injection attempts', () => {
      expect(App.Utils.sanitizeColor('<script>alert(1)</script>')).toBe('#888');
    });

    it('trims whitespace', () => {
      expect(App.Utils.sanitizeColor('  #fff  ')).toBe('#fff');
    });
  });

  describe('s2px() - seconds to pixels', () => {
    it('converts seconds to pixels with default pps', () => {
      // default pps is 0.5
      expect(App.Utils.s2px(100)).toBe(50);
    });

    it('converts with custom pps', () => {
      expect(App.Utils.s2px(100, 2)).toBe(200);
    });

    it('returns 0 for 0 seconds', () => {
      expect(App.Utils.s2px(0, 1)).toBe(0);
    });
  });

  describe('px2s() - pixels to seconds', () => {
    it('converts pixels to seconds with default pps', () => {
      // default pps is 0.5
      expect(App.Utils.px2s(50)).toBe(100);
    });

    it('converts with custom pps', () => {
      expect(App.Utils.px2s(200, 2)).toBe(100);
    });

    it('returns 0 for 0 pixels', () => {
      expect(App.Utils.px2s(0, 1)).toBe(0);
    });
  });

  describe('snap() - grid snapping', () => {
    it('snaps to nearest grid value', () => {
      expect(App.Utils.snap(12, 10)).toBe(10);
      expect(App.Utils.snap(16, 10)).toBe(20);
    });

    it('returns value unchanged when grid is 0', () => {
      expect(App.Utils.snap(12, 0)).toBe(12);
    });

    it('snaps exactly on grid boundary', () => {
      expect(App.Utils.snap(20, 10)).toBe(20);
    });
  });

  describe('epLbl() - episode label', () => {
    it('returns B-prefixed label for any episode', () => {
      expect(App.Utils.epLbl('fb')).toBe('Bfb');
    });

    it('returns B-prefixed label for other episodes', () => {
      expect(App.Utils.epLbl('1')).toBe('B1');
      expect(App.Utils.epLbl('12')).toBe('B12');
    });
  });

  describe('deepClone()', () => {
    it('creates a deep copy of an object', () => {
      const original = { a: 1, b: { c: 2 } };
      const clone = App.Utils.deepClone(original);
      expect(clone).toEqual(original);
      clone.b.c = 999;
      expect(original.b.c).toBe(2);
    });
  });

  describe('debounce()', () => {
    it('returns a function', () => {
      const fn = App.Utils.debounce(() => {}, 100);
      expect(typeof fn).toBe('function');
    });
  });

  describe('$() - cached DOM query', () => {
    it('returns null for non-existent element', () => {
      expect(App.Utils.$('nonexistent')).toBeNull();
    });

    it('finds an element by id', () => {
      const el = document.createElement('div');
      el.id = 'test-elem';
      document.body.appendChild(el);
      expect(App.Utils.$('test-elem')).toBe(el);
      document.body.removeChild(el);
    });
  });

  describe('LIMITS', () => {
    it('has expected field limits', () => {
      expect(App.Utils.LIMITS.title).toBe(200);
      expect(App.Utils.LIMITS.description).toBe(5000);
      expect(App.Utils.LIMITS.screenplay).toBe(50000);
      expect(App.Utils.LIMITS.characterName).toBe(50);
      expect(App.Utils.LIMITS.color).toBe(20);
    });
  });
});
