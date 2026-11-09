import { useEffect, useState } from "react";
import { agendar, cancelarAgendamento, cidadaoCadastro, cidadaoLogin, horariosOcupados, meusAgendamentos, orientacaoConsulta } from "@/lib/agenda.functions";
import { LogOut, CalendarCheck, X, Sparkles } from "lucide-react";
import {
  BAIRROS, HORARIOS, SERVICOS, UBS, type Cidadao,
  formatCPF, onlyDigits, validarCPF,
} from "@/lib/agenda";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}
export function Btn({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline" }) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    ghost: "text-muted-foreground hover:bg-muted",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    outline: "border border-border bg-card hover:bg-muted",
  }[variant];
  return <button {...p} className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${v} ${className}`} />;
}
export function Msg({ text, ok }: { text: string; ok?: boolean }) {
  if (!text) return null;
  return <p className={`rounded-lg px-3 py-2 text-sm ${ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{text}</p>;
}

type Sessao = Cidadao & { pin: string };
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Erro inesperado.");

export function PortalCidadao() {
  const [user, setUser] = useState<Sessao | null>(null);
  useEffect(() => {
    const raw = sessionStorage.getItem("as_sessao");
    if (raw) cidadaoLogin({ data: JSON.parse(raw) }).then((c) => setUser({ ...c, pin: JSON.parse(raw).pin })).catch(() => sessionStorage.removeItem("as_sessao"));
  }, []);
  const login = (c: Sessao) => { sessionStorage.setItem("as_sessao", JSON.stringify({ cpf: c.cpf, pin: c.pin })); setUser(c); };
  const logout = () => { sessionStorage.removeItem("as_sessao"); setUser(null); };
  return user ? <AreaLogada user={user} onLogout={logout} /> : <Auth onLogin={login} />;
}

function Auth({ onLogin }: { onLogin: (c: Sessao) => void }) {
  const [tab, setTab] = useState<"entrar" | "cadastro">("entrar");
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 rounded-2xl bg-hero p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">Sua consulta na UBS, sem fila.</h1>
        <p className="mt-1 text-sm opacity-90">Agende consultas e exames na rede municipal de saúde.</p>
      </div>
      <div className="card-surface p-5">
        <div className="mb-5 grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-semibold">
          {(["entrar", "cadastro"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-md py-2 ${tab === t ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {t === "entrar" ? "Entrar" : "Criar cadastro"}
            </button>
          ))}
        </div>
        {tab === "entrar" ? <Login onLogin={onLogin} /> : <Cadastro onLogin={onLogin} />}
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (c: Sessao) => void }) {
  const [cpf, setCpf] = useState(""); const [pin, setPin] = useState(""); const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { const c = await cidadaoLogin({ data: { cpf, pin } }); onLogin({ ...c, pin }); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="CPF"><input className="field" inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" /></Field>
      <Field label="PIN"><input className="field" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(onlyDigits(e.target.value))} /></Field>
      <Msg text={err} />
      <Btn className="w-full" type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</Btn>
      <p className="text-center text-xs text-muted-foreground">Demonstração: CPF 111.444.777-35 · PIN 1234</p>
    </form>
  );
}

function Cadastro({ onLogin }: { onLogin: (c: Sessao) => void }) {
  const [f, setF] = useState({ nome: "", cpf: "", nascimento: "", telefone: "", bairro: BAIRROS[0]!, pin: "", aceite: false });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f, v: string | boolean) => setF({ ...f, [k]: v });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpf = onlyDigits(f.cpf);
    if (f.nome.trim().split(" ").length < 2) return setErr("Informe o nome completo.");
    if (!validarCPF(cpf)) return setErr("CPF inválido.");
    if (!f.nascimento) return setErr("Informe a data de nascimento.");
    if (onlyDigits(f.telefone).length < 10) return setErr("Telefone inválido.");
    if (!/^\d{4,6}$/.test(f.pin)) return setErr("O PIN deve ter de 4 a 6 dígitos.");
    if (!f.aceite) return setErr("É necessário aceitar o aviso de privacidade.");
    try {
      const c = await cidadaoCadastro({ data: { cpf, nome: f.nome.trim(), nascimento: f.nascimento, telefone: f.telefone, bairro: f.bairro, pin: f.pin } });
      onLogin({ ...c, pin: f.pin });
    } catch (e) { setErr(errMsg(e)); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome completo"><input className="field" value={f.nome} onChange={(e) => set("nome", e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CPF"><input className="field" inputMode="numeric" value={f.cpf} onChange={(e) => set("cpf", e.target.value)} /></Field>
        <Field label="Nascimento"><input className="field" type="date" value={f.nascimento} onChange={(e) => set("nascimento", e.target.value)} /></Field>
        <Field label="Telefone"><input className="field" inputMode="tel" value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></Field>
        <Field label="Bairro">
          <select className="field" value={f.bairro} onChange={(e) => set("bairro", e.target.value)}>{BAIRROS.map((b) => <option key={b}>{b}</option>)}</select>
        </Field>
      </div>
      <Field label="Crie um PIN (4 a 6 dígitos)"><input className="field" type="password" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => set("pin", onlyDigits(e.target.value))} /></Field>
      <label className="flex gap-2 text-sm text-muted-foreground">
        <input type="checkbox" className="mt-1 accent-primary" checked={f.aceite} onChange={(e) => set("aceite", e.target.checked)} />
        Li e aceito o aviso de privacidade: meus dados serão usados apenas para agendamentos na rede municipal, conforme a LGPD.
      </label>
      <Msg text={err} />
      <Btn className="w-full" type="submit">Criar cadastro</Btn>
    </form>
  );
}

type Meu = { id: string; ubs: string; servico: string; data: string; hora: string };
function AreaLogada({ user, onLogout }: { user: Sessao; onLogout: () => void }) {
  const [meus, setMeus] = useState<Meu[]>([]);
  const refresh = () => { meusAgendamentos({ data: { cpf: user.cpf, pin: user.pin } }).then(setMeus).catch(() => {}); };
  useEffect(refresh, []);
  const cancelar = async (id: string) => { await cancelarAgendamento({ data: { cpf: user.cpf, pin: user.pin, id } }); refresh(); };
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4 rounded-2xl bg-hero p-5 text-primary-foreground">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 text-xl font-bold">{user.nome.charAt(0)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm opacity-80">Olá,</p>
          <h2 className="truncate text-xl font-bold">{user.nome}</h2>
          <p className="text-xs opacity-80">CPF {formatCPF(user.cpf)} · {user.bairro}</p>
        </div>
        <button onClick={onLogout} className="rounded-lg p-2 hover:bg-primary-foreground/15" aria-label="Sair"><LogOut className="h-5 w-5" /></button>
      </div>
      <NovoAgendamento user={user} onDone={refresh} n={meus.length} />
      <section className="card-surface p-5">
        <h3 className="mb-4 text-lg font-semibold">Meus agendamentos</h3>
        {meus.length === 0 ? <p className="text-sm text-muted-foreground">Você não tem agendamentos ativos.</p> : (
          <ul className="divide-y divide-border">
            {meus.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <CalendarCheck className="h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">{a.servico}</p>
                  <p className="text-muted-foreground">{a.ubs} · {new Date(a.data + "T00:00").toLocaleDateString("pt-BR")} às {a.hora}</p>
                </div>
                <Btn variant="danger" onClick={() => cancelar(a.id)}><X className="h-4 w-4" />Cancelar</Btn>
              </li>
            ))}
          </ul>
        )}
      </section>
      {meus.length > 0 && <Orientacao user={user} meus={meus} />}
    </div>
  );
}

function Orientacao({ user, meus }: { user: Sessao; meus: Meu[] }) {
  const [id, setId] = useState(meus[0]!.id); const [duvida, setDuvida] = useState("");
  const [res, setRes] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!meus.some((m) => m.id === id)) setId(meus[0]!.id); }, [meus]);
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(""); setRes("");
    try { const r = await orientacaoConsulta({ data: { cpf: user.cpf, pin: user.pin, id, duvida } }); r.erro ? setErr(r.erro) : setRes(r.texto); }
    catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={enviar} className="card-surface space-y-4 p-5">
      <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" /><h3 className="text-lg font-semibold">Como me preparar?</h3></div>
      <p className="text-sm text-muted-foreground">Conte suas dúvidas ou necessidades e receba uma orientação personalizada para a consulta.</p>
      <Field label="Consulta">
        <select className="field" value={id} onChange={(e) => setId(e.target.value)}>
          {meus.map((a) => <option key={a.id} value={a.id}>{a.servico} · {a.ubs} · {new Date(a.data + "T00:00").toLocaleDateString("pt-BR")} {a.hora}</option>)}
        </select>
      </Field>
      <Field label="Sua dúvida ou necessidade">
        <textarea className="field min-h-24" maxLength={1000} value={duvida} onChange={(e) => setDuvida(e.target.value)} placeholder="Ex.: Preciso ir em jejum? Uso cadeira de rodas, a unidade tem acesso?" />
      </Field>
      <Msg text={err} />
      <Btn type="submit" disabled={busy || duvida.trim().length < 3}>{busy ? "Gerando orientação..." : "Gerar orientação"}</Btn>
      {res && (
        <div className="rounded-lg border-l-4 border-l-accent bg-muted p-4 text-sm">
          <p className="whitespace-pre-line leading-relaxed">{res}</p>
          <p className="mt-3 text-xs text-muted-foreground">Orientação gerada automaticamente; não substitui a avaliação do profissional de saúde. Em emergência, ligue 192.</p>
        </div>
      )}
    </form>
  );
}

function NovoAgendamento({ user, onDone, n }: { user: Sessao; onDone: () => void; n: number }) {
  const [ubs, setUbs] = useState(UBS[0]!); const [servico, setServico] = useState(SERVICOS[0]!);
  const [data, setData] = useState(""); const [hora, setHora] = useState(""); const [msg, setMsg] = useState({ t: "", ok: false });
  const [hoje, setHoje] = useState("");
  useEffect(() => { const d = new Date(); d.setDate(d.getDate() + 1); setHoje(d.toISOString().slice(0, 10)); }, []);
  const [indisp, setIndisp] = useState<string[]>([]);
  useEffect(() => { if (data) horariosOcupados({ data: { ubs, servico, data } }).then(setIndisp).catch(() => setIndisp([])); else setIndisp([]); }, [ubs, servico, data, n]);
  const confirmar = async () => {
    if (!data || !hora) return setMsg({ t: "Escolha data e horário.", ok: false });
    try {
      await agendar({ data: { cpf: user.cpf, pin: user.pin, ubs, servico, data, hora } });
      setHora(""); setMsg({ t: "Agendamento confirmado!", ok: true }); onDone();
    } catch (e) { setMsg({ t: errMsg(e), ok: false }); }
  };
  return (
    <section className="card-surface space-y-4 p-5">
      <h3 className="text-lg font-semibold">Novo agendamento</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Unidade de saúde"><select className="field" value={ubs} onChange={(e) => { setUbs(e.target.value); setHora(""); }}>{UBS.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Serviço"><select className="field" value={servico} onChange={(e) => { setServico(e.target.value); setHora(""); }}>{SERVICOS.map((u) => <option key={u}>{u}</option>)}</select></Field>
        <Field label="Data"><input className="field" type="date" min={hoje} value={data} onChange={(e) => { setData(e.target.value); setHora(""); }} /></Field>
      </div>
      {data && (
        <div>
          <p className="mb-2 text-sm font-medium">Horário</p>
          <div className="grid grid-cols-4 gap-2">
            {HORARIOS.map((h) => {
              const off = indisp.includes(h);
              return (
                <button key={h} disabled={off} onClick={() => setHora(h)}
                  className={`rounded-lg border py-2 text-sm font-semibold transition ${off ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through" : hora === h ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                  {h}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Msg text={msg.t} ok={msg.ok} />
      <Btn onClick={confirmar} disabled={!data || !hora}>Confirmar agendamento</Btn>
    </section>
  );
}
