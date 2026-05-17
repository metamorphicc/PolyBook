declare module "qrcode" {
  type QrErrorCorrectionLevel = "low" | "medium" | "quartile" | "high" | "L" | "M" | "Q" | "H";

  type QrToStringOptions = {
    type?: "svg" | "utf8" | "terminal";
    errorCorrectionLevel?: QrErrorCorrectionLevel;
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  };

  const QRCode: {
    toString(text: string, options?: QrToStringOptions): Promise<string>;
  };

  export default QRCode;
}
