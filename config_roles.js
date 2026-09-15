/**
 * Configuração de E-mails Padrão para Admins e Técnicos
 * 
 * Insira aqui os e-mails das pessoas que terão privilégios de Admin e Técnico.
 * O sistema também tentará ler e-mails de admins e técnicos salvos no Firebase
 * nos caminhos '/config/admins' e '/config/tecnicos'.
 */

export const DEFAULT_ADMINS = [
  "alexandrebomfim@escola.pr.gov.br",
  "jorge.dotti@escola.pr.gov.br",
  "estagioprobatorio@escola.pr.gov.br", // Adicionando placeholder para testes
  "est.probmatricula@escola.pr.gov.br"     // Placeholder geral
];

export const DEFAULT_TECNICOS = [
];