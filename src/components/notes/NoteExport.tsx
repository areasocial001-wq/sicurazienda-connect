import { useState, useCallback } from "react";
import { Note } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileText, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface NoteExportProps {
  note: Note;
}

const NoteExport = ({ note }: NoteExportProps) => {
  const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const htmlToMarkdown = (html: string): string => {
    let md = html;
    // Headers
    md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
    md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
    md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
    // Bold, italic, underline
    md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**");
    md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**");
    md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*");
    md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*");
    md = md.replace(/<u[^>]*>(.*?)<\/u>/gi, "_$1_");
    // Code
    md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`");
    md = md.replace(/<pre[^>]*>(.*?)<\/pre>/gis, "```\n$1\n```\n\n");
    // Lists
    md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
    md = md.replace(/<\/?[uo]l[^>]*>/gi, "\n");
    // Task lists
    md = md.replace(/<li[^>]*data-checked="true"[^>]*>(.*?)<\/li>/gi, "- [x] $1\n");
    md = md.replace(/<li[^>]*data-checked="false"[^>]*>(.*?)<\/li>/gi, "- [ ] $1\n");
    // Paragraphs & breaks
    md = md.replace(/<br\s*\/?>/gi, "\n");
    md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
    md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n\n");
    // Links
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
    // Strip remaining
    md = md.replace(/<[^>]+>/g, "");
    // Cleanup
    md = md.replace(/\n{3,}/g, "\n\n").trim();
    return md;
  };

  const exportMarkdown = () => {
    const md = `# ${note.title}\n\n${htmlToMarkdown(note.content)}`;
    const tags = note.tags.length > 0 ? `\n\n---\nTag: ${note.tags.join(", ")}` : "";
    const blob = new Blob([md + tags], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Nota esportata in Markdown");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(note.title, maxWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 8 + 5;

    // Tags
    if (note.tags.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text(`Tag: ${note.tags.join(", ")}`, margin, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
    }

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Content
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const plainText = stripHtml(note.content);
    const lines = doc.splitTextToSize(plainText, maxWidth);

    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 6;
    }

    doc.save(`${note.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
    toast.success("Nota esportata in PDF");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Esporta">
          <FileDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPDF}>
          <FileText className="h-4 w-4 mr-2" /> Esporta PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportMarkdown}>
          <Download className="h-4 w-4 mr-2" /> Esporta Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NoteExport;
