import JSZip from "jszip";

import { looksLikeTable, type ConvertPage } from "@/lib/convert/layout";
import {
  appPropertiesXml,
  contentTypesXml,
  corePropertiesXml,
  escapeXml,
  relationshipsXml,
  xmlDocument,
} from "@/lib/convert/xml";

const officeRel =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const packageRel =
  "http://schemas.openxmlformats.org/package/2006/relationships";

export async function buildDocx(pages: readonly ConvertPage[], title: string) {
  const zip = new JSZip();
  const imageRels: string[] = [];
  const body: string[] = [];
  let imageCount = 0;

  for (const page of pages) {
    body.push(paragraph(`Page ${page.pageNumber}`, true));

    if (page.png && page.png.length > 0) {
      imageCount += 1;
      const name = `image${imageCount}.png`;
      zip.file(`word/media/${name}`, page.png);
      imageRels.push(
        `  <Relationship Id="rIdImg${imageCount}" Type="${officeRel}/image" Target="media/${name}"/>`,
      );
      body.push(drawingParagraph(imageCount, page.width, page.height));
    }

    if (looksLikeTable(page.lines)) {
      body.push(wordTable(page.lines.map((line) => line.cells)));
    } else if (page.lines.length === 0) {
      body.push(paragraph("(No selectable text on this page.)"));
    } else {
      for (const line of page.lines) {
        body.push(paragraph(line.text));
      }
    }
  }

  body.push(
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0"/></w:sectPr>`,
  );

  zip.file(
    "[Content_Types].xml",
    contentTypesXml([
      `  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>`,
      `  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>`,
      `  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,
      `  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`,
    ]),
  );
  zip.file(
    "_rels/.rels",
    relationshipsXml([
      {
        id: "rId1",
        target: "word/document.xml",
        type: `${officeRel}/officeDocument`,
      },
      {
        id: "rId2",
        target: "docProps/core.xml",
        type: `${packageRel}/metadata/core-properties`,
      },
      {
        id: "rId3",
        target: "docProps/app.xml",
        type: `${officeRel}/extended-properties`,
      },
    ]),
  );
  zip.file(
    "word/_rels/document.xml.rels",
    xmlDocument(
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="${officeRel}/styles" Target="styles.xml"/>
${imageRels.join("\n")}
</Relationships>`,
    ),
  );
  zip.file(
    "word/document.xml",
    xmlDocument(
      `<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="${officeRel}" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
${body.join("\n")}
  </w:body>
</w:document>`,
    ),
  );
  zip.file(
    "word/styles.xml",
    xmlDocument(
      `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>`,
    ),
  );
  zip.file("docProps/core.xml", corePropertiesXml(title));
  zip.file("docProps/app.xml", appPropertiesXml("PDFForge"));

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function paragraph(text: string, heading = false) {
  const size = heading ? 28 : 22;
  return `<w:p><w:pPr><w:spacing w:after="120"/><w:rPr><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${heading ? "<w:b/>" : ""}</w:rPr></w:pPr><w:r><w:rPr><w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${heading ? "<w:b/>" : ""}</w:rPr>${textRun(text)}</w:r></w:p>`;
}

function textRun(text: string) {
  return `<w:t xml:space="preserve">${escapeXml(text)}</w:t>`;
}

function wordTable(rows: readonly string[][]) {
  const columnCount = Math.max(1, ...rows.map((row) => row.length));
  const grid = Array.from(
    { length: columnCount },
    () => `<w:gridCol w:w="${Math.floor(10080 / columnCount)}"/>`,
  ).join("");
  const body = rows
    .map((row) => {
      const cells = Array.from({ length: columnCount }, (_, index) => {
        const value = row[index] ?? "";
        return `<w:tc><w:tcPr><w:tcW w:w="${Math.floor(10080 / columnCount)}" w:type="dxa"/></w:tcPr><w:p><w:r>${textRun(value)}</w:r></w:p></w:tc>`;
      }).join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");

  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/><w:left w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/><w:right w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/></w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`;
}

function drawingParagraph(index: number, width: number, height: number) {
  const maxWidth = 5486400;
  const ratio = height / Math.max(width, 1);
  const cx = maxWidth;
  const cy = Math.round(maxWidth * ratio);

  return `<w:p><w:r>
  <w:drawing>
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${cx}" cy="${cy}"/>
      <wp:docPr id="${index}" name="Page picture ${index}"/>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr>
              <pic:cNvPr id="0" name="image${index}.png"/>
              <pic:cNvPicPr/>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="rIdImg${index}"/>
              <a:stretch><a:fillRect/></a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="${cx}" cy="${cy}"/>
              </a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing>
</w:r></w:p>`;
}
