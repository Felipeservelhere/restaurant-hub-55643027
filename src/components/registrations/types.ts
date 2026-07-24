export type TabKey = "usuarios" | "pessoas" | "mesas" | "pagamentos" | "pratos";

export type Situacao = "Ativo" | "Inativo";

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  perfil: "Administrador" | "Gerente" | "Operador" | "Caixa";
  situacao: Situacao;
  senha?: string;
}

export type PessoaTipo = "Cliente" | "Fornecedor" | "Funcionario";

export interface Pessoa {
  id: string;
  documento: string; // CPF/CNPJ
  nome: string;
  tipos: PessoaTipo[];
  contribuinte: "9" | "1" | "2";
  ieCadPro?: string;
  telefone: string;
  email: string;
  cep: string;
  uf: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  situacao: Situacao;
  observacoes?: string;
}

export interface Mesa {
  id: string;
  identificacao: string;
  tipo: "Mesa" | "Comanda";
  local: string;
}

export interface Pagamento {
  id: string;
  descricao: string;
  taxa: number;
  prazo: number; // days
  atalho: string; // "—" or F1..F12
  situacao: Situacao;
}

export interface Prato {
  id: string;
  nome: string;
  tipo: "Prato" | "Copo";
  valor: number;
  situacao: Situacao;
  observacoes?: string;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const seedUsuarios: Usuario[] = [
  { id: uid(), nome: "Ana Beatriz Souza", login: "ana.souza", perfil: "Administrador", situacao: "Ativo", senha: "123456" },
  { id: uid(), nome: "Carlos Henrique", login: "carlos.h", perfil: "Gerente", situacao: "Ativo", senha: "123456" },
  { id: uid(), nome: "Marina Duarte", login: "marina.d", perfil: "Operador", situacao: "Ativo", senha: "123456" },
  { id: uid(), nome: "Ricardo Alves", login: "ricardo.a", perfil: "Caixa", situacao: "Inativo", senha: "123456" },
];

export const seedPessoas: Pessoa[] = [
  {
    id: uid(), documento: "123.456.789-00", nome: "João da Silva", tipos: ["Cliente"],
    contribuinte: "9", telefone: "(11) 99999-1234", email: "joao@email.com",
    cep: "01310-100", uf: "SP", logradouro: "Av. Paulista", numero: "1000", bairro: "Bela Vista", cidade: "São Paulo",
    situacao: "Ativo",
  },
  {
    id: uid(), documento: "12.345.678/0001-99", nome: "Distribuidora Sabor & Cia LTDA", tipos: ["Fornecedor"],
    contribuinte: "1", ieCadPro: "111.222.333.444", telefone: "(11) 3333-4444", email: "contato@sabor.com.br",
    cep: "04567-000", uf: "SP", logradouro: "Rua das Palmeiras", numero: "220", bairro: "Vila Mariana", cidade: "São Paulo",
    situacao: "Ativo",
  },
  {
    id: uid(), documento: "987.654.321-00", nome: "Mariana Oliveira", tipos: ["Funcionario", "Cliente"],
    contribuinte: "9", telefone: "(11) 98888-4321", email: "mariana.o@email.com",
    cep: "05409-002", uf: "SP", logradouro: "Rua Oscar Freire", numero: "500", bairro: "Pinheiros", cidade: "São Paulo",
    situacao: "Ativo",
  },
  {
    id: uid(), documento: "111.222.333-44", nome: "Pedro Antunes", tipos: ["Cliente"],
    contribuinte: "9", telefone: "(21) 97777-0000", email: "pedro@email.com",
    cep: "22071-900", uf: "RJ", logradouro: "Av. Atlântica", numero: "1702", bairro: "Copacabana", cidade: "Rio de Janeiro",
    situacao: "Inativo",
  },
];

export const seedMesas: Mesa[] = [
  { id: uid(), identificacao: "Mesa 01", tipo: "Mesa", local: "Salão principal" },
  { id: uid(), identificacao: "Mesa 02", tipo: "Mesa", local: "Salão principal" },
  { id: uid(), identificacao: "Mesa 03", tipo: "Mesa", local: "Salão principal" },
  { id: uid(), identificacao: "Mesa 04", tipo: "Mesa", local: "Varanda" },
  { id: uid(), identificacao: "Comanda 10", tipo: "Comanda", local: "Balcão" },
  { id: uid(), identificacao: "Comanda 11", tipo: "Comanda", local: "Balcão" },
];

export const seedPagamentos: Pagamento[] = [
  { id: uid(), descricao: "Dinheiro", taxa: 0, prazo: 0, atalho: "F1", situacao: "Ativo" },
  { id: uid(), descricao: "Cartão de crédito", taxa: 3.2, prazo: 30, atalho: "F2", situacao: "Ativo" },
  { id: uid(), descricao: "Cartão de débito", taxa: 1.8, prazo: 1, atalho: "F3", situacao: "Ativo" },
  { id: uid(), descricao: "PIX", taxa: 0, prazo: 0, atalho: "F4", situacao: "Ativo" },
  { id: uid(), descricao: "Vale-refeição", taxa: 4.5, prazo: 15, atalho: "F5", situacao: "Inativo" },
];

export const seedPratos: Prato[] = [
  { id: uid(), nome: "Filé à parmegiana", tipo: "Prato", valor: 68.9, situacao: "Ativo", observacoes: "Acompanha arroz e fritas" },
  { id: uid(), nome: "Risoto de camarão", tipo: "Prato", valor: 82.5, situacao: "Ativo" },
  { id: uid(), nome: "Água mineral 500ml", tipo: "Copo", valor: 6, situacao: "Ativo" },
  { id: uid(), nome: "Chopp Pilsen 300ml", tipo: "Copo", valor: 12, situacao: "Ativo" },
  { id: uid(), nome: "Suco de laranja", tipo: "Copo", valor: 9.5, situacao: "Inativo" },
];

export const perfis: Usuario["perfil"][] = ["Administrador", "Gerente", "Operador", "Caixa"];
export const ufs = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
export const atalhos = ["—","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"];

export const tabConfig: Record<TabKey, {
  singular: string;
  plural: string;
  ctaLabel: string;
  title: string;
  description: string;
  accent: string; // tailwind classes for icon chip
}> = {
  usuarios:   { singular: "usuário",   plural: "Usuários",          ctaLabel: "Novo usuário",     title: "Usuários",           description: "Gerencie logins, perfis e permissões da equipe.",   accent: "from-brand to-orange-500" },
  pessoas:    { singular: "pessoa",    plural: "Pessoas",           ctaLabel: "Nova pessoa",      title: "Pessoas",            description: "Clientes, fornecedores e funcionários em um só lugar.", accent: "from-brand to-orange-500" },
  mesas:      { singular: "mesa",      plural: "Mesas e comandas",  ctaLabel: "Nova mesa",        title: "Mesas e comandas",   description: "Organize salão, varanda e comandas do balcão.",       accent: "from-brand to-orange-500" },
  pagamentos: { singular: "pagamento", plural: "Tipos de pagamento",ctaLabel: "Novo pagamento",   title: "Tipos de pagamento", description: "Formas aceitas, taxas e atalhos de teclado.",         accent: "from-brand to-orange-500" },
  pratos:     { singular: "item",      plural: "Pratos e copos",    ctaLabel: "Novo item",        title: "Pratos e copos",     description: "Cardápio completo com preços e observações.",         accent: "from-brand to-orange-500" },
};