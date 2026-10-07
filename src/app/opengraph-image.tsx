import { ImageResponse } from "next/og";

export const alt =
  "PDFMantra online PDF editor, converter, signing, security and OCR tools";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "72px 80px",
        background:
          "radial-gradient(circle at 78% 42%, rgba(117,82,232,.24), transparent 34%), linear-gradient(135deg, #ffffff 0%, #f4f0ff 100%)",
        color: "#171327",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: "650px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            color: "#6b4cdd",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          PDFMantra
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 34,
            fontSize: 70,
            fontWeight: 700,
            letterSpacing: "-0.055em",
            lineHeight: 0.98,
          }}
        >
          <span>Documents, shaped</span>
          <span style={{ color: "#6f4de2" }}>beautifully.</span>
        </div>
        <p
          style={{
            marginTop: 30,
            fontSize: 27,
            lineHeight: 1.45,
            color: "#5f5a70",
          }}
        >
          Edit, convert, organize, compress, sign, protect and OCR PDFs online.
        </p>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          width: 330,
          height: 390,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 68,
            width: 220,
            height: 290,
            borderRadius: 30,
            background: "linear-gradient(145deg, #5633c5, #896def)",
            transform: "rotate(-14deg)",
            boxShadow: "0 28px 70px rgba(84,52,187,.22)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 18,
            display: "flex",
            flexDirection: "column",
            width: 235,
            height: 315,
            padding: 34,
            border: "1px solid rgba(106,76,205,.12)",
            borderRadius: 32,
            background: "#ffffff",
            transform: "rotate(10deg)",
            boxShadow: "0 28px 70px rgba(84,52,187,.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 54,
              height: 54,
              borderRadius: 16,
              background: "#6845d8",
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 45,
              color: "#6042c9",
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.25,
            }}
          >
            One document.
            <br />
            Every possibility.
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
