import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
      org?: {
        id: string;
        role: Role;
      };
      cookies: {
        [key: string]: string;
      };
    }
  }
}

