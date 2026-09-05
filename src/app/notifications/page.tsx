import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { markNotificationsRead } from "@/lib/actions/library";
import { formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Notifications</h1>
          <p className="mt-2 text-sm text-slate">Deadlines, data changes and new scholarship matches.</p>
        </div>
        <form action={markNotificationsRead}>
          <button type="submit" className="btn btn-sm">
            Mark all as read
          </button>
        </form>
      </header>

      {notifications.length === 0 ? (
        <EmptyState title="Nothing yet" body="Deadline and data-change alerts will appear here." />
      ) : (
        <div className="panel divide-y divide-[color:var(--color-line)]">
          {notifications.map((notification) => (
            <div key={notification.id} className="flex items-start gap-3 px-5 py-4">
              <span
                className="mt-2 h-2 w-2 shrink-0 rounded-full"
                style={{ background: notification.readAt ? "var(--color-line)" : "var(--color-viridian)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{notification.title}</p>
                <p className="mt-0.5 text-sm text-slate">{notification.body}</p>
                <p className="mt-1 text-xs text-mist">{formatDate(notification.createdAt)}</p>
              </div>
              {notification.href && (
                <Link href={notification.href} className="btn btn-sm">
                  Open
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
