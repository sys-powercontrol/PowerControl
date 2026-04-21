export function generatePixPayload(
  pixKey: string,
  amount: number,
  merchantName: string = "EMPRESA",
  merchantCity: string = "CIDADE",
  txid: string = "***"
): string {
  // Helpers
  const formatStr = (id: string, value: string) => {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  const payloadFormatIndicator = "000201";
  const merchantAccountInfo = `0014br.gov.bcb.pix01${pixKey.length.toString().padStart(2, '0')}${pixKey}`;
  const merchantAccountFormat = formatStr("26", merchantAccountInfo);
  const merchantCategoryCode = "52040000";
  const transactionCurrency = "5303986";
  const transactionAmount = formatStr("54", amount.toFixed(2));
  const countryCode = "5802BR";
  const mName = formatStr("59", merchantName.substring(0, 25).toUpperCase());
  const mCity = formatStr("60", merchantCity.substring(0, 15).toUpperCase());
  const additionalData = formatStr("62", formatStr("05", txid));

  const payload = `${payloadFormatIndicator}${merchantAccountFormat}${merchantCategoryCode}${transactionCurrency}${amount > 0 ? transactionAmount : ''}${countryCode}${mName}${mCity}${additionalData}6304`;

  // CRC16 CCITT16 (polynomial 0x1021)
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  const crcStr = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');

  return `${payload}${crcStr}`;
}
