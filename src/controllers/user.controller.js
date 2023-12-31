import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
//import uploadOnCloudinary from "../utils/cloudinary.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { reset } from "nodemon";

//METHOD TO GENERATE REFRESH AND ACCESS TOKENS
//WE USE async AND NOT asyncHandler BECAUSE WE ARE NOT HANDLING AN EXTERNAL WEB REQUEST HERE, SO THAT WOULD BE AN OVERKILL
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    //FIND THE USER USING THE userId
    const user = await User.findById(userId);

    //GENERATE ACCESS AND REFRESH TOKENS AND STORE IN VARIABLES
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //SAVE THE GENERATED REFRESH TOKEN IN THE DATABASE
    user.refreshToken = refreshToken;

    //SAVE THE USER DATA IN THE DATABASE.
    await user.save({ validateBeforeSave: false });

    //RETURN ACCESS AND REFRESH TOKENS
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating Access and Referesh Tokens."
    );
  }
};

//THIS FUNCTION CAN BE CALLED BY FRONTEND TO CHECK WHICH USER IS LOGGED IN
const getCurrentUser = asyncHandler(async (req, res) => {
  //RETURN THE USER DATA
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User details fetched successfully."));
});

//DEFINING METHODS IN THE CONTROLLER
const registerUser = asyncHandler(async (req, res) => {
  //GET USER DETAILS FROM FRONTEND
  const { fullName, username, email, password } = req.body;

  //CHECKING DATA BY APPLYING VALIDATIONS
  //IF AFTER TRIMMING - FULLNAME, USERNAME, EMAIL OR PASSWORD IS EMPTY, THROW AN ERROR
  if (
    [fullName, username, email, password].some((item) => item?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required.");
  }

  //CHECK IF USERNAME OR EMAIL ALREADY EXISTS. IF YES, THROW AN ERROR
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new ApiError(409, "User already exists.");
  }

  //SAVE THE LOCAL PATH OF THE AVATAR IMAGE IF IT EXISTS
  const avatarLocalPath = req.files?.avatar[0].path;

  //IF THE AVATAR IS NOT RECEIVED, THROW AN ERROR
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required.");
  }

  //SAVE THE LOCAL PATH OF THE COVER IMAGE IF IT EXISTS
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0].path;
  }

  //UPLOAD IMAGES TO CLOUDINARY
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

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
    password
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

const loginUser = asyncHandler(async (req, res) => {
  //GET DATA FROM REQ BODY
  const { username, email, password } = req.body;

  //IF NEITHER USERNAME NOR EMAIL IS NOT RECEIVED, THROW AN ERROR
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required.");
  }

  //FROM THE USER MODEL, FIND ONE USER THAT HAS EITHER USERNAME OR EMAIL GIVEN TO US
  const user = await User.findOne({
    $or: [{ username }, { email }]
  });

  //IF NO USER IS FOUND, THROW AN ERROR
  if (!user) {
    throw new ApiError(404, "User does not exist.");
  }

  //PASSWORD CHECK USING THE FUNCTION DEFINED IN THE USER MODEL. THIS MODEL WILL CHECK THE PASSWORD OF THE RETURNED user OBJECT
  const isPasswordValid = await user.isPasswordCorrect(password);

  //IF THE PASSWORD DOES NOT MATCH, THROW AN ERROR
  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid User Credentials.");
  }

  //GENERATE ACCESS AND REFRESH TOKEN
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  //THE user OBJECT THAT WE POPULATED BEFORE PASSORD CHECK DOES NOT CONTAIN THE REFRESH TOKEN. SO WE CALL THE USER AGAIN
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true
  };

  //SEND COOKIES
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged In Successfully."
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //WE WILL HAVE ACCESS TO req.user BECAUSE IT IS A SECURED ROUTE (IE. IT NEEDS THE USER TO BE LOGGED IN TO EXECUTE)
  //THEREFORE, IT WILL RUN THE AUTH MIDDLEWARE, WHICH WILL CHECK THE USER FROM THE TOKEN AND ADD THE user PROPERTY TO req OBJECT
  User.findByIdAndUpdate(
    req.user._id,
    {
      //REMOVING THE refreshToken FROM THE DB FOR THE SAID USER
      $set: {
        refreshToken: undefined
      }
    },
    //WE NEED TO USE THE NEW KEYWORD TO MAKE SURE THAT THIS STATEMENT RETURNS THE UPDATED DOCUMENT
    {
      new: true
    }
  );

  const options = {
    httpOnly: true,
    secure: true
  };

  //SEND NOTIFICATION OF SUCCESS, CLEAR ALL COOKIES FROM THE USER AND SEND OUT THE APPROPRIATE MESSAGE IN A JSON
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //TAKE ACCESS OF THE refreshToken EITHER FROM THE COOKIES OR FROM THE REQ BODY
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  //IF THE refreshToken IS NOT RECEIVED, THROW AN ERROR
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }
  try {
    //DECODE THE refreshToken
    const decodedIncomingRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //FIND THE APPROPRIATE USER USING THE ID GIVEN IN THE DECODED REFRESH TOKEN
    const user = await User.findById(decodedIncomingRefreshToken._id);

    //IF NO USER IS FOUND USING THE ID, THROW AN ERROR
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    //IF THE INCOMING REFRESH TOKEN IS NOT THE SAME AS THE REFRESH TOKEN IN THE DB, THROW AN ERROR
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh Token Miasmatch");
    }

    //GENERATE ACCESS AND REFRESH TOKEN
    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    //SEND COOKIES
    const options = {
      httpOnly: true,
      secure: true
    };

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed Successfully."
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old Password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully."));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //THIS FUNCTION CAN BE CALLED BY FRONTEND TO UPDATE USER DETAILS
  //GET USER DETAILS FROM FRONTEND
  const { fullName, username, email } = req.body;

  //FRONT END SHOULD SEND ALL FIELDS THAT ARE REQUIRED. IF NOT, THROW AN ERROR
  if (!fullName || !username || !email) {
    throw new ApiError(400, "All fields are required.");
  }

  //UPDATING THE USER DATA
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      //REMOVING THE refreshToken FROM THE DB FOR THE SAID USER
      $set: {
        fullName,
        username,
        email
      }
    },
    //WE NEED TO USE THE NEW KEYWORD TO MAKE SURE THAT THIS STATEMENT RETURNS THE UPDATED DOCUMENT
    {
      new: true
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully."));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //WE DIRECTLY ACCESS THE req.user? OBJECT. IF IT IS MISSING AND WE TRY TO ACCESS IT, IT WILL THROW AN ERROR
  const user = await User.findById(req.user?._id);

  const newAvatarLocalPath = req.file?.avatar[0].path;

  if (!newAvatarLocalPath) {
    throw new ApiError(400, "File not found");
  }

  const avatar = await uploadOnCloudinary(newAvatarLocalPath);

  if (!avatar) {
    throw new ApiError(500, "Unable to upload avatar.");
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {
      new: true
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully."));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  const newCoverImageLocalPath = req.file?.coverImage[0].path;

  if (!newCoverImageLocalPath) {
    throw new ApiError(400, "File not found");
  }

  const coverImage = await uploadOnCloudinary(newCoverImageLocalPath);

  if (!coverImage) {
    throw new ApiError(500, "Unable to upload cover image.");
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    {
      new: true
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully."));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  refreshAccessToken,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
};
