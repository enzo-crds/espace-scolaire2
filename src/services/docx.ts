import mammoth from "mammoth";

/**
 * Convertit un fichier DOCX en HTML afin de pouvoir l'importer dans l'éditeur riche.
 * Limitation connue : la mise en page complexe (colonnes, en-têtes/pieds de page,
 * styles avancés) n'est pas conservée à 100%. Il s'agit d'une conversion "best effort".
 */
export async function convertDocxToHtml(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value;
}

export function isDocxFile(file: File): boolean {
  return (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.toLowerCase().endsWith(".docx")
  );
}

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}
