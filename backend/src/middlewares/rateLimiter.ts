import rateLimit from 'express-rate-limit';

// 1. Rate Limiter for Login (Prevent Credential Stuffing)
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // max 30 attempts per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit.',
  },
});

// 2. Rate Limiter for Manager PIN Verification (Prevent PIN Brute-force)
export const pinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // max 15 attempts per 5 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Terlalu banyak verifikasi PIN yang gagal. Akun dibatasi sementara selama 5 menit.',
  },
});

// 3. General Public API Limiter (Prevent DoS)
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // max 1000 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Batas kuota akses tercapai. Harap perlambat pengiriman permintaan.',
  },
});
