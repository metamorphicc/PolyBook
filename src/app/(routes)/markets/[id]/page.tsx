import Header from "@/app/Components/header";
type Props = { params: { id: string } };

export default async function marketsId({ params }: Props) {
  const { id } = await params;

  const res = await fetch(`https://gamma-api.polymarket.com/events/${id}`);
  const jsonRow = await res.json();
  console.log(jsonRow);
  return (
    <div className="relative w-full ">
      <div className="h-screen flex flex-col w-full p-3 items-center justify-center">
      <Header/>

        <div className="flex h-full items-center justify-center w-full">

          <div className="border w-[80vw] h-[40vw] flex shadow-lg">
            <div className="w-full h-full items-center  flex flex-col">
              <div className="flex items-center h-[70%] justify-center w-full border">
                charts
              </div>
              <div className="flex items-center h-[30%] justify-center w-full border">
                markets
              </div>
            </div>
            <div className="w-full flex flex-col  h-full p-15 justify-between">
              <div className=" w-full h-[60%] w-[50%] border rounded-[40px] items-center flex justify-center p-5">
                order window
              </div>
              <div className="p-10 h-[30%] flex items-center justify-center rounded-[40px] flex w-full border">
                Smth
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
