// Regenerates src/data/world-countries-110m.json — a small local GeoJSON file used by
// <CountryExplorer> to draw real country borders. Not run as part of `build` or `dev`; it's a
// one-off/occasional maintenance script, so world-atlas and topojson-client stay devDependencies
// rather than something the shipped app depends on. Run with: npm run data:world-countries
const fs = require("fs");
const path = require("path");
const topojson = require("topojson-client");
const topo = require("world-atlas/countries-110m.json");

// ISO 3166-1 [alpha-2, numeric] pairs, used to attach the alpha-2 codes our data model keys on
// (Country.code) — world-atlas's topojson only carries the numeric id and an English name.
// A handful of disputed/unlisted territories (Kosovo, Somaliland, Northern Cyprus) have no
// standard numeric code and are left with code: null; they still render as muted geography.
const ISO_NUMERIC_TO_ALPHA2 = new Map([
  ["AF", 4], ["AL", 8], ["DZ", 12], ["AS", 16], ["AD", 20], ["AO", 24], ["AI", 660], ["AQ", 10],
  ["AG", 28], ["AR", 32], ["AM", 51], ["AW", 533], ["AU", 36], ["AT", 40], ["AZ", 31], ["BS", 44],
  ["BH", 48], ["BD", 50], ["BB", 52], ["BY", 112], ["BE", 56], ["BZ", 84], ["BJ", 204], ["BM", 60],
  ["BT", 64], ["BO", 68], ["BA", 70], ["BW", 72], ["BV", 74], ["BR", 76], ["IO", 86], ["BN", 96],
  ["BG", 100], ["BF", 854], ["BI", 108], ["KH", 116], ["CM", 120], ["CA", 124], ["CV", 132],
  ["KY", 136], ["CF", 140], ["TD", 148], ["CL", 152], ["CN", 156], ["CX", 162], ["CC", 166],
  ["CO", 170], ["KM", 174], ["CG", 178], ["CD", 180], ["CK", 184], ["CR", 188], ["CI", 384],
  ["HR", 191], ["CU", 192], ["CY", 196], ["CZ", 203], ["DK", 208], ["DJ", 262], ["DM", 212],
  ["DO", 214], ["EC", 218], ["EG", 818], ["SV", 222], ["GQ", 226], ["ER", 232], ["EE", 233],
  ["ET", 231], ["FK", 238], ["FO", 234], ["FJ", 242], ["FI", 246], ["FR", 250], ["GF", 254],
  ["PF", 258], ["TF", 260], ["GA", 266], ["GM", 270], ["GE", 268], ["DE", 276], ["GH", 288],
  ["GI", 292], ["GR", 300], ["GL", 304], ["GD", 308], ["GP", 312], ["GU", 316], ["GT", 320],
  ["GN", 324], ["GW", 624], ["GY", 328], ["HT", 332], ["HM", 334], ["VA", 336], ["HN", 340],
  ["HK", 344], ["HU", 348], ["IS", 352], ["IN", 356], ["ID", 360], ["IR", 364], ["IQ", 368],
  ["IE", 372], ["IL", 376], ["IT", 380], ["JM", 388], ["JP", 392], ["JO", 400], ["KZ", 398],
  ["KE", 404], ["KI", 296], ["KP", 408], ["KR", 410], ["KW", 414], ["KG", 417], ["LA", 418],
  ["LV", 428], ["LB", 422], ["LS", 426], ["LR", 430], ["LY", 434], ["LI", 438], ["LT", 440],
  ["LU", 442], ["MO", 446], ["MG", 450], ["MW", 454], ["MY", 458], ["MV", 462], ["ML", 466],
  ["MT", 470], ["MH", 584], ["MQ", 474], ["MR", 478], ["MU", 480], ["YT", 175], ["MX", 484],
  ["FM", 583], ["MD", 498], ["MC", 492], ["MN", 496], ["MS", 500], ["MA", 504], ["MZ", 508],
  ["MM", 104], ["NA", 516], ["NR", 520], ["NP", 524], ["NL", 528], ["NC", 540], ["NZ", 554],
  ["NI", 558], ["NE", 562], ["NG", 566], ["NU", 570], ["NF", 574], ["MP", 580], ["MK", 807],
  ["NO", 578], ["OM", 512], ["PK", 586], ["PW", 585], ["PS", 275], ["PA", 591], ["PG", 598],
  ["PY", 600], ["PE", 604], ["PH", 608], ["PN", 612], ["PL", 616], ["PT", 620], ["PR", 630],
  ["QA", 634], ["RE", 638], ["RO", 642], ["RU", 643], ["RW", 646], ["SH", 654], ["KN", 659],
  ["LC", 662], ["PM", 666], ["VC", 670], ["WS", 882], ["SM", 674], ["ST", 678], ["SA", 682],
  ["SN", 686], ["SC", 690], ["SL", 694], ["SG", 702], ["SK", 703], ["SI", 705], ["SB", 90],
  ["SO", 706], ["ZA", 710], ["GS", 239], ["ES", 724], ["LK", 144], ["SD", 729], ["SR", 740],
  ["SJ", 744], ["SZ", 748], ["SE", 752], ["CH", 756], ["SY", 760], ["TW", 158], ["TJ", 762],
  ["TZ", 834], ["TH", 764], ["TL", 626], ["TG", 768], ["TK", 772], ["TO", 776], ["TT", 780],
  ["TN", 788], ["TR", 792], ["TM", 795], ["TC", 796], ["TV", 798], ["UG", 800], ["UA", 804],
  ["AE", 784], ["GB", 826], ["US", 840], ["UM", 581], ["UY", 858], ["UZ", 860], ["VU", 548],
  ["VE", 862], ["VN", 704], ["VG", 92], ["VI", 850], ["WF", 876], ["EH", 732], ["YE", 887],
  ["ZM", 894], ["ZW", 716], ["AX", 248], ["BQ", 535], ["CW", 531], ["GG", 831], ["IM", 833],
  ["JE", 832], ["ME", 499], ["BL", 652], ["MF", 663], ["RS", 688], ["SX", 534], ["SS", 728],
  ["XK", 983],
].map(([alpha2, numeric]) => [String(numeric), alpha2]));

// Antarctica adds a distracting band across the bottom of an equirectangular plot and is never
// relevant to a study-abroad map, so it's dropped rather than just left unhighlighted.
const ANTARCTICA_ID = "010";

const round = (n) => Math.round(n * 100) / 100;

function roundRing(ring) {
  return ring.map(([lon, lat]) => [round(lon), round(lat)]);
}

function roundGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(roundRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: geometry.coordinates.map((polygon) => polygon.map(roundRing)) };
  }
  return geometry;
}

const geojson = topojson.feature(topo, topo.objects.countries);

const features = geojson.features
  .filter((feature) => feature.id !== ANTARCTICA_ID)
  .map((feature) => ({
    type: "Feature",
    properties: {
      name: feature.properties.name,
      code: ISO_NUMERIC_TO_ALPHA2.get(String(Number(feature.id))) ?? null,
    },
    geometry: roundGeometry(feature.geometry),
  }));

const out = { type: "FeatureCollection", features };
const outPath = path.join(__dirname, "..", "src", "data", "world-countries-110m.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${features.length} country features to ${path.relative(process.cwd(), outPath)} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
