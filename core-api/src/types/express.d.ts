// Express type augmentation for req.user in core-api
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        fullName: string;
        roles: string[];
      };
    }
  }
}

export {};
