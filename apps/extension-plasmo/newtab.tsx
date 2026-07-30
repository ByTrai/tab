function NewTab() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: 48,
        fontFamily: "Georgia, 'Times New Roman', serif",
        background: "linear-gradient(160deg, #f7f3ec 0%, #e8eef5 100%)",
        color: "#1a1a1a",
      }}
    >
      <p
        style={{
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          fontSize: 12,
        }}
      >
        Tabby
      </p>
      <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", margin: "8px 0 12px" }}>
        Plasmo new-tab shell
      </h1>
      <p style={{ maxWidth: 560, fontSize: 18, lineHeight: 1.5 }}>
        This page proves Plasmo can override the new tab. Organize UI remains on
        the production extension until ADR-0003 cutover.
      </p>
      <p style={{ marginTop: 24, fontSize: 14 }}>
        <a href="https://github.com/ByTrai/tab">Open the repo</a> · production
        path: <code>apps/extension</code>
      </p>
    </main>
  );
}

export default NewTab;
