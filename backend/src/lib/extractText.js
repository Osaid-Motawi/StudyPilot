'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { createError } = require('../middleware/errorHandler');

/**
 * Extract plain text from an uploaded PDF by running pdf-parse in a fresh child
 * process (see pdfWorker.js). Process isolation makes extraction deterministic
 * and prevents pdf-parse global-state corruption across requests.
 *
 * @param {Buffer} buffer
 * @returns {Promise<string>} extracted text ('' if none)
 */
function defaultPdfExtract(buffer) {
  return new Promise((resolve, reject) => {
    const worker = spawn(process.execPath, [path.join(__dirname, 'pdfWorker.js')]);
    let out = '';
    let err = '';
    worker.stdout.on('data', (d) => (out += d));
    worker.stderr.on('data', (d) => (err += d));
    worker.on('error', reject);
    worker.on('close', () => {
      let parsed;
      try {
        parsed = JSON.parse(out);
      } catch (_e) {
        return reject(new Error(err || 'pdf worker produced no output'));
      }
      if (parsed.ok) return resolve(parsed.text || '');
      return reject(new Error(parsed.error || 'pdf parse failed'));
    });
    worker.stdin.on('error', () => {}); // ignore EPIPE if the worker exits early
    worker.stdin.write(buffer);
    worker.stdin.end();
  });
}

// Injectable seam so unit/integration tests can stub PDF extraction.
let _pdfExtract = null;
function setPdfExtractor(fn) {
  _pdfExtract = fn;
}
function resetPdfExtractor() {
  _pdfExtract = null;
}

/**
 * Extract plain text from an uploaded buffer.
 * - PDF via an isolated pdf-parse worker
 * - plain text (.txt) via utf8 decode
 *
 * @param {Buffer} buffer
 * @param {string} typeHint - mimetype or filename used to pick a decoder.
 * @throws AppError 400 for unsupported types, 422 when no usable text.
 */
async function extractText(buffer, typeHint = '') {
  const hint = String(typeHint || '').toLowerCase();
  let text;

  if (hint.includes('pdf')) {
    try {
      text = await (_pdfExtract || defaultPdfExtract)(buffer);
    } catch (_e) {
      // A corrupt/unreadable PDF is a "no usable text" case for the user,
      // never an internal server error.
      throw createError(
        422,
        'no_extractable_text',
        'Could not read text from the PDF. Please try a different file.'
      );
    }
  } else if (hint.includes('text') || hint.includes('plain') || hint.endsWith('.txt')) {
    text = buffer.toString('utf8');
  } else {
    throw createError(
      400,
      'unsupported_file',
      'Unsupported file type. Please upload a PDF or a .txt file.'
    );
  }

  if (!text || !text.trim()) {
    throw createError(
      422,
      'no_extractable_text',
      'Could not extract usable text from the document. Please try a different file.'
    );
  }
  return text.trim();
}

module.exports = { extractText, setPdfExtractor, resetPdfExtractor };
