'use strict';

const multer = require('multer');
const { createError } = require('./errorHandler');

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function isAccepted(file) {
  const mimetype = (file.mimetype || '').toLowerCase();
  const name = (file.originalname || '').toLowerCase();
  return (
    mimetype === 'application/pdf' ||
    mimetype === 'text/plain' ||
    name.endsWith('.txt') ||
    name.endsWith('.pdf')
  );
}

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter(req, file, cb) {
    if (!isAccepted(file)) {
      return cb(
        createError(
          400,
          'unsupported_file',
          'Unsupported file type. Please upload a PDF or a .txt file.'
        )
      );
    }
    return cb(null, true);
  },
}).single('file');

/** Express middleware: parse a single `file` part into memory. */
module.exports = function uploadSingle(req, res, next) {
  multerUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        createError(400, 'file_too_large', 'File is too large. The maximum size is 2 MB.')
      );
    }
    if (err.status) return next(err); // our AppError from fileFilter
    return next(createError(400, 'upload_failed', 'Could not read the uploaded file.'));
  });
};

module.exports.MAX_BYTES = MAX_BYTES;
