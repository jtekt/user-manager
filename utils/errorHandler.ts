export default function (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(error)
  let { statusCode = 500, message = error } = error
  if (isNaN(statusCode) || statusCode > 600) statusCode = 500
  res.status(statusCode).send(message)
}
