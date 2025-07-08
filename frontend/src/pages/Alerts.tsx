import React, { useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

interface AlertItem {
  id?: string;
  message?: string;
  severity?: string;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/alerts")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch alerts");
        return res.json();
      })
      .then((data) => {
        setAlerts(data.alerts || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <Typography variant="h5" component="h2" gutterBottom>
        Alerts
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : alerts.length === 0 ? (
        <Alert severity="info">No alerts found.</Alert>
      ) : (
        <List>
          {alerts.map((alert, idx) => (
            <ListItem key={alert.id || idx}>
              <Typography>
                {alert.message || `Alert #${idx + 1}`}
                {alert.severity ? ` (Severity: ${alert.severity})` : ""}
              </Typography>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
};

export default Alerts; 