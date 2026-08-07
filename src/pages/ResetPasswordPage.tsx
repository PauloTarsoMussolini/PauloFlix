import { authApi } from '../api/auth'
import PasswordSetupForm from '../components/PasswordSetupForm'

export default function ResetPasswordPage() {
  return (
    <PasswordSetupForm
      title="Redefinir senha"
      intro="Escolha uma senha nova. A anterior deixa de valer assim que voce confirmar."
      submitLabel="Salvar nova senha"
      onSubmit={authApi.resetPassword}
      recoveryPath="/esqueci-senha"
    />
  )
}
