// import { ethers } from "ethers";
// import { SiweMessage } from "siwe";
// import { Router } from "express";
// import jwt from "jsonwebtoken"

// const app = Router()

// app.post("/auth/verify", async (req, res) => {
//   const { address, message, signature } = req.body;
//   const addr = address.toLowerCase();

//   // 1) распарсить SIWE-сообщение
//   let siwe;
//   try {
//     siwe = new SiweMessage(message);
//   } catch (e) {
//     return res.status(400).json({ error: "Invalid message format" });
//   }

//   // 2) проверить подпись
//   try {
//     const { data } = await siwe.verify({ signature, domain: "example.com" });
//     // data.address — адрес из подписи
//     if (data.address.toLowerCase() !== addr) {
//       return res.status(401).json({ error: "Address mismatch" });
//     }
//   } catch (e) {
//     return res.status(401).json({ error: "Invalid signature" });
//   }

//   // 3) сверить nonce с БД и пометить использованным
//   const valid = await checkAndConsumeNonce(addr, siwe.nonce);
//   if (!valid) {
//     return res.status(401).json({ error: "Invalid or expired nonce" });
//   }

//   // 4) найти или создать пользователя
//   const user = await findOrCreateUserByAddress(addr);

//   // 5) выдать JWT / сессию
//   const token = jwt.sign(
//     { sub: user.id, address: addr },
//     process.env.JWT_SECRET!,
//     { expiresIn: "7d" }
//   );

//   res.json({ token, user });
// });
