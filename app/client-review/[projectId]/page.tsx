import { notFound } from "next/navigation";
import { ClientReviewView } from "@/components/client-review/ClientReviewView/ClientReviewView";
import {
  getClientProject,
  listClientProjectItems,
  listCommentsForProject,
} from "@/lib/api/client-delivery-admin";

export const dynamic = "force-dynamic";

interface ClientReviewPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ClientReviewPage({ params }: ClientReviewPageProps) {
  const { projectId } = await params;
  const detail = await getClientProject(projectId);
  if (!detail) notFound();

  const [items, comments] = await Promise.all([
    listClientProjectItems(projectId),
    listCommentsForProject(projectId),
  ]);

  const { ...project } = detail;

  return <ClientReviewView project={project} items={items} comments={comments} />;
}
