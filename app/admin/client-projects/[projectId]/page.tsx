import { notFound } from "next/navigation";
import { ClientProjectAdminPanel } from "@/components/admin/ClientProjectAdminPanel/ClientProjectAdminPanel";
import {
  getClientProject,
  listClientProjectItems,
  listClientProjectPackages,
  listCommentsForProject,
} from "@/lib/api/client-delivery-admin";

export const dynamic = "force-dynamic";

interface AdminClientProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function AdminClientProjectPage({
  params,
}: AdminClientProjectPageProps) {
  const { projectId } = await params;
  const detail = await getClientProject(projectId);
  if (!detail) notFound();

  const [packages, items, comments] = await Promise.all([
    listClientProjectPackages(projectId),
    listClientProjectItems(projectId),
    listCommentsForProject(projectId),
  ]);

  const { client, ...project } = detail;

  return (
    <ClientProjectAdminPanel
      project={project}
      client={client}
      packages={packages}
      items={items}
      comments={comments}
    />
  );
}
