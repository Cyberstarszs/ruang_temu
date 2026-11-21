import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const issues = (err as any).issues || (err as any).errors || [];
        res.status(400).json({
          success: false,
          message: issues[0]?.message || 'Data input tidak valid.',
          errors: issues.map((e: any) => ({
            field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
