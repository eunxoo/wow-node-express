const axios = require("axios");
require("dotenv").config({ path: __dirname + "/../.env" });
const ConvertToAddress = require("./ConvertToAddress");

// /convert 엔드포인트의 핸들러 함수
module.exports = async (req, res) => {
  const { latitude, longitude } = req.query;
  // console.log(latitude);
  try {
    const address = await ConvertToAddress(latitude, longitude);
    // console.log(address);
    res.json({ address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error converting coordinates" });
  }
};
