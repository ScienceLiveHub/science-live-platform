import { RelativeDateTime } from "@/components/relative-datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ky from "ky";
import {
  BellIcon,
  CalendarCheck2Icon,
  CheckIcon,
  InboxIcon,
  InfoIcon,
  MessageSquareIcon,
  UserCheckIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Notification } from "../../../../../../api/src/db/schema/user";
import { NotificationType } from "../../../../../../api/src/notifications";

// API base URL from environment
const API_URL = import.meta.env.VITE_API_URL || "";

const notificationIcons: Record<NotificationType, React.ElementType> = {
  invite: UserCheckIcon,
  approved: CheckIcon,
  message: MessageSquareIcon,
  info: InfoIcon,
  warning: CalendarCheck2Icon,
  error: XIcon,
};

const notificationColors: Record<NotificationType, string> = {
  invite: "bg-purple-500",
  approved: "bg-green-500",
  message: "bg-blue-500",
  info: "bg-cyan-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
};

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
  onNavigate: (link?: string) => void;
}

function NotificationItem({
  notification,
  onDismiss,
  onNavigate,
}: NotificationItemProps) {
  const Icon =
    notificationIcons[notification.type as NotificationType] || InfoIcon;
  const bgColor =
    notificationColors[notification.type as NotificationType] || "bg-blue-500";

  return (
    <div className="group flex items-start gap-3 hover:bg-background p-2 bg-card">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bgColor} text-white`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div
        className={`flex-1 space-y-1 ${notification.link ? "cursor-pointer py-1 rounded transition-colors" : ""}`}
        onClick={() => notification.link && onNavigate(notification.link)}
      >
        <p className="text-sm font-medium">{notification.title}</p>
        {notification.content && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {notification.content}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <RelativeDateTime date={notification.createdAt} noHover />
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
      >
        <XIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await ky(`${API_URL}/notifications/unread`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json<Notification[]>();
        setNotifications(data);
        setUnreadCount(data.length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleDismiss = async (notificationId: string) => {
    try {
      const response = await ky(
        `${API_URL}/notifications/${notificationId}/dismiss`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );
      if (response.ok) {
        // Remove from local state
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleDismissAll = async () => {
    try {
      const response = await ky(`${API_URL}/notifications/dismiss-all`, {
        method: "PATCH",
        credentials: "include",
      });
      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error dismissing all notifications:", error);
    }
  };

  const handleNavigate = (link?: string) => {
    if (link) {
      // Open external links in new tab, internal links in router
      if (link.startsWith("http")) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        navigate(link);
      }
      setIsOpen(false);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white px-2 py-0.5 text-xs font-medium">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between mb-0 p-1">
          <DropdownMenuLabel className="text-sm font-bold m-0 ">
            Notifications
          </DropdownMenuLabel>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-500 hover:text-white"
              onClick={handleDismissAll}
            >
              Dismiss all
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-500">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
            <InboxIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No unread notifications</p>
            {/* <Link to="notifications">
              <p className="text-xs mt-1">View all notifications</p>
            </Link> */}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto ">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDismiss={handleDismiss}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
