import { getStore } from '@netlify/blobs';
import { handleAgent } from '../../server/agent.mjs';
import { blobReceipts } from '../../server/receipts.mjs';
const receipts = blobReceipts(() =>
  getStore({ name: 'portfolio-intake-receipts', consistency: 'strong' }),
);
export default (request) => handleAgent(request, { receipts });
export const config = { path: '/api/*' };
