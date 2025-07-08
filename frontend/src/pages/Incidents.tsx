import React, { useEffect, useState } from "react";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

interface Incident {
  id?: string;
  title?: string;
  description?: string;
}

const Incidents: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/incidents")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch incidents");
        return res.json();
      })
      .then((data) => {
        setIncidents(data.incidents || []);
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
        Incidents
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : incidents.length === 0 ? (
        <Alert severity="info">No incidents found.</Alert>
      ) : (
        <List>
          {incidents.map((incident, idx) => (
            <ListItem key={incident.id || idx}>
              <Typography>
                {incident.title || `Incident #${idx + 1}`}
                {incident.description ? `: ${incident.description}` : ""}
              </Typography>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  );
};

export default Incidents; 