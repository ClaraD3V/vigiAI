import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getMyMonitorings } from "../services/supabaseClient";

export function useMonitorings() {
  const { user } = useAuth();
  const [monitorings, setMonitorings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchMonitorings = async () => {
      setLoading(true);
      setError(null);

      const { data, error: err } = await getMyMonitorings(user.id);

      if (err) {
        setError(err.message);
      } else {
        setMonitorings(data || []);
      }

      setLoading(false);
    };

    fetchMonitorings();
  }, [user]);

  return { monitorings, loading, error, refetch: () => {} };
}
