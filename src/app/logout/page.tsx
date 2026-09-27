import { AccountShell } from "../_components/account-shell";
import { logoutAction } from "../auth-actions";

export default function Logout() {
  return <AccountShell title="Cerrar sesión" description="Vas a cerrar la sesión en este dispositivo."><form action={logoutAction}><button className="admin-button" type="submit">Cerrar sesión</button></form></AccountShell>;
}
