import { ethers } from 'ethers';
import Safe from '@safe-global/protocol-kit'; 

const RPC_URL = "https://polygon-rpc.com";

async function getPredictedSafeAddress(userOwnerAddress: string) {
    const safeSdk = await Safe.init({
        provider: RPC_URL,
        signer: userOwnerAddress, 
        predictedSafe: {
            safeAccountConfig: {
                owners: [userOwnerAddress],
                threshold: 1
            }
        }
    });


    const predictedAddress = await safeSdk.getAddress();
    
    console.log("Safe Address:", predictedAddress);
    return predictedAddress;
}