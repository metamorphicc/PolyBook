"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function Main() {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const handleScroll = () => {
    targetRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const router = useRouter();
  return (
    <div className=" relative w-full ">
      <div className="h-screen flex flex-col items-center ">
        <div className="fixed inset-0 -z-10 h-screen">
          <Image
            src="/unsplash.jpg"
            alt="Background"
            fill
            priority
            className="object-cover "
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        <header className="w-[99%] flex-shrink-0 shadow-lg to-transparent rounded-[40px] mt-1">
          <div className="px-8 py-3 flex justify-between items-center ">
            <div className="flex items-center gap-3 cursor-pointer ">
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

            <ul className="flex items-center gap-5">
              <li className="text-white font-semibold text-[19px]">
                <button className="cursor-pointer hover:text-slate-400 transition duration-100">
                  Docs
                </button>
              </li>
              <li className="text-white font-semibold text-[19px]">
                <button className="cursor-pointer hover:text-slate-400 transition duration-100">
                  Team
                </button>
              </li>
              <li className="text-white font-semibold text-[19px]">
                <button className="cursor-pointer hover:text-slate-400 transition duration-100">
                  About
                </button>
              </li>
              <li className="text-white font-semibold text-[19px]">
                <button className="cursor-pointer hover:text-slate-400 transition duration-100">
                  Support
                </button>
              </li>
            </ul>
          </div>
        </header>

        <div className="flex-1 w-full flex flex-col items-center justify-center gap-8 ">
          <div className="p-5  py-17 w-full">
            <div className="flex flex-col items-center justify-center gap-3 ">
              <p className="text-white font-semibold text-[30px]">PolyBook</p>
              <p className="text-white mb-3">
                First scalp-terminal in Polymarket Ecosystem
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-3">
              <h1 className="text-white">
                <button
                  className="bg-black rounded-[40px] px-10 py-2.5 cursor-pointer border"
                  onClick={() => {
                    router.push("/home");
                  }}
                >
                  Launch app
                </button>
              </h1>
              <button
                onClick={handleScroll}
                className="rounded-full mt-3 border bg-[#467EA8] border-white text-white px-5 py-1.5 cursor-pointer"
              >
                Start exploring
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        ref={targetRef}
        className="bg-white h-screen flex flex-col w-full"
        id="mainp"
      >
        <div className="p-10 h-full w-full flex justify-start mt-10 ">
          <div className="shadow-lg rounded-[40px] flex min-w-[60%] max-w-[70%] text-[21px] p-5 flex flex-col gap-4">
            <div className="flex flex-col">
              <p>
                polybook - bla bla bla bla Lorem ipsum dolor sit, amet
                consectetur adipisicing elit. Suscipit, saepe!
              </p>
              <span className="text-[14px] text-zinc-500 font-medium">
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. At quo
                distinctio soluta mollitia, quibusdam non?
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
                bla bla bla Lorem, ipsum dolor sit amet consectetur adipisicing
                elit. At quo distinctio soluta mollitia, quibusdam non?
              </p>
              <span className="text-[14px] text-zinc-500 font-medium">
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. At quo
                distinctio soluta mollitia, quibusdam non?
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
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. At quo
                distinctio soluta mollitia, quibusdam non?
              </p>
              <span className="text-[14px] text-zinc-500 font-medium">
                Lorem, ipsum dolor sit amet consectetur adipisicing elit. At quo
                distinctio soluta mollitia, quibusdam non? Lorem, ipsum dolor
                sit amet consectetur adipisicing elit. At quo distinctio soluta
                mollitia, quibusdam non?
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
            <p className="font-bold text-[30px] text-sky-700">
              {" "}
              All these in one terminal{" "}
            </p>
            <span className="text-[24px]">Start trading</span>
            <Image
              src={"/back.svg"}
              width={20}
              height={20}
              alt="img"
              className="rotate-270 my-5 arrow-bounce"
            />
          </div>

          <button className="px-6 py-3 shadow-lg flex items-center rounded-lg cursor-pointer border hover:scale-103 transition" onClick={() => {router.push("/home")}}>
            GO TRADE
          </button>
        </div>
      </div>
      <div className="h-30 bg-zinc-800 border-t border-zinc-900 flex items-center justify-center">
        <footer className="flex p-5 justify-center items-center flex-col gap-4">
          <div className="text-zinc-400">
            @ 2025 All rights privacy, DYOR NFA.
          </div>
          <div className="text-zinc-400 text-[16px]">Made for polymarket.</div>
        </footer>
      </div>
    </div>
  );
}
