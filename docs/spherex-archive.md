# SPHEREx archive access

Checked 11 November 2026 against the live NASA/IPAC IRSA services. AstroLens X queries these services at request time. It does not store observation rows and it does not invent records when a query fails.

## Endpoints in use

| Purpose | Endpoint |
| --- | --- |
| Spectral-image search | `https://irsa.ipac.caltech.edu/SIA` |
| File download | `https://irsa.ipac.caltech.edu/ibe/data/spherex/.../*.fits` |
| FITS cutout | same file URL with `center=<ra>,<dec>&size=0.08` |
| AstroLens proxy | `GET /api/spherex/observations?ra=<deg>&dec=<deg>` |

SIA is IVOA Simple Image Access version 2. The proxy sends:

```text
COLLECTION=spherex_qr3
POS=circle <ra> <dec> 0.01
MAXREC=80
RESPONSEFORMAT=csv
```

`POS` is in ICRS degrees. The radius is the search circle, in degrees. `spherex_qr3` is the Quick Release 3 wide survey. If that collection returns no rows, the proxy repeats the query against `spherex_qr3_deep`.

Official descriptions:

- Data access guide: https://caltech-ipac.github.io/spherex-archive-documentation/spherex-data-access/
- IRSA SIA example in that guide: `COLLECTION=spherex_qr2&POS=circle+127.69444+-39.17760+0.01`
- TAP, used by IRSA's cutout tutorial and not by this app: `https://irsa.ipac.caltech.edu/TAP/sync`
- Release notes: https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_qr.html

Other public SIA collections documented by IRSA on that date: `spherex_qr2`, `spherex_qr2_deep`, `spherex_qr3`, `spherex_qr3_deep`. QR1 was retired in February 2026 and is no longer served.

## What a row contains

A successful CSV row includes `obs_id`, `facility_name`, `instrument_name`, `energy_bandpassname`, `energy_emband`, `em_min`, `em_max` (meters), `t_exptime` (seconds), `t_min` and `t_max` (MJD), `obs_release_date`, `s_ra`, `s_dec`, `s_pixel_scale`, `access_url`, and `access_format`.

The app converts MJD to UTC and wavelengths from meters to micrometers. `t_min` for the sample file below is `61308.920681`, which is `2026-10-03 22:05:46 UTC`. The archive's own `obs_release_date` on that row is `2026-10-28 22:18:56`.

Sample product, returned for the Orion Nebula search:

```text
https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/2026W39_2A/l2b-v27-2026-271/3/level2_2026W39_2A_0304_1D3_spx_l2b-v27-2026-271.fits
```

`HEAD` returned HTTP 200, `content-type: application/fits`, `content-length: 64794240`. The matching `.jpg` and `.png` URLs returned HTTP 404. `access_format` on the SIA row is `image/fits`. There is no preview-image column.

A cutout of that file at `center=83.822,-5.3875&size=0.08` returned HTTP 200, `application/fits`, 4,072,320 bytes, in about 23 seconds. The IMAGE-sized plane in that cutout is 47 by 47 pixels. Most of the bytes are the EPSF extension, so a cutout is still a multi-extension FITS file, not a picture the browser can show.

## Catalog positions queried

Degrees were converted from the sexagesimal SIMBAD positions already stored in `src/data/catalog.js`. Each call used `COLLECTION=spherex_qr3`, `POS=circle <ra> <dec> 0.01`, and `MAXREC=500`.

| Object | RA deg | Dec deg | Rows | Distinct `obs_id` | Same-bandpass span |
| --- | --- | --- | --- | --- | --- |
| Orion Nebula (M 42) | 83.822 | −5.3875 | 143 | 73 | SPHEREx-D3: 25 visits, 2026-09-14 05:42:43 UTC through 2026-10-04 17:48:28 UTC (20.50 days) |
| Andromeda Galaxy (M 31) | 10.684708 | +41.26875 | 56 | 28 | SPHEREx-D3 and D6: 21 visits, 2026-07-20 through 2026-08-07 (18.05 days). D1 and D4 had a single visit. |
| Vega | 279.234735 | +38.783689 | 150 | 76 | SPHEREx-D2: 38 visits across 12.22 days |
| Sirius | 101.287155 | −16.716116 | 74 | 37 | D1/D4 over 1.36 days and D2/D5 over 1.02 days. D3 and D6 were absent from this response. |
| Betelgeuse | 88.792939 | +7.407064 | 122 | 61 | SPHEREx-D3/D6 over 14.67 days |
| Polaris | 37.954561 | +89.264109 | 150 | 75 | SPHEREx-D3/D6 over 9.03 days |

Vega and Polaris both stopped at 150 rows with `MAXREC=500`, so IRSA appears to cap a single SIA response. Those two spans are lower limits on the images IRSA holds.

Repeat coverage is real for every preset except where a detector is missing. The Orion Nebula D3 series is a suitable pair of dates for a later comparison: same collection, same bandpass name, same search circle, observation starts 20.50 days apart.

That comparison is not an animation candidate yet. SIA matches the image footprint to the circle. SPHEREx frames are about 3.5 degrees across (`s_fov` about 3.485), the pixel scale is 6.15 arcsec, and wavelength varies across the detector. Two `SPHEREx-D3` rows are repeat coverage of the coordinate. They are not a promise that the same wavelength landed on the same object both times. The app reports the dates and leaves the animation unbuilt.

## App behavior

`backend/app/spherex.py` calls SIA and returns the parsed rows. `preview_image_url` is always `null`. The panel links the FITS file and the FITS cutout instead of showing an image.

Failure, an empty table, and the idle state before a selection each render their own message. A failed request can be sent again from the panel.

## Blockers

- IRSA does not publish a JPEG or PNG preview for these spectral images. Generating one would mean downloading a multi-megabyte FITS cutout (about 23 seconds for a 0.08 degree cutout in this test) and stretching the IMAGE extension locally. That rendering is not in the app, so the preview area cannot be mistaken for an IRSA picture.
- SIA does not return the wavelength at the catalog coordinate. The wavelength fields are the bandpass bounds of the whole detector image.
- A response can be truncated. The proxy asks for at most 80 rows (`max_records` is capped at 150). The live service also stopped at 150 rows when asked for 500.
- New SPHEREx data reach SIA about a day after they appear in the browsable directories and some TAP queries. Counts above will change at the next weekly ingestion.
- QR1 is retired. QR2 is still documented, and this app uses QR3 so the panel shows the current wide-survey release.
