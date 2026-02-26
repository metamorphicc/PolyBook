import { useState } from "react";
import Image from "next/image";
export const DepositContent = ({ address, closeModal }: { address: string; closeModal: () => void }) => {
    const [copied, setCopied] = useState(false);
  
    const handleCopy = async () => {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); 
    };
  
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-white">Top Up Balance</h2>
        <p className="text-zinc-400">Your address:</p>
        
        <div 
          onClick={handleCopy}
          className="group relative px-2 w-full py-2 border border-white/20 flex items-center justify-start text-white text-[14px] cursor-pointer hover:border-white/50 transition-all active:scale-[0.98]"
        >
          <span className="truncate pr-16">{address}</span>
          
          <Image src={"/copy.svg"} width={16} height={16} alt="img" />
        </div>
        <span className="text-md text-white">Send assets to this address to start trade</span>
        <button
          onClick={closeModal}
          className="bg-white py-2 rounded-lg text-black cursor-pointer hover:shadow-lg font-bold mt-2"
        >
          Close
        </button>
      </div>
    );
  };