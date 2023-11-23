export function getProductImageUrl(id: string): string {
  return `https://ws-na.amazon-adsystem.com/widgets/q?_encoding=UTF8&MarketPlace=US&ASIN=${id}&ServiceVersion=20070822&ID=AsinImage&WS=1&Format=SL250`;
}
