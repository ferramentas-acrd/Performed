export class UnauthorizedError extends Error {
  status = 401
  constructor() { super('Authentication required') }
}

export class ForbiddenError extends Error {
  status = 403
  constructor() { super('Admin access required') }
}

export class ValidationError extends Error {
  status = 400
  constructor(message: string) { super(message) }
}

export class NotFoundError extends Error {
  status = 404
  constructor(message = 'Not found') { super(message) }
}

export class ServerError extends Error {
  status = 500
  constructor(message = 'Internal server error') { super(message) }
}

export function toHttpResponse(error: unknown) {
  if (error instanceof UnauthorizedError) return { message: error.message, status: 401 }
  if (error instanceof ForbiddenError) return { message: error.message, status: 403 }
  if (error instanceof ValidationError) return { message: error.message, status: 400 }
  if (error instanceof NotFoundError) return { message: error.message, status: 404 }
  console.error(error)
  return { message: 'Internal server error', status: 500 }
}
