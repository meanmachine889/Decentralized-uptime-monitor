import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_KEY } from "./config";


export function AuthMiddleware(req:Request, res:Response, next:NextFunction){
  const token = req.headers['authorization'];
  if(!token){
    return res.status(500).json({error : 'Unauthorized'})
  }
  const decoded = jwt.verify(token, JWT_KEY);
  console.log(decoded);
  if(!decoded || !decoded.sub){
    return res.status(500).json({error : 'Unauthorized'})
  }
  req.userId = decoded.sub as string;
  next();
}