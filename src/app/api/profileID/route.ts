import { Router } from "express";
import { pool } from "../db";

const appID = Router();

appID.get("/", async (req, res) => {
  // const { body } = req.body;

  console.log(`Hello world! Response is succesfully:`);

  return res.json({ ok: true });
});

export default appID;
