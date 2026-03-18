import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Navbar />
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-y-auto bg-background p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
