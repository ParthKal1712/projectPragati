import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true,
      index: true,
      trim: true
    },
    email: {
      type: String,
      required: true
    },
    avatar: {
      type: String, //image url
      required: true
    },
    coverImage: {
      type: String //image url
    },
    watchHistory: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Video"
    },
    refreshToken: {
      type: String
    }
  },
  { timestamps: true }
);

//ADDING isPasswordCorrect METHOD TO THE SCHEMA
//CANNOT USE ARROW FUNCTIONS HERE BECAUSE WE NEED TO REFER TO THE INSIDE OBJECT AND ARROW FUNCTIONS DONT ALLOW CONTEXT
userSchema.methods.isPasswordCorrect = async function (password) {
  //THIS FUNCTION TAKES IN [PLAIN TEXT PASSWORD, ENCRYPTED PASSWORD], COMPARES THEM AND RETURNS IF THEY MATCH OR NOT
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    }
  );
};

//THIS IS A MIDDLEWARE THAT WILL BE CALLED EVERY TIME BEFORE THE DOCUMENT IS SAVED
userSchema.pre("save", async function (next) {
  //CHECK IF THE PASSWORD IS MODIFIED
  if (this.isModified("password")) {
    //IF IT IS MODIFIED, ENCRYPT THE NEW PASSWORD
    this.password = await bcrypt.hash(this.password, 10);
  }

  //CALL THE NEXT MIDDLEWARE OR MOVE ALONG..
  next();
});

export const User = mongoose.model("User", userSchema);
