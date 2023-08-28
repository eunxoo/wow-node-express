const axios = require("axios");
const Redis = require("ioredis");
require("dotenv").config({ path: __dirname + "/../.env" });
const ConvertToAddress = require("./ConvertToAddress");

const redis = new Redis({
  host: "svc.sel3.cloudtype.app",
  port: 31618,
});

module.exports = async (req, res) => {
  console.log("DustWeather.js 서버");

  const { lat, lon } = req.body;

  try {
    const addressInfo = await ConvertToAddress(lat, lon);
    const url = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty`;
    const SERVICE_KEY = process.env.OPENAPI_KEY;

    const apiUrl =
      url +
      "?serviceKey=" +
      SERVICE_KEY +
      "&numOfRows=10" +
      "&pageNo=1" +
      "&returnType=" +
      "json" +
      "&sidoName=" +
      addressInfo.region_1depth_name +
      "&ver=1.3";

    const cacheKey = `${lat}-${lon}`;

    try {
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        res.send(JSON.parse(cachedData)); // 캐시된 데이터가 있다면 반환
        return;
      }

      const response = await axios.get(apiUrl);

      // 데이터 처리 및 캐싱 로직
      const items = response.data.response.body.items;
      const frequencies = {};

      items.forEach((item) => {
        const key = `${item.pm25Grade1h}-${item.pm10Grade1h}`;
        frequencies[key] = (frequencies[key] || 0) + 1;
      });

      let mostFrequent = null;
      let highestFrequency = 0;

      for (const key in frequencies) {
        if (frequencies[key] > highestFrequency) {
          if (mostFrequent !== null || key !== "null-null") {
            mostFrequent = key;
            highestFrequency = frequencies[key];
          }
        }
      }

      if (mostFrequent !== null) {
        const [pm25Grade1h, pm10Grade1h] = mostFrequent.split("-");
        const result = { pm25Grade1h, pm10Grade1h };
        console.log("Most Frequent:", result);

        await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 유효시간: 1시간

        res.json(result);
      } else {
        const result = { pm25Grade1h: null, pm10Grade1h: null };
        await redis.setex(cacheKey, 3600, JSON.stringify(result)); // 유효시간: 1시간

        res.json(result);
      }
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }

  //   axios.get(apiUrl).then((response) => {
  //     // console.log(response.data);
  //     // console.log(response.data.response.body);
  //     response.data.response.body.items.forEach((item) => {
  //       // console.log("Item:", item);
  //     });

  //     const items = response.data.response.body.items;

  //     // 각 프로퍼티 값의 빈도를 계산하기 위한 객체
  //     const frequencies = {};

  //     // 각 항목의 프로퍼티 값을 분석하여 빈도 계산
  //     items.forEach((item) => {
  //       const key = `${item.pm25Grade1h}-${item.pm10Grade1h}`;
  //       frequencies[key] = (frequencies[key] || 0) + 1;
  //     });

  //     // 가장 많이 나온 값 찾기
  //     let mostFrequent = null;
  //     let highestFrequency = 0;

  //     for (const key in frequencies) {
  //       if (frequencies[key] > highestFrequency) {
  //         if (mostFrequent !== null || key !== "null-null") {
  //           mostFrequent = key;
  //           highestFrequency = frequencies[key];
  //         }
  //       }
  //     }

  //     if (mostFrequent !== null) {
  //       // 가장 많이 나온 값의 프로퍼티 값을 추출하여 보내기
  //       const [pm25Grade1h, pm10Grade1h] = mostFrequent.split("-");
  //       const result = { pm25Grade1h, pm10Grade1h };
  //       console.log("Most Frequent:", result);

  //       res.json(result);
  //     } else {
  //       res.json({ pm25Grade1h: null, pm10Grade1h: null });
  //     }
  //   });
  // } catch (error) {
  //   console.error(error);
  //   res.status(500).send("Internal Server Error");
  // }
};
