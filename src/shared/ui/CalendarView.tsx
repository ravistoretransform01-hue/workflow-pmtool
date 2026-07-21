import type { FC } from "react";

interface CalendarViewProps {
  boardId: string;
  boardName: string;
}

export const CalendarView: FC<CalendarViewProps> = ({ boardId, boardName }) => {
  return (
    <div className="p-4">
      <h2>{boardName}</h2>
      <p>Calendar view for board {boardId}</p>
    </div>
  );
};
