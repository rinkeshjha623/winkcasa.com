import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSENT_HEAD, CONSENT_KEY } from '../../src/consent.js';
import { headTags, footerHtml } from '../../src/seo.js';
import { DEFAULTS } from '../../src/store.js';

test('consent defaults to denied for every Google signal', () => {
  for (const k of ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']) assert.match(CONSENT_HEAD, new RegExp(k + "'?:\\s*'denied'"));
});
test('consent default is set BEFORE Google Tag Manager and the Ads tag load', () => {
  const html = headTags({ title: 't', description: 'd', canonical: 'https://www.winkcasa.com/' });
  const iDefault = html.indexOf("'consent','default'"), iGtm = html.indexOf('gtm.js'), iAds = html.indexOf('gtag/js?id=AW-');
  assert.ok(iDefault > -1 && iGtm > -1 && iAds > -1);
  assert.ok(iDefault < iGtm && iDefault < iAds);
});
test('a stored "granted" choice is restored on later visits', () => {
  assert.equal(CONSENT_KEY, 'wc_consent');
  assert.match(CONSENT_HEAD, /wc_consent/);
  assert.match(CONSENT_HEAD, /'consent','update'/);
});
test('footer has a Cookie settings control to change the choice', () => {
  assert.match(footerHtml(DEFAULTS, []), /data-cookie-settings/);
});
