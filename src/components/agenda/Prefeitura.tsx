import { useEffect, useMemo, useState } from "react";
import { LogOut, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { Btn, Field, Msg, errMsg } from "./Cidadao";
import {
  BAIRROS, HORARIOS, SERVICOS, UBS, type Agendamento, type Log, dataBR, historico, maskCPF, onlyDigits, validarCPF, waLink,
} from "@/lib/agenda";
import {
  gestaoDados, gestaoSalvarWhatsapp, recepcaoDados, recepcaoMarcar, recepcaoResetPin, staffLogin,
} from "@/lib/agenda.functions";

type Op = { user: string; senha: string; area: "recepcao" | "gestao" };

export function AreaPrefeitura() {
  const [op, setOp] = useState<Op | null>(null);
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
      {op.area === "recepcao" ? <Recepcao op={op} /> : <Gestao op={op} />}
    </div>
  );
}

function StaffLogin({ onLogin }: { onLogin: (o: Op) => void }) {
  const [area, setArea] = useState<"recepcao" | "gestao">("recepcao");
  const [u, setU] = useState(""); const [s, setS] = useState(""); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    try { await staffLogin({ data: { user: u.trim(), senha: s, area } }); onLogin({ user: u.trim(), senha: s, area }); }
    catch (e) { setErr(errMsg(e)); }
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
const STATUS = ["agendado", "compareceu", "faltou", "cancelado"];

function textoAg(a: Agendamento) {
  return `*Agendamento AgendaSaúde*\nPaciente: ${a.nome}\nCPF: ${maskCPF(a.cpf)}\nTelefone: ${a.telefone ?? "-"}\nUnidade: ${a.ubs}\nServiço: ${a.servico}\nData: ${dataBR(a.data)} às ${a.hora}\nStatus: ${a.status}`;
}

function Recepcao({ op }: { op: Op }) {
  const [ags, setAgs] = useState<Agendamento[]>([]); const [logs, setLogs] = useState<Log[]>([]); const [wa, setWa] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = () => {
    setLoading(true);
    recepcaoDados({ data: op }).then((r) => { setAgs(r.agendamentos); setLogs(r.logs); setWa(r.whatsapp); }).finally(() => setLoading(false));
  };
  useEffect(refresh, []);
  const [f, setF] = useState({ busca: "", de: "", ate: "", ubs: "", servico: "", status: "" });
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const lista = useMemo(() => {
    const q = f.busca.trim().toLowerCase(); const qd = onlyDigits(q);
    return ags.filter((a) =>
      (!q || a.nome.toLowerCase().includes(q) || (qd.length >= 3 && a.cpf.includes(qd))) &&
      (!f.de || a.data >= f.de) && (!f.ate || a.data <= f.ate) &&
      (!f.ubs || a.ubs === f.ubs) && (!f.servico || a.servico === f.servico) && (!f.status || a.status === f.status));
  }, [ags, f]);
  const marcar = async (a: Agendamento, status: "compareceu" | "faltou") => { await recepcaoMarcar({ data: { ...op, id: a.id, status } }); refresh(); };
  const resumo = `*Agendamentos AgendaSaúde* (${lista.length})\n` + lista.slice(0, 40).map((a) => `• ${dataBR(a.data)} ${a.hora} – ${a.nome} – ${a.ubs} – ${a.servico} (${a.status})`).join("\n");

  return (
    <div className="space-y-6">
      <section className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
          <h3 className="text-lg font-semibold">Agendamentos <span className="text-sm font-normal text-muted-foreground">({lista.length} de {ags.length})</span></h3>
          <div className="flex gap-2">
            <Btn variant="outline" onClick={refresh}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar</Btn>
            {wa && lista.length > 0 && <a href={waLink(wa, resumo)} target="_blank" rel="noreferrer"><Btn><MessageCircle className="h-4 w-4" />Enviar lista no WhatsApp</Btn></a>}
          </div>
        </div>
        {!wa && <p className="mx-5 mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Nenhum WhatsApp de encaminhamento definido. A gestão pode configurá-lo na área de Análises.</p>}
        <div className="grid gap-3 border-y border-border bg-muted/40 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Nome ou CPF"><input className="field" value={f.busca} onChange={(e) => set("busca", e.target.value)} placeholder="Buscar..." /></Field>
          <Field label="De"><input className="field" type="date" value={f.de} onChange={(e) => set("de", e.target.value)} /></Field>
          <Field label="Até"><input className="field" type="date" value={f.ate} onChange={(e) => set("ate", e.target.value)} /></Field>
          <Field label="Unidade"><Sel v={f.ubs} on={(v) => set("ubs", v)} opts={UBS} /></Field>
          <Field label="Serviço"><Sel v={f.servico} on={(v) => set("servico", v)} opts={SERVICOS} /></Field>
          <Field label="Status"><Sel v={f.status} on={(v) => set("status", v)} opts={STATUS} /></Field>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>{["Data", "Hora", "Paciente", "CPF", "Unidade", "Serviço", "Status", "Ações"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lista.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">{loading ? "Carregando..." : "Nenhum agendamento encontrado."}</td></tr>}
              {lista.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2">{dataBR(a.data)}</td>
                  <td className="px-4 py-2">{a.hora}</td>
                  <td className="px-4 py-2 font-medium">{a.nome}</td>
                  <td className="px-4 py-2 text-muted-foreground">{maskCPF(a.cpf)}</td>
                  <td className="px-4 py-2">{a.ubs}</td>
                  <td className="px-4 py-2">{a.servico}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[a.status]}`}>{a.status}</span></td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {a.status === "agendado" && <>
                        <button onClick={() => marcar(a, "compareceu")} className="rounded-md bg-success/15 px-2 py-1 text-xs font-semibold text-success">Compareceu</button>
                        <button onClick={() => marcar(a, "faltou")} className="rounded-md bg-destructive/15 px-2 py-1 text-xs font-semibold text-destructive">Faltou</button>
                      </>}
                      {wa && <a href={waLink(wa, textoAg(a))} target="_blank" rel="noreferrer" aria-label="Enviar no WhatsApp" className="rounded-md bg-success/15 px-2 py-1 text-success"><MessageCircle className="h-4 w-4" /></a>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <ResetPin op={op} onDone={refresh} />
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

function Sel({ v, on, opts }: { v: string; on: (v: string) => void; opts: string[] }) {
  return <select className="field" value={v} onChange={(e) => on(e.target.value)}><option value="">Todos</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
}

function ResetPin({ op, onDone }: { op: Op; onDone: () => void }) {
  const [cpf, setCpf] = useState(""); const [pin, setPin] = useState(""); const [doc, setDoc] = useState(false); const [m, setM] = useState({ t: "", ok: false });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarCPF(cpf)) return setM({ t: "CPF inválido.", ok: false });
    if (!doc) return setM({ t: "Confirme a conferência do documento com foto.", ok: false });
    try {
      const r = await recepcaoResetPin({ data: { ...op, cpf, pin } });
      setCpf(""); setPin(""); setDoc(false); setM({ t: `PIN de ${r.nome} redefinido.`, ok: true }); onDone();
    } catch (e) { setM({ t: errMsg(e), ok: false }); }
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

function WhatsappConfig({ op, atual, onSaved }: { op: Op; atual: string; onSaved: () => void }) {
  const [num, setNum] = useState(atual); const [m, setM] = useState({ t: "", ok: false });
  useEffect(() => setNum(atual), [atual]);
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await gestaoSalvarWhatsapp({ data: { ...op, numero: num } }); setM({ t: "Número salvo.", ok: true }); onSaved(); }
    catch (e) { setM({ t: errMsg(e), ok: false }); }
  };
  return (
    <form onSubmit={salvar} className="card-surface space-y-3 p-5">
      <div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-success" /><h3 className="font-semibold">WhatsApp para encaminhar agendamentos</h3></div>
      <p className="text-sm text-muted-foreground">A recepção poderá enviar agendamentos para este número com um clique.</p>
      <div className="flex flex-wrap gap-2">
        <input className="field max-w-xs" inputMode="tel" placeholder="55 11 98888-7777" value={num} onChange={(e) => setNum(e.target.value)} />
        <Btn type="submit">Salvar</Btn>
        {atual && <a href={waLink(atual, "Teste do AgendaSaúde")} target="_blank" rel="noreferrer"><Btn type="button" variant="outline">Testar</Btn></a>}
      </div>
      <p className="text-xs text-muted-foreground">Inclua o código do país (55) e o DDD. Deixe vazio para desativar.</p>
      <Msg text={m.t} ok={m.ok} />
    </form>
  );
}

type Row = { ubs: string; servico: string; hora: string; bairro: string; faltou: boolean; final: boolean };

function Gestao({ op }: { op: Op }) {
  const [rows, setRows] = useState<Row[]>([]); const [cid, setCid] = useState(0); const [wa, setWa] = useState("");
  const load = () => gestaoDados({ data: op }).then((r) => {
    setRows([...historico().map((h) => ({ ...h, final: true })), ...r.rows]); setCid(r.cidadaos); setWa(r.whatsapp);
  });
  useEffect(() => { load(); }, []);
  const finais = rows.filter((r) => r.final);
  const taxa = (l: Row[]) => { const f = l.filter((r) => r.final); return f.length ? (f.filter((r) => r.faltou).length / f.length) * 100 : 0; };
  const geral = taxa(finais);
  const por = (key: "ubs" | "hora", keys: string[]) => keys.map((k) => ({ k, v: taxa(rows.filter((r) => r[key] === k)) }));
  const cont = (key: "servico" | "bairro", keys: string[]) => keys.map((k) => ({ k, v: rows.filter((r) => r[key] === k).length }));
  const fUbs = por("ubs", UBS), fHora = por("hora", HORARIOS), dServ = cont("servico", SERVICOS), dBairro = cont("bairro", BAIRROS);
  const max = (l: { k: string; v: number }[]) => l.reduce((a, b) => (b.v > a.v ? b : a), l[0] ?? { k: "", v: 0 });
  if (!rows.length) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  const pu = max(fUbs), ph = max(fHora), ps = max(dServ);
  return (
    <div className="space-y-6">
      <WhatsappConfig op={op} atual={wa} onSaved={load} />
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
        <b>LGPD:</b> os indicadores são calculados sobre dados anonimizados e agregados (360 registros históricos fictícios + agendamentos reais). Nenhuma informação pessoal identificável é exibida neste painel.
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
