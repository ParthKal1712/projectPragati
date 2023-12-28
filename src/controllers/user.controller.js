import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
//import uploadOnCloudinary from "../utils/cloudinary.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//METHOD TO GENERATE REFRESH AND ACCESS TOKENS
//WE USE async AND NOT asyncHandler BECAUSE WE ARE NOT HANDLING AN EXTERNAL WEB REQUEST HERE, SO THAT WOULD BE AN OVERKILL
const generateAccessAndResponseTokens = async (userId) => {
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

const loginUser = asyncHandler(async (req, res) => {
  //GET DATA FROM REQ BODY
  const { username, email, password } = req.body;

  //IF NEITHER USERNAME NOR EMAIL IS NOT RECEIVED, THROW AN ERROR
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required.");
  }

  //FROM THE USER MODEL, FIND ONE USER THAT HAS EITHER USERNAME OR EMAIL GIVEN TO US
  const user = await User.findOne({
    $or: [{ username }, { email }],
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
  const { accessToken, refreshToken } = await generateAccessAndResponseTokens(
    user._id
  );

  //THE user OBJECT THAT WE POPULATED BEFORE PASSORD CHECK DOES NOT CONTAIN THE REFRESH TOKEN. SO WE CALL THE USER AGAIN
  const loggedInUser = await User.findById(user._id).select(
    "-password - refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
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
        refreshToken: undefined,
      },
    },
    //WE NEED TO USE THE NEW KEYWORD TO MAKE SURE THAT THIS STATEMENT RETURNS THE UPDATED DOCUMENT
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  //SEND NOTIFICATION OF SUCCESS, CLEAR ALL COOKIES FROM THE USER AND SEND OUT THE APPROPRIATE MESSAGE IN A JSON
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully."));
});

export { registerUser, loginUser, logoutUser };
