export const BAIRROS = ["Centro", "Vila Nova", "Bela Vista", "São José", "Jardim América"];
export const UBS = ["UBS Centro", "UBS Vila Nova", "UBS São José (rural)"];
export const SERVICOS = ["Clínico geral", "Pediatria", "Ginecologia", "Odontologia", "Exames de sangue"];
export const HORARIOS = ["07:30", "08:30", "09:30", "10:30", "13:30", "14:30", "15:30", "16:30"];

export type Cidadao = { cpf: string; nome: string; nascimento: string; telefone: string; bairro: string };
export type Status = "agendado" | "compareceu" | "faltou" | "cancelado";
export type Agendamento = { id: string; cpf: string; nome: string; bairro: string; telefone?: string; ubs: string; servico: string; data: string; hora: string; status: Status; criadoEm: string };
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

export function waLink(numero: string, texto: string) {
  return `https://wa.me/${onlyDigits(numero)}?text=${encodeURIComponent(texto)}`;
}
export function dataBR(d: string) { return new Date(d + "T00:00").toLocaleDateString("pt-BR"); }

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
