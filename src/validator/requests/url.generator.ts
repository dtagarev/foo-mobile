export class UrlGenerator {
  private static baseUrl: string = 'https://ipqualityscore.com/api/json';

  static getUrlForIp(apiToken: string, ip: string): string {
    return `${this.baseUrl}/ip/${apiToken}/${ip}`;
  }

  static getUrlForPhone(apiToken: string, phone: string): string {
    return `${this.baseUrl}/phone/${apiToken}/${phone}`;
  }
}
