import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto max-w-md px-4 pt-6 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
