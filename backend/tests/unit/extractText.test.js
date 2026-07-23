'use strict';

const {
  extractText,
  setPdfExtractor,
  resetPdfExtractor,
} = require('../../src/lib/extractText');

afterEach(() => resetPdfExtractor());

describe('extractText', () => {
  test('decodes a .txt buffer via utf8', async () => {
    const buf = Buffer.from('Hello study notes about mitochondria.', 'utf8');
    const text = await extractText(buf, 'text/plain');
    expect(text).toBe('Hello study notes about mitochondria.');
  });

  test('decodes by .txt filename hint', async () => {
    const buf = Buffer.from('notes content', 'utf8');
    const text = await extractText(buf, 'notes.txt');
    expect(text).toBe('notes content');
  });

  test('extracts PDF text via the injected extractor', async () => {
    setPdfExtractor(async () => '  Extracted PDF body  ');
    const text = await extractText(Buffer.from('%PDF-1.4'), 'application/pdf');
    expect(text).toBe('Extracted PDF body');
  });

  test('unsupported type -> 400', async () => {
    await expect(
      extractText(Buffer.from('x'), 'application/msword')
    ).rejects.toMatchObject({ status: 400 });
  });

  test('empty text content -> 422', async () => {
    await expect(extractText(Buffer.from('   ', 'utf8'), 'text/plain')).rejects.toMatchObject({
      status: 422,
    });
  });

  test('PDF with no extractable text -> 422', async () => {
    setPdfExtractor(async () => '   ');
    await expect(
      extractText(Buffer.from('%PDF-1.4'), 'application/pdf')
    ).rejects.toMatchObject({ status: 422 });
  });

  test('PDF extraction failure -> graceful 422 (not 500)', async () => {
    // A corrupt/unreadable PDF (worker throws) must surface as a user-facing
    // 422, never bubble up as an unhandled 500.
    setPdfExtractor(async () => {
      throw new Error('bad XRef entry');
    });
    await expect(
      extractText(Buffer.from('%PDF-broken'), 'application/pdf')
    ).rejects.toMatchObject({ status: 422, code: 'no_extractable_text' });
  });
});
