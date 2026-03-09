import { NextResponse } from "next/server";
import { pool } from "../db";

export async function POST(req: Request) {
  try {
    const { address, safe_address } = await req.json();
    console.log(`регистер юзер ${safe_address} ${address}`)
    const [rowCheck]: any = await pool.query(
      "SELECT safe_address FROM users WHERE safe_address = ?",
      [safe_address]
    );

    if (rowCheck.length) {
      console.log("entered rowcheck")
      return NextResponse.json({
        ok: "ok",
        status: "not registered",
        address: address,
        safe_address: safe_address,
      });
    }

    await pool.query(
      "INSERT INTO users(name, address, balance, safe_address) VALUES(?, ?, ?, ?)",
      ["namesdf", address, 0, safe_address]
    );

    return NextResponse.json({
      ok: "ok",
      status: "not registered",
      address: address,
      safe_address: safe_address,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}