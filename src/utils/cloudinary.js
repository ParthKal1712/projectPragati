import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

//CONNECTING TO CLOUDINARY. CODE SNIPPET PICKED FROM DOCUMENTATION AND SENSITIVE INFORMATION REPLACED WITH ENV VARIABLES
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

//A FUNCRTION THAT TAKES THE LOCAL SERVER PATH OF THE UPLOADED FILE AND UPLOADS IT ON CLOUDINARY
//IT MIGHT TAKE TIME (THUS async) AND MIGHT FAIL (THUS try catch)
const uploadOnCloudinary = async (localFilePath) => {
  try {
    //IF LOCAL FILE PATH IS FALSY, RETURN NULL. THIS IS USED IF FUNCTION IS MISTAKENLY CALLED EMPTY.
    if (!localFilePath) return null;

    //UPLOAD THE FILE ON CLOUDINARY AND SAVE THE RESPONSE IN response
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    //LOG THE NEWLY UPLOADED FILE'S URL ON CLOUDINARY
    console.log(
      "File Uploaded Successfully on Cloudinary. URL is: " + response.url
    );
    fs.unlinkSync(localFilePath);

    //RETURN THE ENTIRE RESPONSE
    return response;
  } catch (error) {
    //REMOVE THE LOCALLY SAVED TEMPORARY FILE IF THE UPOLOAD OPERATION FAILS
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
