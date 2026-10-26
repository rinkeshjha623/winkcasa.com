// Extra on-page content for category pages: a plain-language intro, a short buying guide and FAQs.
// Written for search (SEO), answer engines (AEO) and AI assistants (GEO): direct answers, clear facts, no inflated claims.
const D = 'Delivery is across India in 10 to 20 days, free above the free-delivery amount shown at checkout, and every item can be returned within 7 days if it arrives damaged, defective or wrong.';
export const CAT_INFO = {
  'Dresses & Ethnic Wear': {
    description: 'Festive dresses, kurtis, dupattas and ethnic wear for women, chosen for Diwali, weddings and everyday wear, delivered across India.',
    title: 'Festive dresses and ethnic wear online in India',
    intro: ['Indian shoppers buy most of their festive outfits online in the weeks before Diwali, and sarees, kurtas, lehengas and Indo-western dresses are the categories people search for first. This collection brings together women\'s dresses, kurtis, dupattas and wraps that work for Diwali, Bhai Dooj, weddings and daily wear.',
      'Colours that are in demand this season are peacock green, mustard, ruby red, emerald and soft pastels. Check the size chart on each product page before ordering, because fits differ by style. ' + D],
    faqs: [
      ['What should I wear for Diwali?', 'Pick a festive outfit in a rich colour such as ruby red, mustard, emerald or peacock green. A kurti with a dupatta or a flared dress is comfortable for a long day of puja, visits and dinner. Add one statement jewellery piece.'],
      ['How do I choose the right size when ordering a dress online?', 'Measure your bust, waist and hip, then compare them with the size chart on the product page. If you are between sizes, choose the larger one.'],
      ['Will my order arrive before Diwali?', 'Delivery takes 10 to 20 days from the day you order, so order early. Your expected delivery dates are shown at checkout.'],
      ['Can I return a dress if it does not fit?', 'Returns are accepted within 7 days when an item arrives damaged, defective or wrong. See the Returns page for the full policy.'],
    ],
  },
  'Bags & Potlis': {
    description: 'Potli bags, clutches, sling bags and handbags that complete a festive or everyday look, delivered across India.',
    title: 'Potli bags, clutches and handbags online in India',
    intro: ['A small bag finishes a festive outfit. This collection covers potli bags, clutches, sling bags and handbags in sizes that hold a phone, keys and a few essentials, which is what most people carry to Diwali dinners, weddings and puja visits.',
      'Match the bag to the outfit: a potli or clutch suits ethnic wear, while a sling bag works with dresses and everyday looks. ' + D],
    faqs: [
      ['Which bag goes best with a saree or kurti?', 'A potli bag or a small embroidered clutch. It stays light, leaves your hands free and matches ethnic wear.'],
      ['What can a potli bag hold?', 'A phone, keys, a lipstick, a small wallet and cards. Check the dimensions on the product page before you order.'],
      ['How long does delivery take?', 'Delivery is 10 to 20 days across India. Exact dates are shown at checkout.'],
      ['Can I return a bag?', 'Yes, within 7 days if it arrives damaged, defective or wrong. See the Returns page.'],
    ],
  },
  'Festive Decor': {
    description: 'Diwali and festive home décor: string lights, LED candles, lanterns, garlands and rangoli accessories, delivered across India.',
    title: 'Diwali decor and festive lights online in India',
    intro: ['Home décor is one of the biggest festive categories in India. Lights, lanterns, garlands, torans and rangoli accessories are bought every year to dress the entrance, the puja corner and the balcony.',
      'This collection focuses on easy-to-use pieces: string and fairy lights, LED candles that are safe around children, lanterns and artificial flower garlands. Check the size and power details on each product page. ' + D],
    faqs: [
      ['What are the most popular Diwali decoration items?', 'String lights, diyas or LED candles, lanterns, flower garlands, torans and rangoli. Lights and garlands change the look of a room the fastest.'],
      ['Are LED candles safe to use at home?', 'LED candles have no flame, so they are a safer choice around children, curtains and pets. Always follow the product instructions for batteries or plugs.'],
      ['Can I order in time for Diwali?', 'Delivery takes 10 to 20 days, so order as early as you can. If a festival is close, check the expected date at checkout first.'],
      ['Can I use these decorations for other festivals?', 'Yes. Lights, lanterns and garlands also suit Christmas, Eid, weddings and birthdays.'],
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
    title: 'Hair clips, claw clips and hair accessories online in India',
    intro: ['Claw clips, hair clips, headbands, scrunchies and bows for quick everyday styles and festive hairdos. Pick a larger clip for thick hair and a smaller one for fine hair. ' + D],
    faqs: [
      ['Which claw clip is best for thick hair?', 'Choose a large claw clip with strong teeth and a firm spring. For fine hair a medium clip holds better.'],
      ['How do I stop hair accessories from damaging my hair?', 'Avoid pulling tight, use smooth-edged clips and take them out before sleeping.'],
    ],
  },
  'Beauty tools': {
    title: 'Makeup brushes and beauty tools online in India',
    intro: ['Makeup brushes, face rollers, eyelash curlers, nail art stickers and facial massagers that make a daily routine simpler. Read the product page for materials and care instructions. ' + D],
    faqs: [
      ['How often should I wash makeup brushes?', 'Wash brushes used for foundation and concealer once a week, and eye brushes every two weeks.'],
      ['Does an ice face roller work?', 'It can feel soothing and help reduce temporary puffiness. It is a comfort tool, not a treatment.'],
    ],
  },
};
export const catInfo = (name) => CAT_INFO[name] || null;
