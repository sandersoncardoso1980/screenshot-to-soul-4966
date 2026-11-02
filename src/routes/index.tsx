import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HeartPulse, User, Building2, Lock } from "lucide-react";
import { PortalCidadao } from "@/components/agenda/Cidadao";
import { SaudeCidade } from "@/components/agenda/Cidade";
import { AreaPrefeitura } from "@/components/agenda/Prefeitura";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgendaSaúde – Agende consultas nas UBS" },
      { name: "description", content: "Agende consultas e exames nas Unidades Básicas de Saúde do seu município." },
      { property: "og:title", content: "AgendaSaúde – Agende consultas nas UBS" },
      { property: "og:description", content: "Agende consultas e exames nas Unidades Básicas de Saúde do seu município." },
    ],
  }),
  component: Index,
});

type Aba = "cidadao" | "cidade" | "prefeitura";

function Index() {
  const [aba, setAba] = useState<Aba>("cidadao");
  const tabs = [
    { id: "cidadao" as const, label: "Portal do Cidadão", short: "Cidadão", icon: User },
    { id: "cidade" as const, label: "Saúde na Cidade", short: "Cidade", icon: Building2 },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <button onClick={() => setAba("cidadao")} className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-hero text-primary-foreground"><HeartPulse className="h-5 w-5" /></span>
            <span className="font-display text-lg font-bold">AgendaSaúde</span>
          </button>
          <nav className="ml-auto hidden gap-1 md:flex">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setAba(t.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${aba === t.id ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{t.label}</button>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 md:py-10">
        {aba === "cidadao" && <PortalCidadao />}
        {aba === "cidade" && <SaudeCidade />}
        {aba === "prefeitura" && <AreaPrefeitura />}
      </main>
      <footer className="border-t border-border px-4 pb-24 pt-6 text-center text-xs text-muted-foreground md:pb-6">
        <p>Secretaria Municipal de Saúde · AgendaSaúde MVP</p>
        <button onClick={() => setAba("prefeitura")} className="mt-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline"><Lock className="h-3 w-3" />Área restrita da Prefeitura</button>
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t border-border bg-card md:hidden">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setAba(t.id)} className={`flex flex-col items-center gap-1 py-2.5 text-xs font-semibold ${aba === t.id ? "text-primary" : "text-muted-foreground"}`}>
            <t.icon className="h-5 w-5" />{t.short}
          </button>
        ))}
      </nav>
    </div>
  );
}
