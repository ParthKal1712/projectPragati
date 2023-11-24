import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
//import uploadOnCloudinary from "../utils/cloudinary.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//DEFINING METHODS IN THE CONTROLLER
const registerUser = asyncHandler(async (req, res) => {
  //GET USER DETAILS FROM FRONTEND
  const { fullName, username, email, password } = req.body;

  //CHECKING DATA BY APPLYING VALIDATIONS
  //IF AFTER TRIMMING - FULLNAME, USERNAME, EMAIL OR PASSWORD IS EMPTY, THROW AN ERROR
  if (
    [fullName, username, email, password].some((item) => item.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  //CHECK IF USERNAME OR EMAIL ALREADY EXISTS. IF YES, THROW AN ERROR
  const userExists = await User.findOne({ $or: [{ username }, { email }] });
  if (userExists) {
    throw new ApiError(409, "User already exists.");
  }

  //IF WE HAVEN'T RECEIVED ANY FILES IN THE REQUEST, THROW AN ERROR
  if (JSON.stringify(req.files) === "{}") {
    throw new ApiError(400, "No files received.");
  }

  //THROW AN ERROR IF AVATAR IS NOT RECEIVED
  var avatarLocalPath;
  if (!req.files.avatar) {
    throw new ApiError(400, "Avatar is required.");
  } else {
    avatarLocalPath = req.files.avatar[0].path;
  }

  //PICK COVER IMAGE IF IT IS RECEIVED
  var coverImage = null;
  if (req.files.coverImage) {
    let coverImageLocalPath = req.files.coverImage[0].path;
    coverImage = await uploadOnCloudinary(coverImageLocalPath);
  }

  //UPLOAD IMAGES TO CLOUDINARY
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  //LOOK AT THE RESPONSE RECEIVED FROM CLOUDINARY TO CONFIRM THAT THE AVATAR WAS LOADED
  if (!avatar) {
    throw new ApiError(500, "Unable to upload avatar.");
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
    .json(new ApiResponse(200, createdUser, "User registered successfully."));
});

export { registerUser };
