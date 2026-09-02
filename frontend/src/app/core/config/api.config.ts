/**
 * URL base da API. Fixa em uma constante — o CLI atual do Angular não gera
 * mais `environment.ts`/`environment.prod.ts` por padrão em projetos novos,
 * e para este teste (um único ambiente de deploy) isso seria complexidade
 * desnecessária. Se o projeto crescesse para múltiplos ambientes, o caminho
 * idiomático no Angular seria reintroduzir os arquivos de environment com
 * `fileReplacements` no angular.json.
 */
export const API_BASE_URL = 'http://localhost:3000';
