import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";

//CREATE A NEW ROUTER
const router = Router();

//ROUTING THE REQUEST TO THE CONTROLLER
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  registerUser
);

router.route("/login").post(loginUser);

//SECURED ROUTES (USER NEEDS TO BE LOGGED IN TO BE ABLE TO ACCESS THESE ROUTES)
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);

//EXPORTING THE ROUTER
export default router;
