export const BAIRROS = ["Centro", "Vila Nova", "Bela Vista", "São José", "Jardim América"];
export const UBS = ["UBS Centro", "UBS Vila Nova", "UBS São José (rural)"];
export const SERVICOS = ["Clínico geral", "Pediatria", "Ginecologia", "Odontologia", "Exames de sangue"];
export const HORARIOS = ["07:30", "08:30", "09:30", "10:30", "13:30", "14:30", "15:30", "16:30"];

export type Cidadao = { cpf: string; nome: string; nascimento: string; telefone: string; bairro: string; pin: string };
export type Status = "agendado" | "compareceu" | "faltou" | "cancelado";
export type Agendamento = { id: string; cpf: string; nome: string; bairro: string; ubs: string; servico: string; data: string; hora: string; status: Status; criadoEm: string };
export type Log = { quando: string; operador: string; acao: string };

export function onlyDigits(s: string) { return s.replace(/\D/g, ""); }

export function validarCPF(raw: string): boolean {
  const c = onlyDigits(raw);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export function formatCPF(c: string) {
  const d = onlyDigits(c).padEnd(11, " ");
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`.trim();
}
export function maskCPF(c: string) { const d = onlyDigits(c); return `***.${d.slice(3, 6)}.***-${d.slice(9, 11)}`; }

const K = { cid: "as_cidadaos", ag: "as_agendamentos", log: "as_logs" };
function read<T>(k: string, def: T): T {
  if (typeof window === "undefined") return def;
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : def; } catch { return def; }
}
function write(k: string, v: unknown) { localStorage.setItem(k, JSON.stringify(v)); }

const DEMO: Cidadao = { cpf: "11144477735", nome: "Maria da Silva", nascimento: "1985-04-12", telefone: "(11) 98888-7777", bairro: "Centro", pin: "1234" };

export function getCidadaos(): Cidadao[] {
  const l = read<Cidadao[]>(K.cid, []);
  if (!l.find((c) => c.cpf === DEMO.cpf)) { l.unshift(DEMO); write(K.cid, l); }
  return l;
}
export function saveCidadaos(l: Cidadao[]) { write(K.cid, l); }
export function getAgendamentos(): Agendamento[] { return read<Agendamento[]>(K.ag, []); }
export function saveAgendamentos(l: Agendamento[]) { write(K.ag, l); }
export function getLogs(): Log[] { return read<Log[]>(K.log, []); }
export function addLog(operador: string, acao: string) {
  const l = getLogs(); l.unshift({ quando: new Date().toISOString(), operador, acao }); write(K.log, l.slice(0, 100));
}

export function ocupados(ubs: string, servico: string, data: string): string[] {
  const taken = getAgendamentos().filter((a) => a.ubs === ubs && a.servico === servico && a.data === data && a.status !== "cancelado").map((a) => a.hora);
  // horários indisponíveis simulados (determinísticos)
  const seed = [...(ubs + servico + data)].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const fake = HORARIOS.filter((_, i) => (seed + i * 7) % 5 === 0);
  return Array.from(new Set([...taken, ...fake]));
}

export const STAFF: Record<string, { senha: string; area: "recepcao" | "gestao" }> = {
  recepcao: { senha: "Recep@2026", area: "recepcao" },
  gestao: { senha: "Gest@2026", area: "gestao" },
};

type Hist = { ubs: string; servico: string; hora: string; bairro: string; faltou: boolean };
let histCache: Hist[] | null = null;
export function historico(): Hist[] {
  if (histCache) return histCache;
  let s = 42;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const out: Hist[] = [];
  for (let i = 0; i < 360; i++) {
    const ubs = UBS[Math.floor(rnd() * 3)];
    const hora = HORARIOS[Math.floor(rnd() * HORARIOS.length)];
    let p = 0.15;
    if (ubs!.includes("rural")) p += 0.12;
    if (hora === "07:30" || hora === "16:30") p += 0.1;
    out.push({ ubs: ubs!, hora: hora!, servico: SERVICOS[Math.floor(rnd() * 5)]!, bairro: BAIRROS[Math.floor(rnd() * 5)]!, faltou: rnd() < p });
  }
  histCache = out;
  return out;
}

export const UNIDADES_INFO = [
  { nome: "UBS Centro", end: "Rua XV de Novembro, 120 – Centro", horario: "Seg a Sex, 07h às 19h" },
  { nome: "UBS Vila Nova", end: "Av. das Flores, 845 – Vila Nova", horario: "Seg a Sex, 07h às 17h" },
  { nome: "UBS São José (rural)", end: "Estrada Municipal SJ-04, km 6 – São José", horario: "Seg, Qua e Sex, 07h às 16h" },
];
