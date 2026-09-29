import { notFound } from "next/navigation";
import { AdminForm } from "@/app/_components/admin-form";
import { getUserDetail } from "@/modules/admin/service";
import { assignmentState } from "@/modules/identity/policy";
import { AssignmentFields, BackLink, Empty, Field, formatDate, PageTitle, scopeLabels, Status } from "../../_components";
import { revokeAssignmentAction, saveAssignmentAction, updateUserAction, userCommandAction } from "../../actions";

function AccountCommand({ userId, command, title, description }: { userId: string; command: string; title: string; description: string }) {
  return <div className="border-t border-default py-4 first:border-t-0 first:pt-0"><h3 className="text-sm font-semibold">{title}</h3><p className="my-2 text-sm leading-6 text-secondary">{description}</p><AdminForm action={userCommandAction} confirmLabel={`Confirmo: ${title.toLocaleLowerCase("es")}.`} submitLabel={title}><input name="userId" type="hidden" value={userId} /><input name="command" type="hidden" value={command} /></AdminForm></div>;
}

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const detail = await getUserDetail(userId);
  if (!detail) notFound();
  const { user, permissions, choices } = detail;
  return <>
    <BackLink href="/admin/access">Usuarios y accesos</BackLink>
    <PageTitle title={user.name} description={user.email}><Status value={user.status} /></PageTitle>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
      <div className="min-w-0 space-y-6">
        <section className="admin-panel"><h2 className="mb-4 text-lg font-semibold">Datos de la cuenta</h2>
          {permissions.update ? <AdminForm action={updateUserAction} confirmLabel="Confirmo la actualización de los datos de la cuenta." submitLabel="Guardar datos"><input name="userId" type="hidden" value={user.id} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><input className="admin-input" defaultValue={user.name} maxLength={120} minLength={2} name="name" required /></Field><Field label="Email"><input className="admin-input" defaultValue={user.email} maxLength={254} name="email" required type="email" /></Field></div><Field label="URL de avatar (opcional)"><input className="admin-input" defaultValue={user.avatarUrl ?? ""} maxLength={2000} name="avatarUrl" type="url" /></Field><p className="text-xs leading-5 text-secondary">Cambiar el email cierra las sesiones e invalida los enlaces anteriores. Una cuenta invitada necesitará una nueva invitación.</p></AdminForm> : <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-secondary">Nombre</dt><dd className="mt-1">{user.name}</dd></div><div><dt className="text-secondary">Email</dt><dd className="mt-1 break-all">{user.email}</dd></div></dl>}
          <dl className="mt-5 grid gap-4 border-t border-default pt-4 text-xs sm:grid-cols-3"><div><dt className="text-secondary">Creado (UTC)</dt><dd className="mt-1">{formatDate(user.createdAt)}</dd></div><div><dt className="text-secondary">Último ingreso (UTC)</dt><dd className="mt-1">{formatDate(user.lastLoginAt)}</dd></div><div><dt className="text-secondary">Contraseña actualizada (UTC)</dt><dd className="mt-1">{formatDate(user.passwordChangedAt)}</dd></div></dl>
          {user.mustChangePassword ? <p className="mt-4 text-sm text-warning">Debe cambiar la contraseña antes de continuar.</p> : null}
        </section>
        <section className="admin-panel" id="access"><h2 className="text-lg font-semibold">Roles y ámbitos</h2><p className="mt-2 text-sm leading-6 text-secondary">Los accesos se acumulan. El período empieza en «Desde» e incluye ese instante; termina antes de «Hasta». Una cuenta suspendida no tiene acceso efectivo.</p>
          {user.assignments.length ? <ul className="mt-4 divide-y divide-default">{user.assignments.map((assignment) => <li className="py-5" key={assignment.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{assignment.role.name}</h3><p className="mt-1 text-xs text-secondary">{scopeLabels[assignment.scopeType]} · {assignment.scopeRef ?? "Todo el sistema"}</p></div><Status value={assignmentState(user.status, assignment)} /></div><p className="mt-3 text-xs text-secondary">Desde: {assignment.validFrom ? formatDate(assignment.validFrom) : "sin inicio"} · Hasta: {assignment.validUntil ? formatDate(assignment.validUntil) : "sin vencimiento"} (UTC)</p>
            {permissions.access && choices ? <div className="mt-4 space-y-3"><details className="rounded-md border border-default p-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-action">Editar este acceso</summary><div className="pt-3"><AdminForm action={saveAssignmentAction} confirmLabel="Confirmo el rol, el ámbito y la vigencia de esta asignación." submitLabel="Guardar acceso"><input name="userId" type="hidden" value={user.id} /><input name="assignmentId" type="hidden" value={assignment.id} /><AssignmentFields assignment={assignment} choices={choices} /></AdminForm></div></details><details className="rounded-md border border-default p-3"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-critical">Revocar este acceso</summary><div className="pt-3"><AdminForm action={revokeAssignmentAction} confirmLabel={`Confirmo la revocación de ${assignment.role.name} en ${assignment.scopeRef ?? "todo el sistema"}.`} submitLabel="Revocar acceso"><input name="assignmentId" type="hidden" value={assignment.id} /><p className="text-sm text-secondary">La revocación es inmediata. Las otras asignaciones de esta persona se conservan.</p></AdminForm></div></details></div> : null}
          </li>)}</ul> : <Empty>Esta cuenta no tiene accesos asignados.</Empty>}
          {permissions.access && choices ? <div className="mt-4 border-t border-default pt-5"><h3 className="mb-4 text-base font-semibold">Agregar asignación</h3><AdminForm action={saveAssignmentAction} confirmLabel="Confirmo el nuevo rol, ámbito y período de acceso." submitLabel="Asignar acceso"><input name="userId" type="hidden" value={user.id} /><input name="assignmentId" type="hidden" value="" /><AssignmentFields choices={choices} /></AdminForm></div> : null}
        </section>
      </div>
      <aside className="admin-panel"><h2 className="mb-4 text-lg font-semibold">Acciones de cuenta</h2>
        {permissions.invite && user.status === "INVITED" ? <AccountCommand userId={user.id} command="invite" title="Reenviar invitación" description="Genera un enlace nuevo de 48 horas e invalida el anterior. Si el correo no está disponible, podés copiar el enlace." /> : null}
        {permissions.reset && user.status === "ACTIVE" ? <><AccountCommand userId={user.id} command="reset" title="Restablecer contraseña" description="Envía un enlace de 30 minutos para que la persona elija una contraseña nueva." />{!user.mustChangePassword ? <AccountCommand userId={user.id} command="force-password" title="Exigir cambio de contraseña" description="Cierra las sesiones. En el próximo ingreso la persona deberá cambiar su contraseña antes de usar el sistema." /> : null}</> : null}
        {permissions.suspend ? user.status === "SUSPENDED" ? <AccountCommand userId={user.id} command="reactivate" title="Reactivar usuario" description="Restablece la cuenta. Los accesos siguen sujetos a su vigencia y a sus ámbitos." /> : <AccountCommand userId={user.id} command="suspend" title="Suspender usuario" description="Bloquea el ingreso y cierra todas las sesiones. También invalida invitaciones y enlaces de recuperación pendientes." /> : null}
        {!permissions.invite && !permissions.reset && !permissions.suspend ? <p className="text-sm text-secondary">Tu acceso permite consultar esta cuenta, sin administrar sus credenciales o estado.</p> : null}
      </aside>
    </div>
  </>;
}
