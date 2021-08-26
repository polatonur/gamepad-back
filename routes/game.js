const express = require("express");
const axios = require("axios");
const router = express.Router();

// IMPORT MODELS
const User = require("../models/User");
const Game = require("../models/Game");
const Review = require("../models/Review");
const { findByIdAndUpdate } = require("../models/Game");
const { findById } = require("../models/User");
const isAuthenticated = require("../middlewares/isAuthenticated");

///////////////// ALL GAMES ROUTE //////////////////
router.get("/game/all", async (req, res) => {
  const params = req.query;
  const keys = Object.keys(params);
  for (let i = 0; i < keys.length; i++) {
    if (!params[keys[i]] || params[keys[i]] === "0") {
      delete params[keys[i]];
    }
  }

  console.log(params);
  try {
    const response = await axios.get(
      `https://api.rawg.io/api/games?key=${process.env.API_KEY_GAME}`,
      { params: params }
    );
    res.status(200).json({
      message: response.data,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// UPDATE REVIEW RATING ROUTE //////////////////
router.put("/game/review/rating", isAuthenticated, async (req, res) => {
  const { gameId, reviewId, like, userId } = req.fields;
  console.log(gameId, reviewId, like, userId);
  try {
    // check if user alredy liked or disliked the review
    const user = await User.findById(userId);
    const positiveReviews = user.positive_rating_list;
    const negativeReviews = user.negative_rating_list;

    if (like === "pozitive") {
      console.log("step _ 1");
      console.log("poz==>", positiveReviews.indexOf(reviewId));
      if (
        positiveReviews.indexOf(reviewId) === -1 &&
        negativeReviews.indexOf(reviewId) === -1
      ) {
        console.log("user can like this review");

        //update user like list
        const userToUpdate = await User.findByIdAndUpdate(userId, {
          $push: { positive_rating_list: reviewId },
        });

        // increment game rating
        const reviewToUpdate = await Review.findByIdAndUpdate(reviewId, {
          $inc: { rating: 1 },
        });
      } else if (positiveReviews.indexOf(reviewId) !== -1) {
        console.log(
          "find index of like and delete it from pozitive rating list"
        );
        // step-1
        // find index of like and delete it from pozitive rating list

        const userToUpdate2 = await User.findByIdAndUpdate(userId, {
          $pull: { positive_rating_list: { $in: [reviewId] } },
        });

        // step-2
        // update rating inc -1

        const reviewToUpdate = await Review.findByIdAndUpdate(reviewId, {
          $inc: { rating: -1 },
        });
      }
      const updatedReview = await Review.findById(reviewId);
      const updatedUser = await User.findById(userId);
      res.status(200).json({
        review: updatedReview,
        user: updatedUser,
      });
    } else {
      console.log("step _ 1_neg");
      console.log("neg==>", negativeReviews.indexOf(reviewId));
      if (
        negativeReviews.indexOf(reviewId) === -1 &&
        positiveReviews.indexOf(reviewId) === -1
      ) {
        console.log("user can like this review");

        //update user like list
        const userToUpdate = await User.findByIdAndUpdate(userId, {
          $push: { negative_rating_list: reviewId },
        });
        // increment game rating
        const reviewToUpdate = await Review.findByIdAndUpdate(reviewId, {
          $inc: { rating: -1 },
        });

        const updatedReview = await Review.findById(reviewId);
      } else if (negativeReviews.indexOf(reviewId) !== -1) {
        console.log(
          "find index of like and delete it from pozitive rating list"
        );
        // step-1
        // find index of like and delete it from pozitive rating list

        const userToUpdate = await User.findByIdAndUpdate(userId, {
          $pull: { negative_rating_list: { $in: [reviewId] } },
        });

        // step-2
        // update rating inc -1

        const reviewToUpdate = await Review.findByIdAndUpdate(reviewId, {
          $inc: { rating: 1 },
        });
      }
      const updatedReview = await Review.findById(reviewId);
      const updatedUser = await User.findById(userId);
      res.status(200).json({
        review: updatedReview,
        user: updatedUser,
      });
    }

    console.log("/game/review/rating");
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// ADD REVIEW ROUTE //////////////////
router.post("/game/reviews/add/:id", isAuthenticated, async (req, res) => {
  const { gameName, reviewTitle, reviewText, ownerId } = req.fields;
  const gameId = req.params.id;

  try {
    const user = await User.findById(ownerId);

    const review = new Review({
      game_id: gameId,
      name: gameName,
      title: reviewTitle,
      text: reviewText,
      owner: {
        owner_id: ownerId,
        avatar: user.avatar.url,
        name: user.username,
      },
    });
    const addedReview = await review.save();

    res.status(200).json({
      message: addedReview,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// DELETE REVIEW ROUTE //////////////////
router.delete("/game/review/delete", async (req, res) => {
  try {
    console.log("delete==>", req.query.reviewId);

    const { reviewId, userId } = req.query;
    const response = await Review.findByIdAndDelete(reviewId);
    const userReviews = await Review.find({ "owner.owner_id": userId }).select(
      "text date title name"
    );
    console.log(userReviews);
    res.status(200).json({
      userReviews,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: userReviews,
    });
  }
});

///////////////// GET GAME REVIEWS ROUTE //////////////////
router.get("/game/reviews/get/:id", async (req, res) => {
  console.log("------------------get reviews-------------------------");
  const gameId = req.params.id;
  try {
    let reviews = await Review.find({ game_id: gameId });
    console.log(reviews);
    if (reviews.length > 0) {
      const reviewsAsc = await Review.find({ game_id: gameId }).sort({
        rating: 1,
      });
      const reviewsDesc = await Review.find({ game_id: gameId }).sort({
        rating: -1,
      });

      let firstElement = reviewsDesc[0];
      let secondElement = reviewsAsc[0];
      if (String(firstElement._id) !== String(secondElement._id)) {
        if (Math.abs(reviewsAsc[0].rating) > Math.abs(reviewsDesc[0].rating)) {
          firstElement = reviewsAsc[0];
          secondElement = reviewsDesc[0];
        }

        for (let i = 0; i < reviews.length; i++) {
          if (String(reviews[i]._id) === String(firstElement._id)) {
            console.log("ok");
            reviews.splice(i, 1);
          }
        }
        for (let i = 0; i < reviews.length; i++) {
          if (String(reviews[i]._id) === String(secondElement._id)) {
            console.log("ok");
            reviews.splice(i, 1);
          }
        }

        const sortedReviews = reviews.unshift(firstElement, secondElement);
      }

      res.status(200).json({
        message: reviews,
      });
    } else {
      res.status(200).json({
        message: "",
      });
    }
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: error.message,
    });
  }
});

///////////////// GAME DETAILS ROUTE //////////////////

router.get("/game/:id", async (req, res) => {
  try {
    console.log("games with id");
    const id = req.params.id;
    const response = await axios.get(
      `https://api.rawg.io/api/games/${id}?key=${process.env.API_KEY_GAME}`
    );
    res.status(200).json({
      message: response.data,
    });
  } catch (error) {
    console.log(error.message);
  }
});

// test route
router.put("/test", async (req, res) => {
  console.log("---------------------Test--------------------");
  console.log(req.files);
  console.log(req.fields);
  // console.log("test");
  // const userId = "6123691b2ef8ff139f73e5dd";

  // const userToUpdate1 = await User.findByIdAndUpdate(userId, {
  //   $pull: { positive_rating_list: { $in: ["yesss"] } },
  // });

  // // const userToUpdate2 = await User.findByIdAndUpdate(userId, {
  // //   $push: {
  // //     positive_rating_list: "yesssd",
  // //   },
  // // });
  res.json({
    message: "coucou",
  });
});

module.exports = router;
