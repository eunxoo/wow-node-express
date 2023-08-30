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
  console.log("TomorrowWeather.js 서버");

  const getTodayDate = () => {
    // const today = new Date();
    // const yyyy = today.getFullYear().toString();
    // let mm = today.getMonth() + 1;
    // mm = mm < 10 ? "0" + mm.toString() : mm.toString();
    // let dd = today.getDate();
    // dd = dd < 10 ? "0" + dd.toString() : dd.toString();
    // let hour = moment().hour();
    // if (hour < 2) {
    //   const yesterday = moment().subtract(1, "days");
    //   return yesterday.format("YYYYMMDD");
    // }
    // return yyyy + mm + dd;
    const today = moment();
    const hour = today.hour();

    if (hour < 2) {
      const yesterday = moment().subtract(1, "days");
      return yesterday.format("YYYYMMDD");
    }

    return today.format("YYYYMMDD");
  };

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
    const tomorrow = moment().add(1, "days");
    return tomorrow.format("YYYYMMDD");
  };

  // const getTomorrowDate = () => {
  //   let tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  //   let yyyy = tomorrow.getFullYear().toString();
  //   let mm = tomorrow.getMonth() + 1;
  //   mm = mm < 10 ? "0" + mm.toString() : mm.toString();
  //   let dd = tomorrow.getDate();
  //   dd = dd < 10 ? "0" + dd.toString() : dd.toString();
  //   return yyyy + mm + dd;
  // };

  const getBaseTime = () => {
    // const currentHour = new Date().getHours();
    let currentHour = moment().hour();
    console.log("현재 시간2:", currentHour);
    const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];

    // Find the nearest previous base time
    let previousBaseTime = baseTimes[0];
    for (let i = baseTimes.length - 1; i >= 0; i--) {
      if (currentHour >= baseTimes[i]) {
        previousBaseTime = baseTimes[i];
        break;
      }
    }

    if (currentHour < 2) {
      return "2300";
    }

    return previousBaseTime < 10
      ? "0" + previousBaseTime + "00"
      : previousBaseTime + "00";
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
    getTodayDate() +
    "&base_time=" +
    getBaseTime() +
    "&nx=" +
    toXYconvert.x +
    "&ny=" +
    toXYconvert.y;
  console.log(apiUrl);
  const cacheKey = `${lat}-${lon}-${getTodayDate()}-${getBaseTime()}`;

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
