import { Metadata } from "next";
import DatabaseExplorer from "@/components/database-explorer/DatabaseExplorer";

export const metadata: Metadata = {
  title: "Explorador de Banco de Dados",
  description: "Explore e consulte suas tabelas do Supabase em tempo real",
};

export default function DatabaseExplorerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <DatabaseExplorer />
    </div>
  );
} 