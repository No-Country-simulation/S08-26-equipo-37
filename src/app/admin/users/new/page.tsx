import { AdminForm } from "@/app/_components/admin-form";
import { getNewUserOptions } from "@/modules/admin/service";
import { AssignmentFields, BackLink, Field, PageTitle } from "../../_components";
import { createUserAction } from "../../actions";

export default async function NewUserPage() {
  const choices = await getNewUserOptions();
  return <>
    <BackLink href="/admin/users">Usuarios</BackLink>
    <PageTitle title="Invitar usuario" description="La persona elige su contraseña mediante un enlace privado de un solo uso. La cuenta permanece invitada hasta que lo acepte." />
    <section className="admin-panel max-w-3xl">
      <AdminForm action={createUserAction} confirmLabel="Confirmo la invitación y el alcance de este acceso inicial." submitLabel="Crear usuario e invitación">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><input autoComplete="name" className="admin-input" maxLength={120} minLength={2} name="name" required /></Field><Field label="Email"><input autoComplete="email" className="admin-input" maxLength={254} name="email" required type="email" /></Field></div>
        <Field label="URL de avatar (opcional)"><input className="admin-input" maxLength={2000} name="avatarUrl" placeholder="https://…" type="url" /></Field>
        <div className="border-t border-default pt-4"><h2 className="mb-2 text-base font-semibold">Acceso inicial</h2><p className="mb-4 text-sm leading-6 text-secondary">Elegí un rol y un recurso de la jerarquía. La vigencia debe quedar dentro de tu propio período de autorización.</p><AssignmentFields choices={choices} /></div>
      </AdminForm>
    </section>
  </>;
}
