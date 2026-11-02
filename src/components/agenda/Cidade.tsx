import { MapPin, Clock, Phone, Megaphone } from "lucide-react";
import { UNIDADES_INFO } from "@/lib/agenda";

const AVISOS = [
  { t: "Campanha de vacinação contra a gripe", d: "De 03 a 28/11 em todas as UBS. Leve documento com foto e caderneta de vacinação." },
  { t: "Exames de sangue: jejum", d: "Para exames de glicemia e colesterol, faça jejum de 8 a 12 horas. Água é permitida." },
  { t: "Novembro Azul", d: "Homens acima de 50 anos: agende sua consulta de rotina com o clínico geral." },
];
const TELS = [
  { n: "SAMU", t: "192" }, { n: "Disque Saúde", t: "136" }, { n: "Secretaria Municipal de Saúde", t: "(11) 3333-4500" },
];

export function SaudeCidade() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-bold">Unidades de saúde</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {UNIDADES_INFO.map((u) => (
            <div key={u.nome} className="card-surface p-4 text-sm">
              <h3 className="mb-2 font-semibold text-primary">{u.nome}</h3>
              <p className="flex gap-2 text-muted-foreground"><MapPin className="h-4 w-4 shrink-0" />{u.end}</p>
              <p className="mt-1 flex gap-2 text-muted-foreground"><Clock className="h-4 w-4 shrink-0" />{u.horario}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">Mural de avisos</h2>
        <div className="space-y-3">
          {AVISOS.map((a) => (
            <div key={a.t} className="card-surface flex gap-3 p-4">
              <Megaphone className="h-5 w-5 shrink-0 text-accent-foreground" />
              <div><p className="font-semibold">{a.t}</p><p className="text-sm text-muted-foreground">{a.d}</p></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">Telefones úteis</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {TELS.map((t) => (
            <a key={t.n} href={`tel:${t.t.replace(/\D/g, "")}`} className="card-surface flex items-center gap-3 p-4 hover:border-primary">
              <Phone className="h-5 w-5 text-destructive" />
              <div><p className="text-sm text-muted-foreground">{t.n}</p><p className="text-lg font-bold">{t.t}</p></div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
