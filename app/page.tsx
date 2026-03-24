export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #003768 0%, #005b9f 100%)",
        color: "#ffffff",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          textAlign: "center",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: "24px",
          padding: "48px 32px",
          boxShadow: "0 18px 45px rgba(0,0,0,0.18)",
          backdropFilter: "blur(4px)",
        }}
      >
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: "clamp(42px, 7vw, 64px)",
            lineHeight: 1.05,
            fontWeight: 700,
          }}
        >
          Camel Global
        </h1>

        <p
          style={{
            margin: "0 0 18px",
            fontSize: "clamp(20px, 3vw, 28px)",
            fontWeight: 500,
            opacity: 0.95,
          }}
        >
          Meet and Greet Car Hire
        </p>

        <p
          style={{
            margin: 0,
            fontSize: "18px",
            lineHeight: 1.7,
            opacity: 0.9,
          }}
        >
          Customer platform coming soon.
        </p>
      </div>
    </main>
  );
}