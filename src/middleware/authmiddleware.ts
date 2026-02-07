import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        name: string;
      };
    }
  }
}

export const verifyTokenAndRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(req.cookies)
    const token = req.cookies.session;
    if (!token) {
      return res
        .status(409)
        .json({ message: "No token provided, access denied." });
    }

    try {
      // 2. Verify token
      const decoded = jwt.verify(token, process.env.SECRET as string) as any;

      // 3. Check if the user's role is in the allowed list
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({
          message: "You do not have permission to perform this action.",
        });
      }
      if (decoded.available === false) {
        return res
          .status(403)
          .json({
            message: "Your user was suspened. Please contract the admin",
          });
      }

      // 4. Attach user info to request for use in controllers
      req.user = decoded;
      next();
    } catch (error) {
      console.log(error);
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  };
};
