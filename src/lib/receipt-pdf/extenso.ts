const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function trio(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CENTENAS[c]);
  if (r) {
    if (r < 10) parts.push(UNI[r]);
    else if (r < 20) parts.push(DEZ_A_DEZENOVE[r - 10]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      parts.push(u ? `${DEZENAS[d]} e ${UNI[u]}` : DEZENAS[d]);
    }
  }
  return parts.join(" e ");
}

function intExtenso(n: number): string {
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const parts: string[] = [];
  if (milhoes) parts.push(`${milhoes === 1 ? "um milhão" : `${trio(milhoes)} milhões`}`);
  if (milhares) parts.push(`${milhares === 1 ? "mil" : `${trio(milhares)} mil`}`);
  if (resto) parts.push(trio(resto));
  return parts.join(" e ").replace(/\s+/g, " ").trim();
}

export function valorPorExtenso(valor: number): string {
  const round = Math.round(valor * 100);
  const reais = Math.floor(round / 100);
  const cent = round % 100;
  const txtReais = reais > 0 ? `${intExtenso(reais)} ${reais === 1 ? "real" : "reais"}` : "";
  const txtCent = cent > 0 ? `${intExtenso(cent)} ${cent === 1 ? "centavo" : "centavos"}` : "";
  if (txtReais && txtCent) return `${txtReais} e ${txtCent}`;
  return txtReais || txtCent || "zero real";
}
