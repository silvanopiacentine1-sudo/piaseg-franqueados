export interface Contato {
  nome: string;
  telefone: string;
  email: string;
  funcao: string;
  data_nascimento: string;
}

export interface Franqueado {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  contatos: Contato[];
  cep: string;
  uf: string;
  municipio: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  modalidade: string;
  inicio_operacao: string;
  fim_operacao: string;
  cpf_franqueado: string;
  status: string;
  sistemas_contratados: string[];
  observacao: string;
}

export type FranqueadoInput = Omit<Franqueado, "id">;

export const FRANQUEADO_VAZIO: FranqueadoInput = {
  nome_fantasia: "",
  razao_social: "",
  cnpj: "",
  contatos: [],
  cep: "",
  uf: "",
  municipio: "",
  bairro: "",
  logradouro: "",
  numero: "",
  complemento: "",
  modalidade: "",
  inicio_operacao: "",
  fim_operacao: "",
  cpf_franqueado: "",
  status: "ativo",
  sistemas_contratados: [],
  observacao: "",
};

export const MODALIDADES = ["H.O", "Store", "Migração", "Corporate"];

export const SISTEMAS = ["E-mail", "Contador", "Sistema Financeiro"];

export const FUNCOES_CONTATO = ["Sócio", "Colaborador", "Parceiro"];

export const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];
