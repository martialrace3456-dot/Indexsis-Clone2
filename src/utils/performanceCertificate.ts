import logoUrl from "@/assets/indexsis-logo-transparent.png";
import { certificateIssueDate, certificateMetrics, type CertificateData } from "./performanceStats";

let logoPromise: Promise<HTMLImageElement> | undefined;
function getLogo() {
  logoPromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { logoPromise = undefined; reject(new Error("The certificate logo could not be loaded.")); };
    image.src = logoUrl;
  });
  return logoPromise;
}

export async function generatePerformanceCertificate(data: CertificateData): Promise<Blob> {
  const logo = await getLogo();
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 1275;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Certificate generation is unavailable in this browser.");
  const tokens = getComputedStyle(document.documentElement);
  const color = (token: string) => `hsl(${tokens.getPropertyValue(token).trim()})`;
  const background = color("--certificate-background");
  const accent = color("--certificate-accent");
  const muted = color("--certificate-muted");
  const foreground = color("--certificate-foreground");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Symmetric fine circuit traces, kept behind the personalized content.
  ctx.strokeStyle = color("--certificate-trace");
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 22; i++) {
    for (const side of [1, -1]) {
      const x = side === 1 ? 30 + i * 20 : 1770 - i * 20;
      const bend = 200 + i * 14;
      ctx.beginPath(); ctx.moveTo(x, 15); ctx.lineTo(x, bend);
      ctx.lineTo(x + side * 125, bend + 125); ctx.lineTo(x + side * 125, 550 + i * 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 1260); ctx.lineTo(x, 1080 - i * 9);
      ctx.lineTo(x + side * 100, 980 - i * 9); ctx.lineTo(x + side * 100, 890 - i * 9); ctx.stroke();
    }
  }
  ctx.strokeStyle = accent; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(10, 10, 1780, 1255, 28); ctx.stroke();

  // Bundled logo is already transparent and light-inked for dark backgrounds.
  const logoW = 1000, logoH = Math.min(260, logoW * logo.naturalHeight / logo.naturalWidth);
  const drawW = logoH * logo.naturalWidth / logo.naturalHeight;
  ctx.drawImage(logo, 900 - drawW / 2, 70, drawW, logoH);
  ctx.textAlign = "center";
  function text(value: string, y: number, size: number, ink: string, font = "Arial", weight = "normal", maxWidth = 1550) {
    ctx.fillStyle = ink;
    let fitted = size;
    ctx.font = `${weight} ${fitted}px ${font}`;
    while (ctx.measureText(value).width > maxWidth && fitted > 16) { fitted--; ctx.font = `${weight} ${fitted}px ${font}`; }
    ctx.fillText(value, 900, y);
  }
  text("THE GLOBAL ESTIMATOR CHALLENGE", 365, 32, muted, "Arial", "bold");
  text("CERTIFICATE OF PERFORMANCE", 465, 30, accent, "Arial", "bold");
  text("This is proudly presented to", 540, 32, muted, "Arial", "italic");
  text(data.playerName, 655, 76, foreground, "Georgia", "bold");
  ctx.strokeStyle = color("--certificate-trace"); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(440, 687); ctx.lineTo(1360, 687); ctx.stroke();
  text("for demonstrating exceptional precision in", 758, 32, muted, "Arial", "italic");
  text(data.contestName, 838, 45, accent, "Arial", "bold");
  const metrics = certificateMetrics(data);
  const width = 1360, gap = 36, boxWidth = (width - gap * (metrics.length - 1)) / metrics.length;
  metrics.forEach((metric, index) => {
    const x = 220 + index * (boxWidth + gap);
    ctx.fillStyle = color("--certificate-panel"); ctx.strokeStyle = color("--certificate-trace");
    ctx.beginPath(); ctx.roundRect(x, 905, boxWidth, 165, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = "bold 27px Arial"; ctx.fillText(metric.label, x + boxWidth / 2, 960);
    ctx.fillStyle = accent; ctx.font = "bold 57px Arial"; ctx.fillText(metric.value, x + boxWidth / 2, 1030);
  });
  text("ISSUE DATE", 1150, 24, muted);
  text(certificateIssueDate(data.issuedAt), 1200, 29, foreground, "Arial", "bold");
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Certificate generation failed.")), "image/png"));
}