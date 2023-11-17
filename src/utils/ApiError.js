//WE WANT TO STANDARDIZE SENDING ERRORS FROM OUR APPLICATION.
//THEREFORE, WE ARE EXTENDING THE DEFAULT Error CLASS GIVEN BY NODE.

class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.data = null;
    this.errors = errors;
    this.message = message;
    this.statusCode = statusCode;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
