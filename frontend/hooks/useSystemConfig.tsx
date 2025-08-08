import { useQuery } from "@tanstack/react-query";
import backend from "~backend/client";

export function useSystemConfig() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["system-config"],
    queryFn: () => backend.ticket.getSystemConfig(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    config: data?.config,
    isLoading,
    error,
  };
}
