/**
 * Espelha a politica de senha configurada em IdentityOptions no back-end:
 * minimo 8 caracteres, com maiuscula, minuscula, digito e nao alfanumerico.
 *
 * Validar aqui nao e redundancia com a API. Todos os endpoints de /api/auth
 * dividem um limite de 5 requisicoes por minuto por IP, entao cada senha fraca
 * enviada gasta uma das cinco tentativas do usuario — e ele levaria um 429 no
 * meio do cadastro sem entender por que. Manter as duas regras iguais e o que
 * torna esse limite folgado na pratica.
 */
export const PASSWORD_MIN_LENGTH = 8

export const PASSWORD_RULES_TEXT =
  'A senha deve ter no minimo 8 caracteres e incluir ao menos uma letra maiuscula, ' +
  'uma letra minuscula, um numero e um caractere nao alfanumerico (ex: !, @, #).'

/** Retorna a lista de regras violadas. Vazia significa senha valida. */
export function validatePassword(password: string): string[] {
  const problems: string[] = []

  if (password.length < PASSWORD_MIN_LENGTH)
    problems.push(`A senha deve ter no minimo ${PASSWORD_MIN_LENGTH} caracteres.`)
  if (!/[A-Z]/.test(password)) problems.push('A senha deve incluir uma letra maiuscula.')
  if (!/[a-z]/.test(password)) problems.push('A senha deve incluir uma letra minuscula.')
  if (!/[0-9]/.test(password)) problems.push('A senha deve incluir um numero.')
  if (!/[^a-zA-Z0-9]/.test(password))
    problems.push('A senha deve incluir um caractere nao alfanumerico.')

  return problems
}
