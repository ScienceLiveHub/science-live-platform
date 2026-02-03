import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export function RelativeDateTime({
  date,
  noHover = false,
}: {
  date: string | number | Date;
  noHover?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm group relative">
      {noHover ? (
        <span className="text-sm text-gray-500 dark:text-gray-400 pointer-events-auto w-auto">
          {dayjs(date).fromNow()}
        </span>
      ) : (
        <HoverCard openDelay={100} closeDelay={100}>
          <HoverCardTrigger>
            <span className="text-sm text-gray-500 dark:text-gray-400 pointer-events-auto w-auto">
              {dayjs(date).fromNow()}
            </span>
          </HoverCardTrigger>
          <HoverCardContent
            align="start"
            className="p-0 px-2 m-0 w-auto bg-muted"
          >
            <span className="text-sm text-muted-foreground rounded-md shadow-md">
              {dayjs(date).toString()}
            </span>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
}
