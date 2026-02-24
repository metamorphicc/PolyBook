"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Main() {
  const router = useRouter();
  return (
    <div className=" relative w-full">
      <div className="h-screen flex flex-col">
        <div className="fixed inset-0 -z-10 h-screen">
          <Image
            src="/unsplash.jpg"
            alt="Background"
            fill
            priority
            className="object-cover"
          />
        </div>

        <header className="w-full flex-shrink-0 fixed">
          <div className="px-8 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3 cursor-pointer">
              <Image
                alt="image"
                width={50}
                height={50}
                src={"/logo.png"}
                className="rounded-[10px]"
              ></Image>
              <span
                className="text-white font-semibold text-[25px] tracking-tighter"
                style={{ textShadow: "2px 2px 10px rgba(255, 255, 255, 0.20)" }}
              >
                PolyBook
              </span>
            </div>

            <ul>
              <li className="text-white font-semibold text-[19px]">
                <button className="cursor-pointer hover:text-slate-400 transition duration-100">
                  Docs
                </button>
              </li>
            </ul>
          </div>
        </header>

        <div className="flex-1 w-full flex flex-col items-center justify-center gap-8 ">
          <div className="">
            <div className="flex flex-col items-center justify-center gap-3 ">
              <p className="text-white font-semibold text-[30px]">PolyBook</p>
              <p className="text-white mb-3">
                First scalp-terminal in Polymarket Ecosystem
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
              <h1 className="text-white">
                <button
                  className="bg-black rounded-[40px] px-10 py-3 cursor-pointer"
                  onClick={() => {
                    router.push("/home");
                  }}
                >
                  Launch app
                </button>
              </h1>
              <button className="rounded-full border text-white px-5 py-1 cursor-pointer">
                Learn more
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white h-screen flex flex-col w-full" id="mainp">
        <div className="p-10 h-full w-full flex justify-start mt-10 ">
          <div className="shadow-lg rounded-[40px] flex min-w-[60%] max-w-[70%] text-[21px] p-5 flex flex-col gap-4">
            <div className="flex flex-col">
              <p>

              </p>
              <span className="text-[14px] text-zinc-500 font-medium">

              </span>
            </div>

            <div className="flex">
              <div className="w-full flex items-center justify-center">
                <Image
                  src={"/logo.png"}
                  alt="page"
                  width={60}
                  height={60}
                ></Image>
              </div>

              <div className="w-full flex items-center justify-center">
                <Image
                  src={"/logo.png"}
                  alt="page"
                  width={60}
                  height={60}
                ></Image>
              </div>
            </div>
          </div>
        </div>
        <div className="p-10 h-full w-full flex justify-end ">
          <div className="shadow-lg rounded-[40px] flex min-w-[60%] max-w-[70%] text-[21px] p-5 flex flex-col gap-4">
            <div className="flex flex-col">
              <p>

              </p>
              <span className="text-[14px] text-zinc-500 font-medium">

              </span>
            </div>

            <div className="flex">
              <div className="w-full flex items-center justify-center">
                <Image
                  src={"/logo.png"}
                  alt="page"
                  width={60}
                  height={60}
                ></Image>
              </div>

              <div className="w-full flex items-center justify-center">
                <Image
                  src={"/logo.png"}
                  alt="page"
                  width={60}
                  height={60}
                ></Image>
              </div>
            </div>
          </div>
        </div>
        <div className="p-10 h-full w-full flex justify-start">
          <div className="shadow-lg rounded-[40px] flex min-w-[60%] max-w-[70%] text-[21px] p-5 flex flex-col gap-4">
            <div className="flex flex-col">
              <p>

              </p>
              <span className="text-[14px] text-zinc-500 font-medium">

              </span>
            </div>

            <div className="flex">
              <div className="w-full flex items-center justify-center">
                <Image
                  src={"/logo.png"}
                  alt="page"
                  width={60}
                  height={60}
                ></Image>
              </div>

              <div className="w-full flex items-center justify-center">
                <Image
                  src={"/logo.png"}
                  alt="page"
                  width={60}
                  height={60}
                ></Image>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <p></p>
            <span></span>
          </div>

          <button className="px-6 py-3 shadow-lg flex items-center rounded-lg cursor-pointer border">
            GO TRADE
          </button>
        </div>
      </div>
      <div className="h-30 bg-zinc-800 border-t border-zinc-900 flex items-center justify-center">
        <footer className="flex p-5 justify-center items-center flex-col gap-4">
          <div className="text-zinc-400">
            @ 2025 All rights privacy, DYOR NFA.
          </div>
          <div className="text-zinc-400 text-[16px]">
            Made for polymarket.
          </div>
        </footer>
      </div>
    </div>
  );
}
