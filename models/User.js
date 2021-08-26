const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  full_name: { type: String, default: "" },
  email: String,
  hash: String,
  token: String,
  avatar: {
    url: String,
    public_id: String,
  },
  salt: String,
  positive_rating_list: { type: Array, default: [] },
  negative_rating_list: { type: Array, default: [] },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
