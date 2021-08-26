const { Schema, model } = require("mongoose");
const gameSchema = Schema({
  game_id: String,
  name: String,
  photo: String,
  owner: { type: Schema.Types.ObjectId, ref: "User" },
});

const Game = model("game", gameSchema);

module.exports = Game;
