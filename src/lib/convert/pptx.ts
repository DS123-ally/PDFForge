import JSZip from "jszip";

import type { ConvertPage } from "@/lib/convert/layout";
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
const slideWidth = 12192000;
const slideHeight = 6858000;

export async function buildPptx(pages: readonly ConvertPage[], title: string) {
  const zip = new JSZip();
  const slideOverrides: string[] = [];
  const presentationRels = [
    {
      id: "rId1",
      target: "slideMasters/slideMaster1.xml",
      type: `${officeRel}/slideMaster`,
    },
  ];

  pages.forEach((page, index) => {
    const slideNumber = index + 1;
    const relId = `rId${slideNumber + 1}`;
    presentationRels.push({
      id: relId,
      target: `slides/slide${slideNumber}.xml`,
      type: `${officeRel}/slide`,
    });
    slideOverrides.push(
      `  <Override PartName="/ppt/slides/slide${slideNumber}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`,
    );
    zip.file(`ppt/slides/slide${slideNumber}.xml`, slideXml(page));
    zip.file(
      `ppt/slides/_rels/slide${slideNumber}.xml.rels`,
      relationshipsXml([
        {
          id: "rId1",
          target: "../slideLayouts/slideLayout1.xml",
          type: `${officeRel}/slideLayout`,
        },
        ...(page.png
          ? [
              {
                id: "rId2",
                target: `../media/image${slideNumber}.png`,
                type: `${officeRel}/image`,
              },
            ]
          : []),
      ]),
    );

    if (page.png) {
      zip.file(`ppt/media/image${slideNumber}.png`, page.png);
    }
  });

  zip.file(
    "[Content_Types].xml",
    contentTypesXml([
      `  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>`,
      `  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>`,
      `  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>`,
      `  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`,
      ...slideOverrides,
      `  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,
      `  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`,
    ]),
  );
  zip.file(
    "_rels/.rels",
    relationshipsXml([
      {
        id: "rId1",
        target: "ppt/presentation.xml",
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
    "ppt/_rels/presentation.xml.rels",
    relationshipsXml(presentationRels),
  );
  zip.file(
    "ppt/presentation.xml",
    xmlDocument(
      `<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
${pages
  .map(
    (_, index) => `    <p:sldId id="${256 + index}" r:id="rId${index + 2}"/>`,
  )
  .join("\n")}
  </p:sldIdLst>
  <p:sldSz cx="${slideWidth}" cy="${slideHeight}"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
    ),
  );
  zip.file("ppt/slideMasters/slideMaster1.xml", slideMasterXml());
  zip.file(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    relationshipsXml([
      {
        id: "rId1",
        target: "../slideLayouts/slideLayout1.xml",
        type: `${officeRel}/slideLayout`,
      },
      {
        id: "rId2",
        target: "../theme/theme1.xml",
        type: `${officeRel}/theme`,
      },
    ]),
  );
  zip.file("ppt/slideLayouts/slideLayout1.xml", slideLayoutXml());
  zip.file(
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    relationshipsXml([
      {
        id: "rId1",
        target: "../slideMasters/slideMaster1.xml",
        type: `${officeRel}/slideMaster`,
      },
    ]),
  );
  zip.file("ppt/theme/theme1.xml", themeXml());
  zip.file("docProps/core.xml", corePropertiesXml(title));
  zip.file("docProps/app.xml", appPropertiesXml("PDFForge"));

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function slideXml(page: ConvertPage) {
  const picture = page.png ? pictureShape(page) : "";
  const text = page.png
    ? ""
    : textShape(
        page.lines.map((line) => line.text).join("\n") ||
          `(No selectable text on page ${page.pageNumber}.)`,
      );

  return xmlDocument(
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      ${groupShapeHeader()}
      ${picture}
      ${text}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`,
  );
}

function groupShapeHeader() {
  return `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="${slideWidth}" cy="${slideHeight}"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="${slideWidth}" cy="${slideHeight}"/>
        </a:xfrm>
      </p:grpSpPr>`;
}

function pictureShape(page: ConvertPage) {
  const fitted = fitImage(page.width, page.height);

  return `<p:pic>
        <p:nvPicPr>
          <p:cNvPr id="2" name="Page ${page.pageNumber}"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rId2"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm>
            <a:off x="${fitted.x}" y="${fitted.y}"/>
            <a:ext cx="${fitted.width}" cy="${fitted.height}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>`;
}

function textShape(text: string) {
  const paragraphs = text
    .split("\n")
    .map(
      (line) =>
        `<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${escapeXml(line || " ")}</a:t></a:r></a:p>`,
    )
    .join("");

  return `<p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Text"/>
          <p:cNvSpPr txBox="1"/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="457200" y="457200"/>
            <a:ext cx="11277600" cy="5943600"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
        <p:txBody>
          <a:bodyPr wrap="square"/>
          <a:lstStyle/>
          ${paragraphs}
        </p:txBody>
      </p:sp>`;
}

function fitImage(width: number, height: number) {
  const ratio = width / Math.max(height, 1);
  const slideRatio = slideWidth / slideHeight;
  let fittedWidth = slideWidth;
  let fittedHeight = slideHeight;

  if (ratio > slideRatio) {
    fittedHeight = Math.round(slideWidth / ratio);
  } else {
    fittedWidth = Math.round(slideHeight * ratio);
  }

  return {
    height: fittedHeight,
    width: fittedWidth,
    x: Math.round((slideWidth - fittedWidth) / 2),
    y: Math.round((slideHeight - fittedHeight) / 2),
  };
}

function slideMasterXml() {
  return xmlDocument(
    `<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      ${groupShapeHeader()}
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`,
  );
}

function slideLayoutXml() {
  return xmlDocument(
    `<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${officeRel}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      ${groupShapeHeader()}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`,
  );
}

function themeXml() {
  return xmlDocument(
    `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="PDFForge">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:srgbClr val="000000"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="DC2626"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`,
  );
}
