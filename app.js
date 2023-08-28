const express = require("express");
const app = express();
const cors = require("cors");
const NowWeather = require("./server/NowWeather");
const TodayWeather = require("./server/TodayWeather");
const YesWeather = require("./server/YesWeather");
const AddressConvert = require("./server/AddressConvert");
const DustWeather = require("./server/DustWeather");
const TomorrowWeather = require("./server/TomorrowWeather");
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.post("/nowweather", NowWeather);
app.post("/api/todayweather", TodayWeather);
app.post("/api/yesweather", YesWeather);
app.post("/api/tomorrowweather", TomorrowWeather);
app.get("/api/convert", AddressConvert);
app.post("/api/nowdust", DustWeather);

app.listen(PORT, () => {
  console.log(`server running on PORT ${PORT}`);
});
