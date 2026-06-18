export const MAX_CV_BYTES = 5 * 1024 * 1024;

const CV_TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

const ALLOWED_CV_TYPES = new Set(Object.values(CV_TYPES_BY_EXTENSION));

export function validateCvFile(file: File): string {
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  const inferredType = CV_TYPES_BY_EXTENSION[extension];
  const fileType = ALLOWED_CV_TYPES.has(file.type) ? file.type : inferredType;

  if (!fileType || !ALLOWED_CV_TYPES.has(fileType)) {
    throw new Error("Upload a PDF, DOCX, or TXT CV.");
  }
  if (file.size === 0 || file.size > MAX_CV_BYTES) {
    throw new Error("CV files must be between 1 byte and 5 MB.");
  }
  return fileType;
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("The selected CV could not be read."));
    reader.readAsDataURL(file);
  });
}
