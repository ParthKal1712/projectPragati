import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

//THIS MIDDLEWARE TAKES ANY REQUEST COMING FROM THE FRONTEND AND AUTHENTICATES IT WITH JWT (USING accessToken THAT IS SAVED IN THE USER'S COOKIES DURING LOGIN)

export const verifyJWT = asyncHandler(async (req, res, next) => {
  //ACCESS THE accessToken FROM THE REQUEST, EITHER DIRECTLY OR USING THE "Bearer : <token>" FORMAT
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    //IF accessToken IS NOT RECEIVED, THROW AN ERROR
    if (!token) {
      throw new ApiError(401, "Unauthorized Request");
    }

    //DECODE THE accessToken USING THE SECRET KEY TO ACCESSS THE DATA THAT WAS STORED INSIDE IT
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //USING THE USER ID GIVEN IN THE DECODED ACCESS TOKEN, FIND THE APPROPRIATE USER FROM THE DB
    const user = await User.findbyId(decodedToken._id).select(
      "-password -refreshToken"
    );

    //IF NO USER IS FOUND, THROW AN ERROR
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    //IF THE USER IS FOUND, ADD IT TO A "user" PROPERTY IN THE REQUEST OBJECT
    req.user = user;

    //RUN THE NEXT MIDDLEWARE
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});
