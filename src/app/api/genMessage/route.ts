import crypto from "crypto";
import { SiweMessage } from "siwe";
import Router from "express";

const app = Router();

app.post("/", async (req, res) => {
  const { address } = req.body;
  const addr = address.toLowerCase();

  const nonce = crypto.randomBytes(16).toString("hex");


  const siwe = new SiweMessage({
    domain: "example.com",
    address: addr,
    statement: "Sign in to MyCoolApp.",
    uri: "https://example.com",
    version: "1",
    chainId: 1,
    nonce,
    issuedAt: new Date().toISOString(),
  });

  const messageToSign = siwe.prepareMessage();
  res.json({ messageToSign });
});
