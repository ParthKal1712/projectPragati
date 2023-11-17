//WE HAVE TO BUILD A WRAPPER FUNCTION THAT WILL HELP US HANDLE ASYNC FUNCTIONS.

//THEREFORE, WE NEED A FUNCTION THAT TAKES IN A FUNCTION AS AN ARGUMENT AND RUNS IT ASYNCHRONOUSLY.

//THESE STEPS SHOW HOW WE REACHED THE FINAL SYNTAX.
//const asyncHandler = () => {};
//const asyncHandler = (func) => (()=>{})
//const asyncHandler = (func) => () => {};
//const asyncHandler = (func) => async () => {};

const asyncHandler = (FN) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res
      .status(error.code || 500)
      .json({ success: false, message: error.message });
  }
};

//ANOTHER WAY OF DOING THE SAME THING - THE PROMISE WAY
// const asyncHandler = (requestHandler) => {
//   (req, res, next) => {
//     Promise.resolve(requestHandler(req, res, next)).catch((error) =>
//       next(error)
//     );
//   };
// };

export { asyncHandler };
