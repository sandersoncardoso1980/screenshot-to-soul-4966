create table public.cidadaos (
  cpf text primary key,
  nome text not null,
  nascimento date not null,
  telefone text not null,
  bairro text not null,
  pin_hash text not null,
  criado_em timestamptz not null default now()
);
create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  cpf text not null references public.cidadaos(cpf) on delete cascade,
  ubs text not null, servico text not null, data date not null, hora text not null,
  status text not null default 'agendado' check (status in ('agendado','compareceu','faltou','cancelado')),
  criado_em timestamptz not null default now()
);
create index on public.agendamentos (data, hora);
create table public.logs (
  id bigserial primary key, quando timestamptz not null default now(), operador text not null, acao text not null
);
create table public.configuracoes (chave text primary key, valor text not null default '');

grant all on public.cidadaos, public.agendamentos, public.logs, public.configuracoes to service_role;
grant usage, select on sequence public.logs_id_seq to service_role;
alter table public.cidadaos enable row level security;
alter table public.agendamentos enable row level security;
alter table public.logs enable row level security;
alter table public.configuracoes enable row level security;

insert into public.cidadaos (cpf, nome, nascimento, telefone, bairro, pin_hash)
values ('11144477735','Maria da Silva','1985-04-12','(11) 98888-7777','Centro',
  encode(sha256(convert_to('11144477735:1234','UTF8')),'hex'));
insert into public.configuracoes (chave, valor) values ('whatsapp','');