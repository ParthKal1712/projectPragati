//require("dotenv").config();
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({ path: "./env" });

//BECAUSE CONNECTDB CONTAINS AN AWAIT FUNCTION, IT WILL RETURN A PROMISE. SO, WE CAN CATCH THAT PROMISE USING THEN.
connectDB()
  .then(() => {
    //BEFORE STARTING LISTENING FOR THE USER, WE WILL CHECK IF THERE WAS AN ERROR WHILE CONNECTING TO THE APP
    app.on("error", (error) => {
      console.log("ERROR:", error);
      process.exit(1);
    });

    //NOW THAT WE ARE SURE THERES IS NO ERROR, WE START LISTENING FOR THE USER
    app.listen(process.env.PORT, () => {
      console.log(`Server running. Use our API on port: ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("ERROR:", error);
    process.exit(1);
  });
