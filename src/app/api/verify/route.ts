import express from "express";
import crypto from "crypto";
import { verifyMessage } from "ethers";
import { pool } from "../db";
import jwt from "jsonwebtoken"

const app = express();

app.post("/", async (req, res) => {
  app.use(express.json());
  try {
    const { address, nonce } = req.body 
    const addr = address.toLowerCase();
    console.log("addr:", addr);

    const [rows] = (await pool.query(
      "SELECT nonce FROM login_nonces WHERE address = ? AND used = 0 ORDER BY id DESC LIMIT 1",
      [addr]
    )) as any[];

    console.log("rows:", rows);

    if (!rows.length) {
      return res.status(400).json({ error: "No nonce for this address" });
    }

    const expectedNonce = rows[0].nonce as string;
    console.log("expectedNonce:", expectedNonce);

    
    const [rowReg] = await pool.query("INSERT INTO users (address) VALUES (?)", [address])

    await pool.query(
      "UPDATE login_nonces SET used = 1 WHERE address = ? AND nonce = ?",
      [addr, expectedNonce]
    );

    const token = jwt.sign(
      { sub: 10, address: addr },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );
    console.log(token)
    return res.status(200).json({ ok: "ok", token: "token" });
  } catch (e) {
    console.error("verify error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});


export const verifyApp = app