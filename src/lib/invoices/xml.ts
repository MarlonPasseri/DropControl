import { InvoiceStatus, InvoiceType } from "@prisma/client";

export type ParsedInvoiceXml = {
  number: string;
  series?: string;
  accessKey?: string;
  type: InvoiceType;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate?: Date;
  amount: number;
  taxAmount?: number;
  notes?: string;
};

const TAG_PREFIX = String.raw`(?:[A-Za-z_][\w.-]*:)?`;

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal: string) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripCdata(value: string) {
  return value.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, "$1");
}

function getElementInner(xml: string, tag: string) {
  const match = new RegExp(
    `<${TAG_PREFIX}${tag}\\b[^>]*>([\\s\\S]*?)<\\/${TAG_PREFIX}${tag}>`,
    "i",
  ).exec(xml);

  return match ? match[1] : undefined;
}

function getElementAttribute(xml: string, tag: string, attribute: string) {
  const match = new RegExp(`<${TAG_PREFIX}${tag}\\b([^>]*)>`, "i").exec(xml);

  if (!match) {
    return undefined;
  }

  const attributeMatch = new RegExp(`${attribute}\\s*=\\s*(['"])(.*?)\\1`, "i").exec(match[1]);
  return attributeMatch ? decodeXmlEntities(attributeMatch[2].trim()) : undefined;
}

function getTagValue(xml: string, tag: string) {
  const value = getElementInner(xml, tag);
  return value ? decodeXmlEntities(stripCdata(value).trim()) : undefined;
}

function getTagValues(xml: string, tag: string) {
  const matches = xml.matchAll(
    new RegExp(
      `<${TAG_PREFIX}${tag}\\b[^>]*>([\\s\\S]*?)<\\/${TAG_PREFIX}${tag}>`,
      "gi",
    ),
  );

  return Array.from(matches, (match) => decodeXmlEntities(stripCdata(match[1]).trim())).filter(
    Boolean,
  );
}

function parseDecimal(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalizedValue =
    value.includes(",") && !value.includes(".") ? value.replace(",", ".") : value;
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function requireDecimal(value: string | undefined, fieldLabel: string) {
  const parsedValue = parseDecimal(value);

  if (parsedValue === undefined) {
    throw new Error(`Nao consegui ler ${fieldLabel} do XML da nota fiscal.`);
  }

  return parsedValue;
}

function parseXmlDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)
    ? new Date(`${normalizedValue}T00:00:00`)
    : new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapInvoiceType(tpNF: string | undefined) {
  if (tpNF === "0") {
    return InvoiceType.PURCHASE;
  }

  if (tpNF === "1") {
    return InvoiceType.SALE;
  }

  throw new Error("Nao consegui identificar se o XML e uma nota de compra ou venda.");
}

function mapInvoiceStatus(cStat: string | undefined) {
  if (!cStat) {
    return InvoiceStatus.ISSUED;
  }

  if (["101", "135", "151", "155"].includes(cStat)) {
    return InvoiceStatus.CANCELED;
  }

  if (["100", "150"].includes(cStat)) {
    return InvoiceStatus.ISSUED;
  }

  return InvoiceStatus.PENDING;
}

function buildNotes(xml: string) {
  const emitBlock = getElementInner(xml, "emit") ?? "";
  const destBlock = getElementInner(xml, "dest") ?? "";
  const ideBlock = getElementInner(xml, "ide") ?? "";
  const emitterName = getTagValue(emitBlock, "xNome");
  const recipientName = getTagValue(destBlock, "xNome");
  const operationNature = getTagValue(ideBlock, "natOp");
  const notes = ["Importada via XML"];

  if (emitterName) {
    notes.push(`Emitente: ${emitterName}`);
  }

  if (recipientName) {
    notes.push(`Destinatario: ${recipientName}`);
  }

  if (operationNature) {
    notes.push(`Operacao: ${operationNature}`);
  }

  return notes.join(" | ");
}

export function parseInvoiceXml(xml: string): ParsedInvoiceXml {
  const normalizedXml = xml.replace(/^\uFEFF/, "").trim();
  const infNFeBlock = getElementInner(normalizedXml, "infNFe");

  if (!infNFeBlock) {
    throw new Error("Envie um XML valido de NF-e para importar a nota fiscal.");
  }

  const ideBlock = getElementInner(infNFeBlock, "ide") ?? "";
  const totalsBlock = getElementInner(infNFeBlock, "ICMSTot") ?? "";
  const number = getTagValue(ideBlock, "nNF");
  const issueDate =
    parseXmlDate(getTagValue(ideBlock, "dhEmi")) ??
    parseXmlDate(getTagValue(ideBlock, "dEmi"));

  if (!number) {
    throw new Error("Nao consegui ler o numero da nota no XML informado.");
  }

  if (!issueDate) {
    throw new Error("Nao consegui ler a data de emissao no XML informado.");
  }

  const dueDate = getTagValues(infNFeBlock, "dVenc")
    .map((value) => parseXmlDate(value))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => left.getTime() - right.getTime())[0];
  const totalTax =
    parseDecimal(getTagValue(totalsBlock, "vTotTrib")) ??
    [
      "vICMS",
      "vST",
      "vFCP",
      "vIPI",
      "vII",
      "vPIS",
      "vCOFINS",
      "vIOF",
    ].reduce((sum, tag) => sum + (parseDecimal(getTagValue(totalsBlock, tag)) ?? 0), 0);
  const accessKeyFromId = getElementAttribute(normalizedXml, "infNFe", "Id");
  const accessKey =
    accessKeyFromId?.startsWith("NFe") ? accessKeyFromId.slice(3) : getTagValue(normalizedXml, "chNFe");

  return {
    number,
    series: getTagValue(ideBlock, "serie"),
    accessKey,
    type: mapInvoiceType(getTagValue(ideBlock, "tpNF")),
    status: mapInvoiceStatus(getTagValue(normalizedXml, "cStat")),
    issueDate,
    dueDate,
    amount: requireDecimal(getTagValue(totalsBlock, "vNF"), "o valor total"),
    taxAmount: totalTax > 0 ? totalTax : undefined,
    notes: buildNotes(infNFeBlock),
  };
}
