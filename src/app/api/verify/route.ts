import express from "express";
import crypto from "crypto";
import { ethers } from "ethers";
import { pool } from "../db";
import jwt from "jsonwebtoken"

const app = express();

app.post("/", async (req, res) => {
  const { address, message, sighed } = req.body as {
    address: string;
    message: string;
    sighed: string;
  };

  const addr = address.toLowerCase();

  const [rows] = (await pool.query(
    "SELECT nonce FROM login_nonces WHERE address = ? AND used = 0 ORDER BY id DESC LIMIT 1",
    [addr]
  )) as any[];

  if (!rows.length) {
    return res.status(400).json({ error: "No nonce for this address" });
  }

  const expectedNonce = rows[0].nonce as string;

  if (!message.includes(expectedNonce)) {
    return res.status(400).json({ error: "Nonce mismatch" });
  }

  const recovered = ethers.utils
    .verifyMessage(message, sighed)
    .toLowerCase();

  if (recovered !== addr) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  await pool.query(
    "UPDATE login_nonces SET used = 1 WHERE address = ? AND nonce = ?",
    [addr, expectedNonce]
  );
  const token = jwt.sign(
    { sub: 10, address: addr },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  res.json({ token });
});


export const verifyApp = app