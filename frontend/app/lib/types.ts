export interface Franqueado {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  email: string;
  telefone: string;
  celular: string;
  cep: string;
  uf: string;
  municipio: string;
  bairro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  latitude: string;
  longitude: string;
  ie: string;
  natureza_juridica: string;
  capital_social: string;
  inaugurada: string;
  grupos: string;
  data_inicio_implantacao: string;
  data_fim_implantacao: string;
  data_inauguracao: string;
  data_criacao: string;
  data_criacao_sistema: string;
  data_inativacao: string;
  tipo: string;
  cpf_franqueado: string;
  status: string;
}

export type FranqueadoInput = Omit<Franqueado, "id">;

export const FRANQUEADO_VAZIO: FranqueadoInput = {
  nome_fantasia: "",
  razao_social: "",
  cnpj: "",
  email: "",
  telefone: "",
  celular: "",
  cep: "",
  uf: "",
  municipio: "",
  bairro: "",
  logradouro: "",
  numero: "",
  complemento: "",
  latitude: "",
  longitude: "",
  ie: "",
  natureza_juridica: "",
  capital_social: "",
  inaugurada: "",
  grupos: "",
  data_inicio_implantacao: "",
  data_fim_implantacao: "",
  data_inauguracao: "",
  data_criacao: "",
  data_criacao_sistema: "",
  data_inativacao: "",
  tipo: "Loja Franqueada",
  cpf_franqueado: "",
  status: "ativo",
};

export const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];
