import { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

// UC2 - Se connecter (document de conception, section 3.1)
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      // TODO : appeler POST /api/auth/login (auth-service, via le Gateway) une fois implemente
      const { data } = await apiClient.post("/api/auth/login", { email, password });
      localStorage.setItem("sm_access_token", data.accessToken);
      navigate("/");
    } catch (err) {
      setError("Authentification impossible - endpoint pas encore implemente ?");
    }
  }

  return (
    <div className="sm-card" style={{ maxWidth: 360, margin: "4rem auto" }}>
      <h2>Connexion</h2>
      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        <label>Mot de passe</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit">Se connecter</button>
      </form>
    </div>
  );
}
