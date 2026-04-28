import Safe, { type Eip1193Provider } from "@safe-global/protocol-kit";


export const GAMMA_HOST = "https://gamma-api.polymarket.com";

export const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ];

export const USDC_E_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

import { ethers } from "ethers";

export async function deploySafeIfNeeded(
    signer: ethers.Signer,
    predictedSafeAddress: string
  ) {
    const ownerAddress = await signer.getAddress();
    const provider = signer.provider as ethers.providers.Web3Provider;
    if (!provider) throw new Error("No provider on signer");
  
    const code = await provider.getCode(predictedSafeAddress);
    if (code !== "0x") {
      console.log("[DEPLOY] Safe already deployed");
      return;
    }
  
    const ext = provider.provider as any;
    if (typeof ext.request !== "function") {
      throw new Error("Underlying provider is not EIP-1193 compatible");
    }
    const eip1193 = ext as Eip1193Provider;
  
    console.log("[DEPLOY] deploying Safe at:", predictedSafeAddress);
  
    const safeSdk = await Safe.init({
      provider: eip1193,
      signer: ownerAddress,
      predictedSafe: {
        safeAccountConfig: {
          owners: [ownerAddress],
          threshold: 1,
        },
      },
    });
  
    const deploymentTx = await safeSdk.createSafeDeploymentTransaction();
  
    const txResponse = await signer.sendTransaction(deploymentTx);
    const receipt = await txResponse.wait();
  
    console.log("[DEPLOY] Safe deployed tx:", receipt.transactionHash);
  }
  