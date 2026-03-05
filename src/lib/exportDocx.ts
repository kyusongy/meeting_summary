import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

export async function exportSummaryAsDocx(summary: string, meetingDate: string): Promise<Blob> {
  const lines = summary.split("\n");
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: `Meeting Summary - ${meetingDate}`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Headings (check longest prefix first)
    if (trimmed.startsWith("### ")) {
      children.push(
        new Paragraph({
          text: trimmed.slice(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmed.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: trimmed.slice(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (trimmed.startsWith("# ")) {
      children.push(
        new Paragraph({
          text: trimmed.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 120 },
        })
      );
    }
    // Checklist items
    else if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ")) {
      const checked = trimmed.startsWith("- [x] ");
      const text = trimmed.slice(6);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: checked ? "\u2611 " : "\u2610 " }),
            ...parseBoldRuns(text),
          ],
          bullet: { level: 0 },
        })
      );
    }
    // Bullet points
    else if (trimmed.startsWith("- ")) {
      children.push(
        new Paragraph({
          children: parseBoldRuns(trimmed.slice(2)),
          bullet: { level: 0 },
        })
      );
    }
    // Regular text
    else {
      children.push(
        new Paragraph({
          children: parseBoldRuns(trimmed),
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

// Splits text on **bold** markers into alternating TextRuns
function parseBoldRuns(text: string): TextRun[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return new TextRun({ text: part.slice(2, -2), bold: true });
      }
      return new TextRun({ text: part });
    });
}
