const { toXY } = require("./XyConvert");
const axios = require("axios");
const Redis = require("ioredis");
require("dotenv").config({ path: __dirname + "/../.env" });

const redis = new Redis({
  host: "svc.sel3.cloudtype.app",
  port: 31618,
});

module.exports = async (req, res) => {
  console.log("TomorrowWeather.js 서버");

  const getYesterdayDate = () => {
    let yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    let yyyy = yesterday.getFullYear().toString();
    let mm = yesterday.getMonth() + 1;
    mm = mm < 10 ? "0" + mm.toString() : mm.toString();
    let dd = yesterday.getDate();
    dd = dd < 10 ? "0" + dd.toString() : dd.toString();
    return yyyy + mm + dd;
  };

  const getTomorrowDate = () => {
    let tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    let yyyy = tomorrow.getFullYear().toString();
    let mm = tomorrow.getMonth() + 1;
    mm = mm < 10 ? "0" + mm.toString() : mm.toString();
    let dd = tomorrow.getDate();
    dd = dd < 10 ? "0" + dd.toString() : dd.toString();
    return yyyy + mm + dd;
  };

  const { lat, lon, fields } = req.body;
  const toXYconvert = toXY(lat, lon);

  const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst`;
  const SERVICE_KEY = process.env.OPENAPI_KEY;
  console.log(req.body);
  const apiUrl =
    url +
    "?serviceKey=" +
    SERVICE_KEY +
    "&numOfRows=600" +
    "&pageNo=1" +
    "&dataType=" +
    "json" +
    "&base_date=" +
    getYesterdayDate() +
    "&base_time=" +
    "2300" +
    "&nx=" +
    toXYconvert.x +
    "&ny=" +
    toXYconvert.y;

  const cacheKey = `${lat}-${lon}-${getYesterdayDate()}-2300`;

  try {
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      res.send(JSON.parse(cachedData));
    } else {
      const response = await axios.get(apiUrl);

      const selectedFields = fields || ["TMP", "SKY", "PTY"];
      const selectedDate = getTomorrowDate();

      const selectedItems = response.data.response.body.items.item.filter(
        (item) =>
          selectedFields.includes(item.category) &&
          item.fcstDate === selectedDate
      );

      await redis.setex(cacheKey, 86400, JSON.stringify(selectedItems)); // 유효시간: 24시간

      res.send(selectedItems);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }

  // axios
  //   .get(apiUrl)
  //   .then((response) => {
  //     const selectedFields = fields || ["TMP", "SKY", "PTY"]; // 기본 필드 설정
  //     const selectedDate = getTomorrowDate();

  //     const selectedItems = response.data.response.body.items.item.filter(
  //       (item) =>
  //         selectedFields.includes(item.category) &&
  //         item.fcstDate === selectedDate
  //     );
  //     // console.log(response.data);
  //     // console.log(response.data.response.body);
  //     // console.log(selectedItems);
  //     // res.send(response.data.response.body.items.item);
  //     res.send(selectedItems);
  //   })
  //   .catch((error) => {
  //     console.error(error);
  //     res.status(500).send("Internal Server Error");
  //   });
};
