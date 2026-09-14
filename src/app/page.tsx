import { DashboardHeader } from "./_components/dashboard-header";
import { MachineDetail } from "./_components/machine-detail";
import { PriorityList } from "./_components/priority-list";
import { StatusSummary } from "./_components/status-summary";
import { dashboardSnapshot, getMockAsset, priorityAssets } from "./_data/dashboard";

type HomeProps = {
  searchParams: Promise<{ asset?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const selectedAsset = getMockAsset((await searchParams).asset);

  return (
    <div className="min-h-screen">
      <DashboardHeader />
      <main className="mx-auto max-w-[1480px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12" id="contenido">
        <StatusSummary snapshot={dashboardSnapshot} />

        <div className="mt-10 grid gap-10 lg:mt-12">
          <PriorityList assets={priorityAssets} selectedAssetId={selectedAsset.id} />
          <MachineDetail asset={selectedAsset} />
        </div>
      </main>

      <footer className="mx-auto flex max-w-[1480px] flex-col gap-2 border-t border-white/[0.07] px-4 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <span>PredictiveMaintenance · Prototipo de interfaz</span>
        <span>Dataset sintético · Sin acciones automáticas</span>
      </footer>
    </div>
  );
}
