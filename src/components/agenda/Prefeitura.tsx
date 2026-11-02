import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { Btn, Field, Msg } from "./Cidadao";
import {
  BAIRROS, HORARIOS, SERVICOS, STAFF, UBS, type Agendamento, type Log,
  addLog, getAgendamentos, getCidadaos, getLogs, historico, maskCPF, onlyDigits, saveAgendamentos, saveCidadaos, validarCPF,
} from "@/lib/agenda";

export function AreaPrefeitura() {
  const [op, setOp] = useState<{ user: string; area: "recepcao" | "gestao" } | null>(null);
  if (!op) return <StaffLogin onLogin={setOp} />;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Área restrita da Prefeitura</p>
          <h2 className="text-2xl font-bold">{op.area === "recepcao" ? "Recepção" : "Análises da Gestão"}</h2>
        </div>
        <Btn variant="outline" onClick={() => setOp(null)}><LogOut className="h-4 w-4" />Sair</Btn>
      </div>
      {op.area === "recepcao" ? <Recepcao operador={op.user} /> : <Gestao />}
    </div>
  );
}

function StaffLogin({ onLogin }: { onLogin: (o: { user: string; area: "recepcao" | "gestao" }) => void }) {
  const [area, setArea] = useState<"recepcao" | "gestao">("recepcao");
  const [u, setU] = useState(""); const [s, setS] = useState(""); const [err, setErr] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = STAFF[u.trim()];
    if (!st || st.senha !== s || st.area !== area) return setErr("Usuário ou senha inválidos para esta área.");
    addLog(u.trim(), "Login realizado"); onLogin({ user: u.trim(), area });
  };
  return (
    <div className="mx-auto max-w-md card-surface p-6">
      <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /><h2 className="text-xl font-bold">Acesso de funcionários</h2></div>
      <div className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-semibold">
        {(["recepcao", "gestao"] as const).map((a) => (
          <button key={a} onClick={() => { setArea(a); setErr(""); }} className={`rounded-md py-2 ${area === a ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
            {a === "recepcao" ? "Recepção" : "Análises da Gestão"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Usuário"><input className="field" value={u} onChange={(e) => setU(e.target.value)} /></Field>
        <Field label="Senha"><input className="field" type="password" value={s} onChange={(e) => setS(e.target.value)} /></Field>
        <Msg text={err} />
        <Btn className="w-full" type="submit">Entrar</Btn>
        <p className="text-center text-xs text-muted-foreground">Teste: recepcao / Recep@2026 · gestao / Gest@2026</p>
      </form>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  agendado: "bg-secondary text-secondary-foreground", compareceu: "bg-success/15 text-success",
  faltou: "bg-destructive/15 text-destructive", cancelado: "bg-muted text-muted-foreground",
};

function Recepcao({ operador }: { operador: string }) {
  const [ags, setAgs] = useState<Agendamento[]>([]); const [logs, setLogs] = useState<Log[]>([]);
  const refresh = () => { setAgs(getAgendamentos()); setLogs(getLogs()); };
  useEffect(refresh, []);
  const marcar = (a: Agendamento, status: "compareceu" | "faltou") => {
    saveAgendamentos(getAgendamentos().map((x) => (x.id === a.id ? { ...x, status } : x)));
    addLog(operador, `Marcou "${status === "compareceu" ? "Compareceu" : "Faltou"}" – ${maskCPF(a.cpf)} (${a.data} ${a.hora})`); refresh();
  };
  const lista = [...ags].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  return (
    <div className="space-y-6">
      <section className="card-surface overflow-hidden">
        <h3 className="p-5 pb-3 text-lg font-semibold">Agenda geral</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>{["Data", "Hora", "Paciente", "CPF", "Unidade", "Serviço", "Status", "Ações"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Nenhum agendamento ainda.</td></tr>}
              {lista.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">{new Date(a.data + "T00:00").toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2">{a.hora}</td>
                  <td className="px-4 py-2 font-medium">{a.nome}</td>
                  <td className="px-4 py-2 text-muted-foreground">{maskCPF(a.cpf)}</td>
                  <td className="px-4 py-2">{a.ubs}</td>
                  <td className="px-4 py-2">{a.servico}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[a.status]}`}>{a.status}</span></td>
                  <td className="px-4 py-2">
                    {a.status === "agendado" && (
                      <div className="flex gap-1">
                        <button onClick={() => marcar(a, "compareceu")} className="rounded-md bg-success/15 px-2 py-1 text-xs font-semibold text-success">Compareceu</button>
                        <button onClick={() => marcar(a, "faltou")} className="rounded-md bg-destructive/15 px-2 py-1 text-xs font-semibold text-destructive">Faltou</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <ResetPin operador={operador} onDone={refresh} />
        <section className="card-surface p-5">
          <h3 className="mb-3 text-lg font-semibold">Auditoria</h3>
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {logs.slice(0, 20).map((l, i) => (
              <li key={i} className="border-l-2 border-primary pl-3">
                <p>{l.acao}</p>
                <p className="text-xs text-muted-foreground">{l.operador} · {new Date(l.quando).toLocaleString("pt-BR")}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ResetPin({ operador, onDone }: { operador: string; onDone: () => void }) {
  const [cpf, setCpf] = useState(""); const [pin, setPin] = useState(""); const [doc, setDoc] = useState(false); const [m, setM] = useState({ t: "", ok: false });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = onlyDigits(cpf);
    if (!validarCPF(c)) return setM({ t: "CPF inválido.", ok: false });
    const lista = getCidadaos(); const cid = lista.find((x) => x.cpf === c);
    if (!cid) return setM({ t: "Cidadão não encontrado.", ok: false });
    if (!doc) return setM({ t: "Confirme a conferência do documento com foto.", ok: false });
    if (!/^\d{4,6}$/.test(pin)) return setM({ t: "O novo PIN deve ter de 4 a 6 dígitos.", ok: false });
    saveCidadaos(lista.map((x) => (x.cpf === c ? { ...x, pin } : x)));
    addLog(operador, `Redefiniu PIN – ${maskCPF(c)}`);
    setCpf(""); setPin(""); setDoc(false); setM({ t: `PIN de ${cid.nome} redefinido.`, ok: true }); onDone();
  };
  return (
    <form onSubmit={submit} className="card-surface space-y-4 p-5">
      <h3 className="text-lg font-semibold">Redefinir PIN do cidadão</h3>
      <Field label="CPF do cidadão"><input className="field" value={cpf} onChange={(e) => setCpf(e.target.value)} /></Field>
      <Field label="Novo PIN"><input className="field" type="password" maxLength={6} value={pin} onChange={(e) => setPin(onlyDigits(e.target.value))} /></Field>
      <label className="flex gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={doc} onChange={(e) => setDoc(e.target.checked)} />Conferi documento oficial com foto do cidadão.</label>
      <Msg text={m.t} ok={m.ok} />
      <Btn type="submit">Redefinir PIN</Btn>
    </form>
  );
}

type Row = { ubs: string; servico: string; hora: string; bairro: string; faltou: boolean; final: boolean };

function Gestao() {
  const [rows, setRows] = useState<Row[]>([]); const [cid, setCid] = useState(0);
  useEffect(() => {
    const real = getAgendamentos().filter((a) => a.status !== "cancelado").map((a) => ({ ...a, faltou: a.status === "faltou", final: a.status !== "agendado" }));
    setRows([...historico().map((h) => ({ ...h, final: true })), ...real]); setCid(getCidadaos().length);
  }, []);
  const finais = rows.filter((r) => r.final);
  const taxa = (l: Row[]) => { const f = l.filter((r) => r.final); return f.length ? (f.filter((r) => r.faltou).length / f.length) * 100 : 0; };
  const geral = taxa(finais);
  const por = (key: "ubs" | "hora", keys: string[]) => keys.map((k) => ({ k, v: taxa(rows.filter((r) => r[key] === k)) }));
  const cont = (key: "servico" | "bairro", keys: string[]) => keys.map((k) => ({ k, v: rows.filter((r) => r[key] === k).length }));
  const fUbs = por("ubs", UBS), fHora = por("hora", HORARIOS), dServ = cont("servico", SERVICOS), dBairro = cont("bairro", BAIRROS);
  const max = <T extends { v: number }>(l: T[]) => l.reduce((a, b) => (b.v > a.v ? b : a), l[0] ?? { k: "", v: 0 } as unknown as T);
  if (!rows.length) return null;
  const pu = max(fUbs) as { k: string; v: number }, ph = max(fHora) as { k: string; v: number }, ps = max(dServ) as { k: string; v: number };
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Total de agendamentos" value={rows.length.toLocaleString("pt-BR")} />
        <Kpi label="Taxa geral de faltas" value={`${geral.toFixed(1)}%`} />
        <Kpi label="Cidadãos cadastrados" value={String(cid)} />
      </div>
      <div className="card-surface border-l-4 border-l-accent p-5 text-sm leading-relaxed">
        <p className="mb-1 font-semibold">Insights automáticos</p>
        A <b>{pu.k}</b> registra a maior taxa de faltas ({pu.v.toFixed(1)}%), acima da média geral de {geral.toFixed(1)}%. O horário das <b>{ph.k}</b> concentra mais ausências ({ph.v.toFixed(1)}%) — considere lembretes por SMS ou remanejar vagas. <b>{ps.k}</b> é o serviço mais demandado, com {ps.v} agendamentos.
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Chart title="Taxa de faltas por unidade" data={fUbs} pct color="bg-destructive" />
        <Chart title="Taxa de faltas por horário" data={fHora} pct color="bg-accent" />
        <Chart title="Demanda por serviço" data={dServ} color="bg-primary" />
        <Chart title="Uso por bairro" data={dBairro} color="bg-chart-4" />
      </div>
      <p className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
        <b>LGPD:</b> os indicadores são calculados sobre dados anonimizados e agregados (360 registros históricos fictícios + registros da sessão). Nenhuma informação pessoal identificável é exibida neste painel.
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="card-surface p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-display text-3xl font-bold text-primary">{value}</p></div>;
}

function Chart({ title, data, pct, color }: { title: string; data: { k: string; v: number }[]; pct?: boolean; color: string }) {
  const m = Math.max(...data.map((d) => d.v), 1);
  return (
    <section className="card-surface p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="space-y-2.5">
        {data.map((d) => (
          <div key={d.k} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2 text-sm">
            <span className="truncate text-muted-foreground">{d.k}</span>
            <div className="h-3 rounded-full bg-muted"><div className={`h-3 rounded-full ${color}`} style={{ width: `${(d.v / m) * 100}%` }} /></div>
            <span className="text-right font-semibold">{pct ? `${d.v.toFixed(1)}%` : d.v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
