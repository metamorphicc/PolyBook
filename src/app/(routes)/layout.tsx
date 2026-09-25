import { AppKitProviderr } from "../../../Provider";
import SessionSync from "../Components/SessionSync";

export default function ProductLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppKitProviderr>
      <SessionSync />
      {children}
    </AppKitProviderr>
  );
}
