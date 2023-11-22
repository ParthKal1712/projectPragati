import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//DEFINING METHODS IN THE CONTROLLER
const registerUser = asyncHandler(async (req, res) => {
  //GET USER DETAILS FROM FRONTEND
  const { fullName, username, email, password } = req.body;
  console.log("email: " + JSON.stringify(req.body));

  //CHECKING DATA BY APPLYING VALIDATIONS
  //IF AFTER TRIMMING - FULLNAME, USERNAME, EMAIL OR PASSWORD IS EMPTY, THROW AN ERROR
  if (
    [fullName, username, email, password].some((item) => item.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //CHECK IF USERNAME OR EMAIL ALREADY EXISTS. IF YES, THROW AN ERROR
  const userExists = await User.findOne({ $or: [{ username }, { email }] });
  if (userExists) {
    throw new ApiError(409, "User already exists");
  }

  //UPLOAD IMAGES TO CLOUDINARY
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }

  //CREATE USER OBJECT
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password,
  });

  //CHECK FOR USER CREATION
  //REMOVE PASSWORD AND REFRESH TOKEN FIELD FROM RESPONSE
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user.");
  }

  //RETURN RESPONSE
  return res
    .status(201)
    .json(ApiResponse(200, createdUser, "User registered successfully"));
});

export { registerUser };
