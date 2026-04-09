import jwt from "jsonwebtoken"
import { promisify } from "util"
import Cookies from "cookies"
import createHttpError from "http-errors"
import { get_id_of_user } from "./users"
import { Request, Response } from "express"

const { JWT_SECRET } = process.env

if (!JWT_SECRET) throw new Error(`Token secret not set`)

const jwtSign = promisify<object, string, jwt.SignOptions, string>(jwt.sign)
const jwtVerify = promisify<string, string, jwt.VerifyOptions, jwt.JwtPayload>(jwt.verify)

export const retrieve_jwt = (req: Request, res: Response) => {
  const { headers, query }: any = req
  const token =
    headers.authorization?.split(" ")[1] ||
    headers.authorization ||
    new Cookies(req, res).get("jwt") ||
    new Cookies(req, res).get("token") ||
    query.jwt ||
    query.token

  if (!token) throw createHttpError(401, `JWT not provided`)

  return token
}

export const generate_token = async (user: any) => {
  const user_id = get_id_of_user(user).toString() // Forcing string
  const token_id = user.token_id || user.properties?.token_id
  return jwtSign({ user_id, token_id }, JWT_SECRET!, {})
}

export const verify_token = async (token: string) => {
  try {
    return await jwtVerify(token, JWT_SECRET!, {})
  } catch {
    throw createHttpError(403, `Invalid JWT`)
  }
}

export const verify_token_oidc = async (token: string, key: string) => {
  try {
    return await jwtVerify(token, key as any, {})
  } catch {
    throw createHttpError(403, `Invalid JWT OIDC`)
  }
}

export const decode_token = (token: string) => jwt.decode(token, { complete: true })