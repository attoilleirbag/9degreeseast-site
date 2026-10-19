# 9 Degrees East website

- `site/` is the website. Netlify publishes this folder.
- `scripts/update-weather.mjs` refreshes the Fuel Weather figures from public data.
- `.github/workflows/fuel-weather.yml` runs that script every Monday at 06:00 UTC and publishes the page if anything changed.

## Fuel Weather sources
- U.S. Energy Information Administration (free API key, stored as the `EIA_API_KEY` repository secret): jet fuel, diesel, Henry Hub gas
- Ember, European wholesale electricity prices (CC-BY 4.0): Germany
- Methanex posted contract prices (public page)

If a source is unavailable or returns something unexpected, that fuel keeps its previous figures. Check the run log under the **Actions** tab.

To run an update by hand: **Actions → Update Fuel Weather → Run workflow**.
