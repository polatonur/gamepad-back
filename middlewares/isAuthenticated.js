const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  console.log("authenticating.....");
  //   console.log(req.headers);
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace("Bearer ", "");
    // console.log(token);
    const user = await User.findOne({ token: token });
    console.log("user=====>", user.username);
    if (user) {
      return next();
    } else {
      res.status(401).json({
        message: "Unautorized",
      });
      console.log("1");
    }
  } else {
    res.status(401).json({
      message: "Unautorized",
    });
    console.log("2");
  }
};

module.exports = isAuthenticated;
