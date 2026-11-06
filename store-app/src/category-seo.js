// Extra on-page content for category pages: a plain-language intro, a short buying guide and FAQs.
// Written for search (SEO), answer engines (AEO) and AI assistants (GEO): direct answers, clear facts, no inflated claims.
const D = 'Delivery is across India in 10 to 20 days, free above the free-delivery amount shown at checkout, and every item can be returned within 7 days if it arrives damaged, defective or wrong.';
export const CAT_INFO = {
  'Dresses & Ethnic Wear': {
    description: 'Casual, summer, midi and maxi dresses for women, plus a few co-ords, skirts and pants, delivered across India.',
    title: 'Dresses for women online in India',
    intro: ['Dresses are one of the most searched women\'s clothing categories in India. This collection has casual dresses, summer dresses, midi and maxi dresses, floral and A-line styles, with a few plus size options.',
      'Most styles here are western and casual, made for daytime, brunch, travel and holidays. Check the size chart and fabric on each product page before ordering, because fits differ by style. ' + D],
    faqs: [
      ['Which dress is best for summer?', 'Choose a loose, light dress in cotton or linen, such as an A-line, tank or maxi style. Light colours and a V or round neck keep you cooler.'],
      ['How do I choose the right size when ordering a dress online?', 'Measure your bust, waist and hip, then compare them with the size chart on the product page. If you are between sizes, choose the larger one.'],
      ['What is the difference between a midi and a maxi dress?', 'A midi dress ends between the knee and the ankle. A maxi dress reaches the ankle or the floor.'],
      ['Can I return a dress if it does not fit?', 'Returns are accepted within 7 days when an item arrives damaged, defective or wrong. See the Returns page for the full policy.'],
    ],
  },
  'Bags & Potlis': {
    description: 'Sling bags and everyday bags, delivered across India.',
    title: 'Sling bags and everyday bags online in India',
    intro: ['A sling bag keeps your phone, keys and wallet close and your hands free. This collection is a small, growing edit of sling and everyday bags. Check the size and materials on each product page. ' + D],
    faqs: [
      ['What can a sling bag hold?', 'A phone, keys, a wallet and a few small items. Check the dimensions on the product page before you order.'],
      ['Can I return a bag?', 'Yes, within 7 days if it arrives damaged, defective or wrong. See the Returns page.'],
    ],
  },
  'Lanterns & Lights': {
    description: 'Rechargeable camping lanterns with magnetic bases and hanging hooks, for camping, power cuts and the balcony.',
    title: 'Rechargeable camping lanterns online in India',
    intro: ['Rechargeable lanterns are useful for camping, balcony evenings, power cuts and travel. The lanterns here charge by cable (Type-C on most models), and most have a hanging hook or a magnetic mount so you can place them anywhere.',
      'The main difference between models is battery size, shown in mAh on each product page. Choose 1800 to 2400 mAh for light use, and 3000 to 4500 mAh if you want longer run time. ' + D],
    faqs: [
      ['How do I choose a camping lantern?', 'Look at the battery size (mAh) for run time, and at how it mounts: hook, magnet or stand. A bigger battery lasts longer but weighs more.'],
      ['Can I use a camping lantern at home during a power cut?', 'Yes. A rechargeable lantern is a practical backup light. Keep it charged, and check the product page for charging details.'],
      ['How do I charge it?', 'Most models here charge with a Type-C cable. The product page lists the connector for each model.'],
    ],
  },
  'Festive Decor': {
    description: 'Festive and seasonal decorations, delivered across India.',
    title: 'Festive and seasonal decor online in India',
    intro: ['A small edit of seasonal decorations for the door, wall and mantel, including Halloween and Christmas pieces. Check the size and power details on each product page. ' + D],
    faqs: [
      ['How long does delivery take?', 'Delivery is 10 to 20 days across India. Exact dates are shown at checkout, so order early for a festival.'],
      ['Can I return a decoration?', 'Yes, within 7 days if it arrives damaged, defective or wrong. See the Returns page.'],
    ],
  },
  Jewellery: {
    title: 'Everyday and festive jewellery online in India',
    intro: ['Lightweight earrings, necklaces, bracelets and chokers you can wear every day, plus statement pieces for Diwali and weddings. Each product page lists the material and size so you know what you are buying. ' + D],
    faqs: [
      ['How do I keep fashion jewellery looking new?', 'Put it on last, after perfume and lotion, wipe it with a soft cloth after wearing, and store each piece in its own pouch.'],
      ['Which earrings suit a saree or kurti?', 'Jhumkas and large dangle earrings suit ethnic wear. Studs and small hoops suit everyday outfits.'],
      ['Is online jewellery safe to buy from WinkCasa?', 'WinkCasa is a registered Indian business with a GST number, contact details and a 7 day returns policy for damaged, defective or wrong items.'],
    ],
  },
  'Hair & accessories': {
    description: 'Claw clips, pearl hair clips and headbands for quick everyday styles and festive hairdos.',
    title: 'Hair claw clips, hair clips and headbands online in India',
    intro: ['Hair claw clips, pearl and bow hair clips and headbands for quick everyday styles and festive hairdos. Pick a larger clip for thick hair and a smaller one for fine hair. ' + D],
    faqs: [
      ['Which claw clip is best for thick hair?', 'Choose a large claw clip with strong teeth and a firm spring. For fine hair a medium clip holds better.'],
      ['How do I stop hair accessories from damaging my hair?', 'Avoid pulling tight, use smooth-edged clips and take them out before sleeping.'],
    ],
  },
  'Beauty tools': {
    description: 'Makeup brush sets, eyelash curlers, face rollers, massagers and press-on nails.',
    title: 'Makeup brush sets, face rollers and beauty tools online in India',
    intro: ['Makeup brush sets, eyelash curlers, ice face rollers, facial and neck massagers, scalp massagers and press-on nails that make a daily routine simpler. Read the product page for materials and care instructions. ' + D],
    faqs: [
      ['How often should I wash makeup brushes?', 'Wash brushes used for foundation and concealer once a week, and eye brushes every two weeks.'],
      ['Does an ice face roller work?', 'It can feel soothing and help reduce temporary puffiness. It is a comfort tool, not a treatment.'],
    ],
  },
};
export const catInfo = (name) => CAT_INFO[name] || null;
