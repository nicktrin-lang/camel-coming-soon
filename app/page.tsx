export default function Home() {
  return (
    <main
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "system-ui",
        background: "#003768",
        color: "white",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h1 style={{ fontSize: "42px", marginBottom: "20px" }}>
        Camel Global
      </h1>

      <p style={{ fontSize: "20px", opacity: 0.9 }}>
        Customer platform coming soon.
      </p>

      <a
        href="https://portal.camel-global.com/partner/login"
        style={{
          marginTop: "24px",
          display: "inline-block",
          padding: "14px 28px",
          borderRadius: "999px",
          background: "#ff7a00",
          color: "white",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Partner Login
      </a>
    </main>
  );
}