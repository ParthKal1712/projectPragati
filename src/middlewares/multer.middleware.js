import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    const newName = file.originalname + "-" + Math.round(Math.random() * 1e9);
    cb(null, newName);
  },
});

export const upload = multer({ storage: storage });
