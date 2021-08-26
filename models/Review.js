const { Schema, model } = require("mongoose");

const reviewSchema = Schema({
  game_id: String,
  name: String,
  title: String,
  text: String,
  date: { type: Date, default: Date.now },
  owner: {
    owner_id: { type: Schema.Types.ObjectId, ref: "User" },
    avatar: String,
    name: String,
  },
  rating: { type: Number, default: 0 },
});

const Review = model("Review", reviewSchema);

module.exports = Review;
