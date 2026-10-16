export function Navbar({ user, onSignOut }) {
  const isDoctor = user.role === "doctor";
  return (
    <header className="topbar">
      <span className="brand">Aurawell</span>
      <span className="muted">{isDoctor ? "Doctor console" : "Patient portal"}</span>
      <button className="ghost" onClick={onSignOut}>
        Sign out
      </button>
    </header>
  );
}
