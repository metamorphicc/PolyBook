import express from "express";
import appID from "../src/app/api/profileID/route";
import nonceApp from "../src/app/api/getNonce/route";
import { verifyApp } from "../src/app/api/verify/route";
import cors from "cors";

const app = express();

async function main() {
  app.get("/", (req, res) => {
    res.json({
      Polybook: "",
    });
  });
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(express.json());
  app.use("/api/profileID", appID);
  app.use("/api/getNonce", nonceApp);
  app.use("/api/verify", verifyApp);
  app.listen(8089, () => {
    console.log(`Сервер запущен на порте 8089`);
  });
}

main();
