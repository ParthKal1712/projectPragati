import { asyncHandler } from "../utils/asyncHandler.js";

//DEFINING METHODS IN THE CONTROLLER
const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "User Registered",
  });
});

export { registerUser };
