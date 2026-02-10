// import { useEffect } from "react";


// export default function SearchBid() {
//     useEffect(() => {
//         if (!market) return;
//         let alive = true;
      
//         async function loadBook() {
//           try {
//             const res = await fetch(`/api/orderbook?marketId=${market.id}`, {
//               cache: "no-store",
//             });
//             const data = await res.json();
      
//             if (!alive) return;
      
//             setBids(
//               (data.bids || []).map(([price, size]: [string, string]) => ({
//                 price: Number(price),
//                 size: Number(size),
//               }))
//             );
//             setAsks(
//               (data.asks || []).map(([price, size]: [string, string]) => ({
//                 price: Number(price),
//                 size: Number(size),
//               }))
//             );
//           } catch (e) {
//             console.error(e);
//           }
//         }
      
//         loadBook();
//         const i = setInterval(loadBook, 500);
//         return () => {
//           alive = false;
//           clearInterval(i);
//         };
//       }, [market]);
// }

  