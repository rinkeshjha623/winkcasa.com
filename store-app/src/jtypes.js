// Keyword-led jewellery landing pages. Each one targets a real buying search in India (Google Keyword Planner, India).
// "match" decides which Jewellery products belong on the page; pages with fewer than 3 products are not served.
export const JTYPES = {
  'earrings-for-women': {
    h1: 'Earrings for Women', short: 'Earrings', gcat: 'Apparel & Accessories > Jewelry > Earrings',
    title: 'Earrings for Women Online in India | Studs & Hoops',
    desc: 'Buy earrings for women online in India: stud, hoop, drop and pearl earrings from ₹309. Free delivery above ₹999 and 7-day returns for damaged items.',
    match: (n) => /earring|\bstuds?\b|\bhoops?\b|jhumka|dangle/i.test(n),
    intro: ['Earrings are the easiest way to change a look, and they are what most people search for first. This page brings together stud earrings, hoop earrings, drop and dangle earrings and pearl earrings for women, from about ₹309.',
      'Studs and small hoops suit office and everyday wear. Drop and dangle earrings suit festive outfits, kurtis and sarees. Each product page lists the material and size, so you know what you are buying.'],
    faqs: [['Which earrings are best for daily wear?', 'Small studs and light hoops. They are comfortable all day and go with both western and Indian outfits.'],
      ['Which earrings suit a saree or kurti?', 'Drop and dangle earrings, and pearl drops, add shape next to ethnic wear. Keep the necklace simple when the earrings are large.'],
      ['How do I stop earrings from tarnishing?', 'Put them on last, after perfume and lotion, wipe with a soft cloth after wearing, and store each pair in its own pouch. Stainless steel pieces are the most tarnish resistant.']],
  },
  'pearl-earrings': {
    h1: 'Pearl Earrings', short: 'Pearl earrings', gcat: 'Apparel & Accessories > Jewelry > Earrings',
    title: 'Pearl Earrings Online in India | Studs & Drops',
    desc: 'Shop pearl earrings online in India: pearl studs, pearl drops and zirconia pearl earrings for women from ₹309. 7-day returns for damaged or wrong items.',
    match: (n) => /pearl/i.test(n) && /earring|\bstuds?\b/i.test(n),
    intro: ['Pearl earrings go with almost everything, from a work shirt to a saree. This collection has pearl studs for everyday wear and pearl drops, bow and flower designs for weddings and festive evenings.',
      'The pieces here are fashion jewellery with simulated or mother-of-pearl pearls, so they are light to wear and priced for regular use. The material is written on each product page.'],
    faqs: [['How do I wear pearl earrings every day?', 'Choose small studs. Pair them with a thin chain or no necklace, and keep the rest of the look simple.'],
      ['Which pearl earrings suit a round face?', 'Drop pearl earrings, because the length makes the face look longer. Small studs also work.'],
      ['How do I clean pearl earrings?', 'Wipe them with a soft, slightly damp cloth, dry them, and keep them away from perfume and water.']],
  },
  'stud-earrings': {
    h1: 'Stud Earrings for Women', short: 'Stud earrings', gcat: 'Apparel & Accessories > Jewelry > Earrings',
    title: 'Stud Earrings for Women Online in India',
    desc: 'Buy stud earrings for women online in India: pearl, zirconia, star and flower studs from ₹309. Free delivery above ₹999, 7-day returns for damaged items.',
    match: (n) => /\bstuds?\b/i.test(n),
    intro: ['Stud earrings are small, light and comfortable enough to wear all day. This page lists pearl, zirconia, flower, star and bow studs for women.',
      'Studs are the safest choice for office, college and travel. A pair with a pearl or a small stone works with both western and Indian outfits.'],
    faqs: [['Which studs are best for everyday wear?', 'Small pearl or zirconia studs. They are light and look neat with any outfit.'],
      ['Can I sleep in stud earrings?', 'It is better to take them out at night, so they stay clean and the backs do not press into your ear.']],
  },
  'hoop-earrings': {
    h1: 'Hoop Earrings for Women', short: 'Hoop earrings', gcat: 'Apparel & Accessories > Jewelry > Earrings',
    title: 'Hoop Earrings for Women Online in India',
    desc: 'Shop hoop earrings for women online in India: big, small and pearl hoops from ₹309. Free delivery above ₹999 and 7-day returns for damaged items.',
    match: (n) => /\bhoops?\b/i.test(n),
    intro: ['Hoop earrings frame the face and go with jeans, dresses and kurtis. This collection has big hoops, small hoops and hoops with pearls or stones.',
      'Large hoops work best when the rest of the look is simple. Small hoops are the easy choice for daily wear.'],
    faqs: [['Which hoop size should I pick?', 'Small hoops for daily wear, medium for dresses and kurtis, and large hoops when you want the earrings to be the statement.'],
      ['Are hoop earrings heavy?', 'Large hoops can feel heavy. Check the size on the product page, and choose a hollow or light design if you plan to wear them for long.']],
  },
  'necklaces-for-women': {
    h1: 'Necklaces for Women', short: 'Necklaces', gcat: 'Apparel & Accessories > Jewelry > Necklaces',
    title: 'Necklaces for Women Online in India | Pendant & Layered',
    desc: 'Buy necklaces for women online in India: pendant, layered, choker, pearl and stainless steel chains from ₹309. 7-day returns for damaged items.',
    match: (n) => /necklace|choker|\bchain\b(?!.*bracelet)/i.test(n) && !/bracelet|anklet/i.test(n),
    intro: ['Find pendant necklaces, layered necklaces, chokers, pearl necklaces and stainless steel chains for women. Prices start at about ₹309.',
      'A single pendant suits a round neckline, a choker suits an off-shoulder or V-neck top, and a layered chain suits plain t-shirts. Stainless steel chains are the most tarnish resistant here.'],
    faqs: [['Which necklace is best for daily wear?', 'A thin pendant or chain in stainless steel. It is light, easy to match and does not need much care.'],
      ['What necklace goes with a V-neck?', 'A short pendant that follows the V, or a layered chain, looks balanced.'],
      ['How do I keep necklaces from tangling?', 'Fasten the clasp after each wear and store each necklace flat or hung separately.']],
  },
  'bracelets-for-women': {
    h1: 'Bracelets for Women', short: 'Bracelets', gcat: 'Apparel & Accessories > Jewelry > Bracelets',
    title: 'Bracelets for Women Online in India | Charm & Chain',
    desc: 'Shop bracelets for women online in India: charm, chain, pearl, bangle and beaded bracelets from ₹309. 7-day returns for damaged items.',
    match: (n) => /bracelet|bangle/i.test(n),
    intro: ['Charm bracelets, chain bracelets, beaded bracelets, pearl bracelets and bangle bracelets for women, from about ₹309.',
      'A thin chain bracelet suits office wear, a beaded bracelet suits casual outfits, and a pearl or gold-tone bracelet suits festive wear. Check the length on the product page, and most chains have an adjustable clasp.'],
    faqs: [['How do I find my bracelet size?', 'Measure around your wrist and add about 1.5 cm. Most chain bracelets here have an extender, so they adjust.'],
      ['Which bracelet is best for everyday wear?', 'A stainless steel chain or beaded bracelet. They are light and handle daily wear well.']],
  },
  'rings-for-women': {
    h1: 'Rings for Women', short: 'Rings', gcat: 'Apparel & Accessories > Jewelry > Rings',
    title: 'Rings for Women Online in India | Adjustable & Steel',
    desc: 'Buy rings for women online in India: adjustable open rings, stainless steel band rings and ring sets from ₹309. 7-day returns for damaged items.',
    match: (n) => /\brings?\b/i.test(n) && !/lanyard|duck call/i.test(n),
    intro: ['Adjustable open rings, stainless steel band rings, couple rings and ring sets, from about ₹309.',
      'Open and adjustable rings fit most fingers, so they are the easiest to buy online. For band rings, measure your finger or an existing ring and compare it with the size on the product page.'],
    faqs: [['How do I find my ring size?', 'Wrap a thin strip of paper around the finger, mark where it overlaps, measure the length in mm and compare it with the size guide on the product page.'],
      ['Are stainless steel rings good for daily wear?', 'Yes. Stainless steel is hard-wearing and does not rust or tarnish easily.']],
  },
  'anklets-for-women': {
    h1: 'Anklets for Women', short: 'Anklets', gcat: 'Apparel & Accessories > Jewelry > Anklets',
    title: 'Anklets for Women Online in India | Payal & Chain',
    desc: 'Shop anklets for women online in India: tassel, heart and bohemian chain anklets from ₹309. Free delivery above ₹999, 7-day returns for damaged items.',
    match: (n) => /anklet|foot chain/i.test(n),
    intro: ['Chain anklets, tassel anklets and bohemian anklet sets for women, from about ₹309.',
      'Anklets look best with open footwear, cropped trousers and dresses. Choose an adjustable chain so it fits your ankle comfortably.'],
    faqs: [['How do I choose an anklet size?', 'Measure your ankle and add about 2 cm. Most chain anklets here come with an extender.']],
  },
};
export const JTYPE_ORDER = Object.keys(JTYPES);
// Type of a jewellery product by name, most specific first. Used for feed product_type and Google category.
export function jtypeOf(name) {
  const n = String(name || '');
  if (/anklet|foot chain/i.test(n)) return 'anklets-for-women';
  if (/bracelet|bangle/i.test(n)) return 'bracelets-for-women';
  if (/earring|\bstuds?\b|\bhoops?\b|jhumka|dangle/i.test(n)) return 'earrings-for-women';
  if (/necklace|choker|\bchain\b/i.test(n)) return 'necklaces-for-women';
  if (/\brings?\b/i.test(n)) return 'rings-for-women';
  return '';
}
