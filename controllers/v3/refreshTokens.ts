import { Request, Response } from "express"

export const generateNewToken = async (req: Request, res: Response) => {
  res.status(501).send("Not implemented")
}
