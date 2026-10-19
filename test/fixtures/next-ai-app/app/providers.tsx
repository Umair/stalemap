"use client";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
export function Providers({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
