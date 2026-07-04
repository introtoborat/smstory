import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorized, notFound, forbidden } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth";
import { serializeStory, storyLookupInclude } from "@/lib/story-view";
import PDFDocument from "pdfkit";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from "docx";

// GET /api/export/[id]?format=pdf|docx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requirePermission("export.run");
    if (!user) return forbidden();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "pdf";

    const story = await prisma.story.findUnique({
      where: { id },
      include: {
        ...storyLookupInclude,
        pages: { orderBy: { pageNumber: "asc" } },
      },
    });

    if (!story) return notFound("Story not found");

    const exportStory = serializeStory(story);

    if (format === "docx") {
      return exportDocx(exportStory);
    }

    return exportPdf(exportStory);
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function exportPdf(story: {
  title: string;
  ageGroup: string;
  genre: string;
  characterGender: string;
  pages: {
    pageNumber: number;
    storyText: string;
    sceneDescription: string | null;
    imagePrompt: string | null;
    notes: string | null;
  }[];
}): Promise<NextResponse> {
  const chunks: Buffer[] = [];

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: story.title,
      Author: "StoryDB",
    },
  });

  // Collect PDF data into buffer
  const pdfPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // Title
  doc.fontSize(22).font("Helvetica-Bold").text(story.title, { align: "center" });
  doc.moveDown(0.5);

  // Metadata
  doc.fontSize(10).font("Helvetica").fillColor("#666666");
  const metadata = `Age Group: ${story.ageGroup}  |  Genre: ${story.genre}  |  Character Gender: ${story.characterGender}  |  Pages: ${story.pages.length}`;
  doc.text(metadata, { align: "center" });
  doc.moveDown(0.5);

  // Separator
  doc
    .strokeColor("#cccccc")
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke();
  doc.moveDown(1);

  // Pages
  for (const page of story.pages) {
    // Check if we need a new page (if less than 100pt remaining)
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    // Page header
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#333333");
    doc.text(`Page ${page.pageNumber}`);
    doc.moveDown(0.3);

    // Scene description
    if (page.sceneDescription) {
      doc.fontSize(9).font("Helvetica-Oblique").fillColor("#888888");
      doc.text(`Scene: ${page.sceneDescription}`);
      doc.moveDown(0.3);
    }

    // Story text
    doc.fontSize(11).font("Helvetica").fillColor("#222222");
    doc.text(page.storyText, { lineGap: 3 });
    doc.moveDown(0.8);
  }

  doc.end();

  const pdfBuffer = await pdfPromise;

  const filename = `${story.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}

async function exportDocx(story: {
  title: string;
  ageGroup: string;
  genre: string;
  characterGender: string;
  pages: {
    pageNumber: number;
    storyText: string;
    sceneDescription: string | null;
    imagePrompt: string | null;
    notes: string | null;
  }[];
}): Promise<NextResponse> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: story.title,
          bold: true,
          size: 44,
          font: "Calibri",
        }),
      ],
      spacing: { after: 200 },
      alignment: "center",
    }),
  );

  // Metadata
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Age Group: ${story.ageGroup}  |  Genre: ${story.genre}  |  Character Gender: ${story.characterGender}  |  Pages: ${story.pages.length}`,
          size: 20,
          color: "666666",
          italics: true,
        }),
      ],
      spacing: { after: 400 },
      alignment: "center",
    }),
  );

  // Separator
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "─".repeat(50), color: "CCCCCC" })],
      spacing: { after: 400 },
      alignment: "center",
    }),
  );

  // Pages
  for (const page of story.pages) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Page ${page.pageNumber}`,
            bold: true,
            size: 28,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }),
    );

    if (page.sceneDescription) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Scene: ${page.sceneDescription}`,
              italics: true,
              size: 18,
              color: "888888",
            }),
          ],
          spacing: { after: 100 },
        }),
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: page.storyText,
            size: 22,
          }),
        ],
        spacing: { after: 200 },
      }),
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const docxBuffer = await Packer.toBuffer(doc);

  const filename = `${story.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.docx`;
  return new NextResponse(new Uint8Array(docxBuffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": docxBuffer.byteLength.toString(),
    },
  });
}
