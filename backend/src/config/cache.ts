import NodeCache from 'node-cache';

export const weatherCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
