import Link from "next/link";
import { AccountShell } from "../_components/account-shell";

export default function Forbidden() {
  return <AccountShell title="Acceso no habilitado" description="Tu cuenta no tiene un permiso vigente para esta sección o recurso. Contactá a la administración para revisar tus accesos."><Link className="admin-button" href="/profile">Ver mi perfil</Link></AccountShell>;
}
