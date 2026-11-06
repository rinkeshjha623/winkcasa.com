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

  // ---- Hair & accessories ----
  'hair-claw-clips': {
    cat: 'Hair & accessories', h1: 'Hair Claw Clips for Women', short: 'Hair claw clips', gcat: 'Apparel & Accessories > Clothing Accessories > Hair Accessories',
    title: 'Hair Claw Clips for Women Online in India',
    desc: 'Buy hair claw clips for women online in India: satin bow, star and tulip claw clips from ₹289. Free delivery above ₹999, 7-day returns for damaged items.',
    match: (n) => /claw|shark/i.test(n),
    intro: ['Claw clips hold a full updo in seconds and are one of the most searched hair accessories in India. This page has bow, star and tulip claw clips for women.',
      'Choose a large claw clip with a firm spring for thick hair, and a medium one for fine or short hair. Colours and sizes are listed on each product page.'],
    faqs: [['Which claw clip is best for thick hair?', 'A large claw clip with strong teeth and a firm spring. Medium clips slip on thick hair.'],
      ['How do I put up my hair with a claw clip?', 'Twist your hair up, fold the ends in, and clip across the twist at the back of your head.']],
  },
  'hair-clips-for-women': {
    cat: 'Hair & accessories', h1: 'Hair Clips for Women', short: 'Hair clips', gcat: 'Apparel & Accessories > Clothing Accessories > Hair Accessories',
    title: 'Hair Clips for Women Online in India | Pearl & Bow',
    desc: 'Shop hair clips for women online in India: pearl hair clips, bow hair clips, butterfly and claw clips from ₹289. 7-day returns for damaged items.',
    match: (n) => /hair clip|claw clip|claw/i.test(n),
    intro: ['Pearl hair clips, bow hair clips, butterfly clips and claw clips for everyday styles and festive hairdos, from about ₹289.',
      'Small clips hold side sections and bangs. Large clips and claws hold a half-up style or a full updo.'],
    faqs: [['Which hair clip is best for a festive look?', 'A pearl or crystal hair clip. It adds shine without needing other accessories.'],
      ['Will clips damage my hair?', 'Not if you avoid pulling tight and take them out before sleeping. Smooth-edged clips are gentler.']],
  },
  'headbands-for-women': {
    cat: 'Hair & accessories', h1: 'Headbands for Women', short: 'Headbands', gcat: 'Apparel & Accessories > Clothing Accessories > Hair Accessories',
    title: 'Headbands for Women Online in India | Pearl & Leather',
    desc: 'Buy headbands for women online in India: pearl crystal, PU leather and braided headbands from ₹319. Free delivery above ₹999, 7-day returns.',
    match: (n) => /headband/i.test(n),
    intro: ['Pearl and crystal headbands for festive looks, and leather and braided headbands for everyday wear.',
      'A padded or wide headband sits more comfortably for longer wear. Check the width and material on each product page.'],
    faqs: [['How do I stop a headband slipping?', 'Choose one with a slight grip inside, and wear it a little behind the hairline rather than on the forehead.']],
  },
  // ---- Beauty tools ----
  'makeup-brush-sets': {
    cat: 'Beauty tools', h1: 'Makeup Brush Sets', short: 'Makeup brush sets', gcat: 'Health & Beauty > Personal Care',
    title: 'Makeup Brush Set Online in India | 12, 14 & 15 Piece',
    desc: 'Buy a makeup brush set online in India: 12, 14 and 15 piece sets for face and eyes from ₹449. Free delivery above ₹999, 7-day returns for damaged items.',
    match: (n) => /brush set/i.test(n),
    intro: ['A makeup brush set gives you the right brush for foundation, blush, powder and eyeshadow. This page lists 12, 14 and 15 piece sets.',
      'A 12 piece set covers daily makeup. Larger sets add detail brushes for the eyes and brows. Wash brushes every one to two weeks.'],
    faqs: [['How many makeup brushes do I need?', 'For daily makeup, a foundation brush, a powder brush, a blush brush and two eye brushes are enough. Larger sets are useful if you do full looks.'],
      ['How do I clean makeup brushes?', 'Wash them with mild soap and lukewarm water, reshape the bristles, and dry them flat.']],
  },
  'eyelash-curlers': {
    cat: 'Beauty tools', h1: 'Eyelash Curlers', short: 'Eyelash curlers', gcat: 'Health & Beauty > Personal Care',
    title: 'Eyelash Curler Online in India | Electric & Classic',
    desc: 'Buy an eyelash curler online in India: electric heated, classic and borderless eyelash curlers from ₹329. 7-day returns for damaged items.',
    match: (n) => /eyelash curler/i.test(n),
    intro: ['Classic, borderless and electric heated eyelash curlers. A curl opens up the eyes and holds a mascara look.',
      'Use a classic curler before mascara. A heated curler is used after mascara, and it should be used as instructed to avoid damage.'],
    faqs: [['Should I curl lashes before or after mascara?', 'Before, with a classic curler. Heated curlers are used after mascara, following the product instructions.'],
      ['Do eyelash curlers damage lashes?', 'Not when used gently. Do not press too hard, and never curl lashes after they are clumpy with mascara using a classic curler.']],
  },
  'face-rollers-and-massagers': {
    cat: 'Beauty tools', h1: 'Face Rollers and Massagers', short: 'Face massagers', gcat: 'Health & Beauty > Personal Care',
    title: 'Ice Face Roller & Face Massager Online in India',
    desc: 'Shop ice face rollers, germanium face massage sticks and EMS neck massagers online in India, from ₹539. 7-day returns for damaged items.',
    match: (n) => /roller|massage stick|neck massager|face massager/i.test(n),
    intro: ['Silicone ice face rollers, germanium stone massage sticks and an EMS neck massager.',
      'A chilled ice roller feels soothing in the morning and can help with temporary puffiness. These are comfort tools, not medical treatments.'],
    faqs: [['How do I use an ice face roller?', 'Fill it with water, freeze it, and roll gently over a clean face in upward strokes for a few minutes.'],
      ['Are face massagers safe for daily use?', 'Gentle use is generally fine. Stop if your skin feels irritated, and check the product page for instructions.']],
  },
  'press-on-nails-and-nail-stickers': {
    cat: 'Beauty tools', h1: 'Press-On Nails and Nail Stickers', short: 'Press-on nails', gcat: 'Health & Beauty > Personal Care',
    title: 'Press On Nails & Nail Stickers Online in India',
    desc: 'Buy press on nails and nail art stickers online in India: star moon coffin nails, solid colour and line nail stickers from ₹309. 7-day returns.',
    match: (n) => /nail/i.test(n),
    intro: ['Press-on nails and nail art stickers give a salon look at home in minutes, with no drying time.',
      'Clean and dry your nails, press firmly for 10 to 15 seconds, and avoid soaking your hands for the first few hours.'],
    faqs: [['How long do press-on nails last?', 'Usually several days, depending on how you apply them and how much your hands are in water.'],
      ['Can I reuse nail stickers?', 'Nail stickers are meant for single use. Press-on nails can sometimes be reused if removed carefully.']],
  },
  // ---- Dresses ----
  'dresses-for-women': {
    cat: 'Dresses & Ethnic Wear', h1: 'Dresses for Women', short: 'Dresses', gcat: 'Apparel & Accessories > Clothing > Dresses',
    title: 'Dresses for Women Online in India | Casual & Summer',
    desc: 'Buy dresses for women online in India: casual, summer, floral, midi and maxi dresses, with plus size options, from ₹959. 7-day returns for damaged items.',
    match: (n) => /dress/i.test(n) && !/pants|girls/i.test(n),
    intro: ['Casual dresses, summer dresses, floral dresses, midi and maxi dresses, and plus size options for women.',
      'Check the size chart and fabric on each product page before you order, because fits differ by style. Cotton and linen styles are the coolest for hot weather.'],
    faqs: [['Which dress is best for summer?', 'A loose A-line, tank or maxi dress in cotton or linen, in a light colour.'],
      ['How do I choose my dress size?', 'Measure your bust, waist and hip and compare them with the size chart. If you are between sizes, choose the larger one.']],
  },
  'summer-dresses-for-women': {
    cat: 'Dresses & Ethnic Wear', h1: 'Summer Dresses for Women', short: 'Summer dresses', gcat: 'Apparel & Accessories > Clothing > Dresses',
    title: 'Summer Dresses for Women Online in India',
    desc: 'Shop summer dresses for women online in India: cotton linen A-line, striped maxi and casual summer dresses from ₹959. 7-day returns for damaged items.',
    match: (n) => /summer/i.test(n) && /dress/i.test(n),
    intro: ['Light summer dresses in cotton linen and easy casual cuts, including a striped maxi and an A-line with plus sizes.',
      'Pick breathable fabric, a loose cut and a light colour for hot days. Check the size chart on the product page.'],
    faqs: [['What fabric is best for a summer dress?', 'Cotton and linen. They are breathable and dry quickly.']],
  },
  'midi-and-maxi-dresses': {
    cat: 'Dresses & Ethnic Wear', h1: 'Midi and Maxi Dresses for Women', short: 'Midi and maxi dresses', gcat: 'Apparel & Accessories > Clothing > Dresses',
    title: 'Midi & Maxi Dresses for Women Online in India',
    desc: 'Buy midi dresses and maxi dresses for women online in India: split midi, puff sleeve midi and long casual dresses from ₹1,179. 7-day returns.',
    match: (n) => /midi|maxi|long/i.test(n) && /dress/i.test(n),
    intro: ['Midi dresses end between the knee and ankle, and maxi dresses reach the ankle or the floor. This page has split midi, puff sleeve midi and long casual dresses.',
      'A side split makes a longer dress easier to walk in. Check the length and size chart on each product page.'],
    faqs: [['What is the difference between a midi and a maxi dress?', 'A midi ends between the knee and the ankle. A maxi reaches the ankle or the floor.']],
  },
  // ---- Lanterns ----
  'rechargeable-camping-lanterns': {
    cat: 'Lanterns & Lights', h1: 'Rechargeable Camping Lanterns', short: 'Rechargeable lanterns', gcat: 'Home & Garden > Lighting',
    title: 'Rechargeable Camping Lantern Online in India',
    desc: 'Buy a rechargeable camping lantern online in India: 1800 to 4500 mAh lanterns with magnetic base and hanging hook, from ₹1,129. 7-day returns for damaged items.',
    match: (n) => /lantern/i.test(n),
    intro: ['Rechargeable lanterns for camping, balconies, power cuts and travel, in 1800, 2400, 3000 and 4500 mAh sizes.',
      'Most models charge by cable and hang from a hook or stick to a magnetic mount. A bigger battery gives longer run time.'],
    faqs: [['How do I choose a camping lantern?', 'Check battery size (mAh) for run time and the mounting: hook, magnet or stand.'],
      ['Can I use it for power cuts at home?', 'Yes. Keep it charged and hang it where you need light.']],
  },
};
export const JTYPE_ORDER = Object.keys(JTYPES);
// Type of a product by name, most specific first. Used for feed product_type and Google category.
const FEED_ORDER = ['anklets-for-women', 'bracelets-for-women', 'earrings-for-women', 'necklaces-for-women', 'rings-for-women', 'hair-claw-clips', 'headbands-for-women', 'hair-clips-for-women', 'makeup-brush-sets', 'eyelash-curlers', 'face-rollers-and-massagers', 'press-on-nails-and-nail-stickers', 'dresses-for-women', 'rechargeable-camping-lanterns'];
export function jtypeOf(name, cat = 'Jewellery') {
  const n = String(name || '');
  if (cat === 'Jewellery') {
    if (/anklet|foot chain/i.test(n)) return 'anklets-for-women';
    if (/bracelet|bangle/i.test(n)) return 'bracelets-for-women';
    if (/earring|\bstuds?\b|\bhoops?\b|jhumka|dangle/i.test(n)) return 'earrings-for-women';
    if (/necklace|choker|\bchain\b/i.test(n)) return 'necklaces-for-women';
    if (/\brings?\b/i.test(n)) return 'rings-for-women';
    return '';
  }
  return FEED_ORDER.find((k) => (JTYPES[k].cat || 'Jewellery') === cat && JTYPES[k].match(n)) || '';
}
