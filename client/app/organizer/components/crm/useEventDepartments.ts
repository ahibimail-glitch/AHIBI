"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface EventDepartment {
  id: string;
  key: string;
  name: string;
  color: string;
  sortOrder?: number;
}

interface UseEventDepartmentsOptions {
  eventId: string;
  tokenName?: string;
  enabled?: boolean;
}

export function useEventDepartments({
  eventId,
  tokenName = "organizer_token",
  enabled = true,
}: UseEventDepartmentsOptions) {
  const [departments, setDepartments] = useState<EventDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const fetchDepartments = useCallback(async () => {
    if (!enabled || !eventId) return;

    const token = localStorage.getItem(tokenName);
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${apiUrl}/api/organizer/events/${eventId}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load departments");
      }

      setDepartments(data.data?.departments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load departments");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, enabled, eventId, tokenName]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const departmentMap = useMemo(() => {
    const map = new Map<string, EventDepartment>();
    departments.forEach((dept) => map.set(dept.key, dept));
    return map;
  }, [departments]);

  const getDepartmentLabel = useCallback(
    (key: string) => {
      if (!key || key === "none") return "—";
      return departmentMap.get(key)?.name ?? key;
    },
    [departmentMap]
  );

  const departmentOptions = useMemo(
    () => [
      { value: "none", label: "No department" },
      ...departments.map((dept) => ({ value: dept.key, label: dept.name })),
    ],
    [departments]
  );

  return {
    departments,
    departmentMap,
    departmentOptions,
    getDepartmentLabel,
    loading,
    error,
    refetch: fetchDepartments,
    apiUrl,
    tokenName,
  };
}
