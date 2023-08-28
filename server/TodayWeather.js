const { toXY } = require("./XyConvert");
const axios = require("axios");
const Redis = require("ioredis");
require("dotenv").config({ path: __dirname + "/../.env" });

const redis = new Redis({
  host: "svc.sel3.cloudtype.app",
  port: 31618,
});

module.exports = async (req, res) => {
  console.log("TodayWeather.js 서버");

  const getYesterdayDate = () => {
    let yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    let yyyy = yesterday.getFullYear().toString();
    let mm = yesterday.getMonth() + 1;
    mm = mm < 10 ? "0" + mm.toString() : mm.toString();
    let dd = yesterday.getDate();
    dd = dd < 10 ? "0" + dd.toString() : dd.toString();
    return yyyy + mm + dd;
  };

  const getBaseTime = () => {
    const currentHour = new Date().getHours();
    const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];

    // Find the nearest previous base time
    let previousBaseTime = baseTimes[0];
    for (let i = baseTimes.length - 1; i >= 0; i--) {
      if (currentHour >= baseTimes[i]) {
        previousBaseTime = baseTimes[i];
        break;
      }
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
    getYesterdayDate() +
    "&base_time=" +
    getBaseTime() +
    "&nx=" +
    toXYconvert.x +
    "&ny=" +
    toXYconvert.y;

  const cacheKey = `${lat}-${lon}-${getYesterdayDate()}-2300`;

  try {
    // Redis에서 캐시된 데이터 조회
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      // 캐시된 데이터 반환
      res.send(JSON.parse(cachedData));
    } else {
      // 캐시된 데이터가 없는 경우 API 호출 후 데이터 캐싱
      const response = await axios.get(apiUrl);

      const selectedFields = fields || ["TMN", "TMX", "TMP", "SKY", "PTY"];
      const selectedItems = response.data.response.body.items.item.filter(
        (item) => selectedFields.includes(item.category)
      );

      // 캐시 데이터를 Redis에 저장 (유효기간: 24시간)
      await redis.setex(cacheKey, 24 * 60 * 60, JSON.stringify(selectedItems));
      res.send(selectedItems);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }

  // axios
  //   .get(apiUrl)
  //   .then((response) => {
  //     const selectedFields = fields || ["TMN", "TMX", "TMP", "SKY", "PTY"]; // 기본 필드 설정
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
