const express = require("express");
const formidableMiddleware = require("express-formidable");
const cors = require("cors");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth").OAuthStrategy;
const app = express();
app.use(cors());
app.use(formidableMiddleware());

mongoose.connect(process.env.MONGODB_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true,
});

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME_CLOUDINARY,
  api_key: process.env.API_KEY_CLOUDINARY,
  api_secret: process.env.API_SECRET_CLOUDINARY,
  secure: true,
});

const userRoutes = require("./routes/user");
app.use(userRoutes);
const gameRoutes = require("./routes/game");
app.use(gameRoutes);

///////////////// HOME ROUTE //////////////////
app.get("/", (req, res) => {
  res.status(200).json({
    message: "welcome to my gamepad homepage",
  });
});

///////////////// ALL ROUTES /////////////////
app.all("*", (req, res) => {
  res.status(400).json({
    message: "Ooops! page not found",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}...`));
