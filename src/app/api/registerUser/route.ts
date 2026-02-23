import express from "express";
import { pool } from "../db";

const appUsers = express();
appUsers.use(express.json());
appUsers.post("/", async (req, res) => {
  const { address, safe_address } = req.body;


  const [rowCheck]: any = await pool.query(
    "SELECT safe_address FROM users WHERE safe_address = ?",
    [safe_address] as any
  );
  if (rowCheck.length) {
    return res.status(200).json({ ok: "ok", status: "registered" });
  }

  const [row] = await pool.query(
    "INSERT INTO users(name, address, balance, safe_address) VALUES(?, ?, ?, ?)",
    ["namesdf", address, 0, safe_address] as any
  );

  res
    .status(200)
    .json({
      ok: "ok",
      status: "not registered",
      address: address,
      safe_address: safe_address,
    });
});

export default appUsers;
