// Express type augmentation for req.user
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
