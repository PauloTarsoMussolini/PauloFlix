import { authApi } from '../api/auth'
import PasswordSetupForm from '../components/PasswordSetupForm'

export default function ActivateAccountPage() {
  return (
    <PasswordSetupForm
      title="Criar sua senha"
      intro="Confirme seu e-mail escolhendo uma senha. Depois disso sua conta ja fica ativa."
      submitLabel="Ativar conta"
      onSubmit={authApi.activate}
      // Cadastrar de novo com o mesmo e-mail reenvia o link de ativacao.
      recoveryPath="/cadastro"
    />
  )
}
