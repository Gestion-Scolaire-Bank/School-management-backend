import { useState, useRef, useEffect } from "react";
import { Palette, Download, Upload, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export default function DesignSamplePage() {
  const { t } = useI18n();
  const [schoolName, setSchoolName] = useState("Groupe Scolaire Bilingue");
  const [accentColor, setAccentColor] = useState("#0f4c81");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  const previewCanvasRef = useRef(null);

  // Convert hex to rgb
  const hexToRgb = (hex) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  };

  // Calculate luminance to decide text color (black/white contrast)
  const getContrastColor = (bgColorHex) => {
    const { r, g, b } = hexToRgb(bgColorHex);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 128 ? "#141414" : "#f0f0f0";
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  const textColor = getContrastColor(backgroundColor);

  // Render on canvas
  const drawCard = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, 640, 400);

    // Draw header band
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, 640, 70);

    // Draw header text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const headerTitle = schoolName ? `${schoolName}` : "SchoolManage";

    const drawTextAndLogo = (img = null) => {
      if (img) {
        ctx.drawImage(img, 15, 10, 50, 50);
        ctx.fillText(t("design.canvas.header", { school: headerTitle }), 80, 35);
      } else {
        ctx.fillText(t("design.canvas.header", { school: headerTitle }), 20, 35);
      }

      // Draw student mock details
      ctx.fillStyle = textColor;
      ctx.font = "16px sans-serif";
      ctx.fillText(t("design.canvas.name"), 20, 110);
      ctx.fillText(t("design.canvas.class"), 20, 145);
      ctx.fillText(t("design.canvas.dob"), 20, 180);
      ctx.fillText(t("design.canvas.cardNumber"), 20, 215);
      ctx.fillText(t("design.canvas.studentId"), 20, 250);
      ctx.fillText(t("design.canvas.validUntil"), 20, 285);

      // Draw student photo frame placeholder
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(480, 80, 120, 140);
      
      // Draw a subtle placeholder silhouette
      ctx.fillStyle = textColor;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(t("design.canvas.photoFrame"), 540, 145);
      ctx.fillText("(120 x 140)", 540, 165);

      // Draw QR Code frame placeholder
      ctx.strokeStyle = "#888888";
      ctx.strokeRect(480, 240, 120, 120);
      ctx.fillStyle = textColor;
      ctx.fillText(t("design.canvas.qr"), 540, 290);
      ctx.fillText(t("design.canvas.qrHint"), 540, 310);
    };

    if (logoUrl) {
      const img = new Image();
      img.onload = () => {
        drawTextAndLogo(img);
      };
      img.src = logoUrl;
    } else {
      drawTextAndLogo(null);
    }
  };

  useEffect(() => {
    drawCard(previewCanvasRef.current);
  }, [schoolName, accentColor, backgroundColor, logoUrl]);

  const handleDownload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 400;
    drawCard(canvas);
    
    // Wait slightly for image drawing to complete if asynchronous
    setTimeout(() => {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${schoolName.toLowerCase().replace(/\s+/g, "_")}_id_template.png`;
      a.click();
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("design.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("design.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Settings */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                {t("design.form.title")}
              </CardTitle>
              <CardDescription>{t("design.form.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="schoolName">{t("design.field.schoolName")}</Label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder={t("design.field.schoolName.placeholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accentColor">{t("design.field.accent")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-10 p-0 border-none cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="backgroundColor">{t("design.field.background")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-12 h-10 p-0 border-none cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logo">{t("design.field.logo")}</Label>
                <div className="flex items-center gap-4">
                  <Label
                    htmlFor="logo"
                    className="flex flex-col items-center justify-center border border-dashed border-border hover:bg-muted/50 transition-colors rounded-lg px-4 py-6 w-full cursor-pointer text-sm gap-2"
                  >
                    <Upload className="size-5 text-muted-foreground" />
                    <span>{t("design.field.logo.select")}</span>
                    {logoFile && (
                      <span className="text-xs text-primary font-medium truncate max-w-[200px]">
                        {logoFile.name}
                      </span>
                    )}
                  </Label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              </div>

              <Button onClick={handleDownload} className="w-full flex items-center justify-center gap-2">
                <Download className="size-4" />
                {t("design.download")}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 flex gap-3 text-sm text-primary">
              <ShieldCheck className="size-5 shrink-0" />
              <div>
                <p className="font-semibold">{t("design.note.title")}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {t("design.note.text")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Canvas */}
        <div className="lg:col-span-7 flex flex-col justify-start">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">{t("design.preview.title")}</CardTitle>
              <CardDescription>{t("design.preview.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center bg-muted/30 p-6 overflow-x-auto">
              <div className="border border-border shadow-lg rounded-md overflow-hidden bg-white shrink-0">
                <canvas
                  ref={previewCanvasRef}
                  width={640}
                  height={400}
                  className="w-[480px] h-[300px] md:w-[640px] md:h-[400px] block"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
