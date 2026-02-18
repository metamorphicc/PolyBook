import express from "express";
import { pool } from "../db";

const appUsers = express();

appUsers.post("/", async (req, res) => {
  const { address } = req.body;

  const [rowCheck]: any = await pool.query(
    "SELECT address FROM users WHERE address = ?",
    [address] as any
  );

  if (rowCheck.length) {
    console.log(rowCheck);
    return res.status(200).json({ ok: "ok", status: "registered" });
  }

  const [row] = await pool.query(
    "INSERT INTO users(name, address) VALUES(?, ?)",
    [address, address] as any
  );

  res.status(200).json({ ok: "ok", status: "not registered", address: address });
});

export default appUsers;
