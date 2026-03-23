export const ipFraudScoreKey = (ip: string): string => `ip:fraud-score:${ip}`;
export const phoneFraudScoreKey = (phone: string): string =>
  `phone:fraud-score:${phone}`;
