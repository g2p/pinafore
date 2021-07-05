import { auth, basename } from './utils.js'
import { post, WRITE_TIMEOUT } from '../_utils/ajax.js'

export function setShowReblogs (instanceName, accessToken, accountId, showReblogs) {
  const url = `${basename(instanceName)}/api/v1/accounts/${accountId}/follow`
  return post(url, { reblogs: !!showReblogs }, auth(accessToken), { timeout: WRITE_TIMEOUT })
}
