import express from "express";
import nonceApp from "../src/app/api/getNonce/route";
import { verifyApp } from "../src/app/api/verify/route";
import cors from "cors";
import appUsers from "../src/app/api/registerUser/route";
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
  app.use("/api/getNonce", nonceApp);
  app.use("/api/verify", verifyApp);
  app.use("/api/registerUser", appUsers);
  app.listen(8089, () => {
    console.log(`Server was deployed on 8089`);
  });
}

main();
