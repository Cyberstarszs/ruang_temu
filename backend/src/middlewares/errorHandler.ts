import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  console.error('[Unhandled Server Error]', err);

  const status = err.status || err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';
  const message = (status === 500 && !isDev)
    ? 'Terjadi kesalahan internal pada server.'
    : (err.message || 'Terjadi kesalahan internal pada server.');

  res.status(status).json({
    success: false,
    message,
    ...(isDev ? { stack: err.stack } : {}),
  });
}
