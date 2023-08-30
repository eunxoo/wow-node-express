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
  console.log("NowWeather.js 서버");
  // console.log(moment);
  const getTodayDate = () => {
    // let today = new Date(Date.now() - 45 * 60 * 1000);
    // let yyyy = today.getFullYear().toString();
    // let mm = today.getMonth() + 1;
    // mm = mm < 10 ? "0" + mm.toString() : mm.toString();
    // let dd = today.getDate();
    // dd = dd < 10 ? "0" + dd.toString() : dd.toString();
    // console.log(dd);
    const today = moment().format("YYYYMMDD");
    if (moment().hour() === 0) {
      return moment(today).subtract(1, "days").format("YYYYMMDD");
    }
    console.log("today : ", today);
    return today;
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
  console.log(getBaseTime());
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
    getTodayDate() +
    "&base_time=" +
    getBaseTime() +
    "&nx=" +
    toXYconvert.x +
    "&ny=" +
    toXYconvert.y;

  const cacheKey = `${lat}-${lon}-${getTodayDate()}-${getBaseTime()}`;

  try {
    // Redis에서 캐시된 데이터 조회
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      // 캐시된 데이터 반환
      res.send(JSON.parse(cachedData));
    } else {
      // 캐시된 데이터가 없는 경우 API 호출 후 데이터 캐싱
      const response = await axios.get(apiUrl);

      const selectedFields = fields || ["T1H", "SKY", "PTY"];
      const selectedItems = response.data.response.body.items.item.filter(
        (item) => selectedFields.includes(item.category)
      );

      // 캐시 데이터를 Redis에 저장 (유효기간: 45분)
      await redis.setex(cacheKey, 2700, JSON.stringify(selectedItems));

      res.send(selectedItems);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }

  // axios
  //   .get(apiUrl)
  //   .then((response) => {
  //     const selectedFields = fields || ["T1H", "SKY", "PTY"]; // 기본 필드 설정
  //     const selectedItems = response.data.response.body.items.item.filter(
  //       (item) => selectedFields.includes(item.category)
  //     );
  //     // console.log(response.data);
  //     // console.log(response.data.response.body);
  //     // console.log(response.data.response.body.items.item);
  //     // res.send(response.data.response.body.items.item);
  //     res.send(selectedItems);
  //   })
  //   .catch((error) => {
  //     console.error(error);
  //     res.status(500).send("Internal Server Error");
  //   });
};
