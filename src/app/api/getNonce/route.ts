import express from "express";
import crypto from "crypto";
import { ethers } from "ethers";
import { pool } from "../db";

const nonceApp = express();

nonceApp.get("/", async (req, res) => {
  const address = (req.query.address as string | undefined)?.toLowerCase();
  const nonce = crypto.randomBytes(16).toString("hex");

  if (address) {
    await pool.query(
      "INSERT INTO login_nonces (address, nonce, used) VALUES (?, ?, 0)",
      [address, nonce]
    );
  }

  res.send(nonce);
});


export default nonceApp