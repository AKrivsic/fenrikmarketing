import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { readVideoOutput } from "@/lib/api/content-shared";
import { buildVideoRenderPath } from "@/lib/api/storage";
import {
  buildClientProjectPublishTexts,
  CLIENT_PUBLISH_PLATFORM_LABELS,
  type ClientProjectPublishTexts,
} from "@/lib/publishing/clientProjectPublishText";
import {
  buildClientPublishSectionsFromContentItems,
  type ClientDeliveryPublishSection,
} from "@/lib/publishing/clientDeliveryFromContentItems";
import type { ContentItem, Json } from "@/lib/supabase/types";

export type ClientProjectStatus =
  | "draft"
  | "preview_sent"
  | "revision_requested"
  | "approved"
  | "paid"
  | "delivered";

export type CommentAuthorType = "client" | "admin" | "internal";

export interface ClientRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  websiteUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SampleRequestRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  websiteUrl: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

export interface ClientProjectRow {
  id: string;
  clientId: string;
  title: string;
  status: ClientProjectStatus;
  paid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProjectPackageRow {
  id: string;
  clientProjectId: string;
  internalPackageId: string | null;
  title: string;
  sortOrder: number;
  createdAt: string;
}

export interface ClientProjectItemRow {
  id: string;
  clientProjectId: string;
  packageId: string | null;
  videoUrl: string | null;
  videoStoragePath: string | null;
  title: string;
  tikTokCaption: string;
  instagramCaption: string;
  facebookPost: string;
  linkedinPost: string;
  hashtags: string[];
  clientNote: string | null;
  internalNote: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Fields safe to pass into the public client review UI (no media URLs or internal notes). */
export type ClientProjectItemClientView = Omit<
  ClientProjectItemRow,
  "videoUrl" | "videoStoragePath" | "internalNote"
> & {
  hasVideo: boolean;
  publishTexts: ClientProjectPublishTexts;
  publishSections: ClientDeliveryPublishSection[];
};

function legacyPublishSections(
  item: ClientProjectItemRow,
): ClientDeliveryPublishSection[] {
  const publishTexts = buildClientProjectPublishTexts(item);
  return CLIENT_PUBLISH_PLATFORM_LABELS.map(({ key, label }, index) => ({
    label,
    text: publishTexts[key],
    defaultOpen: index === 0,
  }));
}

export function toClientProjectItemClientView(
  item: ClientProjectItemRow,
  internalContentItems?: ContentItem[],
): ClientProjectItemClientView {
  const { videoUrl: _v, videoStoragePath: _p, internalNote: _n, ...rest } = item;
  const publishSections =
    internalContentItems && internalContentItems.length > 0
      ? buildClientPublishSectionsFromContentItems(internalContentItems)
      : legacyPublishSections(item);
  return {
    ...rest,
    hasVideo: Boolean(_p?.trim() || _v?.trim()),
    publishTexts: buildClientProjectPublishTexts(item),
    publishSections,
  };
}

export type ClientProjectExportItem = Omit<
  ClientProjectItemRow,
  "videoUrl" | "videoStoragePath" | "internalNote"
>;

export function toClientExportItem(item: ClientProjectItemRow): ClientProjectExportItem {
  const {
    videoUrl: _v,
    videoStoragePath: _p,
    internalNote: _n,
    ...rest
  } = item;
  return rest;
}

export interface ClientProjectCommentRow {
  id: string;
  clientProjectItemId: string;
  authorType: CommentAuthorType;
  comment: string;
  createdAt: string;
}

function mapClient(row: Record<string, unknown>): ClientRow {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    company: (row.company as string | null) ?? null,
    websiteUrl: (row.website_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapSampleRequest(row: Record<string, unknown>): SampleRequestRow {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    company: (row.company as string | null) ?? null,
    websiteUrl: (row.website_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: row.status as string,
    createdAt: row.created_at as string,
  };
}

function mapProject(row: Record<string, unknown>): ClientProjectRow {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    title: row.title as string,
    status: row.status as ClientProjectStatus,
    paid: Boolean(row.paid),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPackage(row: Record<string, unknown>): ClientProjectPackageRow {
  return {
    id: row.id as string,
    clientProjectId: row.client_project_id as string,
    internalPackageId: (row.internal_package_id as string | null) ?? null,
    title: row.title as string,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  };
}

function mapItem(row: Record<string, unknown>): ClientProjectItemRow {
  return {
    id: row.id as string,
    clientProjectId: row.client_project_id as string,
    packageId: (row.package_id as string | null) ?? null,
    videoUrl: (row.video_url as string | null) ?? null,
    videoStoragePath: (row.video_storage_path as string | null) ?? null,
    title: row.title as string,
    tikTokCaption: row.tik_tok_caption as string,
    instagramCaption: row.instagram_caption as string,
    facebookPost: row.facebook_post as string,
    linkedinPost: row.linkedin_post as string,
    hashtags: (row.hashtags as string[]) ?? [],
    clientNote: (row.client_note as string | null) ?? null,
    internalNote: (row.internal_note as string | null) ?? null,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapComment(row: Record<string, unknown>): ClientProjectCommentRow {
  return {
    id: row.id as string,
    clientProjectItemId: row.client_project_item_id as string,
    authorType: row.author_type as CommentAuthorType,
    comment: row.comment as string,
    createdAt: row.created_at as string,
  };
}

function findCaption(items: ContentItem[], platform: string): string {
  const item = items.find((i) => i.platform === platform);
  if (!item) return "";
  return (item.caption ?? "").trim();
}


export async function insertSampleRequest(input: {
  name: string;
  email: string;
  company?: string;
  websiteUrl?: string;
  notes?: string;
}): Promise<{ id: string }> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sample_requests")
    .insert({
      name: input.name,
      email: input.email,
      company: input.company?.trim() || null,
      website_url: input.websiteUrl?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function listSampleRequests(): Promise<SampleRequestRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("sample_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapSampleRequest(row as Record<string, unknown>));
}

export async function listClients(): Promise<ClientRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapClient(row as Record<string, unknown>));
}

export async function getClient(clientId: string): Promise<ClientRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapClient(data as Record<string, unknown>);
}

export async function createClientFromSampleRequest(
  sampleRequestId: string,
): Promise<{ clientId: string }> {
  const supabase = createSupabaseAdminClient();
  const { data: sample, error: sampleError } = await supabase
    .from("sample_requests")
    .select("*")
    .eq("id", sampleRequestId)
    .maybeSingle();
  if (sampleError) throw sampleError;
  if (!sample) throw new Error("Sample request not found");

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      name: sample.name as string,
      email: sample.email as string,
      company: sample.company as string | null,
      website_url: sample.website_url as string | null,
      notes: sample.notes as string | null,
    })
    .select("id")
    .single();
  if (clientError) throw clientError;

  await supabase
    .from("sample_requests")
    .update({ status: "converted" })
    .eq("id", sampleRequestId);

  return { clientId: client.id as string };
}

export async function createClient(input: {
  name: string;
  email: string;
  company?: string;
  websiteUrl?: string;
  notes?: string;
}): Promise<{ id: string }> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name.trim(),
      email: input.email.trim(),
      company: input.company?.trim() || null,
      website_url: input.websiteUrl?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function listClientProjects(
  clientId: string,
): Promise<ClientProjectRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("client_projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapProject(row as Record<string, unknown>));
}

export async function createClientProject(
  clientId: string,
  title: string,
): Promise<{ id: string }> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("client_projects")
    .insert({ client_id: clientId, title: title.trim() })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function getClientProject(
  projectId: string,
): Promise<(ClientProjectRow & { client: ClientRow }) | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("client_projects")
    .select("*, clients(*)")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, unknown>;
  const clientRaw = row.clients as Record<string, unknown>;
  return {
    ...mapProject(row),
    client: mapClient(clientRaw),
  };
}

export async function updateClientProjectStatus(
  projectId: string,
  status: ClientProjectStatus,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("client_projects")
    .update({ status })
    .eq("id", projectId);
  if (error) throw error;
}

export async function setClientProjectPaid(
  projectId: string,
  paid: boolean,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const patch: { paid: boolean; status?: ClientProjectStatus } = { paid };
  if (paid) patch.status = "paid";
  const { error } = await supabase
    .from("client_projects")
    .update(patch)
    .eq("id", projectId);
  if (error) throw error;
}

export async function listClientProjectPackages(
  projectId: string,
): Promise<ClientProjectPackageRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("client_project_packages")
    .select("*")
    .eq("client_project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapPackage(row as Record<string, unknown>));
}

export async function listClientProjectItems(
  projectId: string,
): Promise<ClientProjectItemRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("client_project_items")
    .select("*")
    .eq("client_project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapItem(row as Record<string, unknown>));
}

/** Client review UI: hydrate publish copy from linked internal content_packages when present. */
export async function loadClientProjectItemsForReview(
  projectId: string,
): Promise<ClientProjectItemClientView[]> {
  const [items, packages] = await Promise.all([
    listClientProjectItems(projectId),
    listClientProjectPackages(projectId),
  ]);
  const packageById = new Map(packages.map((p) => [p.id, p]));

  const internalPackageIds = [
    ...new Set(
      items
        .map((item) => {
          if (!item.packageId) return null;
          return packageById.get(item.packageId)?.internalPackageId ?? null;
        })
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const contentItemsByPackageId = new Map<string, ContentItem[]>();
  if (internalPackageIds.length > 0) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("content_items")
      .select("*")
      .in("package_id", internalPackageIds)
      .is("language", null);
    if (error) throw error;
    for (const row of data ?? []) {
      const contentItem = row as ContentItem;
      const packageId = contentItem.package_id;
      if (!packageId) continue;
      const list = contentItemsByPackageId.get(packageId) ?? [];
      list.push(contentItem);
      contentItemsByPackageId.set(packageId, list);
    }
  }

  return items.map((item) => {
    const internalId = item.packageId
      ? packageById.get(item.packageId)?.internalPackageId
      : null;
    const internalItems = internalId
      ? contentItemsByPackageId.get(internalId)
      : undefined;
    return toClientProjectItemClientView(item, internalItems);
  });
}

export async function listCommentsForProject(
  projectId: string,
): Promise<ClientProjectCommentRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data: items, error: itemsError } = await supabase
    .from("client_project_items")
    .select("id")
    .eq("client_project_id", projectId);
  if (itemsError) throw itemsError;
  const itemIds = (items ?? []).map((i) => i.id as string);
  if (itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from("client_project_comments")
    .select("*")
    .in("client_project_item_id", itemIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => mapComment(row as Record<string, unknown>));
}

export async function updateClientProjectItem(
  itemId: string,
  patch: Partial<{
    title: string;
    tikTokCaption: string;
    instagramCaption: string;
    facebookPost: string;
    linkedinPost: string;
    hashtags: string[];
    clientNote: string | null;
    internalNote: string | null;
    videoUrl: string | null;
    sortOrder: number;
  }>,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const dbPatch: Record<string, unknown> = {};
  if (patch.title !== undefined) dbPatch.title = patch.title;
  if (patch.tikTokCaption !== undefined) dbPatch.tik_tok_caption = patch.tikTokCaption;
  if (patch.instagramCaption !== undefined) {
    dbPatch.instagram_caption = patch.instagramCaption;
  }
  if (patch.facebookPost !== undefined) dbPatch.facebook_post = patch.facebookPost;
  if (patch.linkedinPost !== undefined) dbPatch.linkedin_post = patch.linkedinPost;
  if (patch.hashtags !== undefined) dbPatch.hashtags = patch.hashtags;
  if (patch.clientNote !== undefined) dbPatch.client_note = patch.clientNote;
  if (patch.internalNote !== undefined) dbPatch.internal_note = patch.internalNote;
  if (patch.videoUrl !== undefined) dbPatch.video_url = patch.videoUrl;
  if (patch.sortOrder !== undefined) dbPatch.sort_order = patch.sortOrder;

  const { error } = await supabase
    .from("client_project_items")
    .update(dbPatch)
    .eq("id", itemId);
  if (error) throw error;
}

export async function addClientProjectComment(input: {
  itemId: string;
  authorType: CommentAuthorType;
  comment: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("client_project_comments").insert({
    client_project_item_id: input.itemId,
    author_type: input.authorType,
    comment: input.comment.trim(),
  });
  if (error) throw error;
}

export async function importInternalContentPackage(
  clientProjectId: string,
  internalPackageId: string,
): Promise<{ packageId: string; itemsCreated: number }> {
  const supabase = createSupabaseAdminClient();

  const { data: pkg, error: pkgError } = await supabase
    .from("content_packages")
    .select("id, title, project_id")
    .eq("id", internalPackageId)
    .maybeSingle();
  if (pkgError) throw pkgError;
  if (!pkg) throw new Error("Content package not found");

  const { data: itemRows, error: itemsError } = await supabase
    .from("content_items")
    .select("*")
    .eq("package_id", internalPackageId)
    .is("language", null);
  if (itemsError) throw itemsError;
  const items = (itemRows ?? []) as ContentItem[];

  const { data: existingPackages, error: sortError } = await supabase
    .from("client_project_packages")
    .select("sort_order")
    .eq("client_project_id", clientProjectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (sortError) throw sortError;
  const nextSort =
    existingPackages && existingPackages.length > 0
      ? ((existingPackages[0] as { sort_order: number }).sort_order ?? 0) + 1
      : 0;

  const { data: deliveryPkg, error: deliveryPkgError } = await supabase
    .from("client_project_packages")
    .insert({
      client_project_id: clientProjectId,
      internal_package_id: internalPackageId,
      title: pkg.title as string,
      sort_order: nextSort,
    })
    .select("id")
    .single();
  if (deliveryPkgError) throw deliveryPkgError;

  const videoItems = items.filter(
    (i) => i.platform === "tiktok" || i.platform === "youtube" || i.format === "short",
  );
  const anchorItem =
    videoItems[0] ??
    items.find((i) => i.platform === "instagram") ??
    items[0];
  if (!anchorItem) {
    return { packageId: deliveryPkg.id as string, itemsCreated: 0 };
  }

  const itemIds = items.map((i) => i.id);
  const { data: jobRows, error: jobsError } = await supabase
    .from("video_jobs")
    .select("id, content_item_id, output, status")
    .eq("project_id", pkg.project_id as string)
    .in("content_item_id", itemIds)
    .order("created_at", { ascending: false });
  if (jobsError) throw jobsError;

  let videoUrl: string | null = null;
  let videoStoragePath: string | null = null;
  for (const job of jobRows ?? []) {
    const row = job as {
      id: string;
      content_item_id: string | null;
      output: Json | null;
    };
    const itemId = row.content_item_id;
    if (itemId === anchorItem.id || videoUrl === null) {
      const out = readVideoOutput(row.output);
      if (out.mp4Url) {
        videoUrl = out.mp4Url;
        videoStoragePath = buildVideoRenderPath(
          pkg.project_id as string,
          row.id,
          "output.mp4",
        );
        if (itemId === anchorItem.id) break;
      }
    }
  }

  const { data: existingItems, error: itemSortError } = await supabase
    .from("client_project_items")
    .select("sort_order")
    .eq("client_project_id", clientProjectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  if (itemSortError) throw itemSortError;
  const itemSort =
    existingItems && existingItems.length > 0
      ? ((existingItems[0] as { sort_order: number }).sort_order ?? 0) + 1
      : 0;

  const { error: insertItemError } = await supabase.from("client_project_items").insert({
    client_project_id: clientProjectId,
    package_id: deliveryPkg.id as string,
    title: anchorItem.title ?? pkg.title ?? "Video",
    video_url: videoUrl,
    video_storage_path: videoStoragePath,
    tik_tok_caption: findCaption(items, "tiktok") || anchorItem.caption || "",
    instagram_caption:
      findCaption(items, "instagram") || anchorItem.caption || "",
    facebook_post: findCaption(items, "facebook") || anchorItem.caption || "",
    linkedin_post: findCaption(items, "linkedin") || anchorItem.caption || "",
    hashtags: anchorItem.hashtags ?? [],
    sort_order: itemSort,
  });
  if (insertItemError) throw insertItemError;

  return { packageId: deliveryPkg.id as string, itemsCreated: 1 };
}

export function buildProjectTextExport(
  project: ClientProjectRow,
  items: ClientProjectItemRow[],
  options?: { publishSectionsByItemId?: Map<string, ClientDeliveryPublishSection[]> },
): string {
  const lines: string[] = [
    `# ${project.title}`,
    `Status: ${project.status}`,
    `Paid: ${project.paid ? "yes" : "no"}`,
    "",
  ];
  items.forEach((item, index) => {
    const sections =
      options?.publishSectionsByItemId?.get(item.id) ??
      legacyPublishSections(item);
    lines.push(`## Video ${index + 1}: ${item.title}`);
    lines.push("");
    for (const section of sections) {
      lines.push(`### ${section.label}`);
      if (section.publishTitle) {
        lines.push("");
        lines.push("Title:");
        lines.push(section.publishTitle);
      }
      lines.push("");
      lines.push(section.text || "—");
      lines.push("");
    }
  });
  return lines.join("\n");
}
