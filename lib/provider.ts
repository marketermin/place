// Future providers must document permission to collect AND retain daily rank history.
// No scraper, scheduler, API credentials, or automatic writes are implemented.
export interface VerifiedRankProvider {
 id:string;
 measure(input:{placeUrl:string;keyword:string;location:string;surface:string;excludeAds:true}):Promise<{rank:number|null;status:'measured'|'not_found'|'failed';measuredAt:string;providerReference:string}>;
}
export const automaticCollection = {enabled:false,reason:'데이터 이용 권한과 측정 기준 검증 전'} as const;

export function providerConfig() {
  return {
    enabled: process.env.RANK_PROVIDER_ENABLED === 'true',
    configured: Boolean(process.env.RANK_PROVIDER_BASE_URL && process.env.RANK_PROVIDER_API_KEY),
  } as const;
}
