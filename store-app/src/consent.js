// Cookie consent. Google signals start DENIED on every page and are only switched on after the visitor accepts.
// Essential cookies (login, cart, checkout) are not affected. The choice is kept in this browser only.
export const CONSENT_KEY = 'wc_consent';
export const CONSENT_HEAD = `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{'ad_storage':'denied','analytics_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','wait_for_update':500});
try{if(localStorage.getItem('${CONSENT_KEY}')==='granted')gtag('consent','update',{'ad_storage':'granted','analytics_storage':'granted','ad_user_data':'granted','ad_personalization':'granted'})}catch(e){}</script>`;
