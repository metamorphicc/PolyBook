import { pool } from "../db"; 
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
  safe_address: string;
}

export async function POST(req: Request) {
  try {
    const { address } = await req.json();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const [rows] = await pool.query<UserRow[]>(
      "SELECT safe_address FROM USERS WHERE address = ?",
      [address]
    );

    if (rows && rows.length > 0) {
      const safeAddress = rows[0].safe_address;
      
      
      return NextResponse.json({ 
        ok: true, 
        safeAddress: safeAddress 
      });
    }

    console.log("User is out of DB");
    return NextResponse.json({ 
      ok: false, 
      safeAddress: null 
    }, { status: 200 }); 

  } catch (error) {
    console.error("DB ERROR ", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}