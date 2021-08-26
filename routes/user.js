const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;
const isAuthenticated = require("../middlewares/isAuthenticated");

// IMPORT MODELS
const User = require("../models/User");
const Game = require("../models/Game");
const Review = require("../models/Review");
const { findOneAndDelete } = require("../models/Game");

///////////////// SIGNUP ROUTE //////////////////
router.post("/user/signup", async (req, res) => {
  const { username, email, password } = req.fields;

  if (await User.findOne({ email })) {
    res.status(409).json({
      message: "this email has already an account",
    });
  } else if (await User.findOne({ username })) {
    res.status(409).json({
      message:
        "this username has already an account please login or change your username",
    });
  } else {
    const salt = uid2(16);
    const token = uid2(16);
    const hash = SHA256(password + salt).toString(encBase64);
    try {
      const user = new User({
        username,
        email,
        hash,
        token,
        salt,
      });
      console.log(user.id);
      if (req.files.photo) {
        const photo = await cloudinary.uploader.upload(req.files.photo.path, {
          folder: `gamepad/${user.id}`,
          use_filename: true,
        });
        user.avatar = {
          url: photo.secure_url,
          public_id: photo.public_id,
        };
      }

      const savedUser = await user.save();

      res.status(200).json({
        message: {
          id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          token: savedUser.token,
          avatar: savedUser.avatar.url,
          game_collection: savedUser.game_collection,
        },
      });
    } catch (error) {
      console.log(error.message);
      res.status(400).json({
        message: error.message,
      });
    }
  }
});

///////////////// LOGIN ROUTE //////////////////
router.post("/user/login", async (req, res) => {
  const { email, password } = req.fields;
  try {
    console.log("log1");
    const user = await User.findOne({ email });
    if (user) {
      console.log("log2");
      const {
        username,
        email,
        hash,
        token,
        avatar,
        game_collection,
        salt,
        _id,
      } = user;
      if (SHA256(password + salt).toString(encBase64) === hash) {
        console.log("log3");
        res.status(200).json({
          message: {
            _id,
            username,
            email,
            token,
            avatar: user.avatar.url,
            game_collection,
          },
        });
      } else {
        res.status(401).json({
          message: "User not found",
        });
      }
    } else {
      res.status(401).json({
        message: "User not found",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// GET MY COLLECTION ROUTE //////////////////
router.delete("/user/delete", async (req, res) => {
  try {
    const { userId } = req.query;
    console.log("delete userId ====>", req.query.userId);
    const userToDelete = await User.findByIdAndDelete(userId);
    const reviewsToDelete = await Review.deleteMany({ owner: userId });
    const gamesCollectionToDelete = await Game.deleteMany({ owner: userId });

    res.status(200).json({
      deleted_user: userToDelete,
      deleted_reviews: reviewsToDelete,
      deleted_games_collection: gamesCollectionToDelete,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// GET USER INFORMATION ROUTE //////////////////
router.get("/user/account", isAuthenticated, async (req, res) => {
  const id = req.query.id;
  console.log("#######USER INFORMATION ROUTE########");
  try {
    const user = await User.findById(id).select(
      "username full_name email avatar"
    );
    const userReviews = await Review.find({ "owner.owner_id": id }).select(
      "text date title name"
    );

    console.log(userReviews);
    res.status(200).json({
      user,
      userReviews,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// UPDATE USER INFORMATION ROUTE //////////////////
router.put("/user/account/update", isAuthenticated, async (req, res) => {
  try {
    const { userId, password, email, username, newPassword, fullName } =
      req.fields;
    console.log(req.fields);
    const user = await User.findById(userId);
    const message = {
      photo_updated: false,
      password_updated: false,
      other_information_updated: false,
    };
    if (req.files.picture) {
      console.log("update image");
      //step-1 delete user avatar from cloudinary
      const public_id = user.avatar.public_id;
      console.log(public_id);
      if (public_id) {
        const responseToDelete = await cloudinary.uploader.destroy(public_id);
        // console.log("cloudinary response delete photo===>", responseToDelete);
        // step-2 upload users new photo to cloudinary
        const responseToUpdate = await cloudinary.uploader.upload(
          req.files.picture.path,
          { folder: `gamepad/${userId}` }
        );
        if (responseToUpdate) {
          console.log(responseToUpdate);
          user.avatar = {
            url: responseToUpdate.secure_url,
            public_id: responseToUpdate.secure_url.public_id,
          };
          await user.save();
          message.photo_updated = true;
        }
      } else {
        const responseToUpdate2 = await cloudinary.uploader.upload(
          req.files.picture.path,
          { folder: `gamepad/${userId}` }
        );
        if (responseToUpdate2) {
          console.log(responseToUpdate2);
          user.avatar = {
            url: responseToUpdate2.secure_url,
            public_id: responseToUpdate2.public_id,
          };
          await user.save();
          message.photo_updated = true;
        }
      }

      // console.log("responseToUpdate===>", responseToUpdate);
    }
    if (newPassword) {
      console.log("newPassword");
      if (SHA256(password + user.salt).toString(encBase64) === user.hash) {
        message.password_updated = true;
        user.hash = SHA256(newPassword + user.salt).toString(encBase64);
        await user.save();
      } else {
        message.password_updated = "password error";
      }
    }
    await User.findByIdAndUpdate(userId, {
      email: email,
      password: password,
      email: email,
      username: username,
      fullName: fullName,
    });

    const updatedUser = await User.findById(userId);
    console.log(updatedUser);
    message.other_information_updated = true;
    message.user = {
      newUsername: updatedUser.username,
      newAvatar: updatedUser.avatar.url,
    };
    res.status(200).json({
      message,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// GET MY COLLECTION ROUTE //////////////////
router.get("/user/collection/get", isAuthenticated, async (req, res) => {
  console.log("get collection");
  try {
    if (req.query.page) {
      const { id, page } = req.query;
      console.log(id);
      const skip = 15 * (page - 1);

      const count = await Game.countDocuments({ owner: id });
      const myCollection = await Game.find({ owner: id }).skip(skip).limit(15);
      // console.log(myCollection);
      res.status(200).json({
        count,
        results: myCollection,
      });
    } else {
      const { id } = req.query;
      const myCollection = await Game.find({ owner: id });
      res.status(200).json({
        message: myCollection,
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// GET MY RATING LIST ROUTE //////////////////
router.get("/user/ratings/get", async (req, res) => {
  console.log("get collection");
  const { id } = req.query;
  console.log(id);
  try {
    const myRatings = await User.findById(id);
    console.log(myRatings.negative_rating_list, myRatings.positive_rating_list);
    res.status(200).json({
      user: {
        negative: myRatings.negative_rating_list,
        positive: myRatings.positive_rating_list,
      },
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// UPDATE MY COLLECTION ROUTE //////////////////
router.put("/user/collection/update", isAuthenticated, async (req, res) => {
  console.log("collection");

  const { gameData, id, operation, page } = req.fields;
  console.log("collection ===>", operation);
  if (operation === "add") {
    const count = await Game.countDocuments({
      owner: id,
      game_id: gameData.id,
    });
    console.log(count);
    if (count === 0) {
      try {
        const game = new Game({
          game_id: gameData.id,
          name: gameData.name,
          photo: gameData.photo,
          owner: id,
        });

        await game.save();

        const updatedGameCollection = await Game.find({ owner: id });
        res.status(200).json({
          count,
          results: updatedGameCollection,
        });

        // res.status(200).json({
        //   message: updatedGameCollection,
        // });
      } catch (error) {
        console.log(error.message);
      }
    } else {
      console.log("game already added");
    }
  } else if (operation === "delete") {
    console.log("del");
    try {
      // console.log(gameData);
      const response = await Game.findByIdAndDelete(gameData._id);
      // console.log(response);
      const skip = 15 * (page - 1);
      const count = await Game.countDocuments({ owner: id });
      console.log("count==>", count);
      const updatedGameCollection = await Game.find({ owner: id })
        .skip(skip)
        .limit(15);
      console.log(updatedGameCollection);
      res.json({
        count,
        results: updatedGameCollection,
      });
    } catch (error) {
      console.log(error.message);
      res.json({
        message: error.message,
      });
    }
  }
});

module.exports = router;
