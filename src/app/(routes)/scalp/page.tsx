"use client";
import DropdownMenu from "@/app/Components/DropDown";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Scalp() {
  const router = useRouter();
  return (
    <div className="relative w-full">
      <div className="h-screen w-full flex flex-col">
        <div className="flex w-full justify-end px-4 py-2 shadow-lg">
          <DropdownMenu />
        </div>
        <div className="w-full h-full ">
          <div className="text-white  h-full flex flex-col justify-center items-center">
            <div className="flex items-center p-6  w-screen shadow-lg justify-center flex-col gap-6">
              <div className="flex items-center flex-col text-black gap-2">
                <p className="text-[25px] font-semibold">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Accusantium, rerum?
                </p>
                <span className="">
                  Lorem ipsum dolor, sit amet consectetur adipisicing elit.
                  Suscipit voluptatibus dolorum, est delectus rem voluptatem
                  beatae, excepturi nostrum ducimus numquam dolores accusantium?
                  Hic ipsam dolores, fugiat molestias qui animi, incidunt
                  eligendi officiis, vel adipisci asperiores! Perferendis nemo
                  nihil dignissimos architecto quibusdam! Quaerat harum
                  laudantium a, non debitis voluptates ipsum est, architecto
                  possimus quis ducimus? Ut vel accusantium odio cum veritatis
                  sapiente perferendis enim recusandae porro debitis aliquid
                  aperiam, explicabo quidem quae sequi aspernatur? Pariatur
                  labore ullam quaerat inventore molestiae consectetur vel
                  accusamus quae esse dolorem aspernatur reiciendis enim,
                  delectus, ea odio odit similique quia doloremque sapiente
                  recusandae error, ducimus autem. Qui ea ad omnis repellat eos
                  excepturi ipsum quisquam nemo veniam iste necessitatibus
                  repudiandae vitae labore, laboriosam libero perferendis amet,
                  explicabo, ullam maiores nihil magnam. Qui, sed ea possimus
                  repellat deserunt dignissimos! Hic voluptas laborum molestiae
                  culpa veniam modi laudantium, accusantium, ullam officia
                  aliquam rem voluptatum? Odit magnam illo itaque quam
                  repudiandae deleniti voluptates, saepe hic dolore cum unde
                  totam autem nemo facere quos temporibus quas. Voluptatibus
                  maxime deleniti dignissimos qui, sapiente nulla repellat
                  asperiores blanditiis esse inventore natus impedit cumque
                  tenetur, ullam magni veritatis at itaque doloremque neque ut
                  molestias repellendus quas. Possimus voluptatem sit ullam quo
                  expedita doloribus optio recusandae aliquid asperiores hic
                  veniam, modi officia soluta mollitia necessitatibus magnam
                  placeat vitae quis architecto odio amet! Possimus nam
                  laudantium odio esse molestiae veritatis. Id mollitia quo,
                  possimus quam obcaecati reiciendis natus alias odio nisi sint
                  ex repellendus dolores quos! Corrupti aspernatur qui modi
                  suscipit dicta quod, obcaecati quaerat commodi nemo quam,
                  ipsam architecto alias at? Consequuntur laborum laudantium
                  saepe, reiciendis numquam, neque illo sed, commodi eveniet
                  iste in praesentium modi excepturi obcaecati quos. Consectetur
                  esse voluptas saepe quas ipsam tenetur beatae ullam? Aliquid
                  distinctio accusamus iusto dolores consectetur assumenda autem
                  earum a, ex consequuntur quibusdam vitae qui amet.
                </span>
              </div>
              <div className=" mb-20 flex gap-6 flex justify-center ">
                <div className="cursor-pointer shadow-lg rounded-[10px] hover:scale-103 transition">
                  <button
                    className="text-black text-semibold px-6 py-2 cursor-pointer border rounded-[10px]"
                    onClick={() => {
                      router.replace("/scalpTerminal");
                    }}
                  >
                    Launch scalp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
