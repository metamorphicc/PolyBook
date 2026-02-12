import express from "express";
import crypto from "crypto";
import { ethers } from "ethers";
import { pool } from "../db";

const nonceApp = express();

nonceApp.post("/", async (req, res) => {
  const { address } = req.body;
  const nonce = crypto.randomBytes(16).toString("hex");
  nonceApp.use(express.json());
  console.log(`nonce: ${nonce}`);
  console.log(`ADDRESS: ${address}`);

  await pool.query(
    "INSERT INTO login_nonces (address, nonce, used) VALUES (?, ?, 0)",
    [address, nonce]
  );

  res.send(nonce);
});

export default nonceApp;
