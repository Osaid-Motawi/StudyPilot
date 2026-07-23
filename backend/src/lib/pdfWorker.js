'use strict';

/**
 * Isolated PDF-extraction worker.
 *
 * Reads raw PDF bytes from stdin, extracts text via pdf-parse, writes a JSON
 * result to stdout, then exits. Running each parse in its own short-lived
 * process avoids pdf-parse / pdf.js (v1.10.100) global-state issues, where a
 * malformed PDF or a prior parse can corrupt state and break the next call.
 */

const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', async () => {
  try {
    // eslint-disable-next-line global-require
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(Buffer.concat(chunks));
    process.stdout.write(JSON.stringify({ ok: true, text: (data && data.text) || '' }));
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
  }
});
