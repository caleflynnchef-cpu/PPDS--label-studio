# PPDS Label Studio — version 1.0

An offline-capable, iPhone-friendly recipe and A4 label printing web app. Not affiliated with Planglow or LabelLogic. No account or subscription; recipes are saved in the browser on the device.

## What it does

- Save, duplicate and edit food recipes.
- Enter each ingredient by manufacturing weight; app sorts the declaration by descending weight.
- Capture compound ingredients and supplier sub-ingredient declarations.
- Check all 14 major regulated allergen categories. Recognised words are automatically emphasised in bold and underline in ingredient statements. It also prompts for common indirect allergen names, but these suggestions **cannot substitute for supplier data**.
- Require an explicit human recipe approval; changing any ingredient or food details invalidates the previous approval.
- Print A4 portrait adhesive label sheets: 21 × 63.5×38.1 mm (similar to L7160), 14 × 99.1×38.1 mm (similar to L7163), or 8 × 99.1×67.7 mm (similar to L7165).
- Choose number of labels (up to 250), and first label position on partly used sheets.
- Preview label overflow; prevent printing if required content does not fit (in the measured browser rendering). Physical test prints are still essential.
- Export and import JSON recipe backups.

## Run it on an iPhone

### Quick testing on a computer
Open `index.html` in a browser, or serve this folder using `python3 -m http.server 8000` and visit `http://localhost:8000`.

### Install on an iPhone Home Screen
A web app needs an HTTPS web address for reliable iOS Home Screen installation and offline caching. Host **this folder's contents** on any trusted static HTTPS host (e.g. GitHub Pages or Netlify Drop). Open the resulting HTTPS URL in **Safari on your iPhone**, tap **Share → Add to Home Screen** (on some iOS versions, through the sharing options), and open it from the icon. Once loaded, app files are cached for offline use. Check Safari's site storage settings: recipes are stored locally, not on your host.

If you only want to try it, open `index.html` directly in a desktop browser. A local file in the iOS Files app does not behave reliably as an installable iPhone web app. Hosting/deployment is not included in the download.

### Printing
1. Connect an **AirPrint-compatible** printer to the same Wi-Fi as your iPhone (or use a desktop printer).
2. Create and verify a recipe with actual ingredients and supplier specifications.
3. Select the correct A4 adhesive sheet dimensions and count. Only use matching stock.
4. Select **Print**, choose the printer, set **A4 / portrait / 100% scale / no headers or footers** where the printer dialogue permits.
5. First print on ordinary paper; place it behind an adhesive sheet against the light to check alignment, then test with adhesive sheets.
6. Read and measure physical labels for legibility, x-height and correctness before sale.

Some AirPrint drivers automatically rescale output, and some home printers have unprintable margins. If a sheet does not align in a physical test, do not use it. Changing font size or margins can compromise labelling. This version does not support direct Bluetooth thermal-printer protocols or iOS-native printing APIs.

## Regulatory limits and safety

This is a **tool for preparing** PPDS labels, not a compliance certification. For relevant prepacked-for-direct-sale food in England, Northern Ireland and Wales, the FSA requires a food name, full ingredients listed generally in descending order of weight at manufacture, and allergenic ingredients emphasised every time they appear. You are responsible for whether PPDS rules apply to your food, supplier changes, hidden allergens and compound ingredients, the legal name, QUID percentages, precautionary allergen labelling based on risk assessment, and other category-specific or wider food-labelling requirements.

The minimum character x-height is generally **1.2 mm**, or **0.9 mm** where the packaging's largest surface is under 80 cm². This measurement depends on **the actual food packaging**, not merely the sticker dimensions. The web app cannot physically measure printer output, and the preview cannot guarantee legal font compliance.

Also: gluten-containing cereals should be specified by cereal, and tree nuts by nut type. Sulphites above the legal threshold require declaration. Automatic keyword suggestions are limited and can create false positives or miss hidden allergens. Confirm all 14 allergens against source documents before approving. Never print demonstration example data for real food.

Official references:
- https://www.gov.uk/government/publications/labelling-guidance-for-prepacked-for-direct-sale-ppds-food-products/labelling-guidance-for-prepacked-for-direct-sale-ppds-food-products
- https://www.gov.uk/government/publications/prepacked-for-direct-sale-ppds-allergen-labelling-changes-for-schools-colleges-and-nurseries/prepacked-for-direct-sale-ppds-allergen-labelling-changes-for-schools-colleges-and-nurseries
- https://www.gov.uk/government/publications/packaging-and-labelling/packaging-and-labelling

## Data privacy

No data is sent to any server by this app; all recipe fields persist in your browser's localStorage. Web server or hosting providers may log your connection, but they do not receive your recipe data. Browser cleanup or reinstalling the Home Screen app can remove locally stored recipes. **Export backups regularly.** Data is not encrypted at rest beyond your device's protections.

## Technical

Static HTML/CSS/JavaScript, service worker for HTTPS offline caching, no packages or frameworks. The source is included so you can customise it. To customise labels, edit `STOCKS` in `app.js` and corresponding CSS. This app is a functional MVP, not a native App Store IPA.
