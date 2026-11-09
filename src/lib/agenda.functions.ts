import { createServerFn } from "@tanstack/react-start";
import { HORARIOS, STAFF, validarCPF, type Agendamento, type Cidadao, type Log, type Status } from "./agenda";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function hashPin(cpf: string, pin: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${cpf}:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const str = (s: unknown, max = 200) => String(s ?? "").trim().slice(0, max);

type CidRow = { cpf: string; nome: string; nascimento: string; telefone: string; bairro: string };
async function authCidadao(cpfRaw: unknown, pin: unknown): Promise<CidRow> {
  const cpf = digits(cpfRaw);
  const s = await db();
  const { data } = await s.from("cidadaos").select("cpf,nome,nascimento,telefone,bairro,pin_hash").eq("cpf", cpf).maybeSingle();
  if (!data || data.pin_hash !== (await hashPin(cpf, String(pin ?? "")))) throw new Error("CPF ou PIN incorretos.");
  const { pin_hash: _p, ...c } = data;
  return c;
}
function authStaff(user: unknown, senha: unknown, area?: "recepcao" | "gestao") {
  const st = STAFF[String(user ?? "")];
  if (!st || st.senha !== senha || (area && st.area !== area)) throw new Error("Usuário ou senha inválidos para esta área.");
  return { user: String(user), area: st.area };
}
async function log(operador: string, acao: string) {
  await (await db()).from("logs").insert({ operador, acao });
}

type CidIn = { cpf: string; pin: string };
const cidIn = (d: CidIn) => ({ cpf: digits(d.cpf), pin: digits(d.pin) });

export const cidadaoLogin = createServerFn({ method: "POST" }).inputValidator(cidIn)
  .handler(async ({ data }): Promise<Cidadao> => authCidadao(data.cpf, data.pin));

export const cidadaoCadastro = createServerFn({ method: "POST" })
  .inputValidator((d: { cpf: string; pin: string; nome: string; nascimento: string; telefone: string; bairro: string }) => ({
    cpf: digits(d.cpf), pin: digits(d.pin), nome: str(d.nome), nascimento: str(d.nascimento, 10), telefone: str(d.telefone, 20), bairro: str(d.bairro, 60),
  }))
  .handler(async ({ data }): Promise<Cidadao> => {
    if (!validarCPF(data.cpf)) throw new Error("CPF inválido.");
    if (!/^\d{4,6}$/.test(data.pin)) throw new Error("O PIN deve ter de 4 a 6 dígitos.");
    if (data.nome.split(" ").length < 2) throw new Error("Informe o nome completo.");
    const s = await db();
    const { data: ex } = await s.from("cidadaos").select("cpf").eq("cpf", data.cpf).maybeSingle();
    if (ex) throw new Error("CPF já cadastrado.");
    const { pin, ...c } = data;
    const { error } = await s.from("cidadaos").insert({ ...c, pin_hash: await hashPin(data.cpf, pin) });
    if (error) throw new Error("Não foi possível salvar o cadastro.");
    return c;
  });

export const horariosOcupados = createServerFn({ method: "POST" })
  .inputValidator((d: { ubs: string; servico: string; data: string }) => ({ ubs: str(d.ubs), servico: str(d.servico), data: str(d.data, 10) }))
  .handler(async ({ data }): Promise<string[]> => {
    const { data: rows } = await (await db()).from("agendamentos").select("hora")
      .eq("ubs", data.ubs).eq("servico", data.servico).eq("data", data.data).neq("status", "cancelado");
    const seed = [...(data.ubs + data.servico + data.data)].reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const fake = HORARIOS.filter((_, i) => (seed + i * 7) % 5 === 0);
    return Array.from(new Set([...(rows ?? []).map((r) => r.hora), ...fake]));
  });

export const meusAgendamentos = createServerFn({ method: "POST" }).inputValidator(cidIn)
  .handler(async ({ data }) => {
    const c = await authCidadao(data.cpf, data.pin);
    const { data: rows } = await (await db()).from("agendamentos").select("*").eq("cpf", c.cpf).eq("status", "agendado").order("data").order("hora");
    return (rows ?? []).map((r) => ({ id: r.id, ubs: r.ubs, servico: r.servico, data: r.data, hora: r.hora }));
  });

export const agendar = createServerFn({ method: "POST" })
  .inputValidator((d: CidIn & { ubs: string; servico: string; data: string; hora: string }) => ({ ...cidIn(d), ubs: str(d.ubs), servico: str(d.servico), data: str(d.data, 10), hora: str(d.hora, 5) }))
  .handler(async ({ data }) => {
    const c = await authCidadao(data.cpf, data.pin);
    const s = await db();
    const { data: taken } = await s.from("agendamentos").select("id").eq("ubs", data.ubs).eq("servico", data.servico).eq("data", data.data).eq("hora", data.hora).neq("status", "cancelado");
    if (taken?.length) throw new Error("Horário indisponível.");
    const { error } = await s.from("agendamentos").insert({ cpf: c.cpf, ubs: data.ubs, servico: data.servico, data: data.data, hora: data.hora });
    if (error) throw new Error("Não foi possível agendar.");
    return { ok: true };
  });

export const cancelarAgendamento = createServerFn({ method: "POST" })
  .inputValidator((d: CidIn & { id: string }) => ({ ...cidIn(d), id: str(d.id, 40) }))
  .handler(async ({ data }) => {
    const c = await authCidadao(data.cpf, data.pin);
    await (await db()).from("agendamentos").update({ status: "cancelado" }).eq("id", data.id).eq("cpf", c.cpf);
    return { ok: true };
  });

type StaffIn = { user: string; senha: string };
const staffIn = (d: StaffIn) => ({ user: str(d.user, 40), senha: String(d.senha ?? "").slice(0, 60) });

export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((d: StaffIn & { area: "recepcao" | "gestao" }) => ({ ...staffIn(d), area: d.area }))
  .handler(async ({ data }) => { authStaff(data.user, data.senha, data.area); await log(data.user, "Login realizado"); return { ok: true }; });

export const recepcaoDados = createServerFn({ method: "POST" }).inputValidator(staffIn)
  .handler(async ({ data }): Promise<{ agendamentos: Agendamento[]; logs: Log[]; whatsapp: string }> => {
    authStaff(data.user, data.senha, "recepcao");
    const s = await db();
    const [{ data: ags }, { data: logs }, { data: cfg }] = await Promise.all([
      s.from("agendamentos").select("*, cidadaos(nome,bairro,telefone)").order("data").order("hora").limit(2000),
      s.from("logs").select("*").order("quando", { ascending: false }).limit(50),
      s.from("configuracoes").select("valor").eq("chave", "whatsapp").maybeSingle(),
    ]);
    return {
      agendamentos: (ags ?? []).map((a) => {
        const c = a.cidadaos as unknown as { nome: string; bairro: string; telefone: string } | null;
        return { id: a.id, cpf: a.cpf, nome: c?.nome ?? "", bairro: c?.bairro ?? "", telefone: c?.telefone ?? "", ubs: a.ubs, servico: a.servico, data: a.data, hora: a.hora, status: a.status as Status, criadoEm: a.criado_em };
      }),
      logs: (logs ?? []).map((l) => ({ quando: l.quando, operador: l.operador, acao: l.acao })),
      whatsapp: cfg?.valor ?? "",
    };
  });

export const recepcaoMarcar = createServerFn({ method: "POST" })
  .inputValidator((d: StaffIn & { id: string; status: "compareceu" | "faltou" }) => ({ ...staffIn(d), id: str(d.id, 40), status: d.status === "faltou" ? "faltou" as const : "compareceu" as const }))
  .handler(async ({ data }) => {
    authStaff(data.user, data.senha, "recepcao");
    const { data: a } = await (await db()).from("agendamentos").update({ status: data.status }).eq("id", data.id).select("cpf,data,hora").maybeSingle();
    if (a) await log(data.user, `Marcou "${data.status === "compareceu" ? "Compareceu" : "Faltou"}" – ***.${a.cpf.slice(3, 6)}.***-${a.cpf.slice(9)} (${a.data} ${a.hora})`);
    return { ok: true };
  });

export const recepcaoResetPin = createServerFn({ method: "POST" })
  .inputValidator((d: StaffIn & { cpf: string; pin: string }) => ({ ...staffIn(d), cpf: digits(d.cpf), pin: digits(d.pin) }))
  .handler(async ({ data }) => {
    authStaff(data.user, data.senha, "recepcao");
    if (!/^\d{4,6}$/.test(data.pin)) throw new Error("O novo PIN deve ter de 4 a 6 dígitos.");
    const s = await db();
    const { data: c } = await s.from("cidadaos").select("nome").eq("cpf", data.cpf).maybeSingle();
    if (!c) throw new Error("Cidadão não encontrado.");
    await s.from("cidadaos").update({ pin_hash: await hashPin(data.cpf, data.pin) }).eq("cpf", data.cpf);
    await log(data.user, `Redefiniu PIN – ***.${data.cpf.slice(3, 6)}.***-${data.cpf.slice(9)}`);
    return { nome: c.nome };
  });

export const gestaoDados = createServerFn({ method: "POST" }).inputValidator(staffIn)
  .handler(async ({ data }) => {
    authStaff(data.user, data.senha, "gestao");
    const s = await db();
    const [{ data: ags }, { count }, { data: cfg }] = await Promise.all([
      s.from("agendamentos").select("ubs,servico,hora,status,cidadaos(bairro)").neq("status", "cancelado").limit(5000),
      s.from("cidadaos").select("cpf", { count: "exact", head: true }),
      s.from("configuracoes").select("valor").eq("chave", "whatsapp").maybeSingle(),
    ]);
    return {
      rows: (ags ?? []).map((a) => ({ ubs: a.ubs, servico: a.servico, hora: a.hora, bairro: (a.cidadaos as unknown as { bairro: string } | null)?.bairro ?? "", faltou: a.status === "faltou", final: a.status !== "agendado" })),
      cidadaos: count ?? 0,
      whatsapp: cfg?.valor ?? "",
    };
  });

export const gestaoSalvarWhatsapp = createServerFn({ method: "POST" })
  .inputValidator((d: StaffIn & { numero: string }) => ({ ...staffIn(d), numero: digits(d.numero).slice(0, 15) }))
  .handler(async ({ data }) => {
    authStaff(data.user, data.senha, "gestao");
    if (data.numero && (data.numero.length < 12 || data.numero.length > 13)) throw new Error("Informe o número com DDI e DDD, ex.: 55 11 98888-7777.");
    await (await db()).from("configuracoes").upsert({ chave: "whatsapp", valor: data.numero });
    await log(data.user, data.numero ? `Definiu WhatsApp de encaminhamento: +${data.numero}` : "Removeu WhatsApp de encaminhamento");
    return { ok: true };
  });

export const orientacaoConsulta = createServerFn({ method: "POST" })
  .inputValidator((d: CidIn & { id: string; duvida: string }) => ({ ...cidIn(d), id: str(d.id, 40), duvida: str(d.duvida, 1000) }))
  .handler(async ({ data }): Promise<{ texto: string; erro?: string }> => {
    const c = await authCidadao(data.cpf, data.pin);
    if (data.duvida.length < 3) return { texto: "", erro: "Descreva sua dúvida ou necessidade." };
    const { data: a } = await (await db()).from("agendamentos").select("ubs,servico,data,hora").eq("id", data.id).eq("cpf", c.cpf).maybeSingle();
    if (!a) return { texto: "", erro: "Agendamento não encontrado." };
    const idade = Math.floor((Date.now() - new Date(c.nascimento).getTime()) / 31557600000);
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const r = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: "Você é um assistente da Secretaria Municipal de Saúde. Dê orientações práticas e acolhedoras, em português do Brasil e linguagem simples, sobre como o cidadão deve se preparar para a consulta ou exame na UBS (documentos: cartão SUS, documento com foto; jejum, horários, o que levar, como chegar com antecedência). Responda em texto simples, sem markdown nem asteriscos, em tópicos curtos iniciados por "• ", no máximo 200 palavras. Não faça diagnóstico nem prescreva medicamentos. Se houver sinais de urgência, oriente a ligar para o SAMU 192 ou procurar o pronto-socorro.",
        input: `Consulta: ${a.servico} na ${a.ubs}, em ${a.data} às ${a.hora}. Idade do paciente: ${idade} anos.\nDúvida/necessidade do cidadão: ${data.duvida}`,
      });
      const out = (r as unknown as { output?: { type: string; content?: { type: string; text?: string }[] }[] }).output ?? [];
      const texto = out.flatMap((o) => o.content ?? []).filter((p) => p.type === "output_text").map((p) => p.text ?? "").join("\n").replace(/\*\*?/g, "").trim();
      return texto ? { texto } : { texto: "", erro: "Não foi possível gerar a orientação agora." };
    } catch (e) {
      if (e instanceof GatewayError) { console.error("AI gateway", e.code, e.httpStatus); return { texto: "", erro: e.httpStatus === 402 ? "Serviço de orientação temporariamente indisponível." : "Não foi possível gerar a orientação agora. Tente novamente." }; }
      throw e;
    }
  });
