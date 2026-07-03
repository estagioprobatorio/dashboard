/**
 * Configuração de E-mails Padrão para Admins e Técnicos
 * 
 * Insira aqui os e-mails das pessoas que terão privilégios de Admin e Técnico.
 * O sistema também tentará ler e-mails de admins e técnicos salvos no Firebase
 * nos caminhos '/config/admins' e '/config/tecnicos'.
 */

export const DEFAULT_ADMINS = [
  "admin@escola.pr.gov.br",
  "diretoria@escola.pr.gov.br",
  "pseudocelomado@gmail.com", // Adicionando placeholder para testes
  "user@escola.pr.gov.br"     // Placeholder geral
];

export const DEFAULT_TECNICOS = [
  "tecnico@escola.pr.gov.br",
  "suporte@escola.pr.gov.br",
  "liziani_scariot@escola.pr.gov.br" // E-mail técnico encontrado nos registros da planilha
];
