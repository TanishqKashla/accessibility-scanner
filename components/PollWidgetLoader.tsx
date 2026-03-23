"use client";

import dynamic from "next/dynamic";

const PollWidget = dynamic(() => import("./PollWidget"), { ssr: false });

export default function PollWidgetLoader() {
  return <PollWidget />;
}
