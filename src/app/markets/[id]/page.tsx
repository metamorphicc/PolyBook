type Props = { params: { id: string } };

export default async function marketsId({ params }: Props) {
  const { id } = await params;

  const res = await fetch(`https://gamma-api.polymarket.com/events/${id}`);
  const jsonRow = await res.json();
  console.log(jsonRow);
  return (
    <div>
      Lorem ipsum, dolor sit amet consectetur adipisicing elit. Facere
      asperiores corporis animi. Mollitia aperiam repellendus molestiae deserunt
      soluta porro illo quam. Asperiores excepturi eius, aliquam eaque quis
      inventore doloremque cupiditate!
    </div>
  );
}
