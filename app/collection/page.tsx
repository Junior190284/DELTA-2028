import { redirect } from "next/navigation";

/**
 * Route fallback for /collection
 * Directs users to the active collection view in Preview or Dashboard depending on context.
 */
export default function CollectionRedirectPage() {
  redirect("/preview/dashboard-ui4?view=collection");
}
