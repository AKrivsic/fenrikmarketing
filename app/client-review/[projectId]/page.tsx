import { notFound } from "next/navigation";
import { ClientReviewView } from "@/components/client-review/ClientReviewView/ClientReviewView";
import {
  getClientProject,
  listCommentsForProject,
  loadClientProjectItemsForReview,
} from "@/lib/api/client-delivery-admin";

export const dynamic = "force-dynamic";

interface ClientReviewPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ClientReviewPage({ params }: ClientReviewPageProps) {
  const { projectId } = await params;
  const detail = await getClientProject(projectId);
  if (!detail) notFound();

  const [clientItems, comments] = await Promise.all([
    loadClientProjectItemsForReview(projectId),
    listCommentsForProject(projectId),
  ]);

  const { client: _client, ...project } = detail;

  return (
    <ClientReviewView project={project} items={clientItems} comments={comments} />
  );
}
