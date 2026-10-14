import { createFileRoute } from "@tanstack/react-router";
import { TradeTrackerPage } from "@/features/trade-tracker/TradeTrackerPage";

export const Route = createFileRoute("/_authenticated/trade-tracker")({
  head: () => ({
    meta: [
      { title: "Average Cost Trade Tracker — HomeTools" },
      {
        name: "description",
        content: "Track investment trades, average cost basis, and portfolio performance.",
      },
    ],
  }),
  component: TradeTrackerRoute,
});

function TradeTrackerRoute() {
  const { user } = Route.useRouteContext();
  return <TradeTrackerPage user={user} />;
}
