//WE HAVE TO BUILD A WRAPPER FUNCTION THAT WILL HELP US HANDLE ERRORS IN ASYNC FUNCTIONS.

//THEREFORE, WE NEED A FUNCTION THAT TAKES IN A FUNCTION AS AN ARGUMENT AND RUNS IT ASYNCHRONOUSLY.

//THESE STEPS SHOW HOW WE REACHED THE FINAL SYNTAX.
//const asyncHandler = () => {};
//const asyncHandler = (func) => (()=>{})
//const asyncHandler = (func) => () => {};
//const asyncHandler = (func) => async () => {};

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }

// ANOTHER WAY OF DOING THE SAME THING - THE PROMISE WAY
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((error) =>
      next(error)
    );
  };
};

export { asyncHandler };
