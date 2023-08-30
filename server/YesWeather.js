const { toXY } = require("./XyConvert");
const axios = require("axios");
const Redis = require("ioredis");
require("moment-timezone");
var moment = require("moment");
moment.tz.setDefault("Asia/Seoul");
require("dotenv").config({ path: __dirname + "/../.env" });

const redis = new Redis({
  host: "svc.sel3.cloudtype.app",
  port: 31618,
});

module.exports = async (req, res) => {
  console.log("YesWeather.js 서버");

  const getYesterdayDate = () => {
    // let yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000 - 45 * 60 * 1000);
    // let yyyy = yesterday.getFullYear().toString();
    // let mm = yesterday.getMonth() + 1;
    // mm = mm < 10 ? "0" + mm.toString() : mm.toString();
    // let dd = yesterday.getDate();
    // dd = dd < 10 ? "0" + dd.toString() : dd.toString();
    // return yyyy + mm + dd;
    const yesterday = moment().subtract(1, "days");
    if (moment().hour() === 0) {
      return moment(yesterday).subtract(1, "days").format("YYYYMMDD");
    }
    return yesterday.format("YYYYMMDD");
  };

  //초단기예보시간 - 예보시간은 각 30분, api제공시간은 45분
  const getBaseTime = () => {
    var currentTime = moment();
    console.log("현재 시간:", currentTime.format("HH"));
    const oneHourAgo = currentTime.subtract(1, "hour");
    let formattedOneHourAgo = oneHourAgo.format("HH");
    console.log("현재 시간2:", formattedOneHourAgo);
    return formattedOneHourAgo + "" + "30";
  };

  const { lat, lon, fields } = req.body;
  const toXYconvert = toXY(lat, lon);

  const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst`;
  const SERVICE_KEY = process.env.OPENAPI_KEY;
  console.log(req.body);
  const apiUrl =
    url +
    "?serviceKey=" +
    SERVICE_KEY +
    "&numOfRows=60" +
    "&pageNo=1" +
    "&dataType=" +
    "json" +
    "&base_date=" +
    getYesterdayDate() +
    "&base_time=" +
    getBaseTime() +
    "&nx=" +
    toXYconvert.x +
    "&ny=" +
    toXYconvert.y;
  console.log(apiUrl);
  const cacheKey = `${lat}-${lon}-${getYesterdayDate()}-${getBaseTime()}`;

  try {
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      res.send(JSON.parse(cachedData));
    } else {
      const response = await axios.get(apiUrl);

      const selectedFields = fields || ["T1H"];
      const selectedItems = response.data.response.body.items.item.filter(
        (item) => selectedFields.includes(item.category)
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
  //     const selectedFields = fields || ["T1H"]; // 기본 필드 설정
  //     const selectedItems = response.data.response.body.items.item.filter(
  //       (item) => selectedFields.includes(item.category)
  //     );

  //     res.send(selectedItems);
  //     // console.log(response.data);
  //     // console.log(response.data.response.body);
  //     // console.log(response.data.response.body.items.item);
  //   })
  //   .catch((error) => {
  //     console.error(error);
  //     res.status(500).send("Internal Server Error");
  //   });
};
