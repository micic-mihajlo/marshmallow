import { AdminGuard } from "@/components/admin/admin-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          {children}
        </div>
      </div>
    </AdminGuard>
  );
} 